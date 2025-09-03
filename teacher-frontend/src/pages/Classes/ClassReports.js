import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { classService } from '../../services/classService';
import { attendanceService } from '../../services/attendanceService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ClassReports = () => {
  const { id } = useParams();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });

  // Fetch class details
  const { data: classData, isLoading: classLoading } = useQuery(
    ['class', id],
    () => classService.getClassById(id)
  );

  // Fetch class students
  const { data: studentsData, isLoading: studentsLoading } = useQuery(
    ['classStudents', id],
    () => classService.getStudentsInClass(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        console.log('Students data received:', data);
      }
    }
  );

  // Fetch attendance records for this class
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery(
    ['classAttendance', id, selectedPeriod, dateRange],
    () => attendanceService.getAttendanceByClass(id),
    {
      enabled: !!id,
      onSuccess: (data) => {
        console.log('Attendance data received:', data);
      },
      onError: (error) => {
        console.error('Error fetching attendance:', error);
      }
    }
  );

  // Calculate attendance statistics
  const calculateAttendanceStats = () => {
    console.log('Calculating stats with:', { studentsData, attendanceData });
    
    if (!attendanceData || !studentsData) {
      return {
        overall: {
          totalClasses: 0,
          averageAttendance: 0,
          totalStudents: 0,
          presentToday: 0
        },
        students: [],
        trends: []
      };
    }

    const students = studentsData || [];
    const attendance = attendanceData?.attendances || attendanceData?.data || attendanceData || [];
    
    console.log('Processing data:', { students: students.length, attendance: attendance.length });

    // Group attendance by date to count total classes
    const classesByDate = {};
    const studentAttendance = {};

    attendance.forEach(record => {
      const date = new Date(record.attendedAt).toDateString();
      const studentId = record.studentId?._id || record.studentId;
      
      if (!classesByDate[date]) {
        classesByDate[date] = new Set();
      }
      classesByDate[date].add(studentId);

      if (!studentAttendance[studentId]) {
        studentAttendance[studentId] = {
          present: 0,
          total: 0,
          lastAttended: null
        };
      }

      if (record.status === 'present' || record.status === 'late') {
        studentAttendance[studentId].present++;
        studentAttendance[studentId].lastAttended = record.attendedAt;
      }
      studentAttendance[studentId].total++;
    });

    const totalClasses = Object.keys(classesByDate).length;
    const today = new Date().toDateString();
    const presentToday = classesByDate[today]?.size || 0;

    // Calculate student-wise stats
    const studentStats = students.map(student => {
      const stats = studentAttendance[student._id] || { present: 0, total: totalClasses };
      const attendanceRate = totalClasses > 0 ? (stats.present / totalClasses) * 100 : 0;

      return {
        _id: student._id,
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        totalPresent: stats.present,
        totalClasses: totalClasses,
        lastAttended: stats.lastAttended ? new Date(stats.lastAttended).toLocaleDateString() : 'Never'
      };
    });

    // Calculate overall average
    const totalAttendanceRate = studentStats.reduce((sum, student) => sum + student.attendanceRate, 0);
    const averageAttendance = students.length > 0 ? totalAttendanceRate / students.length : 0;

    // Calculate daily trends (last 7 days)
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      const dayAttendance = classesByDate[dateString]?.size || 0;
      const attendanceRate = students.length > 0 ? (dayAttendance / students.length) * 100 : 0;
      
      trends.push({
        date: date.toISOString().split('T')[0],
        attendance: Math.round(attendanceRate)
      });
    }

    return {
      overall: {
        totalClasses,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        totalStudents: students.length,
        presentToday
      },
      students: studentStats.sort((a, b) => b.attendanceRate - a.attendanceRate),
      trends
    };
  };

  const stats = calculateAttendanceStats();

  const getAttendanceColor = (rate) => {
    if (rate >= 85) return 'text-green-600 bg-green-100';
    if (rate >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'semester':
        startDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); // 4 months
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    });
  };

  // Export to CSV function
  const exportToCSV = () => {
    const headers = [
      'Student Name',
      'Enrollment No',
      'Attendance Rate (%)',
      'Present/Total',
      'Last Attended',
      'Status'
    ];

    // Handle empty data case
    const csvData = stats.students.length > 0 
      ? stats.students.map(student => [
          student.name,
          student.enrollmentNo,
          student.attendanceRate,
          `${student.totalPresent}/${student.totalClasses}`,
          student.lastAttended,
          student.attendanceRate >= 75 ? 'Good' : 'Poor'
        ])
      : [['No attendance data available', '', '', '', '', '']];

    // Add summary data at the top
    const summaryData = [
      ['Class Report Summary'],
      ['Subject', classData?.subjectName || 'N/A'],
      ['Subject Code', classData?.subjectCode || 'N/A'],
      ['Period', selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)],
      ['Total Classes', stats.overall.totalClasses],
      ['Total Students', stats.overall.totalStudents],
      ['Average Attendance', `${stats.overall.averageAttendance}%`],
      ['Present Today', stats.overall.presentToday],
      ['Export Date', new Date().toLocaleDateString()],
      [''], // Empty row
      headers
    ];

    const allData = [...summaryData, ...csvData];
    
    // Convert to CSV format
    const csvContent = allData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${classData?.subjectCode || 'class'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF function
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Attendance Report', 14, 22);
    
    // Add class information
    doc.setFontSize(12);
    doc.text(`Subject: ${classData?.subjectName || 'N/A'}`, 14, 35);
    doc.text(`Subject Code: ${classData?.subjectCode || 'N/A'}`, 14, 42);
    doc.text(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 14, 49);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 56);
    
    // Add summary statistics
    doc.setFontSize(14);
    doc.text('Summary Statistics', 14, 70);
    doc.setFontSize(10);
    doc.text(`Total Classes: ${stats.overall.totalClasses}`, 14, 80);
    doc.text(`Total Students: ${stats.overall.totalStudents}`, 80, 80);
    doc.text(`Average Attendance: ${stats.overall.averageAttendance}%`, 14, 87);
    doc.text(`Present Today: ${stats.overall.presentToday}`, 80, 87);

    // Prepare table data - handle empty data case
    const tableData = stats.students.length > 0 
      ? stats.students.map(student => [
          student.name,
          student.enrollmentNo,
          `${student.attendanceRate}%`,
          `${student.totalPresent}/${student.totalClasses}`,
          student.lastAttended,
          student.attendanceRate >= 75 ? 'Good' : 'Poor'
        ])
      : [['No attendance data available', '', '', '', '', '']];

    // Add table
    autoTable(doc, {
      head: [['Student Name', 'Enrollment No', 'Attendance Rate', 'Present/Total', 'Last Attended', 'Status']],
      body: tableData,
      startY: 95,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }, // Blue header
      alternateRowStyles: { fillColor: [249, 250, 251] }, // Light gray alternate rows
      columnStyles: {
        0: { cellWidth: 40 }, // Student Name
        1: { cellWidth: 25 }, // Enrollment No
        2: { cellWidth: 25 }, // Attendance Rate
        3: { cellWidth: 25 }, // Present/Total
        4: { cellWidth: 25 }, // Last Attended
        5: { cellWidth: 20 }  // Status
      }
    });

    // Add attendance trend chart data if available
    if (stats.trends.length > 0 && stats.trends.some(day => day.attendance > 0)) {
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text('Attendance Trend (Last 7 Days)', 14, finalY);
      
      const trendData = stats.trends.map(day => [
        formatDate(day.date),
        `${day.attendance}%`
      ]);

      autoTable(doc, {
        head: [['Date', 'Attendance %']],
        body: trendData,
        startY: finalY + 5,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [34, 197, 94] }, // Green header
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 }
        }
      });
    } else if (stats.students.length === 0) {
      // Add a note about no data
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text('Note: No attendance records found for the selected period.', 14, finalY);
    }

    // Save the PDF
    doc.save(`attendance_report_${classData?.subjectCode || 'class'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (classLoading || studentsLoading || attendanceLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
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
              <span className="text-sm font-medium text-gray-500">Reports</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Reports</h1>
          <p className="text-gray-600">{classData?.subjectName} - {classData?.subjectCode}</p>
        </div>
        
        {/* Period Filter */}
        <div className="flex space-x-2">
          {['week', 'month', 'semester'].map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Classes</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.overall.totalClasses}</p>
          {stats.overall.totalClasses === 0 && (
            <p className="text-xs text-gray-400 mt-1">No classes recorded yet</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Average Attendance</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.overall.averageAttendance}%</p>
          {stats.overall.totalClasses === 0 && (
            <p className="text-xs text-gray-400 mt-1">Start taking attendance</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Students</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.overall.totalStudents}</p>
          {stats.overall.totalStudents === 0 && (
            <p className="text-xs text-gray-400 mt-1">No students enrolled</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Present Today</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.overall.presentToday}</p>
          {stats.overall.presentToday === 0 && stats.overall.totalClasses > 0 && (
            <p className="text-xs text-gray-400 mt-1">No attendance today</p>
          )}
        </div>
      </div>

      {/* Attendance Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Trend (Last 7 Days)</h3>
        {stats.trends.some(day => day.attendance > 0) ? (
          <div className="flex items-end space-x-2 h-40">
            {stats.trends.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="bg-blue-500 rounded-t-md w-full transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${Math.max(day.attendance, 5)}%` }}
                  title={`${day.attendance}% attendance`}
                ></div>
                <div className="text-xs text-gray-500 mt-2">
                  {formatDate(day.date)}
                </div>
                <div className="text-xs font-medium text-gray-700">
                  {day.attendance}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">No attendance data to display</p>
            <p className="text-sm">Take attendance to see trends here</p>
          </div>
        )}
      </div>

      {/* Student-wise Attendance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Student Attendance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollment No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present/Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Attended
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.students.length > 0 ? (
                stats.students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.enrollmentNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceColor(student.attendanceRate)}`}>
                        {student.attendanceRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.totalPresent}/{student.totalClasses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.lastAttended}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.attendanceRate >= 75 
                          ? 'text-green-800 bg-green-100'
                          : 'text-red-800 bg-red-100'
                      }`}>
                        {student.attendanceRate >= 75 ? 'Good' : 'Poor'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 text-lg font-medium">No attendance data available</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Start taking attendance to see student reports here
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options */}
      <div className="mt-6 flex justify-end space-x-3">
        <button 
          onClick={exportToCSV}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export to CSV</span>
        </button>
        <button 
          onClick={exportToPDF}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>Export to PDF</span>
        </button>
      </div>
    </div>
  );
};

export default ClassReports;
