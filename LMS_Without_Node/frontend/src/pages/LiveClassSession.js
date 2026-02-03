import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LiveChatBox from '../components/LiveChatBox';
import VideoRenderer from '../components/VideoRenderer';
import {
  Container,
  Box,
  Button,
  Paper,
  Typography,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  ScreenShare,
  StopScreenShare,
  CallEnd,
  PersonRemove,
  PersonAdd,
  FiberManualRecord,
  Stop
} from '@mui/icons-material';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';
import { uploadRecordingToBackend } from '../utils/recordingUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const LiveClassSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liveClass, setLiveClass] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [socketIdMap, setSocketIdMap] = useState({}); // Map socket IDs to user info
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);

  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const screenStreamRef = useRef(null);
  const recordingStreamRef = useRef(null);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchLiveClass();
    initializeSocket();
    return () => {
      cleanup();
    };
  }, [id]);

  // Update local video when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream && !isScreenSharing) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => console.error('Error playing local video:', err));
    }
  }, [localStream, isScreenSharing]);

  const fetchLiveClass = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/classes/${id}`);
      setLiveClass(response.data);
      if (response.data.status !== 'live' && isTeacher) {
        // Teacher can start the class
        await axios.put(`${API_URL}/api/classes/${id}`, { status: 'live' });
        setLiveClass({ ...response.data, status: 'live' });
      }
    } catch (error) {
      console.error('Error fetching live class:', error);
    }
  };

  const initializeSocket = async () => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    // Send user info when joining room
    socket.emit('join-room', { roomId: id, userId: user._id || user.id, userName: user.name });
    
    socket.on('participants', async (participantSocketIds) => {
      setParticipants(participantSocketIds);
      console.log('Participants updated:', participantSocketIds, 'My socket:', socket.id, 'localStream ready:', !!localStream);
      
      // If teacher, create offers for all participants (students)
      if (isTeacher) {
        // Wait for local stream to be ready
        const waitForStream = () => {
          const streamAvailable = localStream || recordingStreamRef.current;
          console.log('Checking for stream... localStream:', !!localStream, 'recordingStreamRef:', !!recordingStreamRef.current);
          
          if (streamAvailable) {
            setTimeout(async () => {
              const students = participantSocketIds.filter(id => id !== socket.id);
              console.log('Teacher: Found students to connect to:', students);
              for (const participantSocketId of students) {
                if (!peerConnectionsRef.current[participantSocketId]) {
                  console.log('Teacher: Creating offer for student:', participantSocketId);
                  await createOfferForParticipant(participantSocketId, streamAvailable);
                  // Small delay between offers
                  await new Promise(resolve => setTimeout(resolve, 200));
                } else {
                  console.log('Teacher: Already connected to:', participantSocketId);
                }
              }
            }, 500);
          } else {
            // If stream not ready, wait and try again
            console.log('Teacher: Waiting for local stream before creating offers...');
            setTimeout(waitForStream, 200);
          }
        };
        waitForStream();
      } else {
        console.log('Student: Current participants:', participantSocketIds);
      }
    });

    socket.on('webrtc-offer', async (data) => {
      console.log('Student received offer:', data);
      setConnectionStatus('Receiving offer...');
      await handleOffer(data);
    });

    socket.on('webrtc-answer', async (data) => {
      await handleAnswer(data);
    });

    socket.on('webrtc-ice-candidate', async (data) => {
      await handleIceCandidate(data);
    });

    socket.on('removed-from-class', () => {
      alert('You have been removed from the class');
      navigate('/live-classes');
    });

    socket.on('class-ended', ({ classId }) => {
      if (!isTeacher) {
        setAlertMessage('The class has ended by the instructor. You will be redirected shortly.');
        setTimeout(() => {
          cleanup();
          navigate('/live-classes');
        }, 2000);
      }
    });

    socket.on('screen-share-started', ({ from }) => {
      // Handle screen share started
    });

    socket.on('screen-share-stopped', ({ from }) => {
      // Handle screen share stopped
    });

    // Live chat messages
    socket.on('chat-message', (data) => {
      console.log('Chat message received:', data);
      setChatMessages(prev => [...prev, {
        ...data,
        id: Date.now() + Math.random()
      }]);
    });

    socket.on('user-joined', async ({ userId, socketId, userName }) => {
      console.log('User joined event received:', socketId, 'Is teacher:', isTeacher, 'My socket:', socket.id);
      setSocketIdMap(prev => ({ ...prev, [socketId]: { userId, userName } }));
      if (isTeacher && socketId !== socket.id) {
        console.log('Teacher: Student joined, will create offer');
        // Wait for local stream to be ready before creating offer
        const waitForStream = () => {
          const streamAvailable = localStream || recordingStreamRef.current;
          if (streamAvailable) {
            setTimeout(async () => {
              if (!peerConnectionsRef.current[socketId]) {
                console.log('Teacher: Creating offer for newly joined student:', socketId);
                await createOfferForParticipant(socketId, streamAvailable);
              } else {
                console.log('Teacher: Peer connection already exists for:', socketId);
              }
            }, 1000); // Increased delay to ensure everything is ready
          } else {
            console.log('Teacher: Waiting for local stream...');
            setTimeout(waitForStream, 200);
          }
        };
        waitForStream();
      } else if (!isTeacher) {
        console.log('Student: Waiting for teacher to send offer...');
        setConnectionStatus('Waiting for teacher...');
      }
    });

    await startLocalStream();
  };

  const createOfferForParticipant = async (participantSocketId, streamToUse = null) => {
    const streamForOffer = streamToUse || screenStreamRef.current || localStream;
    
    if (!streamForOffer) {
      console.warn('Cannot create offer: local stream not ready. Will retry...');
      // Retry after a delay
      setTimeout(() => {
        createOfferForParticipant(participantSocketId, streamToUse);
      }, 500);
      return;
    }
    
    console.log('Creating peer connection for participant:', participantSocketId, 'Stream available:', !!streamForOffer);
    
    if (peerConnectionsRef.current[participantSocketId]) {
      console.log('Peer connection already exists for:', participantSocketId);
      return;
    }
    
    const peerConnection = createPeerConnection(participantSocketId, streamForOffer);
    peerConnectionsRef.current[participantSocketId] = peerConnection;

    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.setLocalDescription(offer);

      socketRef.current.emit('webrtc-offer', {
        roomId: id,
        offer,
        to: participantSocketId, // Send specifically to this participant
        from: socketRef.current.id
      });
      console.log('Offer sent to participant:', participantSocketId, 'Offer type:', offer.type);
    } catch (error) {
      console.error('Error creating offer:', error);
      // Remove from peer connections if offer creation failed
      delete peerConnectionsRef.current[participantSocketId];
    }
  };

  const startLocalStream = async () => {
    try {
      // Only teachers need camera/microphone
      if (isTeacher) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        });
        console.log('Local stream obtained:', stream.id);
        console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
        setLocalStream(stream);
        recordingStreamRef.current = stream;
        
        // Use useEffect to update video element when stream is ready
        setTimeout(() => {
          if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(err => console.error('Error playing local stream:', err));
            console.log('Local video element updated');
          }
        }, 100);
        
        // Request participants list to create offers
        if (socketRef.current) {
          setTimeout(() => {
            console.log('Teacher: Requesting participants list...');
            socketRef.current.emit('request-participants', id);
          }, 1500);
        }
      } else {
        // Students don't need camera/microphone, just wait for teacher's stream
        setConnectionStatus('Connected. Waiting for teacher...');
        // Still request participants to trigger connection
        if (socketRef.current) {
          setTimeout(() => {
            socketRef.current.emit('request-participants', id);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      if (isTeacher) {
        setAlertMessage('Unable to access camera/microphone. Please check permissions: ' + error.message);
      }
    }
  };

  const createPeerConnection = (socketId, streamToAdd = null) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream tracks (only teachers send video/audio)
    if (isTeacher) {
      const streamToUse = streamToAdd || screenStreamRef.current || localStream;
      if (streamToUse) {
        console.log('Adding stream tracks to peer connection for', socketId, 'Tracks:', streamToUse.getTracks().map(t => t.kind));
        // Check if tracks are already added to avoid duplicates
        const existingSenders = peerConnection.getSenders();
        streamToUse.getTracks().forEach(track => {
          // Check if this track is already added
          const alreadyAdded = existingSenders.some(sender => sender.track && sender.track.id === track.id);
          if (!alreadyAdded && (track.readyState === 'live' || track.readyState === 'ended')) {
            try {
              peerConnection.addTrack(track, streamToUse);
              console.log('Added track to peer connection:', track.kind, track.id, track.readyState);
            } catch (error) {
              console.error('Error adding track:', error);
            }
          }
        });
      } else {
        console.warn('No local stream available when creating peer connection for:', socketId);
      }
    }
    // Students don't send tracks, they only receive

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from:', socketId, event.streams);
      const remoteStream = event.streams[0] || event.streams;
      if (remoteStream) {
        console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })));
        setRemoteStreams(prev => ({
          ...prev,
          [socketId]: remoteStream
        }));
        
        if (!isTeacher) {
          setConnectionStatus('Video stream received!');
          console.log('Student: Teacher stream received!');
        }
        
        // Force re-render to update video elements
        setTimeout(() => {
          const videoElements = document.querySelectorAll(`video[data-socket-id="${socketId}"]`);
          videoElements.forEach(videoEl => {
            if (videoEl && remoteStream) {
              videoEl.srcObject = remoteStream;
              videoEl.play().catch(err => console.error('Error playing video:', err));
            }
          });
        }, 100);
        
        // If student receives teacher's stream, also update main video if needed
        if (!isTeacher && remoteStream.getVideoTracks().length > 0) {
          console.log('Teacher stream received, updating display');
        }
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-ice-candidate', {
          roomId: id,
          candidate: event.candidate,
          to: socketId, // Send to the specific peer
          from: socketRef.current.id
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('Peer connection state changed to:', peerConnection.connectionState, 'for socket:', socketId);
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        console.log('Peer connection failed/disconnected, removing:', socketId);
        delete peerConnectionsRef.current[socketId];
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[socketId];
          return newStreams;
        });
      }
      if (peerConnection.connectionState === 'connected' || peerConnection.connectionState === 'completed') {
        console.log('Peer connection established with:', socketId);
        if (!isTeacher) {
          setConnectionStatus('Connected!');
        }
      }
    };

    // Monitor ICE connection state separately
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState, 'for socket:', socketId);
    };

    return peerConnection;
  };

  const handleOffer = async (data) => {
    try {
      const { offer, from } = data;
      // 'from' is socket ID of the person sending the offer (usually teacher)
      const socketId = from;
      console.log('Student: Received offer from teacher:', socketId);
      setConnectionStatus('Connecting to teacher...');
      
      let peerConnection = peerConnectionsRef.current[socketId];
      
      if (!peerConnection) {
        // Create new peer connection for this sender
        console.log('Student: Creating new peer connection for teacher:', socketId);
        peerConnection = createPeerConnection(socketId);
        peerConnectionsRef.current[socketId] = peerConnection;
      }

      // Set remote description (the offer)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Student: Set remote description');
      
      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log('Student: Created answer');

      // Find the socket ID that sent the offer (teacher)
      const teacherSocketId = socketId;
      socketRef.current.emit('webrtc-answer', {
        roomId: id,
        answer,
        to: teacherSocketId, // Send answer back to the teacher
        from: socketRef.current.id
      });
      
      console.log('Student: Sent answer to teacher:', socketId);
      setConnectionStatus('Connected! Waiting for video...');
    } catch (error) {
      console.error('Error handling offer:', error);
      setConnectionStatus('Connection error: ' + error.message);
    }
  };

  const handleAnswer = async (data) => {
    const { answer, from } = data;
    // 'from' is socket ID
    const peerConnection = peerConnectionsRef.current[from];
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    }
  };

  const handleIceCandidate = async (data) => {
    const { candidate, from } = data;
    // Use 'from' to identify which peer connection to add candidate to
    const peerConnection = peerConnectionsRef.current[from];
    if (peerConnection && candidate) {
      try {
        console.log('Adding ICE candidate to peer connection:', from);
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate for', from, ':', error);
      }
    } else {
      console.warn('No peer connection found for socket ID:', from, 'Available connections:', Object.keys(peerConnectionsRef.current));
    }
  };

  const toggleVideo = () => {
    if (localStream && isTeacher) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream && isTeacher) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
      }
    }
  };

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim() || !socketRef.current) return;
    
    const messageData = {
      roomId: id,
      message: chatInput.trim(),
      sender: user._id || user.id,
      senderName: user.name
    };
    
    socketRef.current.emit('chat-message', messageData);
    setChatInput('');
  }, [chatInput, id, user]);

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      screenStreamRef.current = screenStream;

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Replace local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      // If recording is active, update the recording stream to include screen share
      if (isRecording && mediaRecorder) {
        const audioTrack = localStream?.getAudioTracks()[0];
        if (audioTrack) {
          // Create a new stream combining screen video + camera audio
          const recordingStream = new MediaStream();
          recordingStream.addTrack(videoTrack);
          recordingStream.addTrack(audioTrack);
          // Restart recorder with new composite stream
          restartRecorderWithNewStream(recordingStream);
        } else {
          // Restart recorder with screen stream only if no audio available
          restartRecorderWithNewStream(screenStream);
        }
      }

      setIsScreenSharing(true);
      socketRef.current.emit('start-screen-share', {
        roomId: id,
        from: socketRef.current.id
      });

      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera stream
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // If recording is active, restart recorder with camera stream
      if (isRecording && mediaRecorder && localStream) {
        restartRecorderWithNewStream(localStream);
      }
    }

    setIsScreenSharing(false);
    socketRef.current.emit('stop-screen-share', {
      roomId: id,
      from: socketRef.current.id
    });
  };

  // Helper function to restart MediaRecorder with new stream
  const restartRecorderWithNewStream = (newStream) => {
    try {
      // Stop current recorder if active
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }

      recordingStreamRef.current = newStream;

      const recorder = new MediaRecorder(newStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        await uploadRecording(blob);
        setRecordedChunks([]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      console.log('MediaRecorder restarted with new stream');
    } catch (error) {
      console.error('Error restarting recorder:', error);
      alert('Error updating recording stream: ' + error.message);
    }
  };

  const startRecording = async () => {
    try {
      // Use the current active stream (camera + audio by default)
      let recordingStream;
      
      if (isScreenSharing && screenStreamRef.current) {
        // If screen sharing is active, combine screen video with camera audio
        const screenVideoTrack = screenStreamRef.current.getVideoTracks()[0];
        const audioTrack = localStream?.getAudioTracks()[0];
        
        recordingStream = new MediaStream();
        if (screenVideoTrack) recordingStream.addTrack(screenVideoTrack);
        if (audioTrack) recordingStream.addTrack(audioTrack);
      } else {
        // Use camera stream normally
        recordingStream = localStream;
      }

      if (!recordingStream) {
        alert('No stream available for recording');
        return;
      }

      recordingStreamRef.current = recordingStream;

      const recorder = new MediaRecorder(recordingStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        await uploadRecording(blob);
        setRecordedChunks([]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const uploadRecording = async (blob) => {
    try {
      // Calculate recording duration
      const recordingDuration = recordedChunks.length > 0 ? Math.floor(Date.now() / 1000) : 0;
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication token expired. Please log in again.');
        return;
      }
      
      // Upload to Cloudinary via backend
      const result = await uploadRecordingToBackend(blob, id, recordingDuration, token);
      
      alert('Recording uploaded to Cloudinary successfully!');
      console.log('Recording uploaded:', result);
    } catch (error) {
      console.error('Error uploading recording:', error);
      alert('Failed to upload recording: ' + error.message);
    }
  };

  const removeStudent = async (studentSocketId) => {
    if (window.confirm('Remove this student from the class?')) {
      try {
        // Find participant ID from socket ID (this is simplified - in production you'd map socket IDs to user IDs)
        socketRef.current.emit('remove-student', {
          roomId: id,
          studentSocketId
        });
        // Also remove from database if we have participant ID
        // await axios.delete(`http://localhost:5000/api/classes/${id}/participant/${participantId}`);
      } catch (error) {
        console.error('Error removing student:', error);
      }
    }
  };

  const leaveClass = async () => {
    try {
      if (isTeacher && liveClass) {
        // Teacher ends the class using the new endpoint
        await axios.post(`${API_URL}/api/classes/${id}/end`, {}, {
          headers: { Authorization: `Bearer ${user?.token || localStorage.getItem('token')}` }
        });
        // Emit socket event to notify all participants
        if (socketRef.current) {
          socketRef.current.emit('class-ended', { classId: id });
        }
      }
      cleanup();
      navigate('/live-classes');
    } catch (error) {
      console.error('Error ending class:', error);
      // Still redirect even if error
      cleanup();
      navigate('/live-classes');
    }
  };

  const cleanup = () => {
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('leave-room', id);
      socketRef.current.disconnect();
    }
  };

  if (!liveClass) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
        {alertMessage && (
          <Alert severity="warning" onClose={() => setAlertMessage('')} sx={{ mb: 2 }}>
            {alertMessage}
          </Alert>
        )}
        {!isTeacher && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {connectionStatus}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">{liveClass.title}</Typography>
            <Box>
              {isTeacher && (
                <Button
                  variant="outlined"
                  onClick={() => setShowParticipants(true)}
                  sx={{ mr: 1 }}
                >
                  Participants ({participants.length})
                </Button>
              )}
              <Button
                variant="contained"
                color="error"
                startIcon={<CallEnd />}
                onClick={leaveClass}
              >
                Leave Class
              </Button>
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={2}>
          {/* Main Video Area */}
          <Grid item xs={12} md={isTeacher ? 9 : 8}>
            <VideoRenderer 
              remoteStreams={remoteStreams}
              localStream={localStream}
              localVideoRef={localVideoRef}
              isTeacher={isTeacher}
              isRecording={isRecording}
            />
          </Grid>

          {/* Teacher Controls Sidebar */}
          {isTeacher && (
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Controls
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant={isVideoOn ? 'contained' : 'outlined'}
                    startIcon={isVideoOn ? <Videocam /> : <VideocamOff />}
                    onClick={toggleVideo}
                    fullWidth
                  >
                    {isVideoOn ? 'Video On' : 'Video Off'}
                  </Button>
                  <Button
                    variant={isAudioOn ? 'contained' : 'outlined'}
                    startIcon={isAudioOn ? <Mic /> : <MicOff />}
                    onClick={toggleAudio}
                    fullWidth
                  >
                    {isAudioOn ? 'Mic On' : 'Mic Off'}
                  </Button>
                  <Button
                    variant={isScreenSharing ? 'contained' : 'outlined'}
                    color={isScreenSharing ? 'error' : 'primary'}
                    startIcon={isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
                    onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                    fullWidth
                  >
                    {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                  </Button>
                  {isRecording ? (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Stop />}
                      onClick={stopRecording}
                      fullWidth
                    >
                      Stop Recording
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<FiberManualRecord />}
                      onClick={startRecording}
                      fullWidth
                    >
                      Start Recording
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Live Chat - Available for all */}
          <Grid item xs={12} md={isTeacher ? 3 : 4}>
            <LiveChatBox 
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChatMessage={sendChatMessage}
              userId={user._id || user.id}
              userName={user.name}
              showChat={showChat}
              setShowChat={setShowChat}
              isTeacher={isTeacher}
            />
          </Grid>
        </Grid>

        {/* Participants Dialog */}
        <Dialog open={showParticipants} onClose={() => setShowParticipants(false)}>
          <DialogTitle>Participants ({participants.length})</DialogTitle>
          <DialogContent>
            <List>
              {participants.map((participantSocketId, index) => {
                const participantInfo = socketIdMap[participantSocketId];
                const participantName = participantInfo?.userName || `Participant ${index + 1}`;
                return (
                  <ListItem key={participantSocketId}>
                    <ListItemText primary={participantName} />
                    {isTeacher && (
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => removeStudent(participantSocketId)}
                        >
                          <PersonRemove />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowParticipants(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default LiveClassSession;
