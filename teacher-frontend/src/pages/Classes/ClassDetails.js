import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { classService } from '../../services/classService';
import { toast } from 'react-hot-toast';
import { useModal } from '../../hooks/useModal';
import AlertModal from '../../components/common/AlertModal';
import ConfirmModal from '../../components/common/ConfirmModal';

const ClassDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal();
  
  const { data: classData, isLoading, error } = useQuery(
    ['class', id],
    () => classService.getClassById(id),
    {
      enabled: !!id
    }
  );

  const deleteClassMutation = useMutation({
    mutationFn: classService.deleteClass,
    onSuccess: (data) => {
      toast.success(`Class "${data.deletedClass.subjectCode}" deleted successfully!`);
      queryClient.invalidateQueries('classes');
      navigate('/classes');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete class');
    }
  });

  const handleDelete = () => {
    if (classData) {
      showConfirm(
        `Are you sure you want to delete "${classData.subjectCode} - ${classData.subjectName}"? This will also delete all associated schedules and attendance records. This action cannot be undone.`,
        () => deleteClassMutation.mutate(id),
        {
          title: 'Delete Class',
          type: 'danger',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        }
      );
    }
  };

  if (isLoading) return (
    <div className="p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error loading class details: {error.message}
      </div>
    </div>
  );

  if (!classData) return (
    <div className="p-6">
      <div className="text-center text-gray-500">
        Class not found
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link 
              to="/classes" 
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Classes
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <span className="text-gray-400 mx-2">/</span>
              <span className="text-sm font-medium text-gray-500">
                {classData.subjectCode}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Class Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {classData.subjectCode} - {classData.subjectName}
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <span className="text-sm text-gray-500">Class Number</span>
            <p className="font-medium">{classData.classNumber}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Year</span>
            <p className="font-medium">{classData.classYear}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Semester</span>
            <p className="font-medium">{classData.semester}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Division</span>
            <p className="font-medium">{classData.division}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Link
          to={`/attendance?classId=${id}`}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
        >
          Take Attendance
        </Link>
        <Link
          to={`/classes/${id}/students`}
          className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
        >
          Manage Students
        </Link>
        <Link
          to={`/classes/${id}/reports`}
          className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
        >
          View Reports
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleteClassMutation.isLoading}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleteClassMutation.isLoading ? 'Deleting...' : 'Delete Class'}
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center text-gray-500 py-8">
          <p>No recent activity found.</p>
          <p className="text-sm mt-2">Start taking attendance to see activity here.</p>
        </div>
      </div>

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

export default ClassDetails;
