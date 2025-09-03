import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { classService } from '../../services/classService';
import ClassCard from '../../components/features/ClassCard';
import CreateClassModal from '../../components/features/CreateClassModal';

const ClassList = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: classes, isLoading, error } = useQuery(
    'classes',
    classService.getClasses
  );

  console.log('Classes data:', classes);
  console.log('Classes type:', typeof classes);
  console.log('Is array:', Array.isArray(classes));

  if (isLoading) return <div>Loading classes...</div>;
  if (error) {
    console.error('Classes error:', error);
    return <div>Error loading classes: {error.message}</div>;
  }

  // Ensure classes is an array
  const classesArray = Array.isArray(classes) ? classes : [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Classes</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Create New Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classesArray.length > 0 ? (
          classesArray.map((classItem) => (
            <ClassCard key={classItem._id || classItem.id} classItem={classItem} />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            No classes found. Create your first class to get started!
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateClassModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ClassList;