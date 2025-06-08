import React from 'react';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`
        w-full flex items-center justify-center gap-2
        bg-gray-100
        text-gray-900
        font-bold text-lg
        py-4
        rounded-full
        shadow-sm border border-gray-200
        transition-colors duration-150
        hover:bg-gray-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default SecondaryButton; 