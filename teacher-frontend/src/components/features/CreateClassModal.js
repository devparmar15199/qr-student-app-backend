import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { classService } from '../../services/classService';

const CreateClassModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    classNumber: '',
    subjectCode: '',
    subjectName: '',
    classYear: '',
    semester: '',
    division: '',
  });
  const [errors, setErrors] = useState({});

  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation(
    classService.createClass,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        onSuccess();
      },
      onError: (error) => {
        console.error('Create class error:', error);
        if (error.response && error.response.data) {
          setErrors(error.response.data);
        }
      }
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = { ...prev, [name]: value };
      
      // Reset semester when year changes
      if (name === 'classYear') {
        newFormData.semester = '';
      }
      
      return newFormData;
    });
  };

  // Get available semesters based on selected year
  const getAvailableSemesters = () => {
    const year = parseInt(formData.classYear);
    switch (year) {
      case 1:
        return [
          { value: '1', label: 'Semester 1' },
          { value: '2', label: 'Semester 2' }
        ];
      case 2:
        return [
          { value: '3', label: 'Semester 3' },
          { value: '4', label: 'Semester 4' }
        ];
      case 3:
        return [
          { value: '5', label: 'Semester 5' },
          { value: '6', label: 'Semester 6' }
        ];
      case 4:
        return [
          { value: '7', label: 'Semester 7' },
          { value: '8', label: 'Semester 8' }
        ];
      default:
        return [];
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting class data:', formData);
    mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Class</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="subjectCode">
                  Subject Code *
                </label>
                <input
                  type="text"
                  id="subjectCode"
                  name="subjectCode"
                  value={formData.subjectCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., CS101"
                  required
                />
                {errors.subjectCode && <p className="mt-1 text-sm text-red-600">{errors.subjectCode}</p>}
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="classNumber">
                  Class Number *
                </label>
                <input
                  type="text"
                  id="classNumber"
                  name="classNumber"
                  value={formData.classNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 001"
                  required
                />
                {errors.classNumber && <p className="mt-1 text-sm text-red-600">{errors.classNumber}</p>}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="subjectName">
                Subject Name *
              </label>
              <input
                type="text"
                id="subjectName"
                name="subjectName"
                value={formData.subjectName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Introduction to Computer Science"
                required
              />
              {errors.subjectName && <p className="mt-1 text-sm text-red-600">{errors.subjectName}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="classYear">
                  Year *
                </label>
                <select
                  id="classYear"
                  name="classYear"
                  value={formData.classYear}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
                {errors.classYear && <p className="mt-1 text-sm text-red-600">{errors.classYear}</p>}
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="semester">
                  Semester *
                </label>
                <select
                  id="semester"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={!formData.classYear}
                >
                  <option value="">
                    {!formData.classYear ? 'Select Year First' : 'Select Semester'}
                  </option>
                  {getAvailableSemesters().map(semester => (
                    <option key={semester.value} value={semester.value}>
                      {semester.label}
                    </option>
                  ))}
                </select>
                {errors.semester && <p className="mt-1 text-sm text-red-600">{errors.semester}</p>}
                {formData.classYear && getAvailableSemesters().length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">No semesters available for selected year</p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="division">
                  Division *
                </label>
                <input
                  type="text"
                  id="division"
                  name="division"
                  value={formData.division}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., A"
                  required
                />
                {errors.division && <p className="mt-1 text-sm text-red-600">{errors.division}</p>}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none disabled:bg-primary-300"
              >
                {isLoading ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateClassModal;