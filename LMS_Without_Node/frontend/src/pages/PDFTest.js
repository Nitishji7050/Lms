import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PDFTest = () => {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleGenerateTest = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await axios.post(`${API_URL}/api/ai/pdf-test`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setQuestions(response.data);
    } catch (error) {
      alert('Error generating test. Make sure you have a valid OpenAI API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
    setSubmitted(true);
  };

  if (submitted && questions) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Your Score: {score} / {questions.questions.length}
            </Alert>
            <Button variant="outlined" onClick={() => {
              setFile(null);
              setQuestions(null);
              setAnswers({});
              setSubmitted(false);
              setScore(0);
            }}>
              Generate New Test
            </Button>
          </Paper>
        </Container>
      </>
    );
  }

  if (questions) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Test Yourself - Generated Questions
            </Typography>
            {questions.questions.map((q, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {index + 1}. {q.question}
                </Typography>
                {q.options.map((option, optIndex) => (
                  <Button
                    key={optIndex}
                    variant={answers[index] === optIndex ? 'contained' : 'outlined'}
                    onClick={() => setAnswers({ ...answers, [index]: optIndex })}
                    sx={{ display: 'block', mb: 1, textAlign: 'left' }}
                  >
                    {option}
                  </Button>
                ))}
              </Box>
            ))}
            <Button
              variant="contained"
              fullWidth
              onClick={handleSubmit}
            >
              Submit Test
            </Button>
          </Paper>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            PDF AI Test Generator
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload a PDF and let AI generate test questions for you to practice!
          </Typography>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 2
            }}
          >
            <input {...getInputProps()} />
            {file ? (
              <Typography>{file.name}</Typography>
            ) : (
              <Typography>
                {isDragActive
                  ? 'Drop the PDF here...'
                  : 'Drag & drop a PDF file here, or click to select'}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            fullWidth
            onClick={handleGenerateTest}
            disabled={!file || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate Test Questions'}
          </Button>
        </Paper>
      </Container>
    </>
  );
};

export default PDFTest;
