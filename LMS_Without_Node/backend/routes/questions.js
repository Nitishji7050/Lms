const express = require('express');
const router = express.Router();
const {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionBank,
  getTopics
} = require('../controllers/questionController');
const { auth, authorize } = require('../middleware/auth');

// Question management routes
router.post('/', auth, authorize('teacher', 'admin'), createQuestion);
router.get('/', auth, getQuestions);
router.get('/:id', auth, getQuestion);
router.put('/:id', auth, authorize('teacher', 'admin'), updateQuestion);
router.delete('/:id', auth, authorize('teacher', 'admin'), deleteQuestion);

// Question bank for exam creation
router.get('/bank/:courseId', auth, authorize('teacher', 'admin'), getQuestionBank);
router.get('/topics/:courseId', auth, authorize('teacher', 'admin'), getTopics);

module.exports = router;
