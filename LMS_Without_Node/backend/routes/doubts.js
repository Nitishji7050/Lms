const express = require('express');
const router = express.Router();
const {
  createDoubt,
  getDoubts,
  getDoubt,
  sendMessage,
  resolveDoubt,
  upvoteDoubt,
  changeStatus,
  pinDoubt,
  deleteDoubt
} = require('../controllers/doubtController');
const { auth, authorize } = require('../middleware/auth');

// Create & list
router.post('/', auth, authorize('student'), createDoubt);
router.get('/', auth, getDoubts);
router.get('/:id', auth, getDoubt);

// Threaded messages
router.post('/:id/message', auth, sendMessage);

// Upvote
router.post('/:id/upvote', auth, upvoteDoubt);

// Status change
router.patch('/:id/status', auth, changeStatus);

// Pin/unpin (teacher)
router.patch('/:id/pin', auth, authorize('teacher'), pinDoubt);

// Soft delete
router.delete('/:id', auth, deleteDoubt);

module.exports = router;
