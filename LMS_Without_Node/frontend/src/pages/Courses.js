import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Typography,
  Box,
  TextField
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/courses`);
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          All Courses
        </Typography>
        <TextField
          fullWidth
          label="Search Courses"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
        />
        <Grid container spacing={3}>
          {filteredCourses.map((course) => (
            <Grid item xs={12} sm={6} md={4} key={course._id}>
              <Card>
                <CardMedia
                  component="img"
                  height="140"
                  image={course.thumbnail || 'https://via.placeholder.com/300x200'}
                  alt={course.title}
                />
                <CardContent>
                  <Typography variant="h6" component="div">
                    {course.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {course.description.substring(0, 100)}...
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                    ${course.price}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Instructor: {course.instructor?.name}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => navigate(`/courses/${course._id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={async () => {
                      try {
                        await axios.post(`${API_URL}/api/courses/${course._id}/enroll`);
                        alert('Enrolled successfully!');
                        fetchCourses();
                      } catch (error) {
                        alert(error.response?.data?.message || 'Enrollment failed');
                      }
                    }}
                  >
                    Enroll
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

export default Courses;
