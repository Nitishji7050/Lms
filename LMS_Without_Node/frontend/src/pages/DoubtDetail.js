import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Box, Paper, Button, TextField, Divider, List, ListItem, ListItemText, Chip, Alert, IconButton, CircularProgress, Tooltip, Snackbar } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import axiosInstance from '../api/axiosConfig';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DoubtDetail = () => {
  const { id } = useParams();
  const [doubt, setDoubt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { user } = useAuth();

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/doubts/${id}`);
      setDoubt(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this doubt? This action is irreversible.')) return;
    try {
      await axiosInstance.delete(`/api/doubts/${id}`);
      window.alert('Doubt permanently deleted');
      navigate('/doubts');
    } catch (e) {
      console.error('delete doubt failed', e);
      setError(e.response?.data?.message || 'Failed to delete');
    }
  };

  const [attachments, setAttachments] = useState([]); // [{url, name}]
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const uploadFile = async (file) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axiosInstance.post('/api/upload/file', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.url;
    } catch (e) {
      console.error('Upload failed', e);
      setError('File upload failed');
      return null;
    }
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    for (const f of files) {
      try {
        const url = await uploadFile(f);
        if (url) {
          setAttachments(prev => [...prev, { url, name: f.name }]);
          uploaded++;
        }
      } catch (ex) {
        console.error('One file upload failed', ex);
        setError('One or more uploads failed');
        setToast({ open: true, message: 'One or more uploads failed', severity: 'error' });
      }
    }
    setUploading(false);
    if (uploaded > 0) setToast({ open: true, message: `Uploaded ${uploaded} file(s)`, severity: 'success' });
  }; 

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    await handleFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDrop = async (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); const files = Array.from(e.dataTransfer?.files || []); await handleFiles(files); };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const handleReply = async () => {
    if (!reply && attachments.length === 0) return;
    try {
      const urls = attachments.map(a => a.url);
      await axiosInstance.post(`/api/doubts/${id}/message`, { content: reply, attachments: urls });
      setReply('');
      setAttachments([]);
      fetch();
    } catch (e) { setError(e.response?.data?.message || 'Failed to send'); }
  };

  const markResolved = async () => {
    try {
      await axiosInstance.patch(`/api/doubts/${id}/status`, { status: 'resolved' });
      fetch();
    } catch (e) { setError(e.response?.data?.message || 'Failed to resolve'); }
  };

  const toggleUpvote = async () => {
    try {
      await axiosInstance.post(`/api/doubts/${id}/upvote`);
      fetch();
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
  };

  const togglePin = async (value) => {
    try {
      await axiosInstance.patch(`/api/doubts/${id}/pin`, { pinned: !!value });
      fetch();
    } catch (e) { setError(e.response?.data?.message || 'Failed to pin'); }
  };

  if (loading) return <Container sx={{ py: 4 }}>Loading...</Container>;
  if (error) return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!doubt) return null;

  return (
    <Container sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5">{doubt.title}</Typography>
        <Typography sx={{ mt: 1 }}>{doubt.description}</Typography>
        <Box sx={{ mt: 2 }}>
          <Chip label={`Status: ${doubt.status}`} />
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">Student: {doubt.student ? `${doubt.student.name}${doubt.student.role ? ` [${doubt.student.role}]` : ''}` : '—'}</Typography>
            {doubt.teacher ? <Typography variant="body2">Teacher: {`${doubt.teacher.name}${doubt.teacher.role ? ` [${doubt.teacher.role}]` : ''}`}</Typography> : null}
          </Box> 
        </Box>
        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="h6">Thread</Typography>
          <Button size="small" onClick={toggleUpvote}>Upvote ({doubt.upvotes?.length || 0})</Button>
          {doubt.pinned ? <Chip label="Pinned" color="primary" /> : null}
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" onClick={() => togglePin(!doubt.pinned)}>Toggle Pin</Button>
          {user && (user.role === 'teacher' || user.role === 'admin' || (user.role === 'student' && (doubt.student?._id === user._id || doubt.student === user._id || doubt.studentEmail === user.email))) && (
            <Button size="small" color="error" sx={{ ml: 1 }} onClick={handleDelete}>Delete</Button>
          )}
        </Box>

        <List>
          {doubt.messages.map((m, idx) => (
            <ListItem key={idx} alignItems="flex-start">
              <ListItemText primary={m.sender ? `${m.sender.name}${m.sender.role ? ` [${m.sender.role}]` : ''}` : 'Unknown'} secondary={<>
                <Typography sx={{ display: 'block' }}>{m.content}</Typography>
                {m.attachments?.length > 0 && m.attachments.map((a, i) => (
                  <Box key={i} sx={{ mt: 1 }}>
                    <a href={a} target="_blank" rel="noreferrer">Attachment {i + 1}</a>
                  </Box>
                ))}
                <Typography variant="caption">{new Date(m.timestamp).toLocaleString()}</Typography>
              </>} />
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 2 }}>
          {doubt.status === 'resolved' ? (
            <Alert severity="info">This doubt is resolved — replies are locked.</Alert>
          ) : (
            <>
              <TextField label="Write a reply" value={reply} onChange={e => setReply(e.target.value)} fullWidth multiline rows={3} sx={{ mb: 1 }} />

              <Box sx={{ mt: 1 }}>
                <Paper
                  variant="outlined"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  sx={{
                    p: 2,
                    borderStyle: 'dashed',
                    borderColor: dragActive ? 'primary.main' : 'grey.400',
                    backgroundColor: dragActive ? 'action.hover' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} multiple style={{ display: 'none' }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title="Add attachments">
                      <IconButton onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="add attachment">
                        <AttachFileIcon />
                      </IconButton>
                    </Tooltip>
                    {uploading && <CircularProgress size={20} />}
                    <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>Drag & drop files here, or click the attachment icon</Typography>
                  </Box>

                  <Box sx={{ flex: 1 }} />
                  <Button variant="contained" onClick={handleReply} disabled={uploading || (!reply && attachments.length === 0)}>Reply</Button>
                </Paper>
              </Box>

              {attachments.length > 0 && attachments.map((a, i) => (
                <Box key={i} sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <a href={a.url} target="_blank" rel="noreferrer">{a.name || `Attachment ${i + 1}`}</a>
                  <IconButton size="small" onClick={() => removeAttachment(i)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Box>
              ))}

              {(user && (user.role === 'teacher' || user.role === 'admin' || (user.role === 'student' && (doubt.student?._id === user._id || doubt.student === user._id || doubt.studentEmail === user.email)))) && (
                <Button variant="outlined" sx={{ ml: 1, mt: 1 }} onClick={markResolved}>Mark Resolved</Button>
              )}
            </>
          )}
        </Box>
      </Paper>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DoubtDetail;