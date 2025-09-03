import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useLocation } from 'react-router-dom';
import { classService } from '../services/classService';
import { attendanceService } from '../services/attendanceService';
import QRCode from 'react-qr-code';
import { toast } from 'react-hot-toast';

const Attendance = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [qrDuration, setQrDuration] = useState(10);
  const [activeSession, setActiveSession] = useState(null);
  const [currentQRData, setCurrentQRData] = useState(null);
  const [tokenCountdown, setTokenCountdown] = useState(15);
  const [sessionCountdown, setSessionCountdown] = useState(0);
  const queryClient = useQueryClient();
  const location = useLocation();
  const tokenRefreshInterval = useRef(null);
  const tokenCountdownInterval = useRef(null);
  const sessionCountdownInterval = useRef(null);

  // Extract classId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const classId = urlParams.get('classId');
    if (classId) {
      setSelectedClass(classId);
    }
  }, [location.search]);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshInterval.current) clearInterval(tokenRefreshInterval.current);
      if (tokenCountdownInterval.current) clearInterval(tokenCountdownInterval.current);
      if (sessionCountdownInterval.current) clearInterval(sessionCountdownInterval.current);
    };
  }, []);

  // Setup token refresh when session becomes active
  useEffect(() => {
    if (activeSession && activeSession.sessionId) {
      startTokenRefresh();
      startSessionCountdown();
    } else {
      stopAllTimers();
    }

    return () => stopAllTimers();
  }, [activeSession]);

  const startTokenRefresh = () => {
    // Clear existing intervals
    stopAllTimers();

    console.log('Starting token refresh mechanism');

    // Start token countdown
    setTokenCountdown(15);
    tokenCountdownInterval.current = setInterval(() => {
      setTokenCountdown(prev => {
        const newValue = prev - 1;
        
        if (newValue <= 0) {
          // Time to refresh token
          console.log('Token countdown reached 0, refreshing...');
          refreshToken();
          return 15; // Reset countdown for next cycle
        }
        
        return newValue;
      });
    }, 1000);
  };

  const startSessionCountdown = () => {
    if (!activeSession?.sessionExpiresAt) {
      console.log('No session expiration time available');
      return;
    }
    
    console.log('Starting session countdown until:', activeSession.sessionExpiresAt);
    
    sessionCountdownInterval.current = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(activeSession.sessionExpiresAt).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const secondsLeft = Math.floor(difference / 1000);
        setSessionCountdown(secondsLeft);
        
        // Warn when session is about to expire
        if (secondsLeft <= 60 && secondsLeft % 15 === 0) {
          toast.warning(`Session expires in ${secondsLeft} seconds`);
        }
      } else {
        console.log('Session has expired');
        setSessionCountdown(0);
        // Session expired, clean up
        setActiveSession(null);
        setCurrentQRData(null);
        stopAllTimers();
        toast.error('QR session has expired');
      }
    }, 1000);
  };

  const stopAllTimers = () => {
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current);
      tokenRefreshInterval.current = null;
    }
    if (tokenCountdownInterval.current) {
      clearInterval(tokenCountdownInterval.current);
      tokenCountdownInterval.current = null;
    }
    if (sessionCountdownInterval.current) {
      clearInterval(sessionCountdownInterval.current);
      sessionCountdownInterval.current = null;
    }
  };

  const refreshToken = async () => {
    if (!activeSession?.sessionId) {
      console.log('No active session for token refresh');
      return;
    }

    try {
      console.log('Refreshing token for session:', activeSession.sessionId);
      const response = await attendanceService.refreshQRToken(activeSession.sessionId);
      
      console.log('Refresh response:', response);
      
      if (response.success && response.qrPayload) {
        setCurrentQRData(response.qrPayload);
        console.log('Token refreshed successfully, new QR data set');
        
        // Reset the countdown after successful refresh
        setTokenCountdown(15);
      } else {
        console.error('Refresh failed - no QR payload in response');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      
      if (error.response?.status === 404) {
        // Session no longer exists
        setActiveSession(null);
        setCurrentQRData(null);
        stopAllTimers();
        toast.error('QR session has ended');
      } else {
        // Other errors - keep trying but show warning
        console.warn('Token refresh failed, will retry in next cycle');
        toast.error('Failed to refresh QR code');
      }
    }
  };

  // Fetch classes
  const { data: classes, isLoading: classesLoading } = useQuery(
    'classes',
    classService.getClasses
  );

  // Fetch active QR sessions
  const { data: activeSessionsData } = useQuery(
    'activeQRSessions',
    attendanceService.getActiveQRSessions,
    {
      refetchInterval: 30000, // Check every 30 seconds for session status
      onSuccess: (data) => {
        console.log('Active sessions data:', data);
        const sessions = Array.isArray(data) ? data : data.sessions || [];
        
        if (!activeSession && sessions.length > 0) {
          const session = sessions[0];
          setActiveSession(session);
          setCurrentQRData(session.qrPayload);
          console.log('Set active session from query:', session.sessionId);
        }
        // Only clear if we have an active session and no sessions are found
        // AND it's been more than a few seconds since generation (avoid race conditions)
        if (activeSession && sessions.length === 0) {
          const sessionExists = sessions.find(s => s.sessionId === activeSession.sessionId);
          if (!sessionExists) {
            console.log('Active session not found in server response, clearing local session');
            setActiveSession(null);
            setCurrentQRData(null);
            stopAllTimers();
          }
        }
      }
    }
  );

  // Generate QR Session mutation
  const generateQRMutation = useMutation(
    ({ classId, duration, coordinates }) => attendanceService.generateQRSession(classId, duration, coordinates),
    {
      onSuccess: (data) => {
        console.log('QR generation response:', data);
        console.log('Setting activeSession to:', data);
        console.log('Setting currentQRData to:', data.qrPayload);
        setActiveSession(data);
        setCurrentQRData(data.qrPayload);
        // Don't invalidate immediately - let the periodic refetch handle it
        // queryClient.invalidateQueries('activeQRSessions');
        toast.success('QR session started with dynamic security!');
        console.log('QR Session generated successfully:', data);
      },
      onError: (error) => {
        console.error('Error generating QR:', error);
        const errorMessage = error?.response?.data?.message || 'Failed to generate QR code';
        toast.error(`Error: ${errorMessage}`);
      }
    }
  );

  // Terminate QR Session mutation
  const terminateQRMutation = useMutation(
    (sessionId) => attendanceService.terminateQRSession(sessionId),
    {
      onSuccess: () => {
        console.log('QR Session terminated successfully');
        setActiveSession(null);
        setCurrentQRData(null);
        stopAllTimers();
        queryClient.invalidateQueries('activeQRSessions');
        toast.success('QR session terminated');
      },
      onError: (error) => {
        console.error('Error terminating QR:', error);
        const errorMessage = error?.response?.data?.message || 'Failed to terminate QR session';
        toast.error(`Error: ${errorMessage}`);
      }
    }
  );

  // Terminate All QR Sessions mutation
  const terminateAllMutation = useMutation(
    () => attendanceService.terminateAllQRSessions(),
    {
      onSuccess: (data) => {
        console.log('All QR Sessions terminated successfully:', data);
        setActiveSession(null);
        setCurrentQRData(null);
        stopAllTimers();
        queryClient.invalidateQueries('activeQRSessions');
        toast.success('All QR sessions cleared');
      },
      onError: (error) => {
        console.error('Error terminating all QR sessions:', error);
        const errorMessage = error?.response?.data?.message || 'Failed to terminate all QR sessions';
        toast.error(`Error: ${errorMessage}`);
      }
    }
  );

  const handleGenerateQR = () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }
    
    // Get user's location or use default coordinates
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          generateQRMutation.mutate({ 
            classId: selectedClass, 
            duration: qrDuration,
            coordinates 
          });
        },
        (error) => {
          console.warn('Geolocation failed, using default coordinates:', error);
          // Use default coordinates if geolocation fails
          const defaultCoordinates = { latitude: 0, longitude: 0 };
          generateQRMutation.mutate({ 
            classId: selectedClass, 
            duration: qrDuration,
            coordinates: defaultCoordinates 
          });
        }
      );
    } else {
      // Use default coordinates if geolocation is not supported
      const defaultCoordinates = { latitude: 0, longitude: 0 };
      generateQRMutation.mutate({ 
        classId: selectedClass, 
        duration: qrDuration,
        coordinates: defaultCoordinates 
      });
    }
  };

  const handleTerminateQR = () => {
    if (activeSession?.sessionId) {
      console.log('Terminating session with ID:', activeSession.sessionId);
      terminateQRMutation.mutate(activeSession.sessionId);
    } else {
      toast.error('No active session to terminate');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const classesArray = Array.isArray(classes) ? classes : [];
  const selectedClassData = classesArray.find(cls => cls._id === selectedClass);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Management</h1>
        <p className="text-gray-600">Generate secure dynamic QR codes for attendance (refreshes every 15 seconds)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code Generation Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate QR Code</h2>
          
          {/* Class Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!!activeSession}
            >
              <option value="">Choose a class...</option>
              {classesLoading ? (
                <option disabled>Loading classes...</option>
              ) : (
                classesArray.map((classItem) => (
                  <option key={classItem._id} value={classItem._id}>
                    {classItem.subjectCode} - {classItem.subjectName} (Year {classItem.classYear})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Duration Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Duration (minutes)
            </label>
            <select
              value={qrDuration}
              onChange={(e) => setQrDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!!activeSession}
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!activeSession ? (
              <button
                onClick={handleGenerateQR}
                disabled={!selectedClass || generateQRMutation.isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generateQRMutation.isLoading ? 'Generating...' : 'Generate Dynamic QR Code'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleTerminateQR}
                  disabled={terminateQRMutation.isLoading}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {terminateQRMutation.isLoading ? 'Terminating...' : 'Terminate QR Session'}
                </button>
                <button
                  onClick={() => terminateAllMutation.mutate()}
                  disabled={terminateAllMutation.isLoading}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm disabled:opacity-50"
                >
                  {terminateAllMutation.isLoading ? 'Clearing...' : 'Force Clear All Sessions'}
                </button>
              </>
            )}
          </div>

          {/* Security Info */}
          {activeSession && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">🔒 Security Features Active</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>✓ QR code changes every 15 seconds</p>
                <p>✓ Prevents photo sharing</p>
                <p>✓ Session-based validation</p>
              </div>
            </div>
          )}

          {/* Class Information */}
          {selectedClassData && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Selected Class Details</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Subject:</span> {selectedClassData.subjectCode} - {selectedClassData.subjectName}</p>
                <p><span className="font-medium">Year:</span> {selectedClassData.classYear}</p>
                <p><span className="font-medium">Semester:</span> {selectedClassData.semester}</p>
                <p><span className="font-medium">Division:</span> {selectedClassData.division}</p>
              </div>
            </div>
          )}
        </div>

        {/* QR Code Display Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dynamic QR Code</h2>
          
          {activeSession && currentQRData ? (
            <div className="text-center">
              {console.log('Rendering QR - activeSession:', activeSession)}
              {console.log('Rendering QR - currentQRData:', currentQRData)}
              {/* Token Refresh Indicator */}
              <div className="mb-4 flex justify-center">
                <div className={`px-4 py-2 rounded-full transition-colors ${
                  tokenCountdown <= 5 ? 'bg-orange-100 border border-orange-300' : 'bg-blue-100 border border-blue-300'
                }`}>
                  <span className={`text-sm font-medium ${
                    tokenCountdown <= 5 ? 'text-orange-800' : 'text-blue-800'
                  }`}>
                    {tokenCountdown <= 5 ? '🔄 Refreshing in: ' : 'Next refresh in: '}
                    <span className="font-bold">{tokenCountdown}s</span>
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="mb-6 flex justify-center">
                <div className={`relative p-4 bg-white border-2 rounded-lg shadow-sm transition-all duration-300 ${
                  tokenCountdown <= 1 ? 'border-orange-400 shadow-orange-200' : 'border-gray-200'
                }`}>
                  <QRCode
                    value={JSON.stringify(currentQRData)}
                    size={200}
                    level="M"
                  />
                  {tokenCountdown <= 1 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
                      <div className="text-orange-600 font-medium">Updating...</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Info */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-medium text-blue-900 mb-2">Active Dynamic Session</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><span className="font-medium">Class:</span> {activeSession?.displayData?.subjectCode || currentQRData?.subjectCode} - {activeSession?.displayData?.subjectName || currentQRData?.subjectName}</p>
                  <p><span className="font-medium">Session ID:</span> {activeSession.sessionId}</p>
                  <p><span className="font-medium">Security:</span> Dynamic QR (15s refresh)</p>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatTime(sessionCountdown)}
                </div>
                <p className="text-sm text-gray-500">Session time remaining</p>
              </div>

              {/* Warning for expired tokens */}
              {tokenCountdown <= 3 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    🔄 QR Code refreshing in {tokenCountdown} seconds...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active QR Session</h3>
              <p className="text-gray-500">Generate a dynamic QR code to start secure attendance</p>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic QR Info */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">How Dynamic QR Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 mb-2">🔄</div>
            <h3 className="font-medium text-blue-900">Continuous Refresh</h3>
            <p className="text-sm text-blue-700">QR code updates every 15 seconds until session ends</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 mb-2">🛡️</div>
            <h3 className="font-medium text-green-900">Proxy Prevention</h3>
            <p className="text-sm text-green-700">Photos become invalid quickly, preventing sharing</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-purple-600 mb-2">✅</div>
            <h3 className="font-medium text-purple-900">Session-Based</h3>
            <p className="text-sm text-purple-700">Each session has unique ID and rotating tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;