const User = require('../models/User');
const Progress = require('../models/Progress');
const Course = require('../models/Course');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, profile } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, profile },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const progress = await Progress.find({ student: req.user.userId })
      .populate('course', 'title thumbnail')
      .populate('examScores.examId', 'title');
    
    const user = await User.findById(req.user.userId);
    
    res.json({
      progress,
      overallStats: {
        coursesEnrolled: user.enrolledCourses.length,
        coursesCompleted: user.progress?.coursesCompleted || 0,
        totalHours: user.progress?.totalHours || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getStudents = async (req, res) => {
  try {
    const { email } = req.query;
    let query = { role: 'student' };
    
    if (email) {
      query.email = { $regex: email, $options: 'i' }; // Case-insensitive search
    }
    
    const students = await User.find(query).select('-password');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const { email } = req.query;
    let query = { role: 'teacher' };
    
    if (email) {
      query.email = { $regex: email, $options: 'i' }; // Case-insensitive search
    }
    
    const teachers = await User.find(query).select('-password');
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Don't allow deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdmins = async (req, res) => {
  try {
    const { email } = req.query;
    let query = { role: 'admin' };
    
    if (email) {
      query.email = { $regex: email, $options: 'i' }; // Case-insensitive search
    }
    
    const admins = await User.find(query).select('-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Create new admin
    const admin = new User({
      name,
      email,
      password,
      role: 'admin'
    });
    
    await admin.save();
    
    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Create new teacher
    const teacher = new User({
      name,
      email,
      password,
      role: 'teacher'
    });
    
    await teacher.save();
    
    res.status(201).json({
      message: 'Teacher created successfully',
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        createdAt: teacher.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};