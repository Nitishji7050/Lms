import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const AuthContext = createContext();
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  // Setup socket listener for real-time notifications
  useEffect(() => {
    if (!user) return;

    const s = io(API_URL, { transports: ['websocket'] });
    setSocket(s);

    s.on('notification-created', (notif) => {
      if (!notif) return;
      const isTargetRole = notif.targetRoles && user && notif.targetRoles.includes(user.role);
      const isTargetUser = notif.targetUsers && user && notif.targetUsers.includes(user._id);
      if (isTargetRole || isTargetUser) {
        setNotifications(prev => [notif, ...prev]);
      }
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/notifications`);
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      await axios.patch(`${API_URL}/api/notifications/${id}/read`);
      // Update local state
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, readBy: [...(n.readBy||[]), user?._id] } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const getUnreadCountByType = (type) => {
    if (!user) return 0;
    return notifications.filter(n => n.type === type && !(n.readBy || []).includes(user._id)).length;
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setUser(response.data);
      // Fetch notifications once user is loaded
      await fetchNotifications();
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      const { token: newToken } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      // Fetch full user object
      await fetchUser();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
        role
      });
      const { token: newToken } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      // Fetch full user object
      await fetchUser();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const sendOTP = async (email, name, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/send-otp`, {
        email,
        name,
        password
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP'
      };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        email,
        otp
      });
      const { token: newToken } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      // Fetch full user object
      await fetchUser();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'OTP verification failed',
        attemptsRemaining: error.response?.data?.attemptsRemaining
      };
    }
  };

  const resendOTP = async (email) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/resend-otp`, {
        email
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend OTP'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      loading,
      token,
      sendOTP,
      verifyOTP,
      resendOTP,
      notifications,
      fetchNotifications,
      markNotificationAsRead,
      getUnreadCountByType
    }}>
      {children}
    </AuthContext.Provider>
  );
};
