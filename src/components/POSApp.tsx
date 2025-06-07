"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Package, CheckCircle, ArrowLeft, Plus, ShoppingCart, Minus, Trash2, CreditCard } from 'lucide-react';
import { Product } from '../types/product';
import BarcodeScannerModal from './BarcodeScannerModal';

// POS設定の定数
const POS_CONFIG = {
  STORE_CD: '30',  // 店舗コード
  POS_NO: '90',    // POS機ID
  EMP_CD: 'guest'  // 従業員コード（デフォルト）
} as const;

// 購入アイテムの型定義
interface PurchaseItem {
  product: Product;
  quantity: number;
}

// 画面の種類
type AppScreen = 'home' | 'scanner' | 'product-detail' | 'cart' | 'purchase-complete';

// ホーム画面コンポーネント
const HomeScreen: React.FC<{
  onStartScan: () => void;
  cartItemCount: number;
  onCartClick: () => void;
}> = ({ onStartScan, cartItemCount, onCartClick }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow-md p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">POSシステム</h1>
          </div>
          <button
            onClick={onCartClick}
            className="relative hover:bg-gray-100 p-2 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-8 h-8 text-gray-600" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-16 h-16 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">商品をスキャン</h2>
            <p className="text-gray-600">QRコードを読み取って商品を追加</p>
          </div>

          <button
            onClick={onStartScan}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 transition-colors font-bold text-lg flex items-center justify-center gap-3 shadow-lg"
          >
            <Camera className="w-6 h-6" />
            スキャン開始
          </button>
        </div>
      </div>
    </div>
  );
};

