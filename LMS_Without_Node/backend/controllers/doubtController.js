const Doubt = require('../models/Doubt');
const User = require('../models/User');
const Course = require('../models/Course');
const Notification = require('../models/Notification');

// Create a new doubt (student only)
exports.createDoubt = async (req, res) => {
  try {
    const { title, description, course, isPrivate, attachments, teacher } = req.body;

    if (!title || !description || !course) {
      return res.status(400).json({ message: 'Title, description and course are required' });
    }

    // Enrollment check: only students enrolled in the course can post
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.userId);
      if (!user.enrolledCourses.map(String).includes(String(course))) {
        return res.status(403).json({ message: 'Only enrolled students can post doubts for this course' });
      }
    }

    const doubt = await Doubt.create({
      title,
      description,
      attachments: attachments || [],
      isPrivate: !!isPrivate,
      student: req.user.userId,
      studentEmail: req.user.email,
      teacher: teacher || null,
      course: course || null,
      messages: [{
        sender: req.user.userId,
        content: description
      }]
    });

    // Create a notification for teachers (and specific teacher if assigned)
    try {
      const student = await User.findById(req.user.userId).select('name');
      const courseDoc = course ? await Course.findById(course).select('title') : null;
      const message = `${student && student.name ? student.name : 'A student'} posted a new doubt${courseDoc ? ' in ' + courseDoc.title : ''}: ${title}`;
      const link = `/doubts/${doubt._id}`;

      const notifPayload = {
        type: 'doubt',
        message,
        link
      };

      if (teacher) {
        notifPayload.targetUsers = [teacher];
      } else {
        notifPayload.targetRoles = ['teacher'];
      }

      const notification = new Notification(notifPayload);
      const savedNotif = await notification.save();
      // Emit a real-time notification event so connected clients can update
      const { io } = require('../server');
      io.emit('notification-created', savedNotif);
    } catch (notifErr) {
      console.error('Failed to create notification for doubt:', notifErr);
    }

    const { io } = require('../server');
    io.emit('doubt-created', { doubtId: doubt._id, course: doubt.course });

    res.status(201).json(doubt);
  } catch (error) {
    console.error('createDoubt error:', error);
    res.status(500).json({ message: error.message });
  }
};

// List doubts with filters
exports.getDoubts = async (req, res) => {
  try {
    const { courseId, status, publicOnly, page = 1, limit = 20, q, mine } = req.query;
    const query = { isDeleted: { $ne: true } };

    // Filtering
    if (status) query.status = status;
    if (courseId) query.course = courseId;
    if (q) query.$or = [ { title: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') } ];

    // Role-based access
    if (req.user.role === 'student') {
      const user = await User.findById(req.user.userId);

      if (mine === 'true') {
        // Explicit 'mine' filter returns only the student's doubts
        query.student = req.user.userId;
      } else {
        // Students can view:
        // - their own doubts (private or public)
        // - public doubts for courses they are enrolled in
        query.$or = [
          { student: req.user.userId },
          { $and: [ { isPrivate: false }, { course: { $in: user.enrolledCourses } } ] }
        ];
      }
    } else if (req.user.role === 'teacher') {
      // Teachers see doubts related to courses they instruct
      const courses = await Course.find({ instructor: req.user.userId }).select('_id');
      const courseIds = courses.map(c => c._id);
      query.$or = [ { teacher: req.user.userId }, { course: { $in: courseIds } } ];
    }

    // If publicOnly flag explicitly set
    if (publicOnly === 'true') query.isPrivate = false;

    const doubts = await Doubt.find(query)
      .populate('student', 'name email role')
      .populate('teacher', 'name email role')
      .populate('course', 'title')
      .sort({ pinned: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json(doubts);
  } catch (error) {
    console.error('getDoubts error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single doubt
exports.getDoubt = async (req, res) => {
  try {
    const doubt = await Doubt.findById(req.params.id)
      .populate('student', 'name email profile role')
      .populate('teacher', 'name email profile role')
      .populate('course', 'title')
      .populate('messages.sender', 'name email role');
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    // Authorization: private doubts only visible to student (owner) and teachers
    if (doubt.isPrivate) {
      if (req.user.role === 'student') {
        // handle both populated and unpopulated student field
        const studentId = doubt.student && doubt.student._id ? doubt.student._id.toString() : (doubt.student ? doubt.student.toString() : null);
        if (!studentId || studentId !== req.user.userId) {
          return res.status(403).json({ message: 'Unauthorized' });
        }
      }
      // teachers will be allowed (additional instructor checks can be added if needed)
    }

    res.json(doubt);
  } catch (error) {
    console.error('getDoubt error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add reply (message) to doubt
exports.sendMessage = async (req, res) => {
  try {
    const { content, attachments } = req.body;
    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    // Block replies to resolved doubts
    if (doubt.status === 'resolved') {
      return res.status(400).json({ message: 'Cannot reply to a resolved doubt' });
    }

    // Only student (owner) or teacher(s) of the course can reply
    if (req.user.role === 'student' && doubt.student.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (req.user.role === 'teacher') {
      // Optionally ensure teacher is instructor for the course
      // (skip strict check if teacher was assigned directly)
      if (doubt.course) {
        const course = await Course.findById(doubt.course);
        if (course && course.instructor.toString() !== req.user.userId) {
          return res.status(403).json({ message: 'Only course instructor can reply' });
        }
      }
    }

    doubt.messages.push({ sender: req.user.userId, content, attachments: attachments || [] });
    doubt.updatedAt = new Date();

    // If a teacher replies, mark as answered and notify the student
    if (req.user.role === 'teacher') {
      doubt.status = 'answered';

      try {
        const teacher = await User.findById(req.user.userId).select('name');
        const message = `${teacher?.name || 'Teacher'} replied to your doubt: ${doubt.title}`;
        const link = `/doubts/${doubt._id}`;
        const notif = new Notification({ type: 'doubt', message, link, targetUsers: [doubt.student] });
        const saved = await notif.save();
        const { io } = require('../server');
        io.emit('notification-created', saved);
      } catch (notifErr) {
        console.error('Failed to notify student for doubt reply:', notifErr);
      }
    }

    await doubt.save();

    const { io } = require('../server');
    io.emit('doubt-updated', { doubtId: doubt._id });

    res.json(doubt);
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Toggle upvote on a doubt
exports.upvoteDoubt = async (req, res) => {
  try {
    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    const userId = req.user.userId;
    const idx = doubt.upvotes.findIndex(u => u.toString() === userId);
    if (idx === -1) {
      doubt.upvotes.push(userId);
    } else {
      doubt.upvotes.splice(idx, 1);
    }

    await doubt.save();
    res.json({ upvotes: doubt.upvotes.length });
  } catch (error) {
    console.error('upvoteDoubt error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Change status (teacher or student may mark resolved)
exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'open'|'answered'|'resolved'|'closed'
    const allowed = ['open','answered','resolved','closed'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    // Only teacher or owner student can change to resolved/closed
    if (['resolved','closed'].includes(status)) {
      if (!(req.user.role === 'teacher' || (req.user.role === 'student' && doubt.student.toString() === req.user.userId))) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }

    // Only teacher can set 'answered'
    if (status === 'answered' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teacher can mark as answered' });
    }

    doubt.status = status;
    doubt.updatedAt = new Date();
    await doubt.save();

    res.json(doubt);
  } catch (error) {
    console.error('changeStatus error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Pin/unpin (teacher only)
exports.pinDoubt = async (req, res) => {
  try {
    const { pinned } = req.body;
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Unauthorized' });

    const doubt = await Doubt.findByIdAndUpdate(req.params.id, { pinned: !!pinned, updatedAt: new Date() }, { new: true });
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    res.json(doubt);
  } catch (error) {
    console.error('pinDoubt error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Soft delete (teacher/admin)
exports.deleteDoubt = async (req, res) => {
  try {
    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

      // Allow deletion for:
    // - admin (any doubt)
    // - teacher (any doubt)
    // - student only for their own doubt
    if (req.user.role === 'admin' || req.user.role === 'teacher' || (req.user.role === 'student' && doubt.student.toString() === req.user.userId)) {
      // Permanently remove the document from the database
      await Doubt.findByIdAndDelete(req.params.id);
      console.log(`Doubt ${req.params.id} permanently deleted by ${req.user.userId} (${req.user.role})`);
      return res.json({ message: 'Doubt permanently deleted' });
    }

    return res.status(403).json({ message: 'Unauthorized' });
  } catch (error) {
    console.error('deleteDoubt error:', error);
    res.status(500).json({ message: error.message });
  }
};
