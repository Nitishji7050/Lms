import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Badge
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, getUnreadCountByType, notifications, markNotificationAsRead } = useAuth();

  const handleDoubtsClick = async () => {
    if (!user) return;
    const unread = (notifications || []).filter(n => n.type === 'doubt' && !(n.readBy || []).includes(user._id));
    for (const n of unread) {
      await markNotificationAsRead(n._id);
    }
  };

  const handleCoursesClick = async () => {
    if (!user) return;
    const unread = (notifications || []).filter(n => n.type === 'material' && !(n.readBy || []).includes(user._id));
    for (const n of unread) {
      await markNotificationAsRead(n._id);
    }
  };
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>
            LMS
          </Link>
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button color="inherit" component={Link} to="/courses" onClick={handleCoursesClick}>
            <Badge badgeContent={getUnreadCountByType('material')} color="error">
              <span style={{ color: 'inherit' }}>Courses</span>
            </Badge>
          </Button>
          <Button color="inherit" component={Link} to="/live-classes">
            <Badge badgeContent={getUnreadCountByType('live_class')} color="error">
              <span style={{ color: 'inherit' }}>Live Classes</span>
            </Badge>
          </Button>
          <Button color="inherit" component={Link} to="/doubts" onClick={handleDoubtsClick}>
            <Badge badgeContent={getUnreadCountByType('doubt')} color="error">
              <span style={{ color: 'inherit' }}>Doubts</span>
            </Badge>
          </Button>
          <Button color="inherit" component={Link} to="/exams">
            <Badge badgeContent={getUnreadCountByType('exam')} color="error">
              <span style={{ color: 'inherit' }}>Exams</span>
            </Badge>
          </Button>
          <Button color="inherit" component={Link} to="/ai-chatbot">
            AI Chat
          </Button>
          {user?.role === 'teacher' && (
            <>
              <Button color="inherit" onClick={() => navigate('/teacher')}>
                Teacher Dashboard
              </Button>
              <Button color="inherit" onClick={() => navigate('/teacher/exams')}>
                Manage Exams
              </Button>
              <Button color="inherit" onClick={() => navigate('/teacher/questions')}>
                Question Bank
              </Button>
            </>
          )}
          {user?.role === 'admin' && (
            <Button color="inherit" component={Link} to="/admin">
              Admin
            </Button>
          )}
          <Avatar
            sx={{ cursor: 'pointer' }}
            onClick={handleMenu}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem component={Link} to="/profile" onClick={handleClose}>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
