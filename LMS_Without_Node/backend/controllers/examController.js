const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const Course = require('../models/Course');
const User = require('../models/User');

// Create exam
exports.createExam = async (req, res) => {
  try {
    const {
      title,
      description,
      course,
      duration,
      totalMarks,
      passingMarks,
      instructions,
      startDate,
      endDate,
      maxAttempts,
      randomizeQuestions,
      randomizeOptions,
      negativeMarking,
      negativeMarkingValue,
      lockdownMode,
      requireWebcam,
      requireProctoring,
      showResults,
      showCorrectAnswers,
      showExplanation,
      resultReleaseDate
    } = req.body;

    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const exam = new Exam({
      title,
      description,
      course,
      instructor: req.user.userId,
      duration,
      totalMarks: totalMarks || 100,
      passingMarks: passingMarks || 40,
      instructions: instructions || '',
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      maxAttempts: maxAttempts || 1,
      randomizeQuestions: randomizeQuestions || false,
      randomizeOptions: randomizeOptions || false,
      negativeMarking: negativeMarking || false,
      negativeMarkingValue: negativeMarkingValue || 0.25,
      lockdownMode: lockdownMode || false,
      requireWebcam: requireWebcam || false,
      requireProctoring: requireProctoring || false,
      showResults: showResults !== undefined ? showResults : true,
      showCorrectAnswers: showCorrectAnswers !== undefined ? showCorrectAnswers : false,
      showExplanation: showExplanation !== undefined ? showExplanation : false,
      resultReleaseDate: resultReleaseDate || null,
      status: 'draft',
      questions: [],
      submissions: []
    });

    await exam.save();
    await exam.populate('instructor', 'name email');

    res.status(201).json({
      message: 'Exam created successfully',
      exam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all exams for instructor
exports.getInstructorExams = async (req, res) => {
  try {
    const exams = await Exam.find({ instructor: req.user.userId })
      .populate('course', 'title')
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 });

    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get all exams
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('course', 'title')
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 });

    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exams for a course
exports.getCourseExams = async (req, res) => {
  try {
    const { courseId } = req.params;

    const exams = await Exam.find({
      course: courseId,
      status: { $in: ['published', 'scheduled', 'ongoing', 'completed'] }
    })
      .populate('instructor', 'name email')
      .populate('course', 'title')
      .sort({ startDate: 1 });

    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exam details with questions
exports.getExamDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findById(id)
      .populate('course', 'title')
      .populate('instructor', 'name email')
      .populate('questions');

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const now = new Date();
    let canSeeResults = exam.showResults;

    if (exam.resultReleaseDate && now < exam.resultReleaseDate) {
      canSeeResults = false;
    }

    res.json({
      exam,
      canSeeResults,
      examStarted: now >= new Date(exam.startDate),
      examEnded: now >= new Date(exam.endDate)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add questions to exam
exports.addQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionIds } = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (exam.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const questions = await Question.find({ _id: { $in: questionIds } });
    if (questions.length !== questionIds.length) {
      return res.status(404).json({ message: 'Some questions not found' });
    }

    const existingIds = exam.questions.map(q => q.toString());
    questionIds.forEach(qId => {
      if (!existingIds.includes(qId)) {
        exam.questions.push(qId);
      }
    });

    exam.totalQuestions = exam.questions.length;
    await exam.save();
    await exam.populate('questions');

    res.json({
      message: 'Questions added successfully',
      exam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove question from exam
exports.removeQuestion = async (req, res) => {
  try {
    const { id, questionId } = req.params;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (exam.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    exam.questions = exam.questions.filter(q => q.toString() !== questionId);
    exam.totalQuestions = exam.questions.length;
    await exam.save();

    res.json({
      message: 'Question removed successfully',
      exam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Publish exam
exports.publishExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (exam.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (exam.questions.length === 0) {
      return res.status(400).json({ message: 'Exam must have at least one question' });
    }

    exam.status = 'published';
    await exam.save();

    // Notify enrolled students about the published exam
    try {
      const courseDoc = await Course.findById(exam.course).select('title enrolledStudents');
      const teacher = await User.findById(req.user.userId).select('name');
      const message = `${teacher?.name || 'Instructor'} published a new exam${courseDoc ? ' for ' + courseDoc.title : ''}: ${exam.title}`;
      const link = `/exams/${exam._id}`;

      const notif = new (require('../models/Notification'))({
        type: 'exam',
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
    } catch (notifErr) {
      console.error('Failed to create notification for published exam:', notifErr);
    }

    res.json({
      message: 'Exam published successfully',
      exam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update exam details
exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (exam.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (exam.status !== 'draft') {
      return res.status(400).json({ message: 'Can only update draft exams' });
    }

    Object.assign(exam, updateData, { updatedAt: Date.now() });
    await exam.save();

    res.json({
      message: 'Exam updated successfully',
      exam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete exam
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (exam.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Exam.findByIdAndDelete(id);

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get student's available exams
exports.getAvailableExams = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const now = new Date();

    // Get enrolled courses
    const student = await User.findById(studentId).select('enrolledCourses');
    const enrolledCourses = student?.enrolledCourses || [];
    
    console.log('[Exam Access] Student:', studentId);
    console.log('[Exam Access] Enrolled Courses:', enrolledCourses);

    // Only show exams from enrolled courses
    if (enrolledCourses.length === 0) {
      console.log('[Exam Access] Student has no enrolled courses');
      return res.json([]);
    }

    const exams = await Exam.find({
      status: { $in: ['published', 'scheduled', 'ongoing'] },
      course: { $in: enrolledCourses }
    })
      .populate('course', 'title')
      .populate('instructor', 'name')
      .sort({ startDate: 1 });

    console.log('[Exam Access] Found exams:', exams.length);
    res.json(exams);
  } catch (error) {
    console.error('getAvailableExams error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get exam for taking (shuffle if needed, remove answers)
exports.getExamForTaking = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.userId;

    const exam = await Exam.findById(id).populate('questions');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const now = new Date();

    if (now < new Date(exam.startDate)) {
      return res.status(400).json({ message: 'Exam has not started yet' });
    }

    if (now > new Date(exam.endDate)) {
      return res.status(400).json({ message: 'Exam has ended' });
    }

    const attempts = await ExamAttempt.countDocuments({
      exam: id,
      student: studentId,
      status: { $ne: 'abandoned' }
    });

    if (attempts >= exam.maxAttempts) {
      return res.status(400).json({ message: 'Maximum attempts exceeded' });
    }

    let questions = JSON.parse(JSON.stringify(exam.questions));

    if (exam.randomizeQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    if (exam.randomizeOptions) {
      questions = questions.map(q => {
        if (q.type === 'mcq' && q.options && q.options.length > 0) {
          q.options = q.options.sort(() => Math.random() - 0.5);
        }
        return q;
      });
    }

    const examForStudent = {
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      instructions: exam.instructions,
      duration: exam.duration,
      totalQuestions: exam.totalQuestions,
      questions: questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        type: q.type,
        options: q.options,
        imageUrl: q.imageUrl,
        marks: q.marks
      })),
      lockdownMode: exam.lockdownMode,
      requireWebcam: exam.requireWebcam
    };

    res.json(examForStudent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
