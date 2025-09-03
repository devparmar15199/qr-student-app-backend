import api from './api';

export const userService = {
  login: async (credentials) => {
    console.log('UserService: Sending login request to:', '/api/auth/login');
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },
  register: async (userData) => {
    console.log('UserService: Sending registration request to:', '/api/auth/register');
    console.log('UserService: Registration data:', userData);
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/api/users/profile');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await api.put('/api/users/profile', profileData);
    return response.data;
  },
  
  changePassword: async (passwordData) => {
    const response = await api.put('/api/users/change-password', passwordData);
    return response.data;
  },
  
  getStudents: async (search = '') => {
    const response = await api.get('/api/users/students', {
      params: { search, limit: 50 }
    });
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};