import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HomeIcon, 
  AcademicCapIcon, 
  CalendarIcon, 
  ClockIcon, 
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const menuItems = [
    { name: 'Dashboard', icon: HomeIcon, path: '/' },
    { name: 'Classes', icon: AcademicCapIcon, path: '/classes' },
    { name: 'Attendance', icon: ClockIcon, path: '/attendance' },
    { name: 'Schedule', icon: CalendarIcon, path: '/schedule' },
    { name: 'Settings', icon: CogIcon, path: '/settings' },
    { name: 'Profile', icon: UserIcon, path: '/profile' },
  ];

  return (
    <div className="w-64 bg-gray-800 text-white h-screen">
      <div className="p-4 text-xl font-bold">Teacher Portal</div>
      <nav>
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className="flex items-center p-4 hover:bg-gray-700"
          >
            <item.icon className="h-6 w-6 mr-3" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;