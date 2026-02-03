const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const io = socketIo(server, {
  cors: {
    origin: [FRONTEND_URL, "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
const corsOptions = {
  origin: [FRONTEND_URL, "http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Socket.io for live classes and real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const userName = typeof data === 'string' ? null : data.userName;
    
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // Notify all clients in room about new participant
    const participants = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    io.to(roomId).emit('participants', participants);
    socket.to(roomId).emit('user-joined', { userId: socket.id, socketId: socket.id, userName });
  });

  // Handle request for participants list
  socket.on('request-participants', (roomId) => {
    const participants = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    socket.emit('participants', participants);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
    io.to(roomId).emit('participants', Array.from(io.sockets.adapter.rooms.get(roomId) || []));
  });

  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('receive-message', data);
  });

  // Live class chat
  socket.on('chat-message', ({ roomId, message, sender, senderName }) => {
    io.to(roomId).emit('chat-message', { 
      message, 
      sender, 
      senderName, 
      timestamp: new Date().toISOString() 
    });
  });

  // WebRTC signaling events
  socket.on('webrtc-offer', ({ roomId, offer, to, from }) => {
    // If 'to' is specified, send to specific socket, otherwise broadcast to all in room except sender
    if (to) {
      socket.to(to).emit('webrtc-offer', { offer, from: socket.id });
    } else {
      socket.to(roomId).emit('webrtc-offer', { offer, from: socket.id });
    }
  });
  socket.on('webrtc-answer', ({ roomId, answer, to, from }) => {
    // If 'to' is specified, send to specific socket, otherwise broadcast to all in room except sender
    if (to) {
      socket.to(to).emit('webrtc-answer', { answer, from: socket.id });
    } else {
      socket.to(roomId).emit('webrtc-answer', { answer, from: socket.id });
    }
  });
  socket.on('webrtc-ice-candidate', ({ roomId, candidate, to, from }) => {
    // If 'to' is specified, send to specific socket, otherwise broadcast to all in room except sender
    if (to) {
      socket.to(to).emit('webrtc-ice-candidate', { candidate, from: socket.id });
    } else {
      socket.to(roomId).emit('webrtc-ice-candidate', { candidate, from: socket.id });
    }
  });

  // Teacher controls: add/remove student
  socket.on('remove-student', ({ roomId, studentSocketId }) => {
    socket.to(studentSocketId).emit('removed-from-class');
    io.to(roomId).emit('participants', Array.from(io.sockets.adapter.rooms.get(roomId) || []));
  });

  // Screen sharing
  socket.on('start-screen-share', ({ roomId, from }) => {
    socket.to(roomId).emit('screen-share-started', { from });
  });
  socket.on('stop-screen-share', ({ roomId, from }) => {
    socket.to(roomId).emit('screen-share-stopped', { from });
  });

  // Class ended event
  socket.on('class-ended', ({ classId }) => {
    io.emit('class-ended', { classId });
    console.log(`Class ${classId} ended, notifying all clients`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/doubts', require('./routes/doubts'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'LMS Server is running' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export io for use in routes
module.exports = { io };
