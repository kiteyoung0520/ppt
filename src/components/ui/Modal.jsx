import React from 'react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-[500px]' }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-stone-950/60 flex items-center justify-center z-[150] transition-opacity backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`glass-panel w-[90%] ${maxWidth} max-h-[85dvh] rounded-[2rem] p-5 sm:p-6 shadow-2xl relative flex flex-col border border-stone-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-stone-200 pb-3 mb-3 shrink-0">
          <h2 className="text-xl font-bold text-emerald-950">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-stone-400 hover:text-stone-700 font-bold text-xl px-2"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scroll pr-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
