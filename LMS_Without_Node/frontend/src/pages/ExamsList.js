import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Box,
  Chip,
  Typography
} from '@mui/material';
import axiosInstance from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ExamsList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [openPreview, setOpenPreview] = useState(false);
  const [userAttempts, setUserAttempts] = useState({});

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return; // Still loading auth
    }
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Auth is loaded and user is logged in, now fetch exams
    fetchExams();
  }, [user, authLoading, navigate]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Token:', token ? token.substring(0, 50) + '...' : 'Missing');
      console.log('User from auth context:', user);
      console.log('Fetching exams...');
      const response = await axiosInstance.get('/api/exams/available/list');
      setExams(response.data);
      
      // Fetch user attempts for all exams
      const attemptsMap = {};
      for (const exam of response.data) {
        try {
          const attemptsResponse = await axiosInstance.get(`/api/exams/${exam._id}/my-attempts`);
          if (attemptsResponse.data && attemptsResponse.data.length > 0) {
            // Get the latest SUBMITTED attempt only
            const submittedAttempt = attemptsResponse.data.find(a => a.status === 'submitted');
            if (submittedAttempt) {
              attemptsMap[exam._id] = submittedAttempt;
            }
          }
        } catch (err) {
          // No attempts yet, that's fine
          console.log(`No attempts for exam ${exam._id}`);
        }
      }
      setUserAttempts(attemptsMap);
      setError('');
    } catch (err) {
      console.error('Fetch exams error:', err);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', JSON.stringify(err.response?.data, null, 2));
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch exams';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (exam) => {
    try {
      const response = await axiosInstance.post(
        `/api/exams/${exam._id}/attempt/start`,
        {}
      );
      
      // Redirect to exam taking interface
      window.location.href = `/exam/take/${exam._id}/${response.data.attemptId}`;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start exam');
    }
  };

  const getStatusColor = (exam) => {
    if (!exam) return 'default';
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return 'warning';
    if (now > endDate) return 'error';
    return 'success';
  };

  const getStatusText = (exam) => {
    if (!exam) return 'Unknown';
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return 'Upcoming';
    if (now > endDate) return 'Closed';
    return 'Active';
  };

  if (authLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Available Exams
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {exams.length === 0 ? (
        <Alert severity="info">No exams available at this time.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Exam Title</strong></TableCell>
                <TableCell><strong>Course</strong></TableCell>
                <TableCell align="center"><strong>Total Questions</strong></TableCell>
                <TableCell align="center"><strong>Duration (min)</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exams.map((exam) => (
                <TableRow key={exam._id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {exam.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(exam.startDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{exam.course?.title}</TableCell>
                  <TableCell align="center">{exam.totalQuestions}</TableCell>
                  <TableCell align="center">{exam.duration}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getStatusText(exam)}
                      color={getStatusColor(exam)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {userAttempts[exam._id] ? (
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        onClick={() => navigate(`/exam/results/${userAttempts[exam._id]._id}`)}
                      >
                        View Results
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            setSelectedExam(exam);
                            setOpenPreview(true);
                          }}
                          disabled={getStatusText(exam) !== 'Active'}
                          sx={{ mr: 1 }}
                        >
                          Start
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedExam(exam);
                            setOpenPreview(true);
                          }}
                        >
                          Preview
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Exam Preview Dialog */}
      <Dialog open={openPreview} onClose={() => setOpenPreview(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedExam?.title || 'Exam Details'}</DialogTitle>
        <DialogContent>
          {selectedExam ? (
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Description:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedExam?.description}
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                <strong>Instructions:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedExam?.instructions || 'No specific instructions'}
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                <strong>Exam Details:</strong>
              </Typography>
              <Typography variant="body2">
                • Questions: {selectedExam?.totalQuestions}
              </Typography>
              <Typography variant="body2">
                • Duration: {selectedExam?.duration} minutes
              </Typography>
              <Typography variant="body2">
                • Total Marks: {selectedExam?.totalMarks}
              </Typography>
              <Typography variant="body2">
                • Passing Marks: {selectedExam?.passingMarks}
              </Typography>
              <Typography variant="body2">
                • Maximum Attempts: {selectedExam?.maxAttempts}
              </Typography>

              {selectedExam?.negativeMarking && (
                <Typography variant="body2">
                  • Negative Mark: -{selectedExam?.negativeMarkingValue ?? selectedExam?.negativeMarkValue ?? '—'}%mark per wrong answer
                </Typography>
              )}

              {selectedExam?.lockdownMode && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This exam runs in Lockdown Mode. You won't be able to switch tabs or minimize the window.
                </Alert>
              )}

              {selectedExam?.requireWebcam && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Webcam is required for this exam.
                </Alert>
              )}
            </Box>
          ) : (
            <Typography>Loading exam details...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPreview(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              handleStartExam(selectedExam);
            }}
            disabled={!selectedExam || getStatusText(selectedExam) !== 'Active'}
          >
            Start Exam
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExamsList;
