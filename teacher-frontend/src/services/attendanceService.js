import api from './api';

export const attendanceService = {
  // Basic attendance operations
  markAttendance: async (attendanceData) => {
    const response = await api.post('/api/attendances/manual', attendanceData);
    return response.data;
  },
  
  getAllAttendance: async () => {
    const response = await api.get('/api/attendances/records');
    return response.data;
  },

  getAttendanceByClass: async (classId) => {
    const response = await api.get(`/api/attendances/records/class/${classId}`);
    return response.data;
  },
  
  getAttendanceByStudent: async (studentId) => {
    const response = await api.get(`/api/attendances/records/student/${studentId}`);
    return response.data;
  },

  // QR Code session operations with dynamic QR support
  generateQRSession: async (classId, duration = 10, coordinates) => {
    const requestData = {
      classId,
      coordinates: coordinates || { latitude: 0, longitude: 0 } // Default coordinates
    };
    
    // Only include scheduleId if it's provided and not null
    // For now, we'll omit it since schedules aren't implemented
    
    console.log('Sending QR generation request:', requestData);
    
    const response = await api.post('/api/qr/generate', requestData);
    return response.data;
  },

  refreshQRToken: async (sessionId) => {
    const response = await api.post(`/api/qr/refresh/${sessionId}`);
    return response.data;
  },

  terminateQRSession: async (sessionId) => {
    const response = await api.delete(`/api/qr/terminate/${sessionId}`);
    return response.data;
  },

  getActiveQRSessions: async () => {
    const response = await api.get('/api/qr/active');
    return response.data;
  },

  terminateAllQRSessions: async () => {
    const response = await api.delete('/api/qr/terminate-all');
    return response.data;
  },

  validateQRToken: async (token, sessionId) => {
    const response = await api.post('/api/qr/validate', {
      token,
      sessionId
    });
    return response.data;
  }
};