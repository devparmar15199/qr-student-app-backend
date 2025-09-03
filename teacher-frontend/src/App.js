import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ClassList from './pages/Classes/ClassList';
import ClassDetails from './pages/Classes/ClassDetails';
import ClassStudents from './pages/Classes/ClassStudents';
import ClassReports from './pages/Classes/ClassReports';
import AttendancePage from './pages/Attendance';
import SchedulePage from './pages/Schedule';
import SettingsPage from './pages/Settings';
import ProfilePage from './pages/Profile';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="classes" element={<ClassList />} />
              <Route path="classes/:id" element={<ClassDetails />} />
              <Route path="classes/:id/students" element={<ClassStudents />} />
              <Route path="classes/:id/reports" element={<ClassReports />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: 'green',
                  secondary: 'black',
                },
              },
            }}
          />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;