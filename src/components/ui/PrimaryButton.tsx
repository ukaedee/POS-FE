import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  size?: 'L' | 'M';
  style?: React.CSSProperties;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className = '',
  disabled = false,
  size = 'M',
  style,
  ...props
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`
        w-full flex items-center justify-center gap-2
        bg-black text-white
        font-bold
        rounded-full
        shadow-sm
        transition-colors duration-150
        hover:bg-gray-700
        disabled:opacity-50 disabled:cursor-not-allowed
        ${size === 'L' ? 'text-lg py-4' : 'text-base py-3'}
        ${className || ''}
      `}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
};

export default PrimaryButton; 