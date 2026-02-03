const Question = require('../models/Question');
const Course = require('../models/Course');

// Create a new question
exports.createQuestion = async (req, res) => {
  try {
    const { questionText, type, course, topic, difficulty, marks, options, correctAnswer, explanation, imageUrl } = req.body;

    // Validate required fields
    if (!questionText || !type || !course || !topic || !correctAnswer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const question = new Question({
      questionText,
      type,
      course,
      topic,
      difficulty: difficulty || 'medium',
      marks: marks || 1,
      options: options || [],
      correctAnswer,
      explanation: explanation || '',
      imageUrl: imageUrl || '',
      createdBy: req.user.userId
    });

    await question.save();
    await question.populate('course', 'title');

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all questions for a course (with filters)
exports.getQuestions = async (req, res) => {
  try {
    const { course, topic, difficulty, type } = req.query;
    const filter = {};

    if (course) filter.course = course;
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;

    const questions = await Question.find(filter)
      .populate('course', 'title')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single question
exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('course', 'title')
      .populate('createdBy', 'name email');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update question
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, type, topic, difficulty, marks, options, correctAnswer, explanation, imageUrl } = req.body;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Only creator or admin can update
    if (question.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    Object.assign(question, {
      questionText,
      type,
      topic,
      difficulty,
      marks,
      options,
      correctAnswer,
      explanation,
      imageUrl,
      updatedAt: Date.now()
    });

    await question.save();
    await question.populate('course', 'title');
    await question.populate('createdBy', 'name email');

    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete question
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Only creator or admin can delete
    if (question.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Question.findByIdAndDelete(id);

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get question bank for a course (for exam creation)
exports.getQuestionBank = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { topic, difficulty } = req.query;

    const filter = { course: courseId };
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.find(filter)
      .select('_id questionText type topic difficulty marks')
      .sort({ topic: 1, difficulty: 1 });

    // Group by topic
    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.topic]) {
        grouped[q.topic] = [];
      }
      grouped[q.topic].push(q);
    });

    res.json({
      total: questions.length,
      byTopic: grouped,
      questions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get topics for a course
exports.getTopics = async (req, res) => {
  try {
    const { courseId } = req.params;

    const topics = await Question.distinct('topic', { course: courseId });

    res.json({ topics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
