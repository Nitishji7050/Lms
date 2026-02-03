// Remove a material from a course
exports.removeMaterial = async (req, res) => {
  try {
    const courseId = req.params.id;
    const materialId = req.params.materialId;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const material = course.materials.find(mat => mat._id.toString() === materialId);
    if (material && material.fileUrl) {
      // Try to extract public_id from fileUrl more robustly
      // Example Cloudinary URL: https://res.cloudinary.com/<cloud>/.../lms_materials/filename.pdf
      try {
        const url = material.fileUrl.split('?')[0]; // remove query params
        const parts = url.split('/');
        const lastSegment = parts[parts.length - 1] || '';
        // strip extension if present
        const fileName = lastSegment.replace(/\.[^/.]+$/, '');
        let publicId = `lms_materials/${fileName}`;

        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });

        // Choose resource_type: video for video files, otherwise use 'raw' for PDFs/documents
        const resourceType = material.fileType === 'video' ? 'video' : 'raw';

        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        } catch (cloudErr) {
          // Log but do not abort the removal from DB
          console.error(`Cloudinary deletion failed for ${publicId}:`, cloudErr);
        }
      } catch (err) {
        console.error('Failed to parse Cloudinary public id from fileUrl:', err);
      }
    }
    course.materials = course.materials.filter(mat => mat._id.toString() !== materialId);
    await course.save();
    res.json({ message: 'Material removed', materials: course.materials });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const Course = require('../models/Course');
const User = require('../models/User');
const Progress = require('../models/Progress');
const Notification = require('../models/Notification');

exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create({
      ...req.body,
      instructor: req.user.userId,
      isPublished: true
    });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email profile')
      .populate('enrolledStudents', 'name email');
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    // Detect material additions via $push or direct materials array
    const pushMaterials = req.body && req.body.$push && req.body.$push.materials;
    const directMaterials = req.body && req.body.materials && Array.isArray(req.body.materials) ? req.body.materials : null;

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('enrolledStudents', 'name');

    // If materials were added, create notifications for students
    try {
      let newTitles = [];
      if (pushMaterials) {
        if (Array.isArray(pushMaterials)) {
          newTitles = pushMaterials.map(m => m.title).filter(Boolean);
        } else if (typeof pushMaterials === 'object') {
          newTitles = [pushMaterials.title].filter(Boolean);
        }
      } else if (directMaterials) {
        // If direct materials array provided, we can't easily know which are new. We'll notify for all materials in request.
        newTitles = directMaterials.map(m => m.title).filter(Boolean);
      }

      if (newTitles.length > 0 && course) {
        const teacher = await User.findById(req.user.userId).select('name');
        const message = `${teacher?.name || 'Instructor'} uploaded new material${newTitles.length > 1 ? 's' : ''} to ${course.title}: ${newTitles.join(', ')}`;
        const link = `/courses/${course._id}`;

        const notif = new Notification({
          type: 'material',
          message,
          link
        });

        if (course.enrolledStudents && course.enrolledStudents.length > 0) {
          notif.targetUsers = course.enrolledStudents.map(s => s._id);
        } else {
          notif.targetRoles = ['student'];
        }

        const saved = await notif.save();
        const { io } = require('../server');
        io.emit('notification-created', saved);
      }
    } catch (notifErr) {
      console.error('Failed to create material notification:', notifErr);
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(req.user.userId);
    if (user.enrolledCourses.includes(course._id)) {
      return res.status(400).json({ message: 'Already enrolled' });
    }

    user.enrolledCourses.push(course._id);
    course.enrolledStudents.push(user._id);
    
    await user.save();
    await course.save();

    // Create progress tracking
    await Progress.create({
      student: user._id,
      course: course._id
    });

    res.json({ message: 'Enrolled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (req.user.role === 'teacher') {
      const courses = await Course.find({ instructor: req.user.userId })
        .populate('enrolledStudents', 'name email');
      return res.json(courses);
    }

    const courses = await Course.find({ _id: { $in: user.enrolledCourses } })
      .populate('instructor', 'name email');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
