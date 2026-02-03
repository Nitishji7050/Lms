import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Paper,
  Alert
} from '@mui/material';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/exams');
      setExams(response.data);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const handleStartExam = async (examId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/exams/${examId}`);
      setSelectedExam(response.data);
      setAnswers({});
      setSubmitted(false);
      setResult(null);
    } catch (error) {
      console.error('Error fetching exam:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const answerArray = selectedExam.questions.map((q, index) => ({
        selectedAnswer: answers[index] || -1
      }));
      const response = await axios.post(
        `http://localhost:5000/api/exams/${selectedExam._id}/submit`,
        { answers: answerArray }
      );
      setResult(response.data);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting exam:', error);
    }
  };

  if (selectedExam && !submitted) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              {selectedExam.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {selectedExam.description}
            </Typography>
            <Typography variant="body2" paragraph>
              Duration: {selectedExam.duration} minutes
            </Typography>
            {selectedExam.questions.map((question, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {index + 1}. {question.question}
                </Typography>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={answers[index] || ''}
                    onChange={(e) => setAnswers({ ...answers, [index]: parseInt(e.target.value) })}
                  >
                    {question.options.map((option, optIndex) => (
                      <FormControlLabel
                        key={optIndex}
                        value={optIndex}
                        control={<Radio />}
                        label={option}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>
            ))}
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
              sx={{ mt: 3 }}
            >
              Submit Exam
            </Button>
          </Paper>
        </Container>
      </>
    );
  }

  if (submitted && result) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Alert severity={result.passed ? 'success' : 'warning'} sx={{ mb: 2 }}>
              {result.passed ? 'Congratulations! You passed!' : 'You did not pass. Try again!'}
            </Alert>
            <Typography variant="h5" gutterBottom>
              Your Score: {result.score} / {result.totalMarks}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                setSelectedExam(null);
                setSubmitted(false);
                setResult(null);
              }}
            >
              Back to Exams
            </Button>
          </Paper>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Online Exams
        </Typography>
        <Grid container spacing={3}>
          {exams.map((exam) => (
            <Grid item xs={12} md={6} key={exam._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {exam.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {exam.description}
                  </Typography>
                  <Typography variant="body2">
                    Course: {exam.course?.title}
                  </Typography>
                  <Typography variant="body2">
                    Duration: {exam.duration} minutes
                  </Typography>
                  <Typography variant="body2">
                    Total Marks: {exam.totalMarks}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    onClick={() => handleStartExam(exam._id)}
                  >
                    Start Exam
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

export default Exams;
