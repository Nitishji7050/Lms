import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Grid,
  LinearProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axiosInstance from '../api/axiosConfig';
import { useParams, useNavigate } from 'react-router-dom';

const ExamResults = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/exams/attempt/${attemptId}`);

      setAttempt(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#4caf50';
    if (percentage >= 60) return '#ff9800';
    return '#f44336';
  };

  // Dynamically determine pass/fail based on obtainedMarks and passingMarks
  const getPassStatus = (obtained, passMark) => {
    if (typeof obtained !== 'number' || typeof passMark !== 'number') return '—';
    return obtained >= passMark ? 'PASSED' : 'FAILED';
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }

  if (!attempt) {
    return <Alert severity="error">Results not found</Alert>;
  }

  return (
    <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Result Summary Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="h4" gutterBottom>
                  Exam Results
                </Typography>
                <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                  Student: <strong>{attempt.student?.name || 'Unknown'}</strong>
                </Typography>
                <Typography variant="body1" color="textSecondary" gutterBottom>
                  Status: <strong>{attempt.status}</strong>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Submitted: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '—'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: getScoreColor(attempt.accuracyPercent ?? attempt.percentage ?? 0),
                        color: 'white'
                      }}
                    >
                      <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                        {Math.round(attempt.accuracyPercent ?? attempt.percentage ?? 0)}%
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <Chip
                        label={getPassStatus(attempt.obtainedMarks ?? attempt.totalScore ?? 0, attempt.passingMarks ?? attempt.passingMark ?? 0)}
                        color={(attempt.obtainedMarks ?? attempt.totalScore ?? 0) >= (attempt.passingMarks ?? attempt.passingMark ?? 0) ? 'success' : 'error'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Your Score (Accuracy shown above)
                    </Typography>
                    <Typography variant="h4" sx={{ color: getScoreColor(attempt.accuracyPercent ?? attempt.percentage ?? 0) }}>
                      {attempt.totalScore} / {attempt.maxScore}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={attempt.accuracyPercent ?? attempt.percentage ?? 0}
                      sx={{ mt: 2, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Total Marks
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {attempt.maxScore ?? attempt.totalMarks ?? 0}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Pass Mark
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {attempt.passingMarks ?? attempt.passingMark ?? '—'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Obtained Marks
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {attempt.obtainedMarks ?? attempt.totalScore ?? 0}
              </Typography>
            </Paper>
          </Grid>

          {/* Negative Mark (conditional) */}
          {attempt.negativeMarking && (
            <Grid item xs={12} sm={6} md={2}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  Negative Mark(%)
                </Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  {attempt.negativeMarkingValue ? `-${attempt.negativeMarkingValue}` : '—'}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  per wrong
                </Typography>
              </Paper>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Accuracy Rate
              </Typography>
              <Typography variant="h6" sx={{ mt: 1, color: getScoreColor(attempt.accuracyPercent ?? attempt.percentage) }}>
                {attempt.accuracyPercent ?? attempt.percentage}%
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                {attempt.correctCount ?? 0} / {attempt.totalQuestions ?? 0} correct
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Time Taken
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {Math.round((new Date(attempt.submittedAt) - new Date(attempt.startedAt)) / 60000)} mins
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Detailed Answer Review */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Detailed Answer Review
          </Typography>

          {attempt.answers && attempt.answers.length > 0 ? (
            <Box>
              {attempt.answers.map((answer, idx) => (
                <Accordion key={idx} defaultExpanded={idx === 0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography sx={{ fontWeight: 600, minWidth: 40 }}>
                        Q{idx + 1}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {answer.questionText}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={`${answer.marks} marks`}
                          size="small"
                          variant="outlined"
                        />
                        {answer.correctAnswer && answer.studentAnswer === answer.correctAnswer ? (
                          <Chip label="✓ Correct" size="small" color="success" />
                        ) : answer.correctAnswer ? (
                          <Chip label="✗ Incorrect" size="small" color="error" />
                        ) : (
                          <Chip label="Not Answered" size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Box sx={{ pt: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Your Answer:
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                        {answer.studentAnswer || <em>Not answered</em>}
                      </Typography>

                      {answer.correctAnswer && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            Correct Answer:
                          </Typography>
                          <Typography variant="body2" sx={{ p: 1, backgroundColor: '#c8e6c9', borderRadius: 1, color: '#2e7d32' }}>
                            {answer.correctAnswer}
                          </Typography>
                        </>
                      )}

                      {answer.explanation && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            Explanation:
                          </Typography>
                          <Typography variant="body2">
                            {answer.explanation}
                          </Typography>
                        </>
                      )}

                      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #ddd' }}>
                        <Typography variant="caption" color="textSecondary">
                          Time spent: {answer.timeSpent} seconds
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : (
            <Typography color="textSecondary">No answers to review</Typography>
          )}
        </Paper>

        {/* Grading Feedback (if available) */}
        {attempt.feedback && attempt.feedback.length > 0 && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Teacher Feedback
            </Typography>

            {attempt.feedback.map((feedback, idx) => (
              <Alert key={idx} severity="info" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">
                  Question {idx + 1}: {feedback.marks} marks
                </Typography>
                <Typography variant="body2">
                  {feedback.comment}
                </Typography>
              </Alert>
            ))}

            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Graded by: {attempt.gradedBy?.name} on {new Date(attempt.gradedAt).toLocaleDateString()}
            </Typography>
          </Paper>
        )}

        {/* Action Buttons */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/exams')}
          >
            Back to Exams
          </Button>
          <Button
            variant="contained"
            onClick={() => window.print()}
          >
            Print Results
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default ExamResults;
