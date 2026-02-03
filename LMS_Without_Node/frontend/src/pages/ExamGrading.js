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
  TextField,
  Alert,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import axiosInstance from '../api/axiosConfig';
import { useParams } from 'react-router-dom';

const ExamGrading = () => {
  const { examId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [pendingGradings, setPendingGradings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [openGradingDialog, setOpenGradingDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [statistics, setStatistics] = useState(null);
  const [questionStats, setQuestionStats] = useState([]);

  const [gradingData, setGradingData] = useState({});

  useEffect(() => {
    fetchAttempts();
    fetchPendingGradings();
    fetchStatistics();
    fetchQuestionStatistics();
  }, [examId]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/exams/exam/${examId}/attempts`);
      setAttempts(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attempts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingGradings = async () => {
    try {
      const response = await axiosInstance.get(`/api/exams/exam/${examId}/pending-gradings`);
      setPendingGradings(response.data);
    } catch (err) {
      console.error('Failed to fetch pending gradings');
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axiosInstance.get(`/api/exams/exam/${examId}/statistics`);
      setStatistics(response.data);
    } catch (err) {
      console.error('Failed to fetch statistics');
    }
  };

  const fetchQuestionStatistics = async () => {
    try {
      const response = await axiosInstance.get(`/api/exams/exam/${examId}/question-statistics`);
      setQuestionStats(response.data);
    } catch (err) {
      console.error('Failed to fetch question statistics');
    }
  };

  const handleOpenGradingDialog = (pendingGrading) => {
    setSelectedAttempt(pendingGrading);
    const newGradingData = {};
    pendingGrading.essayAnswers.forEach(ans => {
      newGradingData[ans.questionId] = { marks: 0, comment: '' };
    });
    setGradingData(newGradingData);
    setOpenGradingDialog(true);
  };

  const handleSaveGrades = async () => {
    try {
      // Save each grade
      for (const [questionId, gradeInfo] of Object.entries(gradingData)) {
        await axiosInstance.post(
          '/api/exams/attempt/grade/answer',
          {
            attemptId: selectedAttempt.attemptId,
            questionId,
            marks: gradeInfo.marks,
            comment: gradeInfo.comment
          }
        );
      }

      // Submit all grades
      await axiosInstance.post(
        `/api/exams/attempt/${selectedAttempt.attemptId}/submit-grades`,
        {}
      );

      fetchAttempts();
      fetchPendingGradings();
      fetchStatistics();
      setOpenGradingDialog(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save grades');
    }
  };

  const handleReleaseResults = async () => {
    if (!window.confirm('Are you sure you want to release results to all students?')) return;

    try {
      await axiosInstance.post(
        `/api/exams/${examId}/release-results`,
        {}
      );
      alert('Results released successfully');
      fetchAttempts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to release results');
    }
  };

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Exam Grading & Analytics</Typography>
        <Button variant="contained" color="success" onClick={handleReleaseResults}>
          Release Results
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Statistics Cards */}
      {statistics && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total Attempts
              </Typography>
              <Typography variant="h4">{statistics.totalAttempts}</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Average Score
              </Typography>
              <Typography variant="h4" color="primary">
                {statistics.averageScore}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Pass Percentage
              </Typography>
              <Typography variant="h4" color="success.main">
                {statistics.passPercentage}%
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Score Range
              </Typography>
              <Typography variant="body2">
                {statistics.lowestScore} - {statistics.highestScore}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant={tabValue === 0 ? 'contained' : 'outlined'}
          onClick={() => setTabValue(0)}
        >
          Pending Gradings ({pendingGradings.length})
        </Button>
        <Button
          variant={tabValue === 1 ? 'contained' : 'outlined'}
          onClick={() => setTabValue(1)}
        >
          All Attempts ({attempts.length})
        </Button>
        <Button
          variant={tabValue === 2 ? 'contained' : 'outlined'}
          onClick={() => setTabValue(2)}
        >
          Question Analysis
        </Button>
      </Box>

      {/* Tab 1: Pending Gradings */}
      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Student</strong></TableCell>
                <TableCell align="center"><strong>Submitted</strong></TableCell>
                <TableCell align="center"><strong>Essays to Grade</strong></TableCell>
                <TableCell align="center"><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingGradings.map((grading) => (
                <TableRow key={grading.attemptId}>
                  <TableCell>
                    <Typography variant="subtitle2">{grading.student?.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {grading.student?.email}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {new Date(grading.submittedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={grading.essayAnswers.length} color="warning" />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleOpenGradingDialog(grading)}
                    >
                      Grade
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: All Attempts */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Student</strong></TableCell>
                <TableCell align="center"><strong>Score</strong></TableCell>
                <TableCell align="center"><strong>Percentage</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Submitted</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt._id}>
                  <TableCell>
                    <Typography variant="subtitle2">{attempt.student?.name}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {attempt.totalScore} / {attempt.maxScore}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${attempt.percentage}%`}
                      color={attempt.percentage >= 60 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={attempt.status}
                      color={attempt.status === 'graded' ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'Not submitted'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 3: Question Analysis */}
      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Question</strong></TableCell>
                <TableCell align="center"><strong>Difficulty</strong></TableCell>
                <TableCell align="center"><strong>Total Attempts</strong></TableCell>
                <TableCell align="center"><strong>Success Rate</strong></TableCell>
                <TableCell align="center"><strong>Avg Time</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {questionStats.map((stat) => (
                <TableRow key={stat.questionId}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {stat.questionText.substring(0, 50)}...
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={stat.difficulty}
                      color={stat.difficulty === 'easy' ? 'success' : stat.difficulty === 'medium' ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">{stat.totalAttempts}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${stat.successRate}%`}
                      color={stat.successRate >= 60 ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">{stat.averageTimeSpent}s</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Grading Dialog */}
      <Dialog open={openGradingDialog} onClose={() => setOpenGradingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Grade Essay Answers</DialogTitle>
        <DialogContent>
          {selectedAttempt && selectedAttempt.essayAnswers.map((answer) => (
            <Card key={answer.questionId} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  {answer.questionText}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <strong>Student Answer:</strong> {answer.studentAnswer}
                </Typography>

                <Typography variant="caption">Marks: {answer.marks}</Typography>

                <TextField
                  fullWidth
                  label="Marks Obtained"
                  type="number"
                  value={gradingData[answer.questionId]?.marks || 0}
                  onChange={(e) => setGradingData({
                    ...gradingData,
                    [answer.questionId]: {
                      ...gradingData[answer.questionId],
                      marks: parseInt(e.target.value)
                    }
                  })}
                  inputProps={{ max: answer.marks, min: 0 }}
                  margin="normal"
                  size="small"
                />

                <TextField
                  fullWidth
                  label="Feedback/Comments"
                  multiline
                  rows={3}
                  value={gradingData[answer.questionId]?.comment || ''}
                  onChange={(e) => setGradingData({
                    ...gradingData,
                    [answer.questionId]: {
                      ...gradingData[answer.questionId],
                      comment: e.target.value
                    }
                  })}
                  margin="normal"
                  size="small"
                />
              </CardContent>
            </Card>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGradingDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGrades}>
            Submit Grades
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExamGrading;
