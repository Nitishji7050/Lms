const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['mcq', 'true-false', 'short-answer', 'essay', 'matching'],
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  marks: {
    type: Number,
    required: true,
    default: 1,
    min: 0.5
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
    // For MCQ: index or array of indices
    // For True/False: boolean
    // For Short Answer: string
    // For Essay: null (requires manual grading)
    // For Matching: object with mappings
  },
  explanation: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Index for quick lookups
questionSchema.index({ course: 1, topic: 1 });
questionSchema.index({ difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);
