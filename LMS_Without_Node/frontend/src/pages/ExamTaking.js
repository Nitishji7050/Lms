import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Box,
  Button,
  Typography,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  LinearProgress,
  Grid,
  Chip
} from '@mui/material';
import axiosInstance from '../api/axiosConfig';
import { useParams, useNavigate } from 'react-router-dom';

const ExamTaking = () => {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const autoSubmitRef = useRef(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
    } else if (timeRemaining === 0 && exam) {
      handleSubmitExam();
    }

    return () => clearTimeout(timerRef.current);
  }, [timeRemaining, exam]);

  // Lockdown Mode: Detect tab switching
  useEffect(() => {
    if (!exam?.lockdownMode) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Increment tab switch count and record proctor event
        setTabSwitchCount(prev => {
          const next = prev + 1;
          recordProctorEvent('tab-switch');

          // If reached threshold (2), auto-submit once
          if (next >= 2 && !autoSubmitRef.current) {
            autoSubmitRef.current = true;
            // give a small grace period so UI updates before submission
            setTimeout(() => {
              handleSubmitExam();
            }, 300);
          }

          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [exam]);

  // Prevent copy-paste in lockdown mode
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      if (exam?.lockdownMode) {
        recordProctorEvent('right-click');
      }
      return false;
    };

    const handleCopy = (e) => {
      e.preventDefault();
      if (exam?.lockdownMode) {
        recordProctorEvent('copy-paste');
      }
      return false;
    };

    const handleCut = (e) => {
      e.preventDefault();
      if (exam?.lockdownMode) {
        recordProctorEvent('cut');
      }
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      if (exam?.lockdownMode) {
        recordProctorEvent('paste');
      }
      return false;
    };

    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [exam]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/exams/${examId}/take`);

      const examForStudent = response.data;

      // Default remaining time from exam duration
      let remaining = examForStudent.duration * 60; // seconds

      // If an attemptId exists (refreshing during an in-progress attempt), fetch attempt and compute remaining time from startedAt
      if (attemptId) {
        try {
          const attemptRes = await axiosInstance.get(`/api/exams/attempt/${attemptId}`);
          const attempt = attemptRes.data;

          // If attempt is already submitted or graded, redirect to results
          if (attempt.status && (attempt.status === 'submitted' || attempt.status === 'graded')) {
            navigate(`/exam/results/${attemptId}`);
            return;
          }

          // Compute elapsed seconds since attempt started
          const startedAt = attempt.startedAt ? new Date(attempt.startedAt) : null;
          if (startedAt) {
            const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
            remaining = Math.max(0, (examForStudent.duration * 60) - elapsed);
          }

          // Restore answers and review flags if present
          if (attempt.answers && attempt.answers.length > 0) {
            const restoredAnswers = {};
            const restoredMarked = {};

            attempt.answers.forEach(ans => {
              if (ans.questionId) {
                const qid = ans.questionId._id || ans.questionId;
                // Accept multiple possible field names returned by backend for the student's answer
                const answerValue = ans.answer ?? ans.studentAnswer ?? ans.student_response ?? null;
                if (answerValue !== null && answerValue !== undefined) {
                  restoredAnswers[qid] = answerValue;
                }
                if (ans.markedForReview) restoredMarked[qid] = true;
              }
            });

            setAnswers(restoredAnswers);
            setMarkedForReview(restoredMarked);
          }
        } catch (e) {
          // If attempt fetch fails, fall back to full duration
          console.warn('Failed to fetch attempt data, starting fresh timer');
        }
      }

      setExam(examForStudent);
      setTimeRemaining(remaining);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const recordProctorEvent = async (eventType) => {
    // Send suspicious activity to server
    try {
      await axiosInstance.post(
        `/api/exams/attempt/${attemptId}/suspicious-activity`,
        { eventType }
      );
    } catch (err) {
      console.error('Failed to record suspicious activity');
    }
  };

  const handleAnswerChange = (value) => {
    setAnswers({
      ...answers,
      [exam.questions[currentQuestionIndex]._id]: value
    });

    // Auto-save answer
    saveAnswer(exam.questions[currentQuestionIndex]._id, value);
  };

  const saveAnswer = async (questionId, answer) => {
    try {
      await axiosInstance.post(
        '/api/exams/attempt/answer/save',
        {
          attemptId,
          questionId,
          answer,
          timeSpent: (exam.duration * 60) - timeRemaining
        }
      );
    } catch (err) {
      console.error('Failed to save answer');
    }
  };

  const handleMarkForReview = () => {
    const questionId = exam.questions[currentQuestionIndex]._id;
    const isMarked = markedForReview[questionId];

    setMarkedForReview({
      ...markedForReview,
      [questionId]: !isMarked
    });

    // Update on server
    axiosInstance.post(
      '/api/exams/attempt/answer/review',
      {
        attemptId,
        questionId,
        markedForReview: !isMarked
      }
    ).catch(err => console.error('Failed to mark for review'));
  };

  const handleSubmitExam = async () => {
    try {
      const response = await axiosInstance.post(
        `/api/exams/attempt/${attemptId}/submit`,
        {}
      );

      navigate(`/exam/results/${attemptId}`, {
        state: { score: response.data.autoGradedScore, total: response.data.totalAutoGradableMarks }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit exam');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Loading exam...</Typography>
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

  if (!exam || exam.questions.length === 0) {
    return <Alert severity="error">Exam not found or has no questions</Alert>;
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion._id];
  const isMarked = markedForReview[currentQuestion._id];
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== null && answers[k] !== undefined).length;
  const reviewCount = Object.keys(markedForReview).filter(k => markedForReview[k]).length;

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        backgroundColor: '#f5f5f5', 
        minHeight: '100vh', 
        py: 2,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onDrag={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Container maxWidth="lg">
        {/* Header with Timer */}
        <Paper
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: timeRemaining < 300 ? '#fff3cd' : 'white',
            borderLeft: timeRemaining < 300 ? '4px solid #ff9800' : 'none'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="h6">{exam.title}</Typography>
              <Typography variant="body2" color="textSecondary">
                Questions: {answeredCount}/{exam.totalQuestions} answered | {reviewCount} marked for review
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={formatTime(timeRemaining)}
                  icon={<Typography variant="body1">⏱️</Typography>}
                  color={timeRemaining < 300 ? 'error' : 'default'}
                  variant="filled"
                  sx={{ fontSize: '1.2rem', height: 'auto', py: 1, px: 2 }}
                />
              </Box>
              {timeRemaining < 300 && (
                <Typography variant="caption" color="error">
                  ⚠️ Less than 5 minutes remaining
                </Typography>
              )}
            </Grid>
          </Grid>
        </Paper>

        {tabSwitchCount > 0 && (
          <Alert severity="warning" onClose={() => setTabSwitchCount(0)} sx={{ mb: 2 }}>
            ⚠️ Tab switching detected. You have switched tabs {tabSwitchCount} {tabSwitchCount === 1 ? 'time' : 'times'}. After 2 switches the exam will be auto-submitted.
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Questions Palette */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, maxHeight: '70vh', overflow: 'auto' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Questions ({currentQuestionIndex + 1}/{exam.totalQuestions})
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                {exam.questions.map((q, idx) => (
                  <Button
                    key={q._id}
                    variant={idx === currentQuestionIndex ? 'contained' : 'outlined'}
                    color={
                      markedForReview[q._id]
                        ? 'warning'
                        : answers[q._id]
                        ? 'success'
                        : 'primary'
                    }
                    size="small"
                    sx={{ aspectRatio: '1', p: 0 }}
                    onClick={() => setCurrentQuestionIndex(idx)}
                  >
                    {idx + 1}
                  </Button>
                ))}
              </Box>
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  <strong>Legend:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption">
                    <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#1976d2', marginRight: 4 }}></span>
                    Current Question
                  </Typography>
                  <Typography variant="caption">
                    <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#4caf50', marginRight: 4 }}></span>
                    Answered
                  </Typography>
                  <Typography variant="caption">
                    <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#ff9800', marginRight: 4 }}></span>
                    Marked for Review
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Question Display */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Question {currentQuestionIndex + 1} of {exam.totalQuestions}
                    <Chip label={`${currentQuestion.marks} marks`} size="small" sx={{ ml: 1 }} />
                    <Chip
                      label={currentQuestion.difficulty}
                      size="small"
                      color={
                        currentQuestion.difficulty === 'easy'
                          ? 'success'
                          : currentQuestion.difficulty === 'medium'
                          ? 'warning'
                          : 'error'
                      }
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {currentQuestion.questionText}
                  </Typography>

                  {currentQuestion.imageUrl && (
                    <Box sx={{ my: 2 }}>
                      <img
                        src={currentQuestion.imageUrl}
                        alt="Question"
                        style={{ maxWidth: '100%', maxHeight: 300 }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Answer Options */}
                <Box sx={{ mt: 3 }}>
                  {currentQuestion.type === 'mcq' && (
                    <FormControl component="fieldset" fullWidth>
                      <RadioGroup
                        value={currentAnswer || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                      >
                        {currentQuestion.options?.map((option, idx) => (
                          <FormControlLabel
                            key={idx}
                            value={option.text}
                            control={<Radio />}
                            label={option.text}
                            sx={{ mb: 1 }}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  )}

                  {currentQuestion.type === 'true-false' && (
                    <FormControl component="fieldset" fullWidth>
                      <RadioGroup
                        value={currentAnswer || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                      >
                        <FormControlLabel value="true" control={<Radio />} label="True" />
                        <FormControlLabel value="false" control={<Radio />} label="False" />
                      </RadioGroup>
                    </FormControl>
                  )}

                  {(currentQuestion.type === 'short-answer' || currentQuestion.type === 'essay') && (
                    <TextField
                      fullWidth
                      multiline
                      rows={currentQuestion.type === 'essay' ? 6 : 3}
                      value={currentAnswer || ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Enter your answer..."
                      variant="outlined"
                    />
                  )}
                </Box>

                {/* Question Navigation and Review */}
                <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    ← Previous
                  </Button>

                  <Button
                    variant={isMarked ? 'contained' : 'outlined'}
                    color={isMarked ? 'warning' : 'primary'}
                    onClick={handleMarkForReview}
                  >
                    {isMarked ? '★ Marked for Review' : '☆ Mark for Review'}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => setCurrentQuestionIndex(Math.min(exam.totalQuestions - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === exam.totalQuestions - 1}
                  >
                    Next →
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Progress and Submit */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Progress
              </Typography>
              <LinearProgress variant="determinate" value={(answeredCount / exam.totalQuestions) * 100} />
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {answeredCount} / {exam.totalQuestions} answered
              </Typography>

              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd' }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  onClick={() => setShowSubmitDialog(true)}
                  sx={{ mt: 1 }}
                >
                  Submit Exam
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle>Submit Exam?</DialogTitle>
        <DialogContent>
          <Typography>
            You have answered {answeredCount} out of {exam.totalQuestions} questions.
          </Typography>
          <Typography sx={{ mt: 1 }}>
            Are you sure you want to submit? You cannot change your answers after submission.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)}>Continue Exam</Button>
          <Button variant="contained" color="error" onClick={handleSubmitExam}>
            Submit Exam
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamTaking;
