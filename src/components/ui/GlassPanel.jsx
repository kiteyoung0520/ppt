import React from 'react';

const GlassPanel = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel rounded-3xl ${className}`}>
      {children}
    </div>
  );
};

export default GlassPanel;
