const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  meetingLink: String,
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  recordings: [{
    cloudinaryPublicId: String,
    cloudinaryUrl: String,
    recordingDuration: Number, // in seconds
    recordedAt: {
      type: Date,
      default: Date.now
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fileSize: Number, // in bytes
    fileName: String
  }],
  recordingUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LiveClass', liveClassSchema);
