import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { timeSlotService } from '../../services/timeSlotService';
import { useModal } from '../../hooks/useModal';
import AlertModal from '../../components/common/AlertModal';
import ConfirmModal from '../../components/common/ConfirmModal';

const TimeSlotManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    type: 'lecture'
  });

  const queryClient = useQueryClient();
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal();

  // Fetch time slots
  const { data: timeSlots = [], isLoading, error } = useQuery(
    'timeSlots',
    timeSlotService.getTimeSlots
  );

  // Create time slot mutation
  const createTimeSlotMutation = useMutation(
    timeSlotService.createTimeSlot,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('timeSlots');
        setShowCreateModal(false);
        setFormData({ name: '', startTime: '', endTime: '', type: 'lecture' });
        showAlert('Time slot created successfully!', 'success');
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.message || 'Failed to create time slot';
        showAlert(`Error: ${errorMessage}`, 'error');
      }
    }
  );

  // Delete time slot mutation
  const deleteTimeSlotMutation = useMutation(
    timeSlotService.deleteTimeSlot,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('timeSlots');
        showAlert('Time slot deleted successfully!', 'success');
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.message || 'Failed to delete time slot';
        showAlert(`Error: ${errorMessage}`, 'error');
      }
    }
  );

  // Initialize default time slots mutation
  const initializeDefaultSlotsMutation = useMutation(
    timeSlotService.initializeDefaultTimeSlots,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('timeSlots');
        showAlert('Default time slots initialized successfully!', 'success');
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.message || 'Failed to initialize default time slots';
        showAlert(`Error: ${errorMessage}`, 'error');
      }
    }
  );

  const handleCreateTimeSlot = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.startTime || !formData.endTime) {
      showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    createTimeSlotMutation.mutate(formData);
  };

  const handleDeleteTimeSlot = (id) => {
    showConfirm(
      'Are you sure you want to delete this time slot? This will affect any schedules using this time slot.',
      () => deleteTimeSlotMutation.mutate(id),
      {
        title: 'Delete Time Slot',
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    );
  };

  const handleInitializeDefaults = () => {
    showConfirm(
      'This will create default time slots. Continue?',
      () => initializeDefaultSlotsMutation.mutate(),
      {
        title: 'Initialize Default Time Slots',
        type: 'warning',
        confirmText: 'Continue',
        cancelText: 'Cancel'
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Time Slot Management</h2>
          <button
            onClick={handleInitializeDefaults}
            disabled={initializeDefaultSlotsMutation.isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {initializeDefaultSlotsMutation.isLoading ? 'Initializing...' : 'Initialize Default Slots'}
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error loading time slots: {error.message}</p>
          <p className="text-sm text-red-600 mt-2">Try initializing default time slots to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Time Slot Management</h2>
        <div className="flex space-x-3">
          {timeSlots.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              disabled={initializeDefaultSlotsMutation.isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {initializeDefaultSlotsMutation.isLoading ? 'Initializing...' : 'Initialize Default Slots'}
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            + Add Time Slot
          </button>
        </div>
      </div>

      {/* Time Slots List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Configured Time Slots</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeSlots.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <p className="text-lg font-medium mb-2">No time slots configured</p>
                      <p className="text-sm">Add time slots to manage your schedule effectively.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                timeSlots.map((slot) => (
                  <tr key={slot._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {slot.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {slot.startTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {slot.endTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        slot.type === 'lecture' 
                          ? 'bg-green-100 text-green-800' 
                          : slot.type === 'lab'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {slot.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {slot.type !== 'break' && (
                        <button
                          onClick={() => handleDeleteTimeSlot(slot._id)}
                          disabled={deleteTimeSlotMutation.isLoading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deleteTimeSlotMutation.isLoading ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Time Slot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Time Slot</h3>
              <form onSubmit={handleCreateTimeSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 8th Period"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab (2 hours)</option>
                    <option value="project">Project</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    For labs, create 2-hour sessions by combining two consecutive lecture periods
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createTimeSlotMutation.isLoading}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {createTimeSlotMutation.isLoading ? 'Creating...' : 'Create Time Slot'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
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

export default TimeSlotManagement;
