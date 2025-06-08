"use client";
import React, { useState } from 'react';
import { Package, User, DollarSign } from 'lucide-react';
import { Product } from '../types/product';

interface ProductInfoFormProps {
  scannedCode?: string;
  product?: Product | null;
  loading?: boolean;
  onAddToPurchaseList: (product: Product, quantity: number) => void;
}

const ProductInfoForm: React.FC<ProductInfoFormProps> = ({
  scannedCode,
  product,
  loading = false,
  onAddToPurchaseList
}) => {
  const [quantity, setQuantity] = useState(1);
  const [employeeCode, setEmployeeCode] = useState('');

  const handleAddToPurchaseList = () => {
    if (product && quantity > 0) {
      onAddToPurchaseList(product, quantity);
      setQuantity(1);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.STOCK || 999)) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xs p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Package className="w-6 h-6 text-blue-600" />
        商品情報
      </h3>

      {/* 従業員コード入力（任意） */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <User className="w-4 h-4 inline mr-1" />
          従業員コード <span className="text-gray-400 text-xs">(任意)</span>
        </label>
        <input
          type="text"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value)}
          placeholder="従業員コードを入力（省略可）"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={10}
        />
      </div>

      {/* スキャン結果表示 */}
      {scannedCode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>スキャン結果:</strong> {scannedCode}
          </p>
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">商品情報を取得中...</p>
        </div>
      )}

      {/* 商品情報表示 */}
      {product && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">商品ID</p>
              <p className="font-medium">{product.PRD_ID || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">商品コード</p>
              <p className="font-mono font-medium">{product.CODE || 'N/A'}</p>
            </div>
          </div>

          <div>
            <p className="text-gray-600 text-sm">商品名</p>
            <p className="text-lg font-bold text-gray-800">{product.NAME || '商品名不明'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                単価
              </p>
              <p className="text-xl font-bold text-green-600">
                ¥{(product.PRICE || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">在庫数</p>
              <p className={`text-lg font-bold ${(product.STOCK || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.STOCK || 0}個
              </p>
            </div>
          </div>

          {/* 数量選択 */}
          <div className="space-y-2">
            <p className="text-gray-600 text-sm font-medium">購入数量</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                type="button"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    if (val >= 1 && val <= (product.STOCK || 999)) {
                      setQuantity(val);
                    }
                  }}
                  min="1"
                  max={product.STOCK || 999}
                  className="w-20 text-center px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= (product.STOCK || 999)}
                className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                type="button"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              合計: ¥{((product.PRICE || 0) * quantity).toLocaleString()}
            </p>
          </div>

          {/* 購入リストに追加ボタン */}
          <button
            onClick={handleAddToPurchaseList}
            disabled={(product.STOCK || 0) <= 0}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            type="button"
          >
            {(product.STOCK || 0) <= 0 ? '在庫切れ' : '購入リストに追加'}
          </button>
        </div>
      )}

      {/* 商品が見つからない場合 */}
      {scannedCode && !product && !loading && (
        <div className="text-center py-8">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <p className="text-gray-600 text-lg">商品が見つかりませんでした</p>
          <p className="text-gray-500 text-sm mt-2">
            コード: {scannedCode}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductInfoForm; 