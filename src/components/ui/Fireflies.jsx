import React, { useState } from 'react';

const Firefly = ({ style }) => (
  <div 
    className="firefly animate-firefly-pulse absolute"
    style={{
      ...style,
      '--dur': `${2 + Math.random() * 3}s`,
    }}
  >
    <div 
      className="animate-firefly-move w-full h-full"
      style={{ '--move-dur': `${10 + Math.random() * 10}s` }}
    />
  </div>
);

const Fireflies = ({ count = 12 }) => {
  const [fireflies] = useState(() => Array.from({ length: count }).map(() => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
  })));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {fireflies.map((f, i) => (
        <Firefly key={i} style={{ top: f.top, left: f.left, animationDelay: f.delay }} />
      ))}
    </div>
  );
};

export default Fireflies;
