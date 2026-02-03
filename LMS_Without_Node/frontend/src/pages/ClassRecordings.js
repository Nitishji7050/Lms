import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Chip
} from '@mui/material';
import {
  PlayArrow,
  Delete,
  Close,
  Info as InfoIcon
} from '@mui/icons-material';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { fetchClassRecordings, deleteClassRecording, formatDuration, formatFileSize } from '../utils/recordingUtils';

const ClassRecordings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [liveClass, setLiveClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [playbackDialogOpen, setPlaybackDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRecordings();
  }, [id]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchClassRecordings(id, token);
      setLiveClass({
        classId: data.classId,
        title: data.title
      });
      setRecordings(data.recordings || []);
    } catch (err) {
      setError(err.message || 'Failed to load recordings');
      console.error('Error loading recordings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = (recording) => {
    setSelectedRecording(recording);
    setPlaybackDialogOpen(true);
  };

  const handleDeleteClick = (recording) => {
    setRecordingToDelete(recording);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordingToDelete) return;

    try {
      setDeleting(true);
      await deleteClassRecording(id, recordingToDelete._id, token);
      setRecordings(recordings.filter(r => r._id !== recordingToDelete._id));
      setDeleteConfirmOpen(false);
      setRecordingToDelete(null);
      alert('Recording deleted successfully');
    } catch (err) {
      alert('Failed to delete recording: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };


  const isInstructor = user?.role === 'teacher' || user?.role === 'admin';

  if (loading) {
    return (
      <Box>
        <Navbar />
        <Container sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            onClick={() => navigate(-1)}
            variant="text"
            sx={{ mb: 2 }}
          >
            ← Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Class Recordings
          </Typography>
          {liveClass && (
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {liveClass.title}
            </Typography>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* No Recordings */}
        {recordings.length === 0 && !error && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              No recordings available for this class
            </Typography>
          </Paper>
        )}

        {/* Recordings Grid */}
        <Grid container spacing={3}>
          {recordings.map((recording) => (
            <Grid item xs={12} sm={6} md={4} key={recording._id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}>
                {/* Thumbnail Placeholder */}
                <Box
                  sx={{
                    backgroundColor: '#f0f0f0',
                    height: 180,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23999" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9L10 7v10z"/></svg>')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundSize: '64px'
                  }}
                >
                  <IconButton
                    onClick={() => handlePlayRecording(recording)}
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)'
                      }
                    }}
                  >
                    <PlayArrow sx={{ fontSize: 32 }} />
                  </IconButton>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ mb: 1, wordBreak: 'break-word' }}>
                    {recording.fileName || 'Recording'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={formatDuration(recording.recordingDuration)}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={formatFileSize(recording.fileSize)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {new Date(recording.recordedAt).toLocaleString()}
                  </Typography>
                </CardContent>

                <CardActions sx={{ gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => handlePlayRecording(recording)}
                    sx={{ flex: 1 }}
                  >
                    Play
                  </Button>
                  
                  {isInstructor && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(recording)}
                    >
                      <Delete />
                    </IconButton>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Playback Dialog */}
        <Dialog
          open={playbackDialogOpen}
          onClose={() => setPlaybackDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recording Playback</span>
            <IconButton
              onClick={() => setPlaybackDialogOpen(false)}
              size="small"
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedRecording && (
              <Box sx={{ mt: 2 }}>
                <video
                  src={selectedRecording.cloudinaryUrl}
                  controls
                  controlsList="nodownload"
                  style={{
                    width: '100%',
                    maxHeight: '500px',
                    backgroundColor: '#000'
                  }}
                />
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">
                    Duration: {formatDuration(selectedRecording.recordingDuration)}
                  </Typography>
                  <Typography variant="subtitle2">
                    File Size: {formatFileSize(selectedRecording.fileSize)}
                  </Typography>
                  <Typography variant="subtitle2">
                    Recorded: {new Date(selectedRecording.recordedAt).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPlaybackDialogOpen(false)}>Close</Button>
            
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <DialogTitle>Delete Recording</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Are you sure you want to delete this recording? This action cannot be undone.
            </Alert>
            {recordingToDelete && (
              <Typography>
                {recordingToDelete.fileName || 'Recording'}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
              variant="contained"
              color="error"
              disabled={deleting}
            >
              {deleting ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ClassRecordings;
