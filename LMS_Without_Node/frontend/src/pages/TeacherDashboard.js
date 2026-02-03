import React, { useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { DialogContentText } from '@mui/material';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TeacherDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);
  const [liveClassDialog, setLiveClassDialog] = useState(false);
  const [materialDialog, setMaterialDialog] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('pdf');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    category: '',
    price: 0
  });
  const [newLiveClass, setNewLiveClass] = useState({
    title: '',
    description: '',
    course: '',
    scheduledAt: '',
    duration: 60
  });
  const navigate = useNavigate();
  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await axios.delete(`${API_URL}/api/courses/${courseId}`);
      fetchCourses();
    } catch (error) {
      alert('Error deleting course');
    }
  };

  const handleOpenMaterialDialog = (courseId) => {
    setSelectedCourseId(courseId);
    setMaterialDialog(true);
  };

  const handleMaterialUpload = async () => {
    if (!uploadFile || !selectedCourseId) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', uploadFile);
    try {
      const res = await axios.post(`${API_URL}/api/upload/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        }
      });
      const fileUrl = res.data.url;
      // Add material to course
      await axios.put(`${API_URL}/api/courses/${selectedCourseId}`, {
        $push: {
          materials: {
            title: uploadFile.name,
            fileUrl,
            fileType: uploadType
          }
        }
      });
      setMaterialDialog(false);
      setUploadFile(null);
      setUploadType('pdf');
      fetchCourses();
    } catch (error) {
      alert('Error uploading material');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/courses/my-courses`);
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleCreateCourse = async () => {
    try {
      await axios.post(`${API_URL}/api/courses`, newCourse);
      setOpen(false);
      setNewCourse({ title: '', description: '', category: '', price: 0 });
      fetchCourses();
    } catch (error) {
      alert('Error creating course: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateLiveClass = async () => {
    try {
      if (!newLiveClass.title || !newLiveClass.scheduledAt || !newLiveClass.course) {
        alert('Please fill in all required fields (Title, Course, and Scheduled Date)');
        return;
      }
      const liveClassData = {
        title: newLiveClass.title,
        description: newLiveClass.description || '',
        course: newLiveClass.course,
        scheduledAt: newLiveClass.scheduledAt,
        duration: parseInt(newLiveClass.duration) || 60
      };
      const response = await axios.post(`${API_URL}/api/classes`, liveClassData);
      setLiveClassDialog(false);
      setNewLiveClass({ title: '', description: '', course: '', scheduledAt: '', duration: 60 });
      alert('Live class created successfully!');
      // Optionally refresh the page or navigate to live classes
      window.location.href = '/live-classes';
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert('Error creating live class: ' + errorMessage);
      console.error('Error creating live class:', error);
      if (error.response?.data?.error) {
        console.error('Error details:', error.response.data.error);
      }
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">
            Teacher Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => setLiveClassDialog(true)}>
              Create Live Class
            </Button>
            <Button variant="contained" onClick={() => setOpen(true)}>
              Create Course
            </Button>
          </Box>
        </Box>
        <Grid container spacing={3}>
          {courses.map((course) => (
            <Grid item xs={12} md={6} key={course._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {course.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {course.description}
                  </Typography>
                  <Typography variant="body2">
                    Enrolled Students: {course.enrolledStudents?.length || 0}
                  </Typography>
                  {/* List uploaded materials with delete button */}
                  {course.materials && course.materials.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Materials:</Typography>
                      {course.materials.map((mat) => (
                        <Box key={mat._id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            <a
                              href={`${API_URL}/api/courses/${course._id}/material/${mat._id}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {mat.title}
                            </a> ({mat.fileType})
                          </Typography>
                          <Button size="small" color="error" onClick={async () => {
                            if (window.confirm('Delete this material?')) {
                              await axios.delete(`${API_URL}/api/courses/${course._id}/material/${mat._id}`);
                              fetchCourses();
                            }
                          }}>Delete</Button>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => window.location.href = `/courses/${course._id}`}>View</Button>
                  <Button size="small" color="error" onClick={() => handleDeleteCourse(course._id)}>Delete</Button>
                  <Button size="small" color="primary" onClick={() => handleOpenMaterialDialog(course._id)}>Upload Material</Button>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/live-classes?course=${course._id}`)}>Recordings</Button>
                </CardActions>
                      {/* Material Upload Dialog */}
                      <Dialog open={materialDialog} onClose={() => setMaterialDialog(false)}>
                        <DialogTitle>Upload Material (PDF/Video)</DialogTitle>
                        <DialogContent>
                          <DialogContentText>Select a PDF or video file to upload to Cloudinary.</DialogContentText>
                          <TextField
                            select
                            label="Type"
                            value={uploadType}
                            onChange={e => setUploadType(e.target.value)}
                            SelectProps={{ native: true }}
                            fullWidth
                            margin="normal"
                          >
                            <option value="pdf">PDF</option>
                            <option value="video">Video</option>
                          </TextField>
                          <input
                            type="file"
                            accept={uploadType === 'pdf' ? 'application/pdf' : 'video/*'}
                            onChange={e => setUploadFile(e.target.files[0])}
                            style={{ marginTop: 16 }}
                          />
                        </DialogContent>
                        <DialogActions>
                          <Button onClick={() => setMaterialDialog(false)} disabled={uploading}>Cancel</Button>
                          <Button onClick={handleMaterialUpload} variant="contained" disabled={!uploadFile || uploading}>
                            {uploading ? (
                              <>
                                <CircularProgress size={24} color="inherit" />
                                <span style={{ marginLeft: 8 }}>{uploadProgress}%</span>
                              </>
                            ) : 'Upload'}
                          </Button>
                        </DialogActions>
                      </Dialog>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Create Live Class Dialog */}
        <Dialog open={liveClassDialog} onClose={() => setLiveClassDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Live Class</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Title *"
              value={newLiveClass.title}
              onChange={(e) => setNewLiveClass({ ...newLiveClass, title: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newLiveClass.description}
              onChange={(e) => setNewLiveClass({ ...newLiveClass, description: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Course *</InputLabel>
              <Select
                value={newLiveClass.course}
                onChange={(e) => setNewLiveClass({ ...newLiveClass, course: e.target.value })}
                label="Course *"
              >
                <MenuItem value="">-- Select Course --</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Scheduled Date & Time *"
              type="datetime-local"
              value={newLiveClass.scheduledAt}
              onChange={(e) => setNewLiveClass({ ...newLiveClass, scheduledAt: e.target.value })}
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
            <TextField
              fullWidth
              label="Duration (minutes)"
              type="number"
              value={newLiveClass.duration}
              onChange={(e) => setNewLiveClass({ ...newLiveClass, duration: parseInt(e.target.value) || 60 })}
              margin="normal"
              defaultValue={60}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLiveClassDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateLiveClass} variant="contained">
              Create Live Class
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Course Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Title"
              value={newCourse.title}
              onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newCourse.description}
              onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Category"
              value={newCourse.category}
              onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={newCourse.price}
              onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCourse} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default TeacherDashboard;
