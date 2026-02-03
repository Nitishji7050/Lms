import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Avatar,
  Grid
} from '@mui/material';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.profile?.bio || '',
    phone: user?.profile?.phone || '',
    address: user?.profile?.address || ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/profile`);
      setProfile({
        name: response.data.name,
        email: response.data.email,
        bio: response.data.profile?.bio || '',
        phone: response.data.profile?.phone || '',
        address: response.data.profile?.address || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/users/profile`, {
        name: profile.name,
        profile: {
          bio: profile.bio,
          phone: profile.phone,
          address: profile.address
        }
      });
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Error updating profile');
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 100, height: 100, mb: 2 }}>
              {profile.name.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h5">{profile.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.role}
            </Typography>
          </Box>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={profile.email}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  multiline
                  rows={3}
                  value={profile.bio}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" fullWidth>
                  Update Profile
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </>
  );
};

export default Profile;
