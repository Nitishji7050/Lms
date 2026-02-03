import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const Doubts = () => {
  const [doubts, setDoubts] = useState([]);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const socket = io(SOCKET_URL);

  useEffect(() => {
    fetchDoubts();
    socket.on('new-message', (data) => {
      if (data.doubtId === selectedDoubt?._id) {
        fetchDoubts();
      }
    });
    return () => socket.disconnect();
  }, [selectedDoubt]);

  const fetchDoubts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/doubts`);
      setDoubts(response.data);
    } catch (error) {
      console.error('Error fetching doubts:', error);
    }
  };

  const handleOpenDoubt = async (doubtId) => {
    try {
      const response = await axios.get(`${API_URL}/api/doubts/${doubtId}`);
      setSelectedDoubt(response.data);
      setOpen(true);
    } catch (error) {
      console.error('Error fetching doubt:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    try {
      await axios.post(`${API_URL}/api/doubts/${selectedDoubt._id}/message`, {
        content: message
      });
      setMessage('');
      fetchDoubts();
      handleOpenDoubt(selectedDoubt._id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleCreateDoubt = async () => {
    // Implementation for creating new doubt
    setOpen(true);
    setSelectedDoubt(null);
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">
            Doubt Room
          </Typography>
          {user?.role === 'student' && (
            <Button variant="contained" onClick={handleCreateDoubt}>
              Ask a Question
            </Button>
          )}
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Your Doubts
              </Typography>
              <List>
                {doubts.map((doubt) => (
                  <ListItem
                    key={doubt._id}
                    button
                    onClick={() => handleOpenDoubt(doubt._id)}
                  >
                    <ListItemText
                      primary={doubt.subject}
                      secondary={doubt.course?.title || 'General'}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            {selectedDoubt && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {selectedDoubt.subject}
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
                    {selectedDoubt.messages.map((msg, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: (msg.sender._id || msg.sender.id) === (user._id || user.id) ? 'flex-end' : 'flex-start',
                          mb: 2
                        }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: (msg.sender._id || msg.sender.id) === (user._id || user.id) ? 'primary.light' : 'grey.200',
                            borderRadius: 2,
                            maxWidth: '70%'
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {msg.sender.name}
                          </Typography>
                          <Typography variant="body1">{msg.content}</Typography>
                          {msg.images && msg.images.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              {msg.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={`${API_URL}${img}`}
                                  alt="Message"
                                  style={{ maxWidth: '100%', marginTop: 8 }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                    />
                    <Button variant="contained" onClick={handleSendMessage}>
                      Send
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default Doubts;
