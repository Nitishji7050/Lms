const Notification = require('../models/Notification');

// Get notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    // Fetch notifications for user or their role, unread first
    const notifications = await Notification.find({
      $or: [
        { targetUsers: userId },
        { targetRoles: role }
      ]
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;
    await Notification.findByIdAndUpdate(notificationId, {
      $addToSet: { readBy: userId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

// (Optional) Create notification manually
exports.createNotification = async (req, res) => {
  try {
    const { type, message, link, targetRoles, targetUsers } = req.body;
    const notification = new Notification({
      type,
      message,
      link,
      targetRoles,
      targetUsers
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
};
