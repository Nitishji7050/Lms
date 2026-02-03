const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  attachments: [String],
  isPrivate: {
    type: Boolean,
    default: false
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentEmail: {
    type: String
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  // Threaded messages / replies
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    attachments: [String],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['open', 'answered', 'resolved', 'closed'],
    default: 'open'
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pinned: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Doubt', doubtSchema);
