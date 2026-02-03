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
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '../api/axiosConfig';

const QuestionManagement = () => {
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState({ course: '', topic: '', difficulty: '' });

  const [formData, setFormData] = useState({
    questionText: '',
    type: 'mcq',
    course: '',
    topic: '',
    difficulty: 'medium',
    marks: 1,
    options: [{ text: '', isCorrect: false }],
    correctAnswer: '',
    explanation: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetchQuestions();
    fetchCourses();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.course) params.append('course', filter.course);
      if (filter.topic) params.append('topic', filter.topic);
      if (filter.difficulty) params.append('difficulty', filter.difficulty);

      const response = await axiosInstance.get(`/api/questions?${params}`);

      setQuestions(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axiosInstance.get('/api/courses');
      setCourses(response.data);
    } catch (err) {
      console.error('Failed to fetch courses');
    }
  };

  const handleOpenDialog = (question = null) => {
    if (question) {
      setEditingId(question._id);
      setFormData(question);
    } else {
      setEditingId(null);
      setFormData({
        questionText: '',
        type: 'mcq',
        course: '',
        topic: '',
        difficulty: 'medium',
        marks: 1,
        options: [{ text: '', isCorrect: false }],
        correctAnswer: '',
        explanation: '',
        imageUrl: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSaveQuestion = async () => {
    try {
      if (!formData.questionText || !formData.course || !formData.topic || !formData.correctAnswer) {
        setError('Please fill all required fields');
        return;
      }

      if (formData.type === 'mcq' && formData.options.length < 2) {
        setError('MCQ must have at least 2 options');
        return;
      }

      if (editingId) {
        await axiosInstance.put(
          `/api/questions/${editingId}`,
          formData
        );
      } else {
        await axiosInstance.post(
          '/api/questions',
          formData
        );
      }

      fetchQuestions();
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await axiosInstance.delete(`/api/questions/${id}`);
      fetchQuestions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleAddOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { text: '', isCorrect: false }]
    });
  };

  const handleRemoveOption = (index) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
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
        <Typography variant="h4">Question Bank</Typography>
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          + Add Question
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Course</InputLabel>
          <Select
            value={filter.course}
            label="Course"
            onChange={(e) => {
              setFilter({ ...filter, course: e.target.value });
              fetchQuestions();
            }}
          >
            <MenuItem value="">All Courses</MenuItem>
            {courses.map(course => (
              <MenuItem key={course._id} value={course._id}>{course.title}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Topic"
          value={filter.topic}
          onChange={(e) => {
            setFilter({ ...filter, topic: e.target.value });
            fetchQuestions();
          }}
          sx={{ minWidth: 200 }}
        />

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Difficulty</InputLabel>
          <Select
            value={filter.difficulty}
            label="Difficulty"
            onChange={(e) => {
              setFilter({ ...filter, difficulty: e.target.value });
              fetchQuestions();
            }}
          >
            <MenuItem value="">All Levels</MenuItem>
            <MenuItem value="easy">Easy</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="hard">Hard</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Questions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Question</strong></TableCell>
              <TableCell align="center"><strong>Type</strong></TableCell>
              <TableCell align="center"><strong>Topic</strong></TableCell>
              <TableCell align="center"><strong>Difficulty</strong></TableCell>
              <TableCell align="center"><strong>Marks</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question._id} hover>
                <TableCell>
                  <Typography variant="subtitle2">
                    {question.questionText.substring(0, 50)}...
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip label={question.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="center">{question.topic}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={question.difficulty}
                    color={question.difficulty === 'easy' ? 'success' : question.difficulty === 'medium' ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">{question.marks}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleOpenDialog(question)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteQuestion(question._id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Question' : 'Add New Question'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Question Text *"
            multiline
            rows={3}
            value={formData.questionText}
            onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Type *</InputLabel>
            <Select
              value={formData.type}
              label="Type"
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <MenuItem value="mcq">Multiple Choice</MenuItem>
              <MenuItem value="true-false">True/False</MenuItem>
              <MenuItem value="short-answer">Short Answer</MenuItem>
              <MenuItem value="essay">Essay</MenuItem>
              <MenuItem value="matching">Matching</MenuItem>
            </Select>
          </FormControl>

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
            label="Topic *"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={formData.difficulty}
              label="Difficulty"
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            >
              <MenuItem value="easy">Easy</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="hard">Hard</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Marks"
            type="number"
            value={formData.marks}
            onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
            margin="normal"
            inputProps={{ min: 1 }}
          />

          {/* MCQ Options */}
          {formData.type === 'mcq' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Options</Typography>
              {formData.options.map((option, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={option.text}
                    onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                    placeholder="Option text"
                  />
                  <Button
                    variant={option.isCorrect ? 'contained' : 'outlined'}
                    onClick={() => handleOptionChange(idx, 'isCorrect', !option.isCorrect)}
                  >
                    {option.isCorrect ? '✓' : 'O'}
                  </Button>
                  <Button color="error" onClick={() => handleRemoveOption(idx)}>
                    Delete
                  </Button>
                </Box>
              ))}
              <Button variant="outlined" onClick={handleAddOption} fullWidth sx={{ mt: 1 }}>
                + Add Option
              </Button>
            </Box>
          )}

          <TextField
            fullWidth
            label="Correct Answer *"
            value={formData.correctAnswer}
            onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
            margin="normal"
            helperText="Enter the correct answer"
          />

          <TextField
            fullWidth
            label="Explanation"
            multiline
            rows={2}
            value={formData.explanation}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Image URL (optional)"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveQuestion}>
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuestionManagement;
