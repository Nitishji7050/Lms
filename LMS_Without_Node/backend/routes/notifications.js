const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

// Get notifications for current user
router.get('/', auth, notificationController.getNotifications);

// Mark notification as read
router.patch('/:id/read', auth, notificationController.markAsRead);

// (Optional) Create notification manually
router.post('/', auth, notificationController.createNotification);

module.exports = router;
