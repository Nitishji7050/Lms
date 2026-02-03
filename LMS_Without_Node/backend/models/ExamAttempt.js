const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    required: true
  },
  submittedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'graded', 'evaluated'],
    default: 'in-progress'
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      default: null
      // Can be: string, number, array, boolean, or null
    },
    markedForReview: {
      type: Boolean,
      default: false
    },
    timeSpent: {
      type: Number,
      default: 0
      // In seconds
    },
    isAnswered: {
      type: Boolean,
      default: false
    }
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  suspiciousFlags: [{
    type: {
      type: String,
      enum: ['tab-switch', 'copy-paste', 'window-blur', 'multiple-faces'],
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    },
    details: String
  }],
  susiciousScore: {
    type: Number,
    default: 0
    // 0-100, higher means more suspicious
  },
  autoGradedScore: {
    type: Number,
    default: 0
    // Score from auto-graded questions (MCQ, True/False, etc)
  },
  manualGradedScore: {
    type: Number,
    default: 0
    // Score from manually graded questions (Essays)
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  gradedAt: {
    type: Date,
    default: null
  },
  feedback: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    comment: String,
    marks: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for quick lookups
examAttemptSchema.index({ exam: 1, student: 1 });
examAttemptSchema.index({ status: 1 });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
