import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { classService } from '../../services/classService';
import { toast } from 'react-hot-toast';
import { useModal } from '../../hooks/useModal';
import AlertModal from '../common/AlertModal';
import ConfirmModal from '../common/ConfirmModal';

const ClassCard = ({ classItem }) => {
  console.log('ClassCard received:', classItem);
  
  const queryClient = useQueryClient();
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal();
  
  const deleteClassMutation = useMutation({
    mutationFn: classService.deleteClass,
    onSuccess: (data) => {
      toast.success(`Class "${data.deletedClass.subjectCode}" deleted successfully!`);
      queryClient.invalidateQueries('classes');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete class');
    }
  });
  
  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    showConfirm(
      `Are you sure you want to delete "${classItem.subjectCode} - ${classItem.subjectName}"? This action cannot be undone.`,
      () => deleteClassMutation.mutate(classItem._id),
      {
        title: 'Delete Class',
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {classItem.subjectCode} - {classItem.subjectName}
          </h3>
          <button
            onClick={handleDelete}
            disabled={deleteClassMutation.isLoading}
            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete Class"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <p className="text-gray-600 mt-2">
          Year {classItem.classYear} | Semester {classItem.semester} | Division {classItem.division}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Class Number: {classItem.classNumber}
        </p>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {classItem.studentCount || 0} students
          </span>
          <Link 
            to={`/classes/${classItem._id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View Details
          </Link>
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

export default ClassCard;