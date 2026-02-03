const express = require('express');
const router = express.Router();
const {
  chatWithAI,
  generateTestFromPDF
} = require('../controllers/aiController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/chat', auth, chatWithAI);
router.post('/pdf-test', auth, generateTestFromPDF);

module.exports = router;
