const express = require('express');
const router = express.Router();
const {
  createExam,
  getAllExams,
  getInstructorExams,
  getCourseExams,
  getExamDetails,
  addQuestions,
  removeQuestion,
  publishExam,
  updateExam,
  deleteExam,
  getAvailableExams,
  getExamForTaking
} = require('../controllers/examController');
const {
  startAttempt,
  saveAnswer,
  markForReview,
  submitAttempt,
  getAttempt,
  getExamAttempts,
  getPendingGradings
} = require('../controllers/examAttemptController');
const {
  gradeAnswer,
  submitGrades,
  releaseResults,
  getExamStatistics,
  getQuestionStatistics
} = require('../controllers/gradingController');
const { auth, authorize } = require('../middleware/auth');

// IMPORTANT: Place specific routes BEFORE parameterized routes to avoid matching conflicts
// Example: /available/list must come before /:id routes

// Student exam routes (specific paths first)
router.get('/available/list', auth, authorize('student', 'admin', 'teacher'), getAvailableExams);
router.get('/:examId/my-attempts', auth, authorize('student', 'admin', 'teacher'), getExamAttempts);

// Exam attempt routes (specific paths with /attempt and /exam prefixes)
router.post('/attempt/answer/save', auth, authorize('student', 'admin', 'teacher'), saveAnswer);
router.post('/attempt/answer/review', auth, authorize('student', 'admin', 'teacher'), markForReview);
router.post('/attempt/:attemptId/submit', auth, authorize('student', 'admin', 'teacher'), submitAttempt);
router.get('/attempt/:attemptId', auth, getAttempt);

// Grading routes (specific /attempt paths)
router.post('/attempt/grade/answer', auth, authorize('teacher', 'admin'), gradeAnswer);
router.post('/attempt/:attemptId/submit-grades', auth, authorize('teacher', 'admin'), submitGrades);

// Analytics routes (specific /exam paths)
router.get('/exam/:examId/statistics', auth, authorize('teacher', 'admin'), getExamStatistics);
router.get('/exam/:examId/question-statistics', auth, authorize('teacher', 'admin'), getQuestionStatistics);
router.get('/exam/:examId/attempts', auth, authorize('teacher', 'admin'), getExamAttempts);
router.get('/exam/:examId/pending-gradings', auth, authorize('teacher', 'admin'), getPendingGradings);

// Exam management routes (Teacher/Admin)
router.get('/', auth, authorize('admin'), getAllExams);
router.get('/instructor/all', auth, authorize('teacher', 'admin'), getInstructorExams);
router.post('/', auth, authorize('teacher', 'admin'), createExam);
router.get('/course/:courseId', auth, getCourseExams);
router.get('/details/:id', auth, getExamDetails);
router.post('/:id/questions', auth, authorize('teacher', 'admin'), addQuestions);
router.delete('/:id/questions/:questionId', auth, authorize('teacher', 'admin'), removeQuestion);
router.post('/:id/publish', auth, authorize('teacher', 'admin'), publishExam);
router.put('/:id', auth, authorize('teacher', 'admin'), updateExam);
router.delete('/:id', auth, authorize('teacher', 'admin'), deleteExam);

// Student exam taking route (must come after specific routes)
router.get('/:id/take', auth, authorize('student', 'admin', 'teacher'), getExamForTaking);

// Attempt start route (must come after specific routes)
router.post('/:examId/attempt/start', auth, authorize('student', 'admin', 'teacher'), startAttempt);

// Release results route (must come after specific routes)
router.post('/:examId/release-results', auth, authorize('teacher', 'admin'), releaseResults);

module.exports = router;
