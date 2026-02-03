import React, { useEffect, useState } from 'react';
import Modal from '@mui/material/Modal';
// ...existing code...
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import ReactPlayer from 'react-player';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [openVideoModal, setOpenVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const { user } = useAuth();
  // Helper to get JWT token
  const getToken = () => localStorage.getItem('token');

  // Watch video handler
  const handleWatchVideo = async (material) => {
    try {
      const res = await axios.get(`${API_URL}/api/courses/${course._id}/material/${material._id}/view`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      setVideoUrl(url);
      setOpenVideoModal(true);
    } catch (error) {
      alert('Unable to stream video.');
    }
  };

  // Download PDF handler
  const handleDownloadPDF = async (material) => {
    try {
      const res = await axios.get(`${API_URL}/api/courses/${course._id}/material/${material._id}/view`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', material.title);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      alert('Unable to download PDF.');
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/courses/${id}`);
      setCourse(response.data);
      if (response.data.videos && response.data.videos.length > 0) {
        setSelectedVideo(response.data.videos[0]);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };

  if (!course) return <div>Loading...</div>;

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h4" gutterBottom>
                {course.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {course.description}
              </Typography>
              {selectedVideo && (
                <Box sx={{ mt: 3 }}>
                  <ReactPlayer
                    url={selectedVideo.videoUrl}
                    controls
                    width="100%"
                    height="400px"
                  />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    {selectedVideo.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedVideo.description}
                  </Typography>
                </Box>
              )}
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Course Materials
              </Typography>
              <List>
                {course.materials.map((material, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={material.title}
                      secondary={material.fileType}
                    />
                    {material.fileType === 'video' ? (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleWatchVideo(material)}
                      >
                        Watch
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        onClick={() => handleDownloadPDF(material)}
                      >
                        Download
                      </Button>
                    )}
                        {/* Video Modal */}
                        <Modal open={openVideoModal} onClose={() => setOpenVideoModal(false)}>
                          <Box
                            sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', boxShadow: 24, p: 2 }}
                            onContextMenu={e => e.preventDefault()}
                          >
                            <ReactPlayer
                              url={videoUrl}
                              controls
                              playing
                              width="100%"
                              height="400px"
                              config={{ file: { attributes: { controlsList: 'nodownload' } } }}
                            />
                          </Box>
                        </Modal>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Course Videos
                </Typography>
                <List>
                  {course.videos.map((video, index) => (
                    <ListItem
                      key={index}
                      button
                      selected={selectedVideo === video}
                      onClick={() => setSelectedVideo(video)}
                    >
                      <ListItemText
                        primary={video.title}
                        secondary={`${Math.floor(video.duration / 60)} min`}
                      />
                    </ListItem>
                  ))}
                </List>
                {user && user.enrolledCourses && user.enrolledCourses.includes(course._id) ? (
                  <Button fullWidth variant="contained" sx={{ mt: 2 }} disabled>
                    Enrolled
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2 }}
                    onClick={async () => {
                      try {
                        await axios.post(`http://localhost:5000/api/courses/${id}/enroll`);
                        alert('Enrolled successfully!');
                        // Optionally refresh user info
                        window.location.reload();
                      } catch (error) {
                        alert(error.response?.data?.message || 'Enrollment failed');
                      }
                    }}
                  >
                    Enroll Now - ${course.price}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default CourseDetail;
