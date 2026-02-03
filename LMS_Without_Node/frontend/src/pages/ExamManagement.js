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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Box,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axiosInstance from '../api/axiosConfig';

const ExamManagement = () => {
    const [searchTerm, setSearchTerm] = useState("");
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openQuestionsDialog, setOpenQuestionsDialog] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [tabValue, setTabValue] = useState(0);
  // For results dialog
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [resultsExamId, setResultsExamId] = useState(null);
  const [examAttempts, setExamAttempts] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [resultsSearchEmail, setResultsSearchEmail] = useState("");
  // Fetch attempts for a given exam (teacher view)
  const handleOpenResultsDialog = async (examId) => {
    setResultsDialogOpen(true);
    setResultsExamId(examId);
    setResultsLoading(true);
    setResultsError("");
    try {
      const res = await axiosInstance.get(`/api/exams/exam/${examId}/attempts`);
      setExamAttempts(res.data || []);
    } catch (err) {
      setResultsError(err.response?.data?.message || "Failed to fetch attempts");
      setExamAttempts([]);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleCloseResultsDialog = () => {
    setResultsDialogOpen(false);
    setResultsExamId(null);
    setExamAttempts([]);
    setResultsError("");
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    duration: 60,
    totalMarks: 100,
    passingMarks: 40,
    instructions: '',
    startDate: '',
    endDate: '',
    maxAttempts: 1,
    randomizeQuestions: false,
    randomizeOptions: false,
    negativeMarking: false,
    negativeMarkingValue: 0.25,
    lockdownMode: false,
    requireWebcam: false,
    requireProctoring: false,
    showResults: true,
    showCorrectAnswers: false,
    showExplanation: false
  });

  const [selectedQuestions, setSelectedQuestions] = useState([]);

  useEffect(() => {
    console.log('ExamManagement mounted');
    fetchExams();
    fetchCourses();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      console.log('Fetching exams...');
      const response = await axiosInstance.get('/api/exams/instructor/all');
      console.log('Exams fetched:', response.data);
      setExams(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError(err.response?.data?.message || 'Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      console.log('Fetching courses...');
      const response = await axiosInstance.get('/api/courses');
      console.log('Courses fetched:', response.data);
      setCourses(response.data);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  };

  const fetchQuestions = async (courseId) => {
    try {
      const response = await axiosInstance.get(`/api/questions/bank/${courseId}`);
      setQuestions(response.data.questions || []);
    } catch (err) {
      console.error('Failed to fetch questions');
    }
  };

  const handleOpenDialog = (exam = null) => {
    if (exam) {
      setEditingExam(exam._id);
      setFormData(exam);
      setSelectedQuestions(exam.questions || []);
    } else {
      setEditingExam(null);
      setFormData({
        title: '',
        description: '',
        course: '',
        duration: 60,
        totalMarks: 100,
        passingMarks: 40,
        instructions: '',
        startDate: '',
        endDate: '',
        maxAttempts: 1,
        randomizeQuestions: false,
        randomizeOptions: false,
        negativeMarking: false,
        negativeMarkingValue: 0.25,
        lockdownMode: false,
        requireWebcam: false,
        requireProctoring: false,
        showResults: true,
        showCorrectAnswers: false,
        showExplanation: false
      });
      setSelectedQuestions([]);
    }
    setTabValue(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingExam(null);
  };

  const handleOpenQuestionsDialog = async () => {
    if (!formData.course) {
      setError('Please select a course first');
      return;
    }
    await fetchQuestions(formData.course);
    setOpenQuestionsDialog(true);
  };

  const handleSaveExam = async () => {
    try {
      if (!formData.title || !formData.course || !formData.startDate || !formData.endDate) {
        setError('Please fill all required fields');
        return;
      }

      if (editingExam) {
        await axiosInstance.put(
          `/api/exams/${editingExam}`,
          formData
        );
      } else {
        const response = await axiosInstance.post(
          '/api/exams',
          formData
        );
        setEditingExam(response.data.exam._id);
      }

      // Add questions if any selected
      if (selectedQuestions.length > 0 && editingExam) {
        const questionIds = selectedQuestions.map(q => typeof q === 'string' ? q : q._id);
        await axiosInstance.post(
          `/api/exams/${editingExam}/questions`,
          { questionIds }
        );
      }

      fetchExams();
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save exam');
    }
  };

  const handlePublishExam = async (examId) => {
    try {
      await axiosInstance.post(
        `/api/exams/${examId}/publish`,
        {}
      );
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish exam');
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;

    try {
      await axiosInstance.delete(`/api/exams/${id}`);
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      published: 'success',
      scheduled: 'info',
      ongoing: 'warning',
      completed: 'error'
    };
    return colors[status] || 'default';
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
        <Typography variant="h4">Exam Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Exam
        </Button>
      </Box>

      <Box sx={{ mb: 2, maxWidth: 400 }}>
        <TextField
          fullWidth
          label="Search by Exam Title"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          variant="outlined"
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Exam Title</strong></TableCell>
              <TableCell><strong>Course</strong></TableCell>
              <TableCell align="center"><strong>Questions</strong></TableCell>
              <TableCell align="center"><strong>Duration</strong></TableCell>
              <TableCell align="center"><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
              <TableCell align="center"><strong>Results</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {exams
              .filter(exam =>
                exam.title?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((exam) => (
                <TableRow key={exam._id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {exam.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {exam.description?.substring(0, 40)}...
                    </Typography>
                  </TableCell>
                  <TableCell>{exam.course?.title}</TableCell>
                  <TableCell align="center">{exam.totalQuestions || 0}</TableCell>
                  <TableCell align="center">{exam.duration} mins</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={exam.status}
                      color={getStatusColor(exam.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenDialog(exam)}>
                      <EditIcon />
                    </IconButton>
                    {exam.status === 'draft' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => handlePublishExam(exam._id)}
                        sx={{ mr: 1 }}
                      >
                        Publish
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteExam(exam._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="outlined" onClick={() => handleOpenResultsDialog(exam._id)}>
                      View Results
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
                {/* Results Dialog */}
                <Dialog open={resultsDialogOpen} onClose={handleCloseResultsDialog} maxWidth="md" fullWidth>
                  <DialogTitle>Student Results</DialogTitle>
                  <DialogContent>
                    {resultsLoading ? (
                      <Box display="flex" justifyContent="center" alignItems="center" minHeight="120px">
                        <CircularProgress />
                      </Box>
                    ) : resultsError ? (
                      <Alert severity="error">{resultsError}</Alert>
                    ) : (
                      <>
                        <Box sx={{ mb: 2, maxWidth: 350 }}>
                          <TextField
                            fullWidth
                            label="Search by Student Email"
                            value={resultsSearchEmail}
                            onChange={e => setResultsSearchEmail(e.target.value)}
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Email</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell><strong>Submitted At</strong></TableCell>
                                <TableCell><strong>Actions</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {examAttempts.filter(attempt =>
                                attempt.student?.email?.toLowerCase().includes(resultsSearchEmail.toLowerCase())
                              ).length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center">No attempts found</TableCell></TableRow>
                              ) : (
                                examAttempts
                                  .filter(attempt =>
                                    attempt.student?.email?.toLowerCase().includes(resultsSearchEmail.toLowerCase())
                                  )
                                  .map(attempt => (
                                    <TableRow key={attempt._id}>
                                      <TableCell>{attempt.student?.name || '—'}</TableCell>
                                      <TableCell>{attempt.student?.email || '—'}</TableCell>
                                      <TableCell>{attempt.status}</TableCell>
                                      <TableCell>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '—'}</TableCell>
                                      <TableCell>
                                        <Button size="small" variant="contained" onClick={() => window.open(`/exam/results/${attempt._id}`, '_blank')}>View</Button>
                                      </TableCell>
                                    </TableRow>
                                  ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseResultsDialog}>Close</Button>
                  </DialogActions>
                </Dialog>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Exam Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingExam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ mb: 2 }}>
            <Tab label="Basic Info" />
            <Tab label="Questions" />
            <Tab label="Settings" />
          </Tabs>

          {/* Tab 1: Basic Info */}
          {tabValue === 0 && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Exam Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Course *</InputLabel>
                <Select
                  value={formData.course}
                  label="Course"
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                >
                  {courses.map(course => (
                    <MenuItem key={course._id} value={course._id}>{course.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Instructions"
                multiline
                rows={3}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                margin="normal"
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                <TextField
                  label="Start Date *"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End Date *"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  inputProps={{ min: 1 }}
                />
                <TextField
                  label="Total Marks"
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
                  inputProps={{ min: 1 }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                <TextField
                  label="Passing Marks"
                  type="number"
                  value={formData.passingMarks}
                  onChange={(e) => setFormData({ ...formData, passingMarks: parseInt(e.target.value) })}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  label="Maximum Attempts"
                  type="number"
                  value={formData.maxAttempts}
                  onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
                  inputProps={{ min: 1 }}
                />
              </Box>
            </Box>
          )}

          {/* Tab 2: Questions */}
          {tabValue === 1 && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">
                  Selected Questions: {selectedQuestions.length}
                </Typography>
                <Button variant="outlined" onClick={handleOpenQuestionsDialog}>
                  Add Questions
                </Button>
              </Box>

              {selectedQuestions.length > 0 && (
                <Card>
                  <CardContent>
                    {selectedQuestions.map((q, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid #ddd' }}>
                        <Typography variant="body2">
                          {idx + 1}. {typeof q === 'string' ? q : q.questionText}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => setSelectedQuestions(selectedQuestions.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* Tab 3: Settings */}
          {tabValue === 2 && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Question Settings</Typography>
              <FormControlLabel
                control={<Switch checked={formData.randomizeQuestions} onChange={(e) => setFormData({ ...formData, randomizeQuestions: e.target.checked })} />}
                label="Randomize question order"
              />
              <FormControlLabel
                control={<Switch checked={formData.randomizeOptions} onChange={(e) => setFormData({ ...formData, randomizeOptions: e.target.checked })} />}
                label="Randomize MCQ options"
              />

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Grading</Typography>
              <FormControlLabel
                control={<Switch checked={formData.negativeMarking} onChange={(e) => setFormData({ ...formData, negativeMarking: e.target.checked })} />}
                label="Enable negative marking"
              />
              {formData.negativeMarking && (
                <TextField
                  fullWidth
                  label="Negative Mark Value"
                  type="number"
                  value={formData.negativeMarkingValue}
                  onChange={(e) => setFormData({ ...formData, negativeMarkingValue: parseFloat(e.target.value) })}
                  inputProps={{ step: 0.01, min: 0 }}
                  sx={{ mt: 1 }}
                />
              )}

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Results Visibility</Typography>
              <FormControlLabel
                control={<Switch checked={formData.showResults} onChange={(e) => setFormData({ ...formData, showResults: e.target.checked })} />}
                label="Show results to students"
              />
              <FormControlLabel
                control={<Switch checked={formData.showCorrectAnswers} onChange={(e) => setFormData({ ...formData, showCorrectAnswers: e.target.checked })} />}
                label="Show correct answers"
              />
              <FormControlLabel
                control={<Switch checked={formData.showExplanation} onChange={(e) => setFormData({ ...formData, showExplanation: e.target.checked })} />}
                label="Show explanations"
              />

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Proctoring & Security</Typography>
              <FormControlLabel
                control={<Switch checked={formData.lockdownMode} onChange={(e) => setFormData({ ...formData, lockdownMode: e.target.checked })} />}
                label="Enable Lockdown Mode (prevent tab switching)"
              />
              <FormControlLabel
                control={<Switch checked={formData.requireWebcam} onChange={(e) => setFormData({ ...formData, requireWebcam: e.target.checked })} />}
                label="Require webcam"
              />
              <FormControlLabel
                control={<Switch checked={formData.requireProctoring} onChange={(e) => setFormData({ ...formData, requireProctoring: e.target.checked })} />}
                label="Enable AI proctoring"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveExam}>
            {editingExam ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Select Questions Dialog */}
      <Dialog open={openQuestionsDialog} onClose={() => setOpenQuestionsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Questions</DialogTitle>
        <DialogContent>
          {questions.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No questions available for this course. Create questions first.
            </Alert>
          ) : (
            <Box sx={{ mt: 2 }}>
              {questions.map((q) => (
                <FormControlLabel
                  key={q._id}
                  control={<Switch checked={selectedQuestions.some(sq => (typeof sq === 'string' ? sq : sq._id) === q._id)} onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedQuestions([...selectedQuestions, q._id]);
                    } else {
                      setSelectedQuestions(selectedQuestions.filter(sq => (typeof sq === 'string' ? sq : sq._id) !== q._id));
                    }
                  }} />}
                  label={q.questionText.substring(0, 50) + '...'}
                  sx={{ display: 'block', mb: 1 }}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuestionsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExamManagement;
