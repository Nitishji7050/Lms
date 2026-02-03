import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Button, Select, MenuItem, TextField, CircularProgress } from '@mui/material';
import axiosInstance from '../api/axiosConfig';
import DoubtForm from '../components/DoubtForm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DoubtsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');

  const handleDelete = async (d) => {
    if (!window.confirm('Permanently delete this doubt? This action is irreversible.')) return;
    try {
      await axiosInstance.delete(`/api/doubts/${d._id}`);
      await fetch();
      window.alert('Doubt permanently deleted');
    } catch (e) {
      console.error('delete doubt failed', e);
      window.alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/doubts', { params: { status: statusFilter || undefined, q: q || undefined } });
      setDoubts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [statusFilter, q]);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Doubts</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <DoubtForm onCreated={() => fetch()} />
        <Box sx={{ minWidth: 240 }}>
          <TextField label="Search" value={q} onChange={e => setQ(e.target.value)} fullWidth sx={{ mb: 1 }} />
          <Select fullWidth value={statusFilter} onChange={e => setStatusFilter(e.target.value)} displayEmpty>
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="answered">Answered</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
          </Select>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Upvotes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {doubts.map(d => (
                <TableRow key={d._id} hover>
                  <TableCell>{d.title}</TableCell>
                  <TableCell>{d.course?.title || '—'}</TableCell>
                  <TableCell>{d.student ? `${d.student.name}${d.student.role ? ` [${d.student.role}]` : ''}` : '—'}</TableCell>
                  <TableCell>{d.status}</TableCell> 
                  <TableCell>{d.upvotes?.length || 0}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => navigate(`/doubts/${d._id}`)}>View</Button>
                    <Button size="small" onClick={async () => { await axiosInstance.post(`/api/doubts/${d._id}/upvote`); fetch(); }}>Upvote</Button>
                    {user && (user.role === 'teacher' || user.role === 'admin' || (user.role === 'student' && (d.student?._id === user._id || d.student === user._id || d.studentEmail === user.email))) && (
                      <Button size="small" color="error" onClick={() => handleDelete(d)} sx={{ ml: 1 }}>Delete</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default DoubtsList;