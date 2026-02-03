import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Register = () => {
  const [step, setStep] = useState(0); // 0: Form, 1: OTP Verification
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const navigate = useNavigate();

  // Timer for resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/send-otp`, {
        email: formData.email,
        name: formData.name,
        password: formData.password
      });

      setSuccess(response.data.message);
      setStep(1); // Move to OTP verification
      setTimer(300); // 5 minutes timer
      setOtp('');
      setAttemptsRemaining(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter OTP');
      return;
    }

    if (otp.length !== 4) {
      setError('OTP must be 4 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        email: formData.email,
        otp: otp
      });

      // Store token
      localStorage.setItem('token', response.data.token);
      setSuccess('Registration successful! Redirecting to dashboard...');
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      const remaining = err.response?.data?.attemptsRemaining;
      if (remaining !== undefined) {
        setAttemptsRemaining(remaining);
      }
      setError(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/resend-otp`, {
        email: formData.email
      });

      setSuccess('New OTP sent to your email');
      setTimer(300); // Reset timer to 5 minutes
      setOtp('');
      setAttemptsRemaining(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep(0);
    setOtp('');
    setError('');
    setSuccess('');
    setTimer(0);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Register
          </Typography>

          {/* Stepper */}
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Registration Details</StepLabel>
            </Step>
            <Step>
              <StepLabel>Email Verification</StepLabel>
            </Step>
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {step === 0 ? (
            // Step 1: Registration Form
            <form onSubmit={handleSendOTP}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
                helperText="Minimum 6 characters"
              />
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Send OTP'}
              </Button>
              <Typography align="center" sx={{ mt: 2 }}>
                Already have an account? <Link to="/login" style={{ textDecoration: 'none', color: '#007bff' }}>Login</Link>
              </Typography>
            </form>
          ) : (
            // Step 2: OTP Verification
            <form onSubmit={handleVerifyOTP}>
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                We've sent a 4-digit OTP to <strong>{formData.email}</strong>
              </Typography>

              <TextField
                fullWidth
                label="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 4))}
                margin="normal"
                required
                disabled={loading}
                placeholder="0000"
                inputProps={{ maxLength: 4, style: { fontSize: '24px', letterSpacing: '10px', textAlign: 'center' } }}
              />

              <Box sx={{ mt: 2, mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Attempts remaining: <strong style={{ color: attemptsRemaining <= 1 ? 'red' : 'orange' }}>{attemptsRemaining}</strong>
                </Typography>
                <br />
                <Typography variant="caption" sx={{ color: '#666' }}>
                  OTP expires in: <strong>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</strong>
                </Typography>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, mb: 1 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify & Complete Registration'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleResendOTP}
                disabled={timer > 0 || loading}
                sx={{ mb: 2 }}
              >
                {timer > 0 ? `Resend OTP in ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}` : 'Resend OTP'}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={handleBackToForm}
                disabled={loading}
              >
                Back to Form
              </Button>
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
