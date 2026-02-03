const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createLiveClass,
  getLiveClasses,
  getLiveClass,
  updateLiveClass,
  joinLiveClass,
  removeParticipant,
  uploadRecording,
  getClassRecordings,
  deleteRecording,
  endLiveClass,
  deleteLiveClass
} = require('../controllers/classController');
const { auth, authorize } = require('../middleware/auth');

// Multer config for video uploads (max 500MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

router.post('/', auth, authorize('teacher', 'admin'), createLiveClass);
router.get('/', auth, getLiveClasses);
router.get('/:id', auth, getLiveClass);
router.put('/:id', auth, authorize('teacher', 'admin'), updateLiveClass);
router.post('/:id/end', auth, authorize('teacher', 'admin'), endLiveClass);
router.delete('/:id', auth, authorize('admin'), deleteLiveClass);
router.post('/:id/join', auth, joinLiveClass);
router.delete('/:id/participant/:participantId', auth, authorize('teacher', 'admin'), removeParticipant);

// Recording routes
router.post('/:classId/recording/upload', auth, authorize('teacher', 'admin'), upload.single('recording'), uploadRecording);
router.get('/:classId/recordings', auth, getClassRecordings);
router.delete('/:classId/recording/:recordingId', auth, authorize('teacher', 'admin'), deleteRecording);

module.exports = router;
