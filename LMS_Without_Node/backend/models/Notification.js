const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['live_class', 'material', 'doubt', 'exam'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String
  },
  targetRoles: [{
    type: String,
    enum: ['student', 'teacher', 'admin']
  }],
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);