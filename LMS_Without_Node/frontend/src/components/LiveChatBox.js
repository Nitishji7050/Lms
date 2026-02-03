import React, { useEffect, useRef, memo } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton
} from '@mui/material';

// Memoized chat component to prevent re-renders
const LiveChatBox = memo(({
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  userId,
  userName,
  showChat,
  setShowChat,
  isTeacher
}) => {
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <Paper sx={{ p: 2, height: '500px', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Live Chat</Typography>
        <IconButton size="small" onClick={() => setShowChat(!showChat)}>
          {showChat ? '−' : '+'}
        </IconButton>
      </Box>
      {showChat && (
        <>
          <Box 
            ref={chatContainerRef}
            sx={{ 
              flexGrow: 1, 
              overflowY: 'auto', 
              mb: 2, 
              border: '1px solid #ddd', 
              borderRadius: 1, 
              p: 1, 
              bgcolor: '#f9f9f9'
            }}
          >
            {chatMessages.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                No messages yet. Start the conversation!
              </Typography>
            ) : (
              chatMessages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    mb: 1.5,
                    p: 1.5,
                    bgcolor: (msg.sender === (userId)) ? 'primary.light' : 'white',
                    borderRadius: 1,
                    border: '1px solid #e0e0e0',
                    maxWidth: '85%',
                    ml: (msg.sender === (userId)) ? 'auto' : 0,
                    mr: (msg.sender === (userId)) ? 0 : 'auto'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    display="block" 
                    sx={{ mb: 0.5 }}
                  >
                    <strong>{msg.senderName}</strong> {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2">{msg.message}</Typography>
                </Box>
              ))
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
            />
            <Button 
              variant="contained" 
              onClick={sendChatMessage} 
              disabled={!chatInput.trim()}
            >
              Send
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
});

LiveChatBox.displayName = 'LiveChatBox';

export default LiveChatBox;
