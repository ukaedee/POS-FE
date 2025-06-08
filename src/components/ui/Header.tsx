import React from 'react';
import { Package, ShoppingCart } from 'lucide-react';

interface HeaderProps {
  onLogoClick?: () => void;
  onCartClick?: () => void;
  cartCount?: number;
  cartActive?: boolean;
  cartDisabled?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onLogoClick,
  onCartClick,
  cartCount = 0,
  cartActive = false,
  cartDisabled = false,
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-[20px] p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 text-gray-800 hover:text-gray-600 font-bold text-lg transition-colors"
          disabled={!onLogoClick}
        >
          <Package className="w-6 h-6" />
          POS APP
        </button>
        <button
          onClick={onCartClick}
          className={`relative p-2 rounded-lg transition-colors ${cartActive ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
          style={{ minWidth: 48, minHeight: 48 }}
          disabled={cartDisabled}
        >
          <ShoppingCart className="w-8 h-8 text-gray-600" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-gray-800 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Header; 