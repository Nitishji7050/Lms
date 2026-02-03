const LiveClass = require('../models/LiveClass');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadVideoRecording, deleteVideoRecording } = require('../utils/cloudinary');

exports.createLiveClass = async (req, res) => {
  try {
    const { title, description, course, scheduledAt, duration } = req.body;
    
    // Validate required fields
    if (!title || !scheduledAt) {
      return res.status(400).json({ 
        message: 'Title and scheduled date are required' 
      });
    }

    // Validate scheduledAt is a valid date
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid scheduled date format' 
      });
    }

    const liveClass = await LiveClass.create({
      title,
      description: description || '',
      course: course || undefined,
      scheduledAt: scheduledDate,
      duration: duration || 60,
      instructor: req.user.userId,
      status: 'scheduled'
    });

    // Create notification for enrolled students of the course
    try {
      if (course) {
        const courseDoc = await require('../models/Course').findById(course).select('title enrolledStudents');
        const teacher = await User.findById(req.user.userId).select('name');
        const message = `${teacher?.name || 'Instructor'} scheduled a new class${courseDoc ? ' in ' + courseDoc.title : ''}: ${title}`;
        const link = `/live-classes/${liveClass._id}`;

        const notif = new Notification({
          type: 'live_class',
          message,
          link
        });

        if (courseDoc && courseDoc.enrolledStudents && courseDoc.enrolledStudents.length > 0) {
          notif.targetUsers = courseDoc.enrolledStudents;
        } else {
          notif.targetRoles = ['student'];
        }

        const saved = await notif.save();
        const { io } = require('../server');
        io.emit('notification-created', saved);
      }
    } catch (notifErr) {
      console.error('Failed to create notification for live class:', notifErr);
    }
    
    res.status(201).json(liveClass);
  } catch (error) {
    console.error('Error creating live class:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating live class',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.getLiveClasses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`[LiveClass Access] User: ${userId}, Role: ${userRole}`);

    let query = {};

    if (userRole === 'student') {
      // Get student's enrolled courses
      const student = await User.findById(userId).select('enrolledCourses');
      const enrolledCourses = student?.enrolledCourses || [];

      console.log(`[LiveClass Access] Student enrolled in courses: ${enrolledCourses.length}`);
      console.log(`[LiveClass Access] Course IDs: ${enrolledCourses.join(', ')}`);

      // Only show live classes from enrolled courses
      query = {
        status: { $in: ['scheduled', 'live'] },
        course: { $in: enrolledCourses }
      };
    } else if (userRole === 'teacher') {
      // Teachers see their own live classes
      query = { instructor: userId };
    } else if (userRole === 'admin') {
      // Admins see all live classes
      query = {};
    }

    const classes = await LiveClass.find(query)
      .populate('instructor', 'name email')
      .populate('course', 'title')
      .sort({ scheduledAt: 1 });

    console.log(`[LiveClass Access] Found ${classes.length} accessible classes`);
    res.json(classes);
  } catch (error) {
    console.error('getLiveClasses error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate('instructor', 'name email profile')
      .populate('participants', 'name email')
      .populate('course', 'title');
    res.json(liveClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(liveClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.joinLiveClass = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const classId = req.params.id;

    const liveClass = await LiveClass.findById(classId)
      .populate('course');

    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    console.log(`[Join LiveClass] User: ${userId}, Role: ${userRole}, ClassId: ${classId}`);

    // Check if class is live or scheduled
    if (liveClass.status === 'completed' || liveClass.status === 'cancelled') {
      return res.status(400).json({ message: 'This class is no longer available' });
    }

    // Authorization: Students must be enrolled in the course
    if (userRole === 'student' && liveClass.course) {
      const student = await User.findById(userId).select('enrolledCourses');
      const isEnrolled = student?.enrolledCourses?.includes(liveClass.course._id);

      console.log(`[Join LiveClass] Course: ${liveClass.course._id}, IsEnrolled: ${isEnrolled}`);

      if (!isEnrolled) {
        console.log(`[Join LiveClass] UNAUTHORIZED - Student not enrolled in course`);
        return res.status(403).json({ message: 'You are not enrolled in the course for this live class' });
      }
    }

    // Add participant if not already added
    if (!liveClass.participants.includes(userId)) {
      liveClass.participants.push(userId);
      await liveClass.save();
    }

    console.log(`[Join LiveClass] Successfully joined`);
    res.json({ 
      message: 'Joined class successfully', 
      meetingLink: liveClass.meetingLink,
      status: liveClass.status
    });
  } catch (error) {
    console.error('joinLiveClass error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    
    // Only instructor can remove participants
    if (liveClass.instructor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only instructor can remove participants' });
    }

    const participantId = req.params.participantId;
    liveClass.participants = liveClass.participants.filter(
      p => p.toString() !== participantId
    );
    await liveClass.save();

    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload recording to Cloudinary
exports.uploadRecording = async (req, res) => {
  try {
    const { classId, recordingDuration } = req.body;

    if (!classId) {
      return res.status(400).json({ message: 'Class ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No recording file provided' });
    }

    // Verify the user is the instructor of this class
    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    if (liveClass.instructor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only instructor can upload recordings' });
    }

    // Upload to Cloudinary
    const fileName = `${classId}-${Date.now()}`;
    const uploadResult = await uploadVideoRecording(
      req.file.buffer,
      fileName,
      `lms/recordings/${classId}`
    );

    // Add recording to the class
    const recordingData = {
      cloudinaryPublicId: uploadResult.publicId,
      cloudinaryUrl: uploadResult.url,
      recordingDuration: recordingDuration || uploadResult.duration,
      recordedBy: req.user.userId,
      fileSize: uploadResult.fileSize,
      fileName: req.file.originalname
    };

    liveClass.recordings.push(recordingData);
    await liveClass.save();

    res.status(201).json({
      message: 'Recording uploaded successfully',
      recording: recordingData,
      liveClass
    });
  } catch (error) {
    console.error('Error uploading recording:', error);
    res.status(500).json({
      message: error.message || 'Error uploading recording'
    });
  }
};

// Get all recordings for a class
exports.getClassRecordings = async (req, res) => {
  try {
    const { classId } = req.params;

    const liveClass = await LiveClass.findById(classId)
      .populate('recordings.recordedBy', 'name email');

    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    res.json({
      classId: liveClass._id,
      title: liveClass.title,
      instructor: liveClass.instructor,
      recordings: liveClass.recordings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a recording from Cloudinary and database
exports.deleteRecording = async (req, res) => {
  try {
    const { classId, recordingId } = req.params;

    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Only instructor can delete recordings
    if (liveClass.instructor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only instructor can delete recordings' });
    }

    // Find the recording
    const recording = liveClass.recordings.find(r => r._id.toString() === recordingId);
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    // Delete from Cloudinary
    if (recording.cloudinaryPublicId) {
      await deleteVideoRecording(recording.cloudinaryPublicId);
    }

    // Remove from database
    liveClass.recordings = liveClass.recordings.filter(
      r => r._id.toString() !== recordingId
    );
    await liveClass.save();

    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    res.status(500).json({
      message: error.message || 'Error deleting recording'
    });
  }
};

// End a live class (teacher/admin only)
exports.endLiveClass = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is teacher or admin
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only teachers and admins can end classes' });
    }

    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Verify user is the instructor (unless admin)
    if (req.user.role === 'teacher' && liveClass.instructor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only the instructor can end this class' });
    }

    // Update status to completed
    liveClass.status = 'completed';
    await liveClass.save();

    res.json({ 
      message: 'Live class ended successfully',
      liveClass 
    });
  } catch (error) {
    console.error('Error ending live class:', error);
    res.status(500).json({
      message: error.message || 'Error ending live class'
    });
  }
};

// Delete a live class (admin only)
exports.deleteLiveClass = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete classes' });
    }

    const liveClass = await LiveClass.findById(id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Delete all associated recordings from Cloudinary
    if (liveClass.recordings && liveClass.recordings.length > 0) {
      for (const recording of liveClass.recordings) {
        if (recording.cloudinaryPublicId) {
          try {
            await deleteVideoRecording(recording.cloudinaryPublicId);
          } catch (err) {
            console.error(`Failed to delete recording ${recording.cloudinaryPublicId}:`, err);
          }
        }
      }
    }

    // Delete the class from database
    await LiveClass.findByIdAndDelete(id);

    res.json({ message: 'Live class deleted successfully' });
  } catch (error) {
    console.error('Error deleting live class:', error);
    res.status(500).json({
      message: error.message || 'Error deleting live class'
    });
  }
};
