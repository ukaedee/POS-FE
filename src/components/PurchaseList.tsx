"use client";
import React, { useState } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, CreditCard } from 'lucide-react';
import { Product } from '../types/product';

interface PurchaseItem {
  product: Product;
  quantity: number;
}

interface PurchaseListProps {
  items: PurchaseItem[];
  onUpdateQuantity: (productCode: string, quantity: number) => void;
  onRemoveItem: (productCode: string) => void;
  onProcessPurchase: (employeeCode: string) => void;
  processingPurchase?: boolean;
}

const PurchaseList: React.FC<PurchaseListProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProcessPurchase,
  processingPurchase = false
}) => {
  const [employeeCode, setEmployeeCode] = useState('');

  // 合計金額を計算
  const totalAmount = items.reduce((sum, item) => sum + (item.product.PRICE * item.quantity), 0);

  const handleQuantityChange = (productCode: string, delta: number) => {
    const item = items.find(i => i.product.CODE === productCode);
    if (item) {
      const newQuantity = item.quantity + delta;
      if (newQuantity >= 1 && newQuantity <= item.product.STOCK) {
        onUpdateQuantity(productCode, newQuantity);
      }
    }
  };

  const handleProcessPurchase = () => {
    if (items.length > 0) {
      // 従業員コードが空の場合はデフォルト値を使用
      onProcessPurchase(employeeCode.trim() || 'guest');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-green-600" />
          購入リスト ({items.length}点)
        </h3>
      </div>

      {/* 商品リスト */}
      <div className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>商品が追加されていません</p>
            <p className="text-sm mt-1">バーコードをスキャンして商品を追加してください</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.product.CODE} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {item.product.NAME}
                    </h4>
                    <p className="text-sm text-gray-500 font-mono">
                      {item.product.CODE}
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      ¥{item.product.PRICE.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="ml-4 flex flex-col items-end space-y-2">
                    {/* 数量調整 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(item.product.CODE, -1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                        type="button"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.product.CODE, 1)}
                        disabled={item.quantity >= item.product.STOCK}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                        type="button"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* 小計 */}
                    <p className="text-sm font-bold text-gray-900">
                      小計: ¥{(item.product.PRICE * item.quantity).toLocaleString()}
                    </p>
                    
                    {/* 削除ボタン */}
                    <button
                      onClick={() => onRemoveItem(item.product.CODE)}
                      className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                      type="button"
                      title="商品を削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 合計とチェックアウト */}
      {items.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {/* 合計金額 */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold text-gray-800">合計金額:</span>
            <span className="text-2xl font-bold text-green-600">
              ¥{totalAmount.toLocaleString()}
            </span>
          </div>

          {/* 従業員コード入力（任意） */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              従業員コード <span className="text-gray-400 text-xs">(任意)</span>
            </label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="従業員コードを入力（省略可）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ 入力しない場合は「guest」として処理されます
            </p>
          </div>

          {/* 決済ボタン */}
          <button
            onClick={handleProcessPurchase}
            disabled={items.length === 0 || processingPurchase}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            type="button"
          >
            {processingPurchase ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                決済処理中...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                決済を実行
              </>
            )}
          </button>

          {/* 商品詳細サマリー */}
          <div className="mt-4 p-3 bg-white rounded-lg text-xs text-gray-600">
            <div className="flex justify-between">
              <span>商品点数:</span>
              <span>{items.length}点</span>
            </div>
            <div className="flex justify-between">
              <span>合計個数:</span>
              <span>{items.reduce((sum, item) => sum + item.quantity, 0)}個</span>
            </div>
            <div className="flex justify-between font-medium text-gray-800">
              <span>税込総額:</span>
              <span>¥{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseList; 