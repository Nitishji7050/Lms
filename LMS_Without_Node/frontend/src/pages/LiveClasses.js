import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Chip,
  Box,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const LiveClasses = () => {
  const [classes, setClasses] = useState([]);
  const [classEndedMessage, setClassEndedMessage] = useState('');
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [socketRef] = useState(() => io(SOCKET_URL));

  useEffect(() => {
    fetchClasses();
    
    // Listen for class-ended event to refresh classes
    socketRef.on('class-ended', (data) => {
      setClassEndedMessage('A class has ended. Refreshing...');
      setTimeout(() => {
        fetchClasses();
        setClassEndedMessage('');
      }, 1500);
    });

    return () => {
      socketRef.off('class-ended');
      socketRef.disconnect();
    };
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      });
      // If a course query param is present, filter classes client-side
      const params = new URLSearchParams(location.search);
      const courseFilter = params.get('course');
      if (courseFilter) {
        setClasses(response.data.filter(c => c.course && c.course._id === courseFilter));
      } else {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleJoinClass = async (classId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/classes/${classId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` } }
      );
      
      if (response.data.status === 'completed' || response.data.status === 'cancelled') {
        alert('This class has ended and is no longer available');
        fetchClasses();
        return;
      }
      
      navigate(`/live-class/${classId}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to join class');
      fetchClasses();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return 'error';
      case 'scheduled': return 'info';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">
            Live Classes
          </Typography>
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <Button
              variant="contained"
              onClick={() => navigate('/teacher')}
            >
              Create Class
            </Button>
          )}
        </Box>
        
        {classEndedMessage && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {classEndedMessage}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {classes.map((classItem) => (
            <Grid item xs={12} md={6} key={classItem._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      {classItem.title}
                    </Typography>
                    <Chip
                      label={classItem.status}
                      color={getStatusColor(classItem.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {classItem.description}
                  </Typography>
                  <Typography variant="body2">
                    Instructor: {classItem.instructor?.name}
                  </Typography>
                  <Typography variant="body2">
                    Scheduled: {new Date(classItem.scheduledAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Duration: {classItem.duration} minutes
                  </Typography>
                </CardContent>
                <CardActions>
                  {classItem.status !== 'completed' && classItem.status !== 'cancelled' && (classItem.status === 'live' || classItem.status === 'scheduled' || (user?.role === 'teacher' && classItem.instructor?._id === user._id)) && (
                    <Button
                      variant="contained"
                      onClick={() => handleJoinClass(classItem._id)}
                    >
                      {classItem.status === 'live' ? 'Join Class' : user?.role === 'teacher' ? 'Start Class' : 'Join Class'}
                    </Button>
                  )}
                  {(classItem.status === 'completed' || classItem.status === 'cancelled') && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {classItem.status === 'completed' ? 'Class ended' : 'Class cancelled'}
                    </Typography>
                  )}
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/class/${classItem._id}/recordings`)}
                    sx={{ ml: 1 }}
                  >
                    Recordings
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </>
  );
};

export default LiveClasses;
