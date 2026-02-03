const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  videosWatched: [{
    videoId: mongoose.Schema.Types.ObjectId,
    watchedAt: Date,
    progress: Number // percentage watched
  }],
  examScores: [{
    examId: mongoose.Schema.Types.ObjectId,
    score: Number,
    maxScore: Number,
    attemptedAt: Date
  }],
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

module.exports = mongoose.model('Progress', progressSchema);
