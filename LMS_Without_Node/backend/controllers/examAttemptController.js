const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Progress = require('../models/Progress');

// Start exam attempt
exports.startAttempt = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.userId;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const now = new Date();

    // Check if exam is available
    if (now < new Date(exam.startDate)) {
      return res.status(400).json({ message: 'Exam has not started yet' });
    }

    if (now > new Date(exam.endDate)) {
      return res.status(400).json({ message: 'Exam has ended' });
    }

    // Check attempt limit
    const attemptCount = await ExamAttempt.countDocuments({
      exam: examId,
      student: studentId,
      status: { $in: ['in-progress', 'submitted', 'graded'] }
    });

    if (attemptCount >= exam.maxAttempts) {
      return res.status(400).json({ message: 'Maximum attempts exceeded' });
    }

    // Create new attempt
    const attempt = new ExamAttempt({
      exam: examId,
      student: studentId,
      startedAt: now,
      status: 'in-progress',
      answers: exam.questions.map(qId => ({
        questionId: qId,
        answer: null,
        markedForReview: false,
        timeSpent: 0,
        isAnswered: false
      }))
    });

    await attempt.save();
    await attempt.populate('exam');

    res.status(201).json({
      message: 'Exam attempt started',
      attemptId: attempt._id,
      exam: attempt.exam
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Save answer (auto-save)
exports.saveAnswer = async (req, res) => {
  try {
    const { attemptId, questionId, answer, timeSpent } = req.body;
    const studentId = req.user.userId;

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Authorization
    if (attempt.student.toString() !== studentId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Check if exam is still in progress
    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Exam already submitted' });
    }

    // Find and update answer
    const answerIndex = attempt.answers.findIndex(a => a.questionId.toString() === questionId);
    if (answerIndex === -1) {
      return res.status(404).json({ message: 'Question not found in attempt' });
    }

    attempt.answers[answerIndex].answer = answer;
    attempt.answers[answerIndex].timeSpent = timeSpent || 0;
    attempt.answers[answerIndex].isAnswered = true;

    await attempt.save();

    res.json({
      message: 'Answer saved',
      answerIndex
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark question for review
exports.markForReview = async (req, res) => {
  try {
    const { attemptId, questionId, markedForReview } = req.body;
    const studentId = req.user.userId;

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== studentId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const answerIndex = attempt.answers.findIndex(a => a.questionId.toString() === questionId);
    if (answerIndex === -1) {
      return res.status(404).json({ message: 'Question not found' });
    }

    attempt.answers[answerIndex].markedForReview = markedForReview;
    await attempt.save();

    res.json({ message: 'Question marked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit exam
exports.submitAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user.userId;

    const attempt = await ExamAttempt.findById(attemptId).populate('exam').populate('answers.questionId');
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== studentId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Attempt already submitted' });
    }

    const exam = attempt.exam;

    // Auto-grade MCQ and True/False questions
    let autoGradedScore = 0;
    let totalAutoGradableMarks = 0;

    attempt.answers.forEach(answer => {
      const question = answer.questionId;

      // Auto-grade MCQ and True/False
      if (question.type === 'mcq' || question.type === 'true-false') {
        totalAutoGradableMarks += question.marks;

        // Check if answer is correct
        if (answer.answer && answer.answer === question.correctAnswer) {
          autoGradedScore += question.marks;
        } else if (exam.negativeMarking && answer.isAnswered) {
          // Apply negative marking
          autoGradedScore -= (question.marks * exam.negativeMarkingValue);
        }
      } else {
        totalAutoGradableMarks += question.marks;
      }
    });

    // Ensure score doesn't go below 0
    autoGradedScore = Math.max(0, autoGradedScore);

    // Update attempt
    attempt.submittedAt = new Date();
    attempt.status = 'submitted';
    attempt.autoGradedScore = autoGradedScore;
    attempt.totalScore = autoGradedScore; // Will be updated when essays are graded

    await attempt.save();

    // Create progress record
    await Progress.findOneAndUpdate(
      { student: studentId, course: exam.course },
      {
        $push: {
          examScores: {
            examId: exam._id,
            score: autoGradedScore,
            maxScore: totalAutoGradableMarks,
            attemptedAt: new Date()
          }
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      message: 'Exam submitted successfully',
      autoGradedScore,
      totalAutoGradableMarks,
      isPassed: autoGradedScore >= exam.passingMarks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get student's attempt
exports.getAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`[Attempt View] User: ${userId}, Role: ${userRole}, AttemptId: ${attemptId}`);

    const attempt = await ExamAttempt.findById(attemptId)
      .populate('exam')
      .populate('student', 'name email')
      .populate('answers.questionId')
      .populate('gradedBy', 'name email');

    if (!attempt) {
      console.log(`[Attempt View] Attempt not found`);
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Strict authorization check
    const isOwnAttempt = attempt.student._id.toString() === userId;
    const isTeacher = userRole === 'teacher' || userRole === 'admin';

    console.log(`[Attempt View] IsOwnAttempt: ${isOwnAttempt}, IsTeacher: ${isTeacher}`);
    console.log(`[Attempt View] Attempt Student ID: ${attempt.student._id}, Token User ID: ${userId}`);

    // Only allow: student viewing their own attempt, or teacher/admin viewing any attempt
    if (!isOwnAttempt && !isTeacher) {
      console.log(`[Attempt View] UNAUTHORIZED - Different student trying to view attempt`);
      return res.status(403).json({ message: 'Unauthorized - Cannot view other student\'s attempt' });
    }

    const exam = attempt.exam;

    // Check if student can see results
    const now = new Date();
    const resultReleased = !exam.resultReleaseDate || now >= new Date(exam.resultReleaseDate);

    if (!resultReleased && isOwnAttempt) {
      console.log(`[Attempt View] Results not yet released`);
      return res.status(400).json({ message: 'Results not yet released' });
    }

    // Compute question-level correctness and accuracy
    const totalQuestions = exam.totalQuestions || attempt.answers.length || 0;
    let correctCount = 0;

    const normalize = (v) => JSON.stringify(v === undefined ? null : v);

    attempt.answers.forEach(ans => {
      const q = ans.questionId;
      if (q && q.correctAnswer !== undefined && q.correctAnswer !== null) {
        try {
          if (normalize(ans.answer) === normalize(q.correctAnswer)) {
            correctCount += 1;
          }
        } catch (e) {
          // ignore comparison errors
        }
      }
    });

    const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Prepare response based on exam settings and status
    const response = {
      _id: attempt._id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      // Provided scores
      totalScore: attempt.totalScore,
      autoGradedScore: attempt.autoGradedScore,
      manualGradedScore: attempt.manualGradedScore,
      // Compute obtainedMarks (fallback to sum of auto + manual)
      obtainedMarks: typeof attempt.totalScore === 'number' ? attempt.totalScore : ((attempt.autoGradedScore || 0) + (attempt.manualGradedScore || 0)),
      // Include percentage and pass status
      percentage: attempt.percentage,
      isPassed: attempt.isPassed,
      // Include student info
      student: attempt.student ? { _id: attempt.student._id, name: attempt.student.name, email: attempt.student.email } : null,
      // Include exam max score
      maxScore: exam.totalMarks,
      // Include exam pass mark
      passingMarks: exam.passingMarks,
      // Negative marking info
      negativeMarking: exam.negativeMarking,
      negativeMarkingValue: exam.negativeMarkingValue,
      // Accuracy metrics
      accuracyPercent,
      correctCount,
      totalQuestions,
      answers: attempt.answers.map(ans => {
        const q = ans.questionId;
        return {
          questionId: q._id,
          questionText: q.questionText,
          type: q.type,
          marks: q.marks,
          studentAnswer: ans.answer,
          timeSpent: ans.timeSpent,
          markedForReview: ans.markedForReview,
          ...(exam.showCorrectAnswers || attempt.status === 'graded' ? { correctAnswer: q.correctAnswer } : {}),
          ...(exam.showExplanation || attempt.status === 'graded' ? { explanation: q.explanation } : {})
        };
      })
    };

    // Add grading info if graded
    if (attempt.status === 'graded') {
      response.feedback = attempt.feedback;
      response.gradedBy = attempt.gradedBy;
      response.gradedAt = attempt.gradedAt;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all attempts for a student in an exam (for teacher grading)
exports.getExamAttempts = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log(`[Attempt Access] User: ${userId}, Role: ${userRole}, ExamId: ${examId}`);

    const exam = await Exam.findById(examId).populate('instructor');

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is instructor or admin - they can see all attempts
    const isInstructor = exam.instructor._id.toString() === userId;
    const isAdmin = userRole === 'admin';

    if (isInstructor || isAdmin) {
      console.log(`[Attempt Access] Instructor/Admin accessing all attempts`);
      const attempts = await ExamAttempt.find({ exam: examId })
        .populate('student', 'name email enrolledCourses')
        .populate('gradedBy', 'name email')
        .select('-answers')
        .sort({ submittedAt: -1 });

      return res.json(attempts);
    }

    // Student can only see their own attempts
    console.log(`[Attempt Access] Student accessing own attempts`);
    const attempts = await ExamAttempt.find({ 
      exam: examId,
      student: userId  // CRITICAL: Must match the userId from token
    })
      .populate('student', 'name email enrolledCourses')
      .populate('gradedBy', 'name email')
      .select('-answers')
      .sort({ submittedAt: -1 });

    console.log(`[Attempt Access] Found ${attempts.length} attempts for student ${userId}`);
    res.json(attempts);
  } catch (error) {
    console.error('getExamAttempts error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get pending grading (essays needing manual grading)
exports.getPendingGradings = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.userId;

    const exam = await Exam.findById(examId).populate('instructor');

    if (exam.instructor._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const attempts = await ExamAttempt.find({
      exam: examId,
      status: 'submitted'
    })
      .populate('student', 'name email')
      .populate('answers.questionId')
      .sort({ submittedAt: 1 });

    // Filter essays that need grading
    const pendingGradings = attempts.map(attempt => {
      const essayAnswers = attempt.answers.filter(ans => {
        const q = ans.questionId;
        return (q.type === 'essay' || q.type === 'short-answer') && ans.isAnswered;
      });

      return {
        attemptId: attempt._id,
        student: attempt.student,
        submittedAt: attempt.submittedAt,
        essayAnswers: essayAnswers.map(ans => ({
          questionId: ans.questionId._id,
          questionText: ans.questionId.questionText,
          studentAnswer: ans.answer,
          marks: ans.questionId.marks,
          type: ans.questionId.type
        }))
      };
    }).filter(p => p.essayAnswers.length > 0);

    res.json(pendingGradings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
