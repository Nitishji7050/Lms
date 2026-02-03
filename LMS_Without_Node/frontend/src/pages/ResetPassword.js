import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    // Verify the reset token when page loads
    const verifyToken = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/verify-reset-token/${token}`);
        setEmail(response.data.email);
        setTokenValid(true);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired reset link');
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setError('No reset token provided');
      setVerifying(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword
      });

      setSuccess(response.data.message);
      setNewPassword('');
      setConfirmPassword('');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            mt: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px'
          }}
        >
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Verifying reset link...</Typography>
        </Box>
      </Container>
    );
  }

  if (!tokenValid) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom color="error">
              Invalid Reset Link
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Typography sx={{ mb: 3 }}>
              The password reset link has expired or is invalid. Please request a new one.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              component={Link}
              to="/login"
            >
              Back to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Reset Password
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
            Email: {email}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              helperText="Must be at least 6 characters"
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? <CircularProgress size={24} /> : 'Reset Password'}
            </Button>
            <Typography align="center">
              <Link to="/login" style={{ textDecoration: 'none', color: '#007bff' }}>
                Back to Login
              </Link>
            </Typography>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPassword;
