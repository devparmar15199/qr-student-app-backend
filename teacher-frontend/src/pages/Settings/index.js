import React, { useState } from 'react';
import TimeSlotManagement from './TimeSlotManagement';
import RoomManagement from './RoomManagement';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('timeslots');

  const tabs = [
    { id: 'timeslots', name: 'Time Slots', icon: '🕐' },
    { id: 'rooms', name: 'Rooms', icon: '🏢' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your time slots and room configurations</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'timeslots' && <TimeSlotManagement />}
        {activeTab === 'rooms' && <RoomManagement />}
      </div>
    </div>
  );
};

export default Settings;
