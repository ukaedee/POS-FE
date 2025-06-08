import React from 'react';
import Image from 'next/image';
import { Package } from 'lucide-react';
import QuantitySelector from './QuantitySelector';
import { Product } from '../../types/product';

interface ProductCardProps {
  product: Product;
  quantity: number;
  maxQuantity: number;
  onQuantityChange: (newQuantity: number) => void;
  onRemove: () => void;
  imageError: boolean;
  onImageError: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  maxQuantity,
  onQuantityChange,
  onRemove,
  imageError,
  onImageError,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 flex gap-3 items-top">
      {/* サムネイル */}
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
        {!imageError ? (
          <Image
            src={`/images/${product.CODE}.png`}
            alt={`商品コード ${product.CODE}`}
            onError={onImageError}
            width={64}
            height={64}
            className="w-full h-full object-contain"
          />
        ) : (
          <Package className="w-8 h-8 text-gray-400" />
        )}
      </div>
      {/* 商品情報 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-mono mb-1">{product.CODE}</p>
        <h3 className="font-bold text-gray-800 text-base leading-tight break-words whitespace-normal mb-1">{product.NAME}</h3>
        <p className="text-lg font-bold text-gray-900 mb-1">¥{product.PRICE.toLocaleString()}<span className="text-xs font-normal text-gray-500 ml-1">(税込)</span></p>
        <p className="text-xs text-gray-500">個数・{quantity}</p>
        {/* 個数増減＋削除ボタン */}
        <div className="flex items-center gap-1 mt-1">
          <QuantitySelector
            value={quantity}
            min={1}
            max={maxQuantity}
            onChange={onQuantityChange}
            className="gap-1 mt-1"
            size="M"
          />
          <button
            onClick={onRemove}
            className="ml-2 text-red-500 hover:text-red-700 font-semibold text-base px-4 py-1"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 