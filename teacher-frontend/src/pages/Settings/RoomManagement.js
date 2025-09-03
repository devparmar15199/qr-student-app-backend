import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { roomService } from '../../services/roomService';
import { useModal } from '../../hooks/useModal';
import AlertModal from '../../components/common/AlertModal';
import ConfirmModal from '../../components/common/ConfirmModal';

const RoomManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    roomNumber: '',
    type: 'classroom'
  });

  const queryClient = useQueryClient();
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal();

  // Fetch rooms
  const { data: rooms = [], isLoading, error } = useQuery(
    'rooms',
    roomService.getRooms
  );

  // Create room mutation
  const createRoomMutation = useMutation(
    roomService.createRoom,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rooms');
        setShowCreateModal(false);
        setFormData({ roomNumber: '', type: 'classroom' });
        showAlert('Room created successfully!', 'success');
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.message || 'Failed to create room';
        showAlert(`Error: ${errorMessage}`, 'error');
      }
    }
  );

  // Delete room mutation
  const deleteRoomMutation = useMutation(
    roomService.deleteRoom,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rooms');
        showAlert('Room deleted successfully!', 'success');
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.message || 'Failed to delete room';
        showAlert(`Error: ${errorMessage}`, 'error');
      }
    }
  );

  // Initialize default rooms mutation
  const initializeDefaultRoomsMutation = useMutation(
    roomService.initializeDefaultRooms,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('rooms');
        showAlert('Default rooms initialized successfully!', 'success');
      },
      onError: (error) => {
        const errorMessage = error?.response?.data?.message || 'Failed to initialize default rooms';
        showAlert(`Error: ${errorMessage}`, 'error');
      }
    }
  );

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!formData.roomNumber || !formData.type) {
      showAlert('Please fill in all required fields', 'warning');
      return;
    }
    
    createRoomMutation.mutate(formData);
  };

  const handleDeleteRoom = (id) => {
    showConfirm(
      'Are you sure you want to delete this room? This will affect any schedules using this room.',
      () => deleteRoomMutation.mutate(id),
      {
        title: 'Delete Room',
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    );
  };

  const handleInitializeDefaults = () => {
    showConfirm(
      'This will create default rooms. Continue?',
      () => initializeDefaultRoomsMutation.mutate(),
      {
        title: 'Initialize Default Rooms',
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
          <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
          <button
            onClick={handleInitializeDefaults}
            disabled={initializeDefaultRoomsMutation.isLoading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {initializeDefaultRoomsMutation.isLoading ? 'Initializing...' : 'Initialize Default Rooms'}
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error loading rooms: {error.message}</p>
          <p className="text-sm text-red-600 mt-2">Try initializing default rooms to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
        <div className="flex space-x-3">
          {rooms.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              disabled={initializeDefaultRoomsMutation.isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {initializeDefaultRoomsMutation.isLoading ? 'Initializing...' : 'Initialize Default Rooms'}
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            + Add Room
          </button>
        </div>
      </div>

      {/* Rooms List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Available Rooms</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Number
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
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <p className="text-lg font-medium mb-2">No rooms configured</p>
                      <p className="text-sm">Add rooms to manage your room assignments.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {room.roomNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        room.type === 'classroom' 
                          ? 'bg-blue-100 text-blue-800' 
                          : room.type === 'lab'
                          ? 'bg-purple-100 text-purple-800'
                          : room.type === 'auditorium'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {room.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteRoom(room._id)}
                        disabled={deleteRoomMutation.isLoading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleteRoomMutation.isLoading ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Room</h3>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., C-204, E-301"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="classroom">Classroom</option>
                    <option value="lab">Laboratory</option>
                    <option value="auditorium">Auditorium</option>
                    <option value="seminar">Seminar Hall</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createRoomMutation.isLoading}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {createRoomMutation.isLoading ? 'Creating...' : 'Create Room'}
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

export default RoomManagement;