// 商品詳細画面コンポーネント
const ProductDetailScreen: React.FC<{
  product?: Product | null;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  loading?: boolean;
}> = ({ product, onBack, onAddToCart, loading = false }) => {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.STOCK || 999)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (product && quantity > 0) {
      onAddToCart(product, quantity);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">商品情報を取得中...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="bg-white shadow-md p-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            戻る
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <p className="text-gray-600 text-lg">商品が見つかりませんでした</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow-md p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          戻る
        </button>
      </div>

      {/* 商品詳細 */}
      <div className="flex-1 p-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            {/* 商品画像エリア */}
            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-20 h-20 text-gray-400" />
            </div>

            {/* 商品情報 */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">{product.NAME}</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">商品コード</p>
                  <p className="font-mono font-medium">{product.CODE}</p>
                </div>
                <div>
                  <p className="text-gray-600">在庫数</p>
                  <p className={`font-bold ${(product.STOCK || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.STOCK}個
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-600 text-sm">価格</p>
                <p className="text-3xl font-bold text-blue-600">¥{product.PRICE.toLocaleString()}</p>
              </div>

              {/* 数量選択 */}
              <div className="space-y-3">
                <p className="text-gray-700 font-medium">数量</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-12 h-12 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-full"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-2xl font-bold w-16 text-center">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (product.STOCK || 999)}
                    className="w-12 h-12 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-full"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-center text-gray-600 text-sm">
                  小計: ¥{(product.PRICE * quantity).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 追加ボタン */}
      <div className="p-6 bg-white border-t">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleAddToCart}
            disabled={(product.STOCK || 0) <= 0}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-3"
          >
            <Plus className="w-6 h-6" />
            {(product.STOCK || 0) <= 0 ? '在庫切れ' : 'カートに追加'}
          </button>
        </div>
      </div>
    </div>
  );
};

// カート画面コンポーネント
const CartScreen: React.FC<{
  items: PurchaseItem[];
  onHomeClick: () => void;
  onUpdateQuantity: (productCode: string, quantity: number) => void;
  onRemoveItem: (productCode: string) => void;
  onCheckout: () => void;
  onStartScan: () => void;
  processing?: boolean;
  totalItemCount: number;
}> = ({ items, onHomeClick, onUpdateQuantity, onRemoveItem, onCheckout, onStartScan, processing = false, totalItemCount }) => {
  const totalAmount = items.reduce((sum, item) => sum + (item.product.PRICE * item.quantity), 0);
  const tax = Math.floor(totalAmount * 0.1);
  const taxIncludedTotal = totalAmount + tax;

  const handleQuantityChange = (productCode: string, delta: number) => {
    const item = items.find(i => i.product.CODE === productCode);
    if (item) {
      const newQuantity = item.quantity + delta;
      if (newQuantity >= 1 && newQuantity <= item.product.STOCK) {
        onUpdateQuantity(productCode, newQuantity);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow-md p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onHomeClick}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-lg transition-colors"
          >
            <Package className="w-6 h-6" />
            POS APP
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            カート ({totalItemCount}点)
          </h1>
          <div></div>
        </div>
      </div>

      {/* 商品リスト */}
      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto">
          {/* 商品を追加ボタン */}
          <div className="mb-4">
            <button
              onClick={onStartScan}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-3"
            >
              <Camera className="w-6 h-6" />
              商品を追加
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">まだカートに商品がありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.CODE} className="bg-white rounded-lg p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{item.product.NAME}</h3>
                      <p className="text-sm text-gray-500 font-mono">{item.product.CODE}</p>
                      <p className="text-lg font-bold text-blue-600">¥{item.product.PRICE.toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.product.CODE, -1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.product.CODE, 1)}
                          disabled={item.quantity >= item.product.STOCK}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="text-sm font-bold">
                        ¥{(item.product.PRICE * item.quantity).toLocaleString()}
                      </p>
                      
                      <button
                        onClick={() => onRemoveItem(item.product.CODE)}
                        className="text-red-600 hover:text-red-800 p-1"
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
      </div>

      {/* 合計・購入ボタン */}
      {items.length > 0 && (
        <div className="bg-white border-t p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* 買上点数・小計・消費税・合計金額 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">買上点数</span>
                <span className="font-bold">{totalItemCount}点</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">小計</span>
                <span className="font-bold">¥{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">消費税等</span>
                <span className="font-bold">¥{tax.toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-500 ml-4">
                (10%対象 ¥{totalAmount.toLocaleString()})
              </div>
              <div className="text-xs text-gray-500 ml-4">
                (内消費税 ¥{tax.toLocaleString()})
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">合計金額</span>
                  <span className="text-2xl font-bold text-green-600">¥{taxIncludedTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onCheckout}
              disabled={processing}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-xl hover:bg-green-700 disabled:opacity-50 font-bold text-lg flex items-center justify-center gap-3"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  処理中...
                </>
              ) : (
                <>
                  <CreditCard className="w-6 h-6" />
                  購入
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 購入完了画面コンポーネント
const PurchaseCompleteScreen: React.FC<{
  onReturnHome: () => void;
}> = ({ onReturnHome }) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // カウントダウンが0になったらホームに戻る
  useEffect(() => {
    if (countdown <= 0) {
      onReturnHome();
    }
  }, [countdown, onReturnHome]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          {/* 成功アイコンとタイトル */}
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              購入が完了しました
            </h1>
            
            <p className="text-gray-600">
              {countdown}秒後にトップに戻ります
            </p>
          </div>

          {/* ボタン */}
          <div className="space-y-3">
            <button
              onClick={onReturnHome}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              すぐにトップに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// メインPOSアプリコンポーネント
const POSApp: React.FC = () => {
  // 画面状態管理
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  
  // モーダル状態
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  
  // 商品関連状態
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 購入リスト状態
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  
  // 認証状態
  const [authenticating, setAuthenticating] = useState(false);

  // ホーム画面に戻る（useCallbackでメモ化）
  const handleReturnHome = useCallback(() => {
    setCurrentScreen('home');
    setProduct(null);
    setError('');
    setAuthenticating(false);
  }, []);

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
          setCurrentScreen('product-detail');
        } else {
          setError('商品データの形式が正しくありません');
          setProduct(null);
          setCurrentScreen('product-detail');
        }
      } else if (response.status === 404) {
        setError('商品が見つかりませんでした');
        setProduct(null);
        setCurrentScreen('product-detail');
      } else {
        const errorText = await response.text();
        console.error("APIエラーレスポンス:", errorText);
        setError(`エラーが発生しました: ${response.status}`);
        setProduct(null);
        setCurrentScreen('product-detail');
      }
    } catch (err) {
      setError('商品検索でエラーが発生しました');
      setProduct(null);
      setCurrentScreen('product-detail');
      console.error("Product fetch error:", err);
    } finally {
      setLoading(false);
      setAuthenticating(false);
    }
  };

  // QRコード検出時の処理（認証アニメーション付き）
  const handleCodeDetected = async (code: string) => {
    console.log(`📱 コード検出: ${code}`);
    
    // スキャナーモーダルを閉じる
    setScannerModalOpen(false);
    
    // 認証アニメーション開始
    setAuthenticating(true);
    
    // 0.8秒待ってから認証API呼び出し
    setTimeout(() => {
      fetchProduct(code);
    }, 800);
  };

  // API: 購入処理
  const processPurchase = async () => {
    if (purchaseItems.length === 0) return;
    
    setProcessingPurchase(true);
    
    try {
      const purchaseData = {
        emp_cd: POS_CONFIG.EMP_CD,
        store_cd: POS_CONFIG.STORE_CD,
        pos_no: POS_CONFIG.POS_NO,
        items: purchaseItems.map(item => ({
          prd_code: item.product.CODE,
          qty: item.quantity
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
      } else {
        const errorText = await response.text();
        console.error("購入処理エラー:", errorText);
      }
      
    } catch (err) {
      console.error("Purchase error:", err);
    } finally {
      // 購入完了画面に遷移
      setCurrentScreen('purchase-complete');
      
      // 購入リストをクリア
      setPurchaseItems([]);
      setProduct(null);
      setProcessingPurchase(false);
    }
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
    
    // カート画面に遷移
    setCurrentScreen('cart');
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
    setScannerModalOpen(true);
  };

  // 商品詳細画面から戻る
  const handleBackFromProductDetail = () => {
    setCurrentScreen('home');
    setProduct(null);
    setError('');
  };

  // 画面レンダリング
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen 
            onStartScan={startNewScan}
            cartItemCount={purchaseItems.reduce((sum, item) => sum + item.quantity, 0)}
            onCartClick={() => setCurrentScreen('cart')}
          />
        );
      
      case 'product-detail':
        return (
          <ProductDetailScreen
            product={product}
            onBack={handleBackFromProductDetail}
            onAddToCart={handleAddToPurchaseList}
            loading={loading}
          />
        );
      
      case 'cart':
        const totalItemCount = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <CartScreen
            items={purchaseItems}
            onHomeClick={handleReturnHome}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={processPurchase}
            onStartScan={startNewScan}
            processing={processingPurchase}
            totalItemCount={totalItemCount}
          />
        );
      
      case 'purchase-complete':
        return (
          <PurchaseCompleteScreen
            onReturnHome={handleReturnHome}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {renderScreen()}
      
      {/* エラーメッセージ */}
      {error && (
        <div className="fixed top-4 left-4 right-4 bg-red-100 border border-red-400 rounded-lg p-4 z-40 max-w-4xl mx-auto">
          <div className="flex justify-between items-start">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800 ml-4"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 認証中モーダル */}
      {authenticating && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm mx-4 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">認証中...</h3>
            <p className="text-gray-600 text-sm">商品情報を確認しています</p>
          </div>
        </div>
      )}

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