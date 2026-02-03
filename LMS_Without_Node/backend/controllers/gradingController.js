const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const Progress = require('../models/Progress');

// Grade essay/short answer question
exports.gradeAnswer = async (req, res) => {
  try {
    const { attemptId, questionId, marks, comment } = req.body;
    const graderId = req.user.userId;

    const attempt = await ExamAttempt.findById(attemptId).populate('exam');
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Authorization: only exam instructor or admin can grade
    const exam = attempt.exam;
    if (exam.instructor.toString() !== graderId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Find the answer
    const answerIndex = attempt.answers.findIndex(a => a.questionId.toString() === questionId);
    if (answerIndex === -1) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    // Find or create feedback entry
    let feedbackIndex = attempt.feedback.findIndex(f => f.questionId.toString() === questionId);
    if (feedbackIndex === -1) {
      attempt.feedback.push({
        questionId,
        marks: 0,
        comment: ''
      });
      feedbackIndex = attempt.feedback.length - 1;
    }

    attempt.feedback[feedbackIndex].marks = marks;
    attempt.feedback[feedbackIndex].comment = comment || '';

    // Save and recalculate total score
    await attempt.save();

    // Recalculate total score
    const totalScore = (attempt.autoGradedScore || 0) + (attempt.manualGradedScore || 0);
    const exam_data = await Exam.findById(attempt.exam);
    const isPassed = totalScore >= exam_data.passingMarks;

    res.json({
      message: 'Answer graded',
      totalScore,
      isPassed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit all grades and finalize scoring
exports.submitGrades = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const graderId = req.user.userId;

    const attempt = await ExamAttempt.findById(attemptId).populate('exam');
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.exam.instructor.toString() !== graderId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (attempt.status !== 'submitted') {
      return res.status(400).json({ message: 'Can only grade submitted attempts' });
    }

    // Calculate manual graded score from feedback
    const manualGradedScore = attempt.feedback.reduce((sum, f) => sum + (f.marks || 0), 0);

    // Update attempt
    attempt.manualGradedScore = manualGradedScore;
    attempt.totalScore = (attempt.autoGradedScore || 0) + manualGradedScore;
    attempt.percentage = ((attempt.totalScore / attempt.exam.totalMarks) * 100).toFixed(2);
    attempt.isPassed = attempt.totalScore >= attempt.exam.passingMarks;
    attempt.status = 'graded';
    attempt.gradedBy = graderId;
    attempt.gradedAt = new Date();

    await attempt.save();

    // Update progress
    await Progress.findOneAndUpdate(
      {
        student: attempt.student,
        course: attempt.exam.course
      },
      {
        $set: {
          'examScores.$[elem].manualGradedScore': manualGradedScore,
          'examScores.$[elem].totalScore': attempt.totalScore,
          'examScores.$[elem].percentage': attempt.percentage,
          'examScores.$[elem].isPassed': attempt.isPassed,
          'examScores.$[elem].gradedAt': attempt.gradedAt
        }
      },
      {
        arrayFilters: [{ 'elem.examId': attempt.exam._id }],
        new: true
      }
    );

    res.json({
      message: 'Grades submitted successfully',
      totalScore: attempt.totalScore,
      percentage: attempt.percentage,
      isPassed: attempt.isPassed
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Release results to students
exports.releaseResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.userId;

    const exam = await Exam.findById(examId).populate('instructor');

    if (exam.instructor._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Set result release date to now (immediate release)
    exam.resultReleaseDate = new Date();
    await exam.save();

    // Update all associated attempts' result release status
    const attempts = await ExamAttempt.updateMany(
      { exam: examId },
      { resultReleasedAt: new Date() }
    );

    res.json({
      message: 'Results released to students',
      updatedAttempts: attempts.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exam statistics for teacher analytics
exports.getExamStatistics = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.userId;

    const exam = await Exam.findById(examId).populate('instructor');

    if (exam.instructor._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const attempts = await ExamAttempt.find({ exam: examId, status: 'graded' });

    if (attempts.length === 0) {
      return res.json({
        totalAttempts: 0,
        averageScore: 0,
        passPercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        scoreDistribution: {}
      });
    }

    // Calculate statistics
    const scores = attempts.map(a => a.totalScore);
    const passed = attempts.filter(a => a.isPassed).length;

    const stats = {
      totalAttempts: attempts.length,
      averageScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
      passPercentage: ((passed / attempts.length) * 100).toFixed(2),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      medianScore: scores.length % 2 === 0 
        ? ((scores[Math.floor(scores.length / 2) - 1] + scores[Math.floor(scores.length / 2)]) / 2).toFixed(2)
        : scores[Math.floor(scores.length / 2)],
      scoreDistribution: {
        excellent: attempts.filter(a => a.percentage >= 90).length,
        good: attempts.filter(a => a.percentage >= 80 && a.percentage < 90).length,
        average: attempts.filter(a => a.percentage >= 70 && a.percentage < 80).length,
        belowAverage: attempts.filter(a => a.percentage >= 60 && a.percentage < 70).length,
        poor: attempts.filter(a => a.percentage < 60).length
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get question-wise statistics
exports.getQuestionStatistics = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user.userId;

    const exam = await Exam.findById(examId)
      .populate('instructor')
      .populate('questions');

    if (exam.instructor._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const attempts = await ExamAttempt.find({ exam: examId, status: 'graded' });

    const questionStats = exam.questions.map(question => {
      const questionAttempts = attempts.filter(a => 
        a.answers.some(ans => ans.questionId.toString() === question._id.toString())
      );

      const correct = questionAttempts.filter(a => {
        const ans = a.answers.find(x => x.questionId.toString() === question._id.toString());
        return ans && ans.answer === question.correctAnswer;
      }).length;

      return {
        questionId: question._id,
        questionText: question.questionText,
        type: question.type,
        difficulty: question.difficulty,
        totalAttempts: questionAttempts.length,
        correctAnswers: correct,
        incorrectAnswers: questionAttempts.length - correct,
        successRate: ((correct / questionAttempts.length) * 100).toFixed(2),
        averageTimeSpent: (
          questionAttempts.reduce((sum, a) => {
            const ans = a.answers.find(x => x.questionId.toString() === question._id.toString());
            return sum + (ans?.timeSpent || 0);
          }, 0) / questionAttempts.length
        ).toFixed(0)
      };
    });

    res.json(questionStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
