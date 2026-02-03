const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  getMyCourses,
  removeMaterial
} = require('../controllers/courseController');
const { auth, authorize } = require('../middleware/auth');

// Protected route to stream/download material
router.get('/:id/material/:materialId/view', auth, async (req, res) => {
  try {
    const courseId = req.params.id;
    const materialId = req.params.materialId;
    const Course = require('../models/Course');
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const material = course.materials.find(mat => mat._id.toString() === materialId);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    // Optionally check if user is enrolled or has access
    // Stream or redirect to Cloudinary file
    if (material.fileType === 'video') {
      // For video, redirect to Cloudinary URL (can be improved to stream)
      return res.redirect(material.fileUrl);
    } else {
      // For PDF, download
      res.setHeader('Content-Disposition', `attachment; filename="${material.title}"`);
      require('axios')({ url: material.fileUrl, responseType: 'stream' })
        .then(response => response.data.pipe(res))
        .catch(() => res.status(500).json({ message: 'Error downloading file' }));
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post('/', auth, authorize('teacher', 'admin'), createCourse);
router.get('/', getCourses);
router.get('/my-courses', auth, getMyCourses);
router.get('/:id', getCourse);
router.put('/:id', auth, authorize('teacher', 'admin'), updateCourse);
router.delete('/:id', auth, authorize('teacher', 'admin'), deleteCourse);

// Remove material from course
router.delete('/:id/material/:materialId', auth, authorize('teacher', 'admin'), removeMaterial);
router.post('/:id/enroll', auth, enrollCourse);

module.exports = router;
