import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  FormControl
} from '@mui/material';
import { Delete, Add, Search } from '@mui/icons-material';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalExams: 0,
    totalClasses: 0
  });
  const [users, setUsers] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchEmail, setSearchEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Delete confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Add teacher form states
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '' });
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [teacherFormError, setTeacherFormError] = useState('');
  
  // Add admin form states
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminFormError, setAdminFormError] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchLiveClasses(),
        fetchStudents(),
        fetchTeachers(),
        fetchAdmins()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, coursesRes, examsRes, classesRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/courses`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/exams`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/classes`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats({
        totalUsers: usersRes.data.length,
        totalCourses: coursesRes.data.length,
        totalExams: examsRes.data.length,
        totalClasses: classesRes.data.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStudents = async (email = '') => {
    try {
      const params = email ? { email } : {};
      const response = await axios.get(`${API_URL}/api/users/students`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students');
    }
  };

  const fetchTeachers = async (email = '') => {
    try {
      const params = email ? { email } : {};
      const response = await axios.get(`${API_URL}/api/users/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setError('Failed to fetch teachers');
    }
  };

  const fetchAdmins = async (email = '') => {
    try {
      const params = email ? { email } : {};
      const response = await axios.get(`${API_URL}/api/users/admins`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
      setError('Failed to fetch admins');
    }
  };

  const fetchLiveClasses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLiveClasses(response.data);
    } catch (error) {
      console.error('Error fetching live classes:', error);
    }
  };

  const handleSearchStudents = (e) => {
    const email = e.target.value;
    setSearchEmail(email);
    if (email.trim()) {
      fetchStudents(email);
    } else {
      fetchStudents();
    }
  };

  const handleSearchTeachers = (e) => {
    const email = e.target.value;
    setSearchEmail(email);
    if (email.trim()) {
      fetchTeachers(email);
    } else {
      fetchTeachers();
    }
  };

  const handleSearchAdmins = (e) => {
    const email = e.target.value;
    setSearchEmail(email);
    if (email.trim()) {
      fetchAdmins(email);
    } else {
      fetchAdmins();
    }
  };

  const handleDeleteClick = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setDeleting(true);
      
      if (deleteType === 'student' || deleteType === 'teacher') {
        // Delete user
        await axios.delete(`${API_URL}/api/users/${itemToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (deleteType === 'student') {
          setStudents(students.filter(s => s._id !== itemToDelete._id));
        } else {
          setTeachers(teachers.filter(t => t._id !== itemToDelete._id));
        }
        setSuccessMessage(`${deleteType === 'student' ? 'Student' : 'Teacher'} deleted successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else if (deleteType === 'class') {
        // Delete live class
        await axios.delete(`${API_URL}/api/classes/${itemToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLiveClasses(liveClasses.filter(c => c._id !== itemToDelete._id));
        setSuccessMessage('Live class deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchStats();
      }
      
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      setDeleteType(null);
    } catch (err) {
      setError(`Failed to delete: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddTeacher = async () => {
    try {
      setTeacherFormError('');
      
      if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
        setTeacherFormError('All fields are required');
        return;
      }
      
      if (newTeacher.password.length < 6) {
        setTeacherFormError('Password must be at least 6 characters');
        return;
      }
      
      setAddingTeacher(true);
      
      const response = await axios.post(
        `${API_URL}/api/users/create-teacher`,
        {
          name: newTeacher.name,
          email: newTeacher.email,
          password: newTeacher.password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccessMessage('Teacher created successfully');
      setAddTeacherOpen(false);
      setNewTeacher({ name: '', email: '', password: '' });
      fetchTeachers();
      fetchStats();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setTeacherFormError(err.response?.data?.message || 'Failed to create teacher');
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleAddAdmin = async () => {
    try {
      setAdminFormError('');
      
      if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
        setAdminFormError('All fields are required');
        return;
      }
      
      if (newAdmin.password.length < 6) {
        setAdminFormError('Password must be at least 6 characters');
        return;
      }
      
      setAddingAdmin(true);
      
      const response = await axios.post(
        `${API_URL}/api/users/create-admin`,
        {
          name: newAdmin.name,
          email: newAdmin.email,
          password: newAdmin.password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccessMessage('Admin created successfully');
      setAddAdminOpen(false);
      setNewAdmin({ name: '', email: '', password: '' });
      fetchAdmins();
      fetchStats();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setAdminFormError(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchEmail('');
  };

  const renderStudentsTab = () => (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Manage Students</Typography>
        <TextField
          placeholder="Search by email"
          value={searchEmail}
          onChange={handleSearchStudents}
          size="small"
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
          }}
        />
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Joined</strong></TableCell>
              <TableCell align="right"><strong>Action</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student._id}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{new Date(student.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(student, 'student')}
                      title="Delete student"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No students found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const renderTeachersTab = () => (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Manage Teachers</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search by email"
            value={searchEmail}
            onChange={handleSearchTeachers}
            size="small"
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddTeacherOpen(true)}
          >
            Add Teacher
          </Button>
        </Box>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Joined</strong></TableCell>
              <TableCell align="right"><strong>Action</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teachers.length > 0 ? (
              teachers.map((teacher) => (
                <TableRow key={teacher._id}>
                  <TableCell>{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{new Date(teacher.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(teacher, 'teacher')}
                      title="Delete teacher"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No teachers found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const renderAdminsTab = () => (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Manage Admins</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search by email"
            value={searchEmail}
            onChange={handleSearchAdmins}
            size="small"
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
            }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddAdminOpen(true)}
          >
            Add Admin
          </Button>
        </Box>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Joined</strong></TableCell>
              <TableCell align="right"><strong>Action</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admins.length > 0 ? (
              admins.map((admin) => (
                <TableRow key={admin._id}>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(admin, 'admin')}
                      title="Delete admin"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No admins found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const renderLiveClassesTab = () => (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Live Classes
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Title</strong></TableCell>
                <TableCell><strong>Instructor</strong></TableCell>
                <TableCell><strong>Scheduled</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Participants</strong></TableCell>
                <TableCell align="right"><strong>Action</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {liveClasses.map((liveClass) => (
                <TableRow key={liveClass._id}>
                  <TableCell>{liveClass.title}</TableCell>
                  <TableCell>{liveClass.instructor?.name || 'Unknown'}</TableCell>
                  <TableCell>{new Date(liveClass.scheduledAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={liveClass.status}
                      size="small"
                      color={
                        liveClass.status === 'live'
                          ? 'error'
                          : liveClass.status === 'completed'
                          ? 'success'
                          : 'default'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{liveClass.participants?.length || 0}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => navigate(`/class/${liveClass._id}/recordings`)}
                      >
                        Recordings
                      </Button>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteClick(liveClass, 'class')}
                        title="Delete class"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h4" color="primary">
                {stats.totalUsers}
              </Typography>
              <Typography variant="body2">Total Users</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h4" color="primary">
                {stats.totalCourses}
              </Typography>
              <Typography variant="body2">Total Courses</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h4" color="primary">
                {stats.totalExams}
              </Typography>
              <Typography variant="body2">Total Exams</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h4" color="primary">
                {stats.totalClasses}
              </Typography>
              <Typography variant="body2">Live Classes</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs for different management sections */}
        <Paper sx={{ mt: 4 }}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Manage Students" />
            <Tab label="Manage Teachers" />
            <Tab label="Manage Admins" />
            <Tab label="Live Classes" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && renderStudentsTab()}
            {activeTab === 1 && renderTeachersTab()}
            {activeTab === 2 && renderAdminsTab()}
            {activeTab === 3 && renderLiveClassesTab()}
          </Box>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Are you sure you want to delete this {deleteType}? This action cannot be undone.
            </Alert>
            {itemToDelete && (
              <Typography>
                <strong>{deleteType === 'class' ? 'Class' : 'User'}:</strong> {itemToDelete.title || itemToDelete.name}
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

        {/* Add Teacher Dialog */}
        <Dialog open={addTeacherOpen} onClose={() => setAddTeacherOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {teacherFormError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {teacherFormError}
              </Alert>
            )}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Name"
                value={newTeacher.name}
                onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                placeholder="Enter teacher name"
                fullWidth
              />
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                placeholder="Enter teacher email"
                fullWidth
              />
            </FormControl>
            <FormControl fullWidth>
              <TextField
                label="Password"
                type="password"
                value={newTeacher.password}
                onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                placeholder="Enter password (min 6 characters)"
                fullWidth
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddTeacherOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddTeacher}
              variant="contained"
              color="primary"
              disabled={addingTeacher}
            >
              {addingTeacher ? <CircularProgress size={24} /> : 'Add Teacher'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Admin Dialog */}
        <Dialog open={addAdminOpen} onClose={() => setAddAdminOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Admin</DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {adminFormError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {adminFormError}
              </Alert>
            )}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Name"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                placeholder="Enter admin name"
                fullWidth
              />
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                placeholder="Enter admin email"
                fullWidth
              />
            </FormControl>
            <FormControl fullWidth>
              <TextField
                label="Password"
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                placeholder="Enter password (min 6 characters)"
                fullWidth
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddAdminOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddAdmin}
              variant="contained"
              color="primary"
              disabled={addingAdmin}
            >
              {addingAdmin ? <CircularProgress size={24} /> : 'Add Admin'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default AdminDashboard;
