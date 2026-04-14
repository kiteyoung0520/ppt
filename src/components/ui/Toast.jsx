import React, { useState, useEffect } from 'react';

// For a global toast, we can simply export a trigger function, or handle it via a ToastContext.
// Here we use a custom event approach for simplicity across components.

export const toast = (message, duration = 3000) => {
  const event = new CustomEvent('show-toast', { detail: { message, duration } });
  window.dispatchEvent(event);
};

const Toast = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleToast = (e) => {
      setMessage(e.detail.message);
      setVisible(true);
      setTimeout(() => {
        setVisible(false);
      }, e.detail.duration || 3000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-emerald-700 text-white px-5 py-2.5 rounded-full font-bold text-sm z-[300] shadow-lg animate-popup-fade">
      {message}
    </div>
  );
};

export default Toast;
