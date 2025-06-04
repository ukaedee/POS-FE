"use client";
import React, { useState } from 'react';
import { Camera, Package, Search, CheckCircle } from 'lucide-react';
import { Product } from '../types/product';
import BarcodeScannerModal from './BarcodeScannerModal';
import ProductInfoForm from './ProductInfoForm';
import PurchaseList from './PurchaseList';

// 購入アイテムの型定義
interface PurchaseItem {
  product: Product;
  quantity: number;
}

// 取引結果の型定義
interface TransactionResult {
  transaction_id: string;
  total_amount: number;
  timestamp: string;
}

const POSApp: React.FC = () => {
  // モーダル状態
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  
  // 商品関連状態
  const [scannedCode, setScannedCode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 購入リスト状態
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  
  // 取引完了状態
  const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // API: 商品情報を取得
  const fetchProduct = async (code: string) => {
    setLoading(true);
    setError('');
    
    try {
      console.log(`商品検索開始: ${code}`);
      const response = await fetch(`https://app-step4-34.azurewebsites.net/product/${code}`);
      
      if (response.ok) {
        const productData = await response.json();
        console.log("受信した商品データ:", productData);
        
        if (productData && typeof productData === 'object') {
          setProduct(productData as Product);
          setError('');
        } else {
          setError('商品データの形式が正しくありません');
          setProduct(null);
        }
      } else if (response.status === 404) {
        setError('商品が見つかりませんでした');
        setProduct(null);
      } else {
        const errorText = await response.text();
        console.error("APIエラーレスポンス:", errorText);
        setError(`エラーが発生しました: ${response.status}`);
        setProduct(null);
      }
    } catch (err) {
      setError('商品検索でエラーが発生しました');
      setProduct(null);
      console.error("Product fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // API: 購入処理
  const processPurchase = async (employeeCode: string) => {
    if (purchaseItems.length === 0) return;
    
    setProcessingPurchase(true);
    
    try {
      const purchaseData = {
        employee_code: employeeCode,
        items: purchaseItems.map(item => ({
          product_code: item.product.CODE,
          quantity: item.quantity,
          unit_price: item.product.PRICE
        }))
      };

      console.log("購入データ送信:", purchaseData);
      
      const response = await fetch('https://app-step4-34.azurewebsites.net/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("購入処理成功:", result);
        
        setLastTransaction(result);
        setShowSuccess(true);
        
        // 購入リストをクリア
        setPurchaseItems([]);
        setProduct(null);
        setScannedCode('');
        
        // 3秒後に成功メッセージを非表示
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const errorText = await response.text();
        console.error("購入処理エラー:", errorText);
        setError(`購入処理でエラーが発生しました: ${response.status}`);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError('購入処理でエラーが発生しました');
    } finally {
      setProcessingPurchase(false);
    }
  };

  // スキャナーからのコード検出処理
  const handleCodeDetected = (code: string) => {
    console.log('検出されたコード:', code);
    setScannedCode(code);
    fetchProduct(code);
  };

  // 購入リストに商品を追加
  const handleAddToPurchaseList = (product: Product, quantity: number) => {
    setPurchaseItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.product.CODE === product.CODE);
      
      if (existingItemIndex !== -1) {
        // 既存商品の場合は数量を更新
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += quantity;
        return newItems;
      } else {
        // 新規商品の場合は追加
        return [...prevItems, { product, quantity }];
      }
    });
    
    // 商品情報をリセット
    setProduct(null);
    setScannedCode('');
  };

  // 購入リストの数量を更新
  const handleUpdateQuantity = (productCode: string, quantity: number) => {
    setPurchaseItems(prevItems =>
      prevItems.map(item =>
        item.product.CODE === productCode
          ? { ...item, quantity }
          : item
      )
    );
  };

  // 購入リストから商品を削除
  const handleRemoveItem = (productCode: string) => {
    setPurchaseItems(prevItems =>
      prevItems.filter(item => item.product.CODE !== productCode)
    );
  };

  // 新しいスキャンを開始
  const startNewScan = () => {
    setProduct(null);
    setScannedCode('');
    setError('');
    setScannerModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* ヘッダー */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            POS システム
          </h1>
          <p className="text-gray-600 mt-2">バーコードスキャンと商品管理システム</p>
        </div>
      </div>

      {/* 成功メッセージ */}
      {showSuccess && lastTransaction && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-green-100 border border-green-400 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-bold text-green-800">購入処理が完了しました！</p>
              <p className="text-green-700 text-sm">
                取引ID: {lastTransaction.transaction_id} | 
                合計金額: ¥{lastTransaction.total_amount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-red-100 border border-red-400 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: 商品情報とスキャナー */}
        <div className="space-y-6">
          {/* スキャナー起動ボタン */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <button
              onClick={startNewScan}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg flex items-center justify-center gap-3"
              type="button"
            >
              <Camera className="w-6 h-6" />
              スキャン（カメラ）
            </button>
            <p className="text-gray-500 text-sm text-center mt-2">
              バーコード・QRコードを読み取ります
            </p>
          </div>

          {/* 商品情報フォーム */}
          <ProductInfoForm
            scannedCode={scannedCode}
            product={product}
            loading={loading}
            onAddToPurchaseList={handleAddToPurchaseList}
          />
        </div>

        {/* 右側: 購入リスト */}
        <div>
          <PurchaseList
            items={purchaseItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onProcessPurchase={processPurchase}
            processingPurchase={processingPurchase}
          />
        </div>
      </div>

      {/* 統計情報 */}
      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            セッション情報
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{purchaseItems.length}</p>
              <p className="text-gray-600 text-sm">商品点数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {purchaseItems.reduce((sum, item) => sum + item.quantity, 0)}
              </p>
              <p className="text-gray-600 text-sm">合計個数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                ¥{purchaseItems.reduce((sum, item) => sum + (item.product.PRICE * item.quantity), 0).toLocaleString()}
              </p>
              <p className="text-gray-600 text-sm">合計金額</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {lastTransaction ? '✅' : '⏳'}
              </p>
              <p className="text-gray-600 text-sm">
                {lastTransaction ? '取引完了' : '作業中'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* バーコードスキャナーモーダル */}
      <BarcodeScannerModal
        isOpen={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onCodeDetected={handleCodeDetected}
      />
    </div>
  );
};

export default POSApp; 