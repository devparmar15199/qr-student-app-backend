import api from './api';

export const scheduleService = {
  // Basic CRUD operations
  getSchedules: () => api.get('/api/schedules'),
  getScheduleById: (id) => api.get(`/api/schedules/${id}`),
  createSchedule: (scheduleData) => api.post('/api/schedules', scheduleData),
  updateSchedule: (id, scheduleData) => api.put(`/api/schedules/${id}`, scheduleData),
  deleteSchedule: (id) => api.delete(`/api/schedules/${id}`),

  // Enhanced schedule operations
  getTeacherSchedule: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.week) queryParams.append('week', params.week);
    if (params.semester) queryParams.append('semester', params.semester);
    if (params.academicYear) queryParams.append('academicYear', params.academicYear);
    
    return api.get(`/api/schedules/teacher?${queryParams}`);
  },

  getTodaySchedule: () => api.get('/api/schedules/today'),

  getWeeklySchedule: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.week) queryParams.append('week', params.week);
    if (params.semester) queryParams.append('semester', params.semester);
    if (params.academicYear) queryParams.append('academicYear', params.academicYear);
    
    return api.get(`/api/schedules/weekly?${queryParams}`);
  },

  createBulkSchedules: (schedulesData) => api.post('/api/schedules/bulk', schedulesData),

  checkScheduleConflict: (scheduleData) => api.post('/api/schedules/check-conflict', scheduleData),

  // Time slot utilities
  getTimeSlots: () => {
    return [
      { id: 1, start: '09:00', end: '10:00', label: '09:00-10:00', type: 'class' },
      { id: 2, start: '10:00', end: '11:00', label: '10:00-11:00', type: 'class' },
      { id: 'break1', start: '11:00', end: '11:15', label: '11:00-11:15 (Refreshment Break)', type: 'break', duration: 15 },
      { id: 3, start: '11:15', end: '12:15', label: '11:15-12:15', type: 'class' },
      { id: 4, start: '12:15', end: '13:15', label: '12:15-13:15', type: 'class' },
      { id: 'break2', start: '13:15', end: '14:00', label: '13:15-14:00 (Lunch Break)', type: 'break', duration: 45 },
      { id: 5, start: '14:00', end: '15:00', label: '14:00-15:00', type: 'class' },
      { id: 6, start: '15:00', end: '16:00', label: '15:00-16:00', type: 'class' },
      { id: 7, start: '16:00', end: '17:00', label: '16:00-17:00', type: 'class' },
    ];
  },

  getDaysOfWeek: () => {
    return [
      { id: 'Monday', label: 'Monday', short: 'Mon' },
      { id: 'Tuesday', label: 'Tuesday', short: 'Tue' },
      { id: 'Wednesday', label: 'Wednesday', short: 'Wed' },
      { id: 'Thursday', label: 'Thursday', short: 'Thu' },
      { id: 'Friday', label: 'Friday', short: 'Fri' },
      { id: 'Saturday', label: 'Saturday', short: 'Sat' },
    ];
  },

  // Get only class time slots (excluding breaks)
  getClassTimeSlots: () => {
    return scheduleService.getTimeSlots().filter(slot => slot.type === 'class');
  },

  // Get only break time slots
  getBreakTimeSlots: () => {
    return scheduleService.getTimeSlots().filter(slot => slot.type === 'break');
  },

  // Merge and split operations
  mergeSchedules: (sourceScheduleId, targetScheduleId, customLabel) => 
    api.post('/api/schedules/merge', { 
      sourceScheduleId, 
      targetScheduleId, 
      customLabel 
    }),

  splitSchedule: (scheduleId) => 
    api.post(`/api/schedules/split/${scheduleId}`),
};
