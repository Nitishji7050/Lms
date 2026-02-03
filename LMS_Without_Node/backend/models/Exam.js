const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Enhanced question management
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  totalQuestions: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 100
  },
  passingMarks: {
    type: Number,
    required: true,
    default: 40
  },
  // Exam timing and scheduling
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    // in minutes
  },
  // Exam configuration
  maxAttempts: {
    type: Number,
    default: 1,
    min: 1
  },
  randomizeQuestions: {
    type: Boolean,
    default: true
  },
  randomizeOptions: {
    type: Boolean,
    default: true
  },
  negativeMarking: {
    type: Boolean,
    default: false
  },
  negativeMarkingValue: {
    type: Number,
    default: 0.25
    // Marks deducted for wrong answer
  },
  // Results and visibility
  showResults: {
    type: Boolean,
    default: true
  },
  showCorrectAnswers: {
    type: Boolean,
    default: true
  },
  showExplanation: {
    type: Boolean,
    default: true
  },
  resultReleaseDate: {
    type: Date,
    default: null
    // If set, results only shown after this date
  },
  // Security and proctoring
  lockdownMode: {
    type: Boolean,
    default: false
    // Prevent tab switching, copy-paste, etc
  },
  requireWebcam: {
    type: Boolean,
    default: false
  },
  requireProctoring: {
    type: Boolean,
    default: false
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled', 'ongoing', 'completed', 'archived'],
    default: 'draft'
  },
  // Instructions
  instructions: {
    type: String,
    default: ''
  },
  // Legacy submissions (for backward compatibility)
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    answers: [{
      questionId: mongoose.Schema.Types.ObjectId,
      selectedAnswer: mongoose.Schema.Types.Mixed
    }],
    score: Number,
    submittedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for quick lookups
examSchema.index({ course: 1 });
examSchema.index({ instructor: 1 });
examSchema.index({ status: 1 });
examSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Exam', examSchema);
