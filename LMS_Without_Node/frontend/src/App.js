import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import LiveClasses from './pages/LiveClasses';
import LiveClassSession from './pages/LiveClassSession';
import ClassRecordings from './pages/ClassRecordings';
import Doubts from './pages/Doubts';
import Exams from './pages/Exams';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AIChatbot from './pages/AIChatbot';
import PDFTest from './pages/PDFTest';
import ExamsList from './pages/ExamsList';
import ExamTaking from './pages/ExamTaking';
import ExamResults from './pages/ExamResults';
import ExamManagement from './pages/ExamManagement';
import QuestionManagement from './pages/QuestionManagement';
import ExamGrading from './pages/ExamGrading';
import DoubtsList from './pages/DoubtsList';
import DoubtDetail from './pages/DoubtDetail';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <PrivateRoute>
                  <Courses />
                </PrivateRoute>
              }
            />
            <Route
              path="/courses/:id"
              element={
                <PrivateRoute>
                  <CourseDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/live-classes"
              element={
                <PrivateRoute>
                  <LiveClasses />
                </PrivateRoute>
              }
            />
            <Route
              path="/live-class/:id"
              element={
                <PrivateRoute>
                  <LiveClassSession />
                </PrivateRoute>
              }
            />
            <Route
              path="/class/:id/recordings"
              element={
                <PrivateRoute>
                  <ClassRecordings />
                </PrivateRoute>
              }
            />
            <Route
              path="/doubts/overview"
              element={
                <PrivateRoute>
                  <Doubts />
                </PrivateRoute>
              }
            />
            <Route
              path="/exams"
              element={
                <PrivateRoute>
                  <ExamsList />
                </PrivateRoute>
              }
            />
            <Route
              path="/doubts"
              element={
                <PrivateRoute>
                  <DoubtsList />
                </PrivateRoute>
              }
            />
            <Route
              path="/doubts/:id"
              element={
                <PrivateRoute>
                  <DoubtDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/exam/take/:examId/:attemptId"
              element={
                <PrivateRoute>
                  <ExamTaking />
                </PrivateRoute>
              }
            />
            <Route
              path="/exam/results/:attemptId"
              element={
                <PrivateRoute>
                  <ExamResults />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher/exams"
              element={
                <PrivateRoute requiredRole={['teacher', 'admin']}>
                  <ExamManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher/questions"
              element={
                <PrivateRoute requiredRole={['teacher', 'admin']}>
                  <QuestionManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher/exam/:examId/grading"
              element={
                <PrivateRoute requiredRole={['teacher', 'admin']}>
                  <ExamGrading />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute requiredRole="admin">
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <PrivateRoute requiredRole={['teacher', 'admin']}>
                  <TeacherDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/ai-chatbot"
              element={
                <PrivateRoute>
                  <AIChatbot />
                </PrivateRoute>
              }
            />
            <Route
              path="/pdf-test"
              element={
                <PrivateRoute>
                  <PDFTest />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
