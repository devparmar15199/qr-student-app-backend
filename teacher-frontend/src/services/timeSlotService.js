import api from './api';

export const timeSlotService = {
  // Get all time slots (public endpoint for when not authenticated)
  getTimeSlots: async () => {
    try {
      const response = await api.get('/api/timeslots');
      return response.data.timeSlots;
    } catch (error) {
      // If authentication fails, try public endpoint
      if (error.response?.status === 401) {
        const response = await api.get('/api/timeslots/public');
        return response.data.timeSlots;
      }
      throw error;
    }
  },

  // Get available time slots for scheduling (no breaks)
  getAvailableTimeSlots: async () => {
    try {
      const response = await api.get('/api/timeslots/available');
      return response.data.timeSlots;
    } catch (error) {
      // If authentication fails, fallback to public endpoint and filter
      if (error.response?.status === 401) {
        const response = await api.get('/api/timeslots/public');
        return response.data.timeSlots.filter(slot => slot.type !== 'break');
      }
      throw error;
    }
  },

  // Create a new time slot
  createTimeSlot: async (timeSlotData) => {
    const response = await api.post('/api/timeslots', timeSlotData);
    return response.data.timeSlot;
  },

  // Update a time slot
  updateTimeSlot: async (id, timeSlotData) => {
    const response = await api.put(`/api/timeslots/${id}`, timeSlotData);
    return response.data.timeSlot;
  },

  // Delete a time slot
  deleteTimeSlot: async (id) => {
    const response = await api.delete(`/api/timeslots/${id}`);
    return response.data;
  },

  // Initialize default time slots (try authenticated first, then public)
  initializeDefaultTimeSlots: async () => {
    try {
      const response = await api.post('/api/timeslots/initialize');
      return response.data.timeSlots;
    } catch (error) {
      // If authentication fails, try public endpoint
      if (error.response?.status === 401) {
        const response = await api.post('/api/timeslots/initialize-public');
        return response.data.timeSlots;
      }
      throw error;
    }
  },
};
