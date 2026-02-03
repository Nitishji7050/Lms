import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Dialog,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [openForgot, setOpenForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleForgotPasswordClick = () => {
    setOpenForgot(true);
    setForgotError('');
    setForgotSuccess('');
    setForgotEmail('');
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email: forgotEmail
      });

      setForgotSuccess(response.data.message);
      setForgotEmail('');
      
      // Close dialog after 3 seconds
      setTimeout(() => {
        setOpenForgot(false);
      }, 3000);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Login
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Login
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Typography>
                Don't have an account? <Link to="/register" style={{ textDecoration: 'none', color: '#007bff' }}>Register</Link>
              </Typography>
            </Box>
            <Button
              fullWidth
              variant="text"
              onClick={handleForgotPasswordClick}
              sx={{ mt: 1, textTransform: 'none', color: '#007bff' }}
            >
              Forgot Password?
            </Button>
          </form>
        </Paper>
      </Box>

      {/* Forgot Password Dialog */}
      <Dialog open={openForgot} onClose={() => setOpenForgot(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Reset Password
          </Typography>
          {forgotError && <Alert severity="error" sx={{ mb: 2 }}>{forgotError}</Alert>}
          {forgotSuccess && <Alert severity="success" sx={{ mb: 2 }}>{forgotSuccess}</Alert>}
          <form onSubmit={handleForgotPasswordSubmit}>
            <TextField
              fullWidth
              label="Enter your registered email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              margin="normal"
              required
              disabled={loading}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="contained"
                fullWidth
                type="submit"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setOpenForgot(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </Dialog>
    </Container>
  );
};

export default Login;
