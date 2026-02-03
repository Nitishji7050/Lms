import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  School,
  VideoLibrary,
  Quiz,
  Chat
} from '@mui/icons-material';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    coursesEnrolled: 0,
    coursesCompleted: 0,
    examsTaken: 0,
    doubtsResolved: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/progress');
      setStats({
        coursesEnrolled: response.data.overallStats.coursesEnrolled,
        coursesCompleted: response.data.overallStats.coursesCompleted,
        examsTaken: response.data.progress.reduce((acc, p) => acc + (p.examScores?.length || 0), 0),
        doubtsResolved: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <Card sx={{ height: '100%', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" color={color}>
          {value}
        </Typography>
      </CardContent>
      {onClick && (
        <CardActions>
          <Button size="small" onClick={onClick}>View Details</Button>
        </CardActions>
      )}
    </Card>
  );

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user?.name}!
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {user?.role === 'student' && 'Track your learning progress and continue your journey.'}
          {user?.role === 'teacher' && 'Manage your courses and interact with students.'}
          {user?.role === 'admin' && 'Manage the entire learning platform.'}
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Courses Enrolled"
              value={stats.coursesEnrolled}
              icon={<School color="primary" />}
              color="primary"
              onClick={() => navigate('/courses')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Courses Completed"
              value={stats.coursesCompleted}
              icon={<VideoLibrary color="success" />}
              color="success.main"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Exams Taken"
              value={stats.examsTaken}
              icon={<Quiz color="warning" />}
              color="warning.main"
              onClick={() => navigate('/exams')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Doubts"
              value={stats.doubtsResolved}
              icon={<Chat color="secondary" />}
              color="secondary.main"
              onClick={() => navigate('/doubts')}
            />
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/courses')}
              >
                Browse Courses
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/live-classes')}
              >
                Join Live Class
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/ai-chatbot')}
              >
                Ask AI Assistant
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/pdf-test')}
              >
                PDF Test Generator
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </>
  );
};

export default Dashboard;
