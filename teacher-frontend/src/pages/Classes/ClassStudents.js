import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { classService } from '../../services/classService';
import { userService } from '../../services/userService';
import { useModal } from '../../hooks/useModal';
import AlertModal from '../../components/common/AlertModal';
import ConfirmModal from '../../components/common/ConfirmModal';

const ClassStudents = () => {
  const { id } = useParams();
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const queryClient = useQueryClient();
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal();

  // Fetch class details
  const { data: classData, isLoading: classLoading } = useQuery(
    ['class', id],
    () => classService.getClassById(id)
  );

  // Fetch enrolled students
  const { data: students, isLoading: studentsLoading } = useQuery(
    ['classStudents', id],
    () => classService.getStudentsInClass(id),
    {
      enabled: !!id
    }
  );

  // Fetch available students for enrollment
  const { data: availableStudents, isLoading: studentsSearchLoading } = useQuery(
    ['students', studentSearch],
    () => userService.getStudents(studentSearch),
    {
      enabled: showAddStudent
    }
  );

  // Enroll student mutation
  const enrollMutation = useMutation(
    ({ classId, studentId }) => classService.enrollStudent(classId, studentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['classStudents', id]);
        showAlert('Student enrolled successfully!', 'success');
        setSelectedStudent(null);
        setShowAddStudent(false);
        setStudentSearch('');
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.error || 'Failed to enroll student';
        showAlert(errorMessage, 'error');
      }
    }
  );

  const handleEnrollStudent = () => {
    if (!selectedStudent) {
      showAlert('Please select a student to enroll', 'warning');
      return;
    }
    
    enrollMutation.mutate({
      classId: id,
      studentId: selectedStudent._id
    });
  };

  const handleRemoveStudent = (studentId) => {
    showConfirm(
      'Are you sure you want to remove this student from the class?',
      () => {
        // TODO: Implement remove student API call
        showAlert('Student removal feature will be implemented soon', 'info');
      },
      {
        title: 'Remove Student',
        type: 'danger',
        confirmText: 'Remove',
        cancelText: 'Cancel'
      }
    );
  };

  const filteredStudents = availableStudents?.filter(student => 
    !students?.some(enrolled => enrolled._id === student._id)
  ) || [];

  if (classLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <Link
                to={`/classes/${id}`}
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                {classData?.subjectCode}
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <span className="text-gray-400 mx-2">/</span>
              <span className="text-sm font-medium text-gray-500">Students</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">
            {classData?.subjectCode} - {classData?.subjectName}
          </p>
        </div>
        <button
          onClick={() => setShowAddStudent(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Enroll Student
        </button>
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-96 flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enroll Student</h3>
            
            {/* Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Students
              </label>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name, email, or enrollment number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto mb-4">
              {studentsSearchLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3 p-2">
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <label key={student._id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="radio"
                        name="selectedStudent"
                        value={student._id}
                        checked={selectedStudent?._id === student._id}
                        onChange={() => setSelectedStudent(student)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                        <div className="text-xs text-gray-500">{student.enrollmentNo} • {student.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  {studentSearch ? 'No students found matching your search' : 'No available students to enroll'}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <button
                onClick={handleEnrollStudent}
                disabled={!selectedStudent || enrollMutation.isLoading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrollMutation.isLoading ? 'Enrolling...' : 'Enroll Student'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddStudent(false);
                  setSelectedStudent(null);
                  setStudentSearch('');
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Students List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Enrolled Students ({students?.length || 0})
          </h2>
        </div>

        {studentsLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : students && students.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {students.map((student) => (
              <div key={student._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-lg">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-500">
                        {student.enrollmentNo} • {student.email}
                      </p>
                      {student.enrolledAt && (
                        <p className="text-xs text-gray-400">
                          Enrolled: {new Date(student.enrolledAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => showAlert(`Viewing details for ${student.name}`, 'info', 'Student Details')}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(student._id)}
                        className="text-red-600 hover:text-red-500 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students enrolled</h3>
            <p className="text-gray-500 mb-4">Get started by adding students to this class</p>
            <button
              onClick={() => setShowAddStudent(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Enroll First Student
            </button>
          </div>
        )}
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

export default ClassStudents;
