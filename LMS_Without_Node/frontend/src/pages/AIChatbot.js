import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Avatar,
  List,
  ListItem
} from '@mui/material';
import Navbar from '../components/Navbar';
import axios from 'axios';

const AIChatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI learning assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/ai/chat', {
        message: input,
        context: messages.slice(-5).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, height: '70vh', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h5" gutterBottom>
            AI Learning Assistant
          </Typography>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 2, bgcolor: 'grey.50' }}>
            <List>
              {messages.map((msg, index) => (
                <ListItem
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      maxWidth: '70%'
                    }}
                  >
                    <Avatar sx={{ bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                      {msg.role === 'user' ? 'U' : 'AI'}
                    </Avatar>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: msg.role === 'user' ? 'primary.light' : 'white',
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="body1">{msg.content}</Typography>
                    </Paper>
                  </Box>
                </ListItem>
              ))}
              {loading && (
                <ListItem>
                  <Typography variant="body2" color="text.secondary">
                    AI is thinking...
                  </Typography>
                </ListItem>
              )}
            </List>
            <div ref={messagesEndRef} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your courses..."
              disabled={loading}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              Send
            </Button>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default AIChatbot;
