import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (newValue: number) => void;
  className?: string;
  size?: 'L' | 'M';
}

const sizeMap = {
  L: {
    btn: 'w-12 h-12',
    font: 'text-2xl',
    num: 'w-16',
    icon: 'w-5 h-5',
  },
  M: {
    btn: 'w-8 h-8',
    font: 'text-base',
    num: 'w-8',
    icon: 'w-4 h-4',
  },
};

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  min = 1,
  max = 999,
  onChange,
  className = '',
  size = 'M',
}) => {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className={`${s.btn} flex items-center justify-center bg-black text-white rounded-full transition-colors disabled:opacity-30`}
        type="button"
      >
        <Minus className={s.icon} />
      </button>
      <span className={`${s.font} font-bold ${s.num} text-center`}>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className={`${s.btn} flex items-center justify-center bg-black text-white rounded-full transition-colors disabled:opacity-30`}
        type="button"
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
};

export default QuantitySelector; 