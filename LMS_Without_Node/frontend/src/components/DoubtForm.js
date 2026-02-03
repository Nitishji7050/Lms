import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, FormControlLabel, Switch, MenuItem, Select, InputLabel, FormControl, Typography, Alert, Snackbar } from '@mui/material';
import axiosInstance from '../api/axiosConfig';

const DoubtForm = ({ onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [courses, setCourses] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axiosInstance.get('/api/courses');
        setCourses(res.data || []);
      } catch (e) {
        // ignore
      }
    };
    fetchCourses();
  }, []);

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

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLoading(true);
    const url = await uploadFile(f);
    if (url) setAttachments([url]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!title || !description || !course) return setError('Title, description and course required');
    setLoading(true);
    try {
      const payload = { title, description, course, isPrivate, attachments };
      const res = await axiosInstance.post('/api/doubts', payload);
      setTitle(''); setDescription(''); setCourse(''); setIsPrivate(false); setAttachments([]);
      setToast({ open: true, message: 'Doubt posted', severity: 'success' });
      if (onCreated) onCreated(res.data);
    } catch (err) {
      console.error('post doubt error:', err);
      const msg = err.response?.data?.message || 'Failed to post doubt';
      setError(msg);
      setToast({ open: true, message: msg, severity: 'error' });
    } finally { setLoading(false); }
  }; 

  return (
    <Box sx={{ mb: 2 }}>
      <TextField fullWidth label="Title" value={title} onChange={e => setTitle(e.target.value)} sx={{ mb: 1 }} />
      <TextField fullWidth label="Description" multiline rows={4} value={description} onChange={e => setDescription(e.target.value)} sx={{ mb: 1 }} />

      <FormControl fullWidth required sx={{ mb: 1 }}>
        <InputLabel>Course (required)</InputLabel>
        <Select value={course} label="Course (required)" onChange={e => setCourse(e.target.value)}>
          <MenuItem value="" disabled>Select a course</MenuItem>
          {courses.map(c => <MenuItem key={c._id} value={c._id}>{c.title}</MenuItem>)}
        </Select>
      </FormControl> 

      {/* Note: course is required now */}

      <FormControlLabel control={<Switch checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />} label="Private" />

      {/* attachments: file upload */}
      <input type="file" accept="image/*,application/pdf,video/*" onChange={handleFileChange} style={{ display: 'block', margin: '8px 0' }} />
      {attachments.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Attached: <a href={attachments[0]} target="_blank" rel="noreferrer">{attachments[0]}</a></Typography>
      )}
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <Button variant="contained" onClick={handleSubmit} disabled={loading}>{loading ? 'Posting...' : 'Post Doubt'}</Button>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(prev => ({ ...prev, open: false }))}>
        <Alert onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DoubtForm;