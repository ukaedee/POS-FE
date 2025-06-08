"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Package, CheckCircle, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '../types/product';
import BarcodeScannerModal from './BarcodeScannerModal';
import Image from 'next/image';
import SecondaryButton from './ui/SecondaryButton';
import PrimaryButton from './ui/PrimaryButton';
import Header from './ui/Header';
import QuantitySelector from './ui/QuantitySelector';
import BottomArea from './ui/BottomArea';
import ProductCard from './ui/ProductCard';

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
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <Header
        onLogoClick={undefined}
        onCartClick={onCartClick}
        cartCount={cartItemCount}
        cartActive={false}
        cartDisabled={false}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-16 h-16 text-gray-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">商品をスキャン</h2>
            <p className="text-gray-600">QRコードを読み取って商品を追加</p>
          </div>
        </div>
      </div>
      {/* スキャン開始ボタンを中央下部に固定配置 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full flex justify-center z-20">
        <div className="max-w-md w-[90vw]">
          <PrimaryButton onClick={onStartScan} className="w-full py-5 text-xl">
            <Camera className="w-6 h-6" />
            スキャン開始
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

// 商品詳細画面コンポーネント
const ProductDetailScreen: React.FC<{
  product?: Product | null;
  onHomeClick: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onStartScan: () => void;
  loading?: boolean;
  cartCount: number;
}> = ({ product, onHomeClick, onAddToCart, onStartScan, loading = false, cartCount }) => {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!product && !loading) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [product, loading]);

  useEffect(() => {
    if (countdown <= 0 && !product && !loading) {
      onHomeClick();
    }
  }, [countdown, product, loading, onHomeClick]);

  const handleAddToCart = () => {
    if (product && quantity > 0) {
      onAddToCart(product, quantity);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">商品情報を取得中...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          onLogoClick={onHomeClick}
          onCartClick={undefined}
          cartCount={cartCount}
          cartActive={false}
          cartDisabled={true}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 text-6xl mb-4">❌</div>
            <p className="text-gray-600 text-lg">商品が見つかりませんでした</p>
            <p className="text-gray-500 text-sm mt-2">{countdown}秒後にトップに戻ります</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <Header
        onLogoClick={onHomeClick}
        onCartClick={undefined}
        cartCount={cartCount}
        cartActive={false}
        cartDisabled={true}
      />

      {/* 別の商品をスキャンボタン（上部） */}
      <div className="max-w-md w-full mx-auto mt-4 px-4">
        <SecondaryButton onClick={onStartScan}>
          <Camera className="w-6 h-6" />
          商品をスキャン
        </SecondaryButton>
      </div>

      {/* 商品詳細 */}
      <div className="flex-1 p-6 pb-40">
        <div className="max-w-md mx-auto">
          <div className="bg-white space-y-6">
            {/* 商品画像エリア */}
            <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {!imageError ? (
                <Image
                  src={`/images/${product.CODE}.png`}
                  alt={`商品コード ${product.CODE}`}
                  onError={handleImageError}
                  width={256}
                  height={256}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Package className="w-20 h-20 text-gray-400" />
              )}
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
                <p className="text-3xl font-bold text-gray-800">¥{product.PRICE.toLocaleString()}</p>
              </div>

              {/* 数量選択 */}
              <div className="space-y-3">
                <p className="text-gray-700 font-medium">数量</p>
                <QuantitySelector
                  value={quantity}
                  min={1}
                  max={product.STOCK || 999}
                  onChange={setQuantity}
                  size="L"
                />
                <p className="text-center text-gray-600 text-sm">
                  小計: ¥{(product.PRICE * quantity).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 追加ボタン（下部固定） */}
      <BottomArea>
        <div className="max-w-md mx-auto p-6 space-y-3">
          <PrimaryButton
            onClick={handleAddToCart}
            disabled={(product.STOCK || 0) <= 0}
            className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: (product.STOCK || 0) <= 0 ? '#9ca3af' : undefined }}
          >
            <Plus className="w-6 h-6" />
            {(product.STOCK || 0) <= 0 ? '在庫切れ' : 'カートに追加'}
          </PrimaryButton>
        </div>
      </BottomArea>
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
  processing?: boolean;
  totalItemCount: number;
  onStartScan: () => void;
}> = ({ items, onHomeClick, onUpdateQuantity, onRemoveItem, onCheckout, processing = false, totalItemCount, onStartScan }) => {
  const totalAmount = items.reduce((sum, item) => sum + (item.product.PRICE * item.quantity), 0);
  const tax = Math.floor(totalAmount * 0.1);
  const taxIncludedTotal = totalAmount + tax;
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleQuantityChange = (productCode: string, delta: number) => {
    const item = items.find(i => i.product.CODE === productCode);
    if (item) {
      const newQuantity = item.quantity + delta;
      if (newQuantity >= 1 && newQuantity <= item.product.STOCK) {
        onUpdateQuantity(productCode, newQuantity);
      }
    }
  };

  const handleImageError = (productCode: string) => {
    setImageErrors(prev => new Set(prev).add(productCode));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <Header
        onLogoClick={onHomeClick}
        onCartClick={undefined}
        cartCount={totalItemCount}
        cartActive={true}
        cartDisabled={true}
      />

      {/* 商品リスト（スクロール可能、スキャンボタン含む） */}
      <div className="flex-1 p-4 pb-[216px] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="max-w-2xl mx-auto w-full" style={{ paddingLeft: '4px', paddingRight: '4px' }}>
          <SecondaryButton onClick={onStartScan}>
            <Camera className="w-6 h-6" />
              商品をスキャン
          </SecondaryButton>
          <div className="mt-2 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">まだカートに商品がありません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <ProductCard
                    key={item.product.CODE}
                    product={item.product}
                    quantity={item.quantity}
                    maxQuantity={item.product.STOCK}
                    onQuantityChange={(newValue) => handleQuantityChange(item.product.CODE, newValue - item.quantity)}
                    onRemove={() => onRemoveItem(item.product.CODE)}
                    imageError={imageErrors.has(item.product.CODE)}
                    onImageError={() => handleImageError(item.product.CODE)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 合計・購入ボタン（下部固定・影付き） */}
      {items.length > 0 && (
        <BottomArea>
          <div className="max-w-2xl mx-auto" style={{ padding: '24px' }}>
            {/* 買上点数〜内消費税などの情報 */}
            <div className="text-sm text-gray-700 grid grid-cols-2 gap-y-1 mb-3">
              <span>買上点数</span><span className="text-right">{totalItemCount}点</span>
              <span>小計</span><span className="text-right">¥{totalAmount.toLocaleString()}</span>
              <span>消費税等</span><span className="text-right">¥{tax.toLocaleString()}</span>
              <span className="text-xs text-gray-400">(10%対象)</span><span className="text-right text-xs text-gray-400">¥{totalAmount.toLocaleString()}</span>
              <span className="text-xs text-gray-400">(内消費税)</span><span className="text-right text-xs text-gray-400">¥{tax.toLocaleString()}</span>
            </div>
            {/* Divider */}
            <div className="border-t border-dashed border-gray-300 my-2"></div>
            {/* 合計金額 */}
            <div className="flex justify-between items-end mb-4">
              <div className="text-xs text-gray-500">合計金額</div>
              <div className="text-2xl font-bold text-gray-900">¥{taxIncludedTotal.toLocaleString()}</div>
            </div>
            {/* 購入ボタン */}
            <PrimaryButton
              onClick={onCheckout}
              disabled={processing}
              className="w-full"
            >
              <ShoppingCart className="w-6 h-6" />
              購入
            </PrimaryButton>
          </div>
        </BottomArea>
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

  useEffect(() => {
    if (countdown <= 0) {
      onReturnHome();
    }
  }, [countdown, onReturnHome]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-gray-700" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              購入が完了しました
            </h1>
            
            <p className="text-gray-600">
              {countdown}秒後にトップに戻ります
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-center">
              <PrimaryButton onClick={onReturnHome} className="max-w-xs w-full mx-auto">
                トップに戻る
              </PrimaryButton>
            </div>
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

    // 在庫超過チェック
    const overStockItem = purchaseItems.find(item => item.quantity > (item.product.STOCK || 0));
    if (overStockItem) {
      setError(`「${overStockItem.product.NAME}」の在庫が不足しています（在庫: ${overStockItem.product.STOCK}、カート: ${overStockItem.quantity}）`);
      return;
    }

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
            onHomeClick={handleReturnHome}
            onAddToCart={handleAddToPurchaseList}
            onStartScan={startNewScan}
            loading={loading}
            cartCount={purchaseItems.reduce((sum, item) => sum + item.quantity, 0)}
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
            processing={processingPurchase}
            totalItemCount={totalItemCount}
            onStartScan={startNewScan}
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
    <div className="min-h-screen">
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
              <div className="w-16 h-16 border-4 border-gray-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
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