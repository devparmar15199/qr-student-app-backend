import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { scheduleService } from '../services/scheduleService';
import { classService } from '../services/classService';
import { timeSlotService } from '../services/timeSlotService';
import { useModal } from '../hooks/useModal';
import AlertModal from '../components/common/AlertModal';
import ConfirmModal from '../components/common/ConfirmModal';

const SchedulePage = () => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [mergeData, setMergeData] = useState({ sourceId: '', targetId: '', customLabel: '' });
  const [formData, setFormData] = useState({
    classId: '',
    dayOfWeek: '',
    timeSlotId: '',
    roomId: '',
    customRoom: ''
  });

  const queryClient = useQueryClient();
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal();

  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Get current week in YYYY-WXX format from date
  const getWeekFromDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (date - startOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const currentDate = getCurrentDate();
    setSelectedDate(currentDate);
    setSelectedWeek(getWeekFromDate(currentDate));
  }, []);

  // Update week when date changes
  useEffect(() => {
    if (selectedDate) {
      setSelectedWeek(getWeekFromDate(selectedDate));
    }
  }, [selectedDate]);

  // Fetch weekly schedule - now fetches all teacher's schedules regardless of semester/year
  const { data: weeklySchedule, isLoading, error } = useQuery({
    queryKey: ['weeklySchedule', selectedWeek],
    queryFn: () => scheduleService.getWeeklySchedule({
      week: selectedWeek
    }),
    enabled: !!selectedWeek
  });

  // Fetch classes for dropdown
  const { data: classesData, isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ['classes'],
    queryFn: classService.getClasses,
    onSuccess: (data) => {
      console.log('Classes data loaded:', data);
    },
    onError: (error) => {
      console.error('Classes loading error:', error);
    }
  });

  // Fetch available time slots
  const { data: availableTimeSlots = [], isLoading: timeSlotsLoading } = useQuery({
    queryKey: ['availableTimeSlots'],
    queryFn: timeSlotService.getAvailableTimeSlots,
    onError: (error) => {
      console.error('Time slots loading error:', error);
    }
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: scheduleService.createSchedule,
    onSuccess: () => {
      showAlert('Schedule created successfully!', 'success');
      setShowCreateModal(false);
      setFormData({
        classId: '',
        dayOfWeek: '',
        timeSlotId: '',
        roomId: '',
        customRoom: ''
      });
      queryClient.invalidateQueries(['weeklySchedule']);
    },
    onError: (error) => {
      showAlert(`Error: ${error.response?.data?.message || 'Failed to create schedule'}`, 'error');
    }
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: scheduleService.deleteSchedule,
    onSuccess: () => {
      showAlert('Schedule deleted successfully!', 'success');
      queryClient.invalidateQueries(['weeklySchedule']);
    },
    onError: (error) => {
      showAlert(`Error: ${error.response?.data?.message || 'Failed to delete schedule'}`, 'error');
    }
  });

  // Merge schedules mutation
  const mergeSchedulesMutation = useMutation({
    mutationFn: ({ sourceId, targetId, customLabel }) => 
      scheduleService.mergeSchedules(sourceId, targetId, customLabel),
    onSuccess: (data) => {
      console.log('Merge success:', data);
      showAlert('Schedules merged successfully!', 'success');
      setShowMergeModal(false);
      setMergeData({ sourceId: '', targetId: '', customLabel: '' });
      // Force refresh both queries
      queryClient.invalidateQueries(['weeklySchedule']);
      queryClient.refetchQueries(['weeklySchedule']);
    },
    onError: (error) => {
      console.error('Merge error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to merge schedules';
      showAlert(`Error: ${errorMessage}`, 'error');
    }
  });

  // Split schedule mutation
  const splitScheduleMutation = useMutation({
    mutationFn: scheduleService.splitSchedule,
    onSuccess: () => {
      showAlert('Schedule split successfully!', 'success');
      queryClient.invalidateQueries(['weeklySchedule']);
    },
    onError: (error) => {
      showAlert(`Error: ${error.response?.data?.message || 'Failed to split schedule'}`, 'error');
    }
  });

  // Fetch all time slots (including breaks for display)
  const { data: allTimeSlots = [], isLoading: allTimeSlotsLoading } = useQuery({
    queryKey: ['allTimeSlots'],
    queryFn: timeSlotService.getTimeSlots,
    onError: (error) => {
      console.error('All time slots loading error:', error);
    }
  });

  // Convert API time slots to display format
  const timeSlots = allTimeSlots.map(slot => ({
    id: slot._id,
    start: slot.startTime,
    end: slot.endTime,
    label: `${slot.startTime}-${slot.endTime}${slot.type === 'break' ? ` (${slot.name})` : ''}`,
    type: slot.type === 'break' ? 'break' : 'class',
    name: slot.name,
    duration: slot.duration
  }));

  const daysOfWeek = scheduleService.getDaysOfWeek();

  // Helper functions for predefined options  
  const getAvailableRooms = () => [
    { id: 1, roomNumber: 'C-201', building: 'C Block', type: 'classroom' },
    { id: 2, roomNumber: 'C-202', building: 'C Block', type: 'classroom' },
    { id: 3, roomNumber: 'C-203', building: 'C Block', type: 'classroom' },
    { id: 4, roomNumber: 'C-204', building: 'C Block', type: 'classroom' },
    { id: 5, roomNumber: 'E-201', building: 'E Block', type: 'lab' },
    { id: 6, roomNumber: 'E-202', building: 'E Block', type: 'lab' },
    { id: 7, roomNumber: 'A-301', building: 'A Block', type: 'classroom' },
  ];

  const handleCreateSchedule = (e) => {
    e.preventDefault();
    
    // Check if either a room is selected OR custom room is entered
    const hasRoom = formData.roomId || formData.customRoom.trim();
    
    if (!formData.classId || !formData.dayOfWeek || !formData.timeSlotId || !hasRoom) {
      showAlert('Please fill in all required fields', 'warning');
      return;
    }

    // Get the selected class and time slot data
    const selectedClass = classesData?.find(cls => cls._id === formData.classId);
    const selectedTimeSlot = availableTimeSlots.find(slot => slot._id === formData.timeSlotId);
    const availableRooms = getAvailableRooms();
    const selectedRoom = availableRooms.find(room => room.id.toString() === formData.roomId);
    
    // Use custom room if provided, otherwise use selected room
    const roomNumber = formData.customRoom.trim() || selectedRoom?.roomNumber;
    
    const scheduleData = {
      classId: formData.classId,
      dayOfWeek: formData.dayOfWeek,
      startTime: selectedTimeSlot?.startTime,
      endTime: selectedTimeSlot?.endTime,
      roomNumber: roomNumber,
      sessionType: selectedTimeSlot?.type || 'lecture',
      semester: selectedClass?.semester || '1',
      academicYear: selectedClass?.classYear ? `${selectedClass.classYear}` : '1'
    };

    createScheduleMutation.mutate(scheduleData);
  };

  const handleSlotClick = (day, timeSlot) => {
    // Prevent scheduling during break times
    if (timeSlot.type === 'break') {
      showAlert('Cannot schedule classes during break time', 'warning');
      return;
    }
    
    // Find the matching time slot ID from our available time slots
    const matchingTimeSlot = availableTimeSlots.find(slot => 
      slot.startTime === timeSlot.start && slot.endTime === timeSlot.end
    );
    
    setSelectedSlot({ day, timeSlot });
    setFormData({
      ...formData,
      dayOfWeek: day.id,
      timeSlotId: matchingTimeSlot ? matchingTimeSlot._id : '',
      roomId: '',
      customRoom: ''
    });
    setShowCreateModal(true);
  };

  const handleDeleteSchedule = (scheduleId) => {
    showConfirm(
      'Are you sure you want to delete this schedule?',
      () => deleteScheduleMutation.mutate(scheduleId),
      {
        title: 'Delete Schedule',
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    );
  };

  const handleSplitSchedule = (scheduleId) => {
    showConfirm(
      'Are you sure you want to split this merged schedule back into individual slots?',
      () => splitScheduleMutation.mutate(scheduleId),
      {
        title: 'Split Schedule',
        type: 'warning',
        confirmText: 'Split',
        cancelText: 'Cancel'
      }
    );
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    // If no destination or dropped in the same place, do nothing
    if (!destination || 
        (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    // Extract day and timeSlot from droppableId (format: "day-startTime_endTime")
    const [sourceDay, sourceTimeRange] = source.droppableId.split('-');
    const [destDay, destTimeRange] = destination.droppableId.split('-');
    
    const [sourceStart, sourceEnd] = sourceTimeRange.split('_');
    const [destStart, destEnd] = destTimeRange.split('_');

    // Only allow merging within the same day
    if (sourceDay !== destDay) {
      showAlert('Can only merge schedules within the same day', 'warning');
      return;
    }

    // Define valid 2-hour continuous blocks
    const validMergeCombinations = [
      // 9:00-11:00 (1st + 2nd period)
      { slots: [{ start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' }], label: '9:00-11:00 Lab Session' },
      // 11:15-13:15 (3rd + 4th period)
      { slots: [{ start: '11:15', end: '12:15' }, { start: '12:15', end: '13:15' }], label: '11:15-13:15 Lab Session' },
      // 14:00-16:00 (5th + 6th period)
      { slots: [{ start: '14:00', end: '15:00' }, { start: '15:00', end: '16:00' }], label: '14:00-16:00 Lab Session' }
    ];

    // Check if the source and destination times form a valid merge combination
    let validCombination = null;
    for (const combination of validMergeCombinations) {
      const [slot1, slot2] = combination.slots;
      
      // Check if source and dest match this combination (in either order)
      const isValidOrder1 = (sourceStart === slot1.start && sourceEnd === slot1.end && 
                            destStart === slot2.start && destEnd === slot2.end);
      const isValidOrder2 = (sourceStart === slot2.start && sourceEnd === slot2.end && 
                            destStart === slot1.start && destEnd === slot1.end);
      
      if (isValidOrder1 || isValidOrder2) {
        validCombination = combination;
        break;
      }
    }

    if (!validCombination) {
      showAlert('Can only merge schedules for continuous 2-hour blocks:\n• 9:00-11:00 (1st + 2nd period)\n• 11:15-13:15 (3rd + 4th period)\n• 14:00-16:00 (5th + 6th period)', 'warning');
      return;
    }

    // Get the source schedule (must exist since we're dragging it)
    const sourceSchedule = getScheduleForSlot(sourceDay, { start: sourceStart, end: sourceEnd });
    
    if (!sourceSchedule) {
      showAlert('Source schedule not found', 'error');
      return;
    }

    // Check if destination has a schedule - if not, we can't merge
    const destSchedule = getScheduleForSlot(destDay, { start: destStart, end: destEnd });
    
    if (!destSchedule) {
      showAlert('Cannot merge with empty time slot. Please create a schedule in the destination slot first, then drag to merge.', 'warning');
      return;
    }

    // Check if schedules are for the same class
    const sourceClassId = sourceSchedule.classId?._id || sourceSchedule.classId;
    const destClassId = destSchedule.classId?._id || destSchedule.classId;
    
    if (sourceClassId !== destClassId) {
      showAlert('Can only merge schedules for the same class', 'warning');
      return;
    }

    // Set up merge data and show modal with suggested label
    setMergeData({
      sourceId: sourceSchedule._id,
      targetId: destSchedule._id,
      customLabel: validCombination.label
    });
    setShowMergeModal(true);
  };

  const handleMergeSubmit = (e) => {
    e.preventDefault();
    if (!mergeData.sourceId || !mergeData.targetId || !mergeData.customLabel) {
      showAlert('Please fill in all fields', 'warning');
      return;
    }
    mergeSchedulesMutation.mutate(mergeData);
  };

  const getScheduleForSlot = (dayId, timeSlot) => {
    if (!weeklySchedule?.data?.weeklySchedule) return null;
    
    const daySchedules = weeklySchedule.data.weeklySchedule[dayId];
    if (!daySchedules || !Array.isArray(daySchedules)) return null;
    
    // First check for exact time match (regular schedules)
    const exactMatch = daySchedules.find(schedule => 
      schedule.startTime === timeSlot.start && 
      schedule.endTime === timeSlot.end
    );
    
    if (exactMatch) return exactMatch;
    
    // Check for merged schedules that span this time slot
    const mergedMatch = daySchedules.find(schedule => {
      if (!schedule.isMerged) return false;
      
      // Convert times to minutes for comparison
      const slotStart = timeToMinutes(timeSlot.start);
      const slotEnd = timeToMinutes(timeSlot.end);
      const scheduleStart = timeToMinutes(schedule.startTime);
      const scheduleEnd = timeToMinutes(schedule.endTime);
      
      // Check if this time slot is within the merged schedule's range
      return slotStart >= scheduleStart && slotEnd <= scheduleEnd;
    });
    
    return mergedMatch || null;
  };

  // Helper function to convert HH:mm to minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get valid merge time slots for visual hints
  const getValidMergeSlots = () => {
    return [
      // 9:00-11:00 block
      { start: '09:00', end: '10:00', pair: '10:00-11:00', block: '9:00-11:00' },
      { start: '10:00', end: '11:00', pair: '09:00-10:00', block: '9:00-11:00' },
      // 11:15-13:15 block  
      { start: '11:15', end: '12:15', pair: '12:15-13:15', block: '11:15-13:15' },
      { start: '12:15', end: '13:15', pair: '11:15-12:15', block: '11:15-13:15' },
      // 14:00-16:00 block
      { start: '14:00', end: '15:00', pair: '15:00-16:00', block: '14:00-16:00' },
      { start: '15:00', end: '16:00', pair: '14:00-15:00', block: '14:00-16:00' }
    ];
  };

  if (isLoading || timeSlotsLoading || allTimeSlotsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error loading schedule: {error.response?.data?.message || error.message}</p>
        <button 
          onClick={() => queryClient.invalidateQueries(['weeklySchedule'])}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule</h1>
          <p className="text-gray-600">Schedule for week of {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'selected date'}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Date selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Week {selectedWeek ? selectedWeek.split('-W')[1] : ''} of {selectedWeek ? selectedWeek.split('-W')[0] : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors mt-6"
          >
            Add Schedule
          </button>
        </div>
      </div>

      {/* Timetable Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Time
                  </th>
                  {daysOfWeek.map((day) => (
                    <th key={day.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot.id} className={`hover:bg-gray-50 ${timeSlot.type === 'break' ? 'bg-gray-100' : ''}`}>
                    <td className={`px-4 py-6 whitespace-nowrap text-sm font-medium ${timeSlot.type === 'break' ? 'text-gray-600 bg-gray-200' : 'text-gray-900 bg-gray-50'}`}>
                      {timeSlot.label}
                    </td>
                    {timeSlot.type === 'break' ? (
                      // Render break row spanning all days
                      <td colSpan={daysOfWeek.length} className="px-2 py-2 text-center">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 h-20 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-sm font-semibold text-orange-800">
                              {timeSlot.name.includes('Break') ? `🧘 ${timeSlot.name}` : `🍽️ ${timeSlot.name}`}
                            </div>
                            <div className="text-xs text-orange-600">
                              {timeSlot.duration} minutes
                            </div>
                            {timeSlot.name.includes('Refreshment') && (
                              <div className="text-xs text-orange-500 mt-1">
                                Time to freshen up
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    ) : (
                      // Render normal class slots for each day with drag and drop
                      daysOfWeek.map((day) => {
                        const schedule = getScheduleForSlot(day.id, timeSlot);
                        const droppableId = `${day.id}-${timeSlot.start}_${timeSlot.end}`;
                        
                        return (
                          <td key={day.id} className="px-2 py-2 text-center relative">
                            <Droppable droppableId={droppableId}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`min-h-[80px] ${snapshot.isDraggedOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''}`}
                                >
                                  {schedule ? (
                                    <Draggable draggableId={schedule._id} index={0}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`rounded-lg p-3 flex flex-col justify-between transition-colors group cursor-move ${
                                            snapshot.isDragging ? 'shadow-lg rotate-3 bg-indigo-200' : 'hover:bg-indigo-200'
                                          } ${
                                            schedule.isMerged 
                                              ? 'bg-purple-100 border-purple-200 min-h-[100px]' 
                                              : 'bg-indigo-100 border border-indigo-200 min-h-[80px]'
                                          }`}
                                        >
                                          <div>
                                            <div className="text-sm font-semibold text-indigo-900">
                                              {schedule.customLabel || schedule.classId?.subjectCode || schedule.class?.subjectCode || schedule.subjectCode || 'No Subject'}
                                              {schedule.isMerged && <span className="text-xs text-purple-600 ml-1">🔗</span>}
                                            </div>
                                            <div className="text-xs text-indigo-700">
                                              {schedule.classId?.subjectName || schedule.class?.subjectName || schedule.subjectName || 'Subject Name Not Available'}
                                            </div>
                                            <div className="text-xs text-indigo-600">
                                              {(schedule.classId?.semester || schedule.class?.semester || schedule.semester) ? 
                                                `Sem ${schedule.classId?.semester || schedule.class?.semester || schedule.semester}` : 'Semester N/A'}
                                              {(schedule.classId?.division || schedule.class?.division || schedule.division) && 
                                                ` | ${schedule.classId?.division || schedule.class?.division || schedule.division}`}
                                            </div>
                                            {(schedule.roomNumber || schedule.location) && (
                                              <div className="text-xs text-indigo-500">
                                                📍 {schedule.roomNumber || 
                                                    (typeof schedule.location === 'string' 
                                                      ? schedule.location 
                                                      : 'Room Available')}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <div className="text-xs text-gray-500">
                                              {schedule.isMerged ? '� Merged' : '� Drag to merge'}
                                            </div>
                                            <div className="flex space-x-2">
                                              {schedule.isMerged && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSplitSchedule(schedule._id);
                                                  }}
                                                  className="bg-yellow-500 text-white rounded-md px-3 py-1 text-xs font-medium hover:bg-yellow-600 transition-colors flex items-center space-x-1 shadow-sm"
                                                  title="Split merged schedule"
                                                >
                                                  <span>✂</span>
                                                  <span>Split</span>
                                                </button>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteSchedule(schedule._id);
                                                }}
                                                className="bg-red-500 text-white rounded-md px-3 py-1 text-xs font-medium hover:bg-red-600 transition-colors flex items-center space-x-1 shadow-sm"
                                                title="Delete schedule"
                                              >
                                                <span>×</span>
                                                <span>Delete</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ) : (
                                    <button
                                      onClick={() => handleSlotClick(day, timeSlot)}
                                      className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                                    >
                                      <span className="text-2xl">+</span>
                                    </button>
                                  )}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DragDropContext>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Schedule
                {selectedSlot && (
                  <span className="block text-sm font-normal text-gray-600 mt-1">
                    📅 {selectedSlot.day.label} | ⏰ {selectedSlot.timeSlot.label}
                  </span>
                )}
              </h3>
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({...formData, classId: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">
                      {classesLoading ? 'Loading classes...' : 'Select a class'}
                    </option>
                    {classesError && (
                      <option value="" disabled>Error loading classes</option>
                    )}
                    {classesData && (
                      // Handle different possible data structures
                      (Array.isArray(classesData) ? classesData : classesData.data || classesData.classes || [])?.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.subjectCode || cls.code} - {cls.subjectName || cls.name || cls.subject} 
                          {cls.semester && ` | Sem ${cls.semester}`}
                          {cls.classYear && ` | ${cls.classYear}`}
                          {cls.division && ` | Div ${cls.division}`}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Classes from all semesters and years will be shown
                    {classesError && <span className="text-red-500"> - Error: {classesError.message}</span>}
                    {classesData && <span className="text-green-500"> - {(Array.isArray(classesData) ? classesData : classesData.data || classesData.classes || [])?.length || 0} classes found</span>}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({...formData, dayOfWeek: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select a day</option>
                    {daysOfWeek.map((day) => (
                      <option key={day.id} value={day.id}>{day.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                  <select
                    value={formData.timeSlotId}
                    onChange={(e) => setFormData({...formData, timeSlotId: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select a time slot</option>
                    {availableTimeSlots.map((slot) => (
                      <option key={slot._id} value={slot._id}>
                        {slot.name} ({slot.startTime} - {slot.endTime}) - {slot.type}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedSlot ? (
                      <span className="text-green-600">✅ Auto-selected from schedule grid</span>
                    ) : (
                      <span>💡 For 2-hour lab sessions, create individual periods first, then drag one to another to merge into 2-hour blocks: 9:00-11:00, 11:15-13:15, or 14:00-16:00</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => {
                      setFormData({...formData, roomId: e.target.value, customRoom: ''});
                    }}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mb-2"
                  >
                    <option value="">Select a predefined room</option>
                    {getAvailableRooms().map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.roomNumber} - {room.building} ({room.type})
                      </option>
                    ))}
                  </select>
                  
                  <div className="text-sm text-gray-500 mb-2 text-center">OR</div>
                  
                  <input
                    type="text"
                    value={formData.customRoom}
                    onChange={(e) => {
                      setFormData({...formData, customRoom: e.target.value, roomId: ''});
                    }}
                    placeholder="Enter custom room (e.g., C-205, Lab-3)"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Choose from dropdown or enter a custom room number
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createScheduleMutation.isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createScheduleMutation.isLoading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Merge Schedules Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🔗 Merge Schedules
              </h3>
              <div className="text-sm text-gray-600 mb-4">
                You're about to merge two consecutive time slots into one 2-hour session.
              </div>
              
              <form onSubmit={handleMergeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Label
                  </label>
                  <input
                    type="text"
                    value={mergeData.customLabel}
                    onChange={(e) => setMergeData({...mergeData, customLabel: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Lab Session, Extended Lecture"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This label will be displayed for the merged session
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-sm font-medium text-blue-700 mb-2">Valid 2-Hour Merge Blocks:</div>
                  <div className="text-xs text-blue-600">
                    • 9:00-11:00 (1st + 2nd period)<br/>
                    • 11:15-13:15 (3rd + 4th period)<br/>
                    • 14:00-16:00 (5th + 6th period)
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm font-medium text-gray-700 mb-2">What happens:</div>
                  <div className="text-sm text-gray-600">
                    • Two separate time slots will be combined<br/>
                    • Session type will be set to "Lab"<br/>
                    • Custom label: "{mergeData.customLabel}"<br/>
                    • You can split it back later if needed
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMergeModal(false);
                      setMergeData({ sourceId: '', targetId: '', customLabel: '' });
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
                  >
                    ✕ Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mergeSchedulesMutation.isLoading}
                    className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                  >
                    {mergeSchedulesMutation.isLoading ? 'Merging...' : '🔗 Merge Sessions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
};

export default SchedulePage;