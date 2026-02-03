const express = require('express');
const router = express.Router();
const { getUserProfile, updateProfile, getProgress, getAllUsers, getStudents, getTeachers, getAdmins, deleteUser, createTeacher, createAdmin } = require('../controllers/userController');
const { auth, authorize } = require('../middleware/auth');

router.get('/profile', auth, getUserProfile);
router.put('/profile', auth, updateProfile);
router.get('/progress', auth, getProgress);
router.get('/all', auth, authorize('admin'), getAllUsers);
router.get('/students', auth, authorize('admin'), getStudents);
router.get('/teachers', auth, authorize('admin'), getTeachers);
router.get('/admins', auth, authorize('admin'), getAdmins);
router.delete('/:userId', auth, authorize('admin'), deleteUser);
router.post('/create-teacher', auth, authorize('admin'), createTeacher);
router.post('/create-admin', auth, authorize('admin'), createAdmin);

module.exports = router;
