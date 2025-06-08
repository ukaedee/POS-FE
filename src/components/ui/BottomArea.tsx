import React from 'react';

interface BottomAreaProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const BottomArea: React.FC<BottomAreaProps> = ({ children, className = '', style }) => {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-[10px] w-full z30 shadow-lg ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default BottomArea; 