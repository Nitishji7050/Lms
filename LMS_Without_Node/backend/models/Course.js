const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  thumbnail: {
    type: String,
    default: ''
  },
  videos: [{
    title: String,
    description: String,
    videoUrl: String,
    duration: Number,
    order: Number
  }],
  materials: [{
    title: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublished: {
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

module.exports = mongoose.model('Course', courseSchema);
