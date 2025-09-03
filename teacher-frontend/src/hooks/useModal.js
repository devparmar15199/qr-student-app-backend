import { useState, useCallback } from 'react';

export const useModal = () => {
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Yes',
    cancelText: 'Cancel',
    onConfirm: null
  });

  const showAlert = useCallback((message, type = 'info', title = '') => {
    setAlertModal({
      isOpen: true,
      title: title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : 'Information'),
      message,
      type
    });
  }, []);

  const showConfirm = useCallback((message, onConfirm, options = {}) => {
    setConfirmModal({
      isOpen: true,
      title: options.title || 'Confirm Action',
      message,
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Yes',
      cancelText: options.cancelText || 'Cancel',
      onConfirm
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    alertModal,
    confirmModal,
    showAlert,
    showConfirm,
    closeAlert,
    closeConfirm
  };
};
