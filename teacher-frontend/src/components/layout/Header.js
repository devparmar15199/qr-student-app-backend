import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Teacher Portal</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="p-1 rounded-full text-gray-600 hover:text-gray-900 focus:outline-none">
            <BellIcon className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <UserCircleIcon className="h-8 w-8 text-gray-600" />
            <span className="text-gray-700">{user?.name}</span>
            <button 
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;