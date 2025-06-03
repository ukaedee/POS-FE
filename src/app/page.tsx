"use client";
import { useState } from "react";
import { PlusIcon, MinusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface Product {
  PRD_ID: number;
  CODE: string;
  NAME: string;
  PRICE: number;
  STOCK: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface PurchaseResponse {
  TRD_ID: number;
  DATETIME: string;
  EMP_CD: string;
  STORE_CD: string;
  POS_NO: string;
  TOTAL_AMT: number;
  TTL_AMT_EX_TAX: number;
  details: Array<{
    DTL_ID: number;
    PRD_ID: number;
    PRD_CODE: string;
    PRD_NAME: string;
    PRD_PRICE: number;
    QTY: number;
    TAX_CD: string;
  }>;
}

interface TransactionDetail {
  transaction_id: number;
  items: Array<{
    name: string;
    unit_price: number;
    quantity: number;
    tax_rate: number;
    tax_amount: number;
    price_incl_tax: number;
  }>;
  total_excl_tax: number;
  total_tax: number;
  total_incl_tax: number;
}

export default function PurchaseTest() {
  const [productCode, setProductCode] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResponse | null>(null);
  const [transactionDetail, setTransactionDetail] = useState<TransactionDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'purchase' | 'search'>('purchase');

  // 取引詳細取得
  const handleGetTransactionDetail = async () => {
    if (!transactionId.trim()) {
      setError("取引IDを入力してください");
      return;
    }

    setLoading(true);
    setError("");
    setTransactionDetail(null);

    try {
      const response = await fetch(`https://app-step4-34.azurewebsites.net/transactions/${transactionId}`);
      
      if (response.ok) {
        const detail: TransactionDetail = await response.json();
        setTransactionDetail(detail);
        console.log("Transaction Detail:", detail);
      } else if (response.status === 404) {
        setError("取引が見つかりませんでした");
      } else {
        const errorData = await response.json();
        setError(`エラー: ${errorData.detail || response.status}`);
      }
    } catch (err) {
      setError("取引詳細取得でエラーが発生しました");
      console.error("Transaction detail error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 商品を検索してカートに追加
  const handleAddToCart = async () => {
    if (!productCode.trim()) {
      setError("商品コードを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`https://app-step4-34.azurewebsites.net/product/${productCode}`);
      
      if (response.ok) {
        const product: Product = await response.json();
        
        // 既にカートにある商品か確認
        const existingItem = cart.find(item => item.product.CODE === product.CODE);
        
        if (existingItem) {
          // 在庫チェック
          if (existingItem.quantity >= product.STOCK) {
            setError(`在庫不足です。利用可能な在庫: ${product.STOCK}個`);
            return;
          }
          
          // 数量を増やす
          setCart(cart.map(item => 
            item.product.CODE === product.CODE 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ));
        } else {
          // 新しい商品をカートに追加
          if (product.STOCK < 1) {
            setError("この商品は在庫がありません");
            return;
          }
          
          setCart([...cart, { product, quantity: 1 }]);
        }
        
        setProductCode("");
      } else if (response.status === 404) {
        setError("商品が見つかりませんでした");
      } else {
        setError(`エラーが発生しました: ${response.status}`);
      }
    } catch (err) {
      setError("商品検索エラーが発生しました");
      console.error("Product search error:", err);
    } finally {
      setLoading(false);
    }
  };

  // カートアイテムの数量変更
  const updateQuantity = (productCode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productCode);
      return;
    }

    const item = cart.find(item => item.product.CODE === productCode);
    if (item && newQuantity > item.product.STOCK) {
      setError(`在庫不足です。利用可能な在庫: ${item.product.STOCK}個`);
      return;
    }

    setCart(cart.map(item => 
      item.product.CODE === productCode 
        ? { ...item, quantity: newQuantity }
        : item
    ));
    setError("");
  };

  // カートから商品を削除
  const removeFromCart = (productCode: string) => {
    setCart(cart.filter(item => item.product.CODE !== productCode));
  };

  // カートをクリア
  const clearCart = () => {
    setCart([]);
    setPurchaseResult(null);
    setError("");
  };

  // 購入処理
  const handlePurchase = async () => {
    if (cart.length === 0) {
      setError("カートに商品を追加してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const purchaseData = {
        emp_cd: empCode || null,
        items: cart.map(item => ({
          prd_code: item.product.CODE,
          qty: item.quantity
        }))
      };

      console.log("Purchase request:", purchaseData);

      const response = await fetch("https://app-step4-34.azurewebsites.net/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseData)
      });

      if (response.ok) {
        const result: PurchaseResponse = await response.json();
        setPurchaseResult(result);
        setCart([]);
      } else {
        const errorData = await response.json();
        setError(`購入エラー: ${errorData.detail || response.status}`);
      }
    } catch (err) {
      setError("購入処理でエラーが発生しました");
      console.error("Purchase error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 合計金額計算
  const totalAmount = cart.reduce((sum, item) => sum + (item.product.PRICE * item.quantity), 0);
  const taxAmount = Math.floor(totalAmount * 0.1);
  const totalWithTax = totalAmount + taxAmount;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (activeTab === 'purchase') {
        handleAddToCart();
      } else {
        handleGetTransactionDetail();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          POS APIテスト
        </h1>

        {/* タブナビゲーション */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('purchase');
                  setError("");
                  setTransactionDetail(null);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'purchase'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🛒 購入テスト
              </button>
              <button
                onClick={() => {
                  setActiveTab('search');
                  setError("");
                  setPurchaseResult(null);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔍 取引詳細検索
              </button>
            </nav>
          </div>
        </div>

        {/* 購入テストタブ */}
        {activeTab === 'purchase' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 商品追加セクション */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">商品をカートに追加</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    従業員コード（オプション）
                  </label>
                  <input
                    type="text"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="例: 1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    商品コード（13桁）
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="例: 4902505130267"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={13}
                    />
                    <button
                      onClick={handleAddToCart}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* カート表示セクション */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">カート ({cart.length}品目)</h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    カートをクリア
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">カートは空です</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.CODE} className="flex items-center justify-between border-b pb-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.NAME}</p>
                        <p className="text-xs text-gray-500">¥{item.product.PRICE.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.CODE, item.quantity - 1)}
                          className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.CODE, item.quantity + 1)}
                          className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.CODE)}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* 合計 */}
                  <div className="pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>小計（税抜）:</span>
                      <span>¥{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>消費税（10%）:</span>
                      <span>¥{taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>合計:</span>
                      <span>¥{totalWithTax.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePurchase}
                    disabled={loading}
                    className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? "処理中..." : "購入する"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 取引詳細検索タブ */}
        {activeTab === 'search' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 取引ID入力セクション */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">取引詳細検索</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    取引ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="例: 1"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleGetTransactionDetail}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      🔍 検索
                    </button>
                  </div>
                </div>
                
                {/* 購入結果から取引IDを使用 */}
                {purchaseResult && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-700 mb-2">最新の購入取引:</p>
                    <button
                      onClick={() => {
                        setTransactionId(purchaseResult.TRD_ID.toString());
                        handleGetTransactionDetail();
                      }}
                      className="text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      取引ID: {purchaseResult.TRD_ID} の詳細を表示
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 取引詳細表示セクション */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">取引詳細</h2>
              
              {!transactionDetail ? (
                <p className="text-gray-500 text-center py-8">
                  取引IDを入力して検索してください
                </p>
              ) : (
                <div className="space-y-4">
                  {/* 基本情報 */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-medium mb-2">取引情報</h3>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">取引ID:</span> {transactionDetail.transaction_id}</p>
                    </div>
                  </div>

                  {/* 商品明細 */}
                  <div>
                    <h3 className="font-medium mb-2">購入商品</h3>
                    <div className="space-y-2">
                      {transactionDetail.items.map((item, index) => (
                        <div key={index} className="border border-gray-200 p-3 rounded-md">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                単価: ¥{item.unit_price.toLocaleString()} × {item.quantity}個
                              </p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-medium">¥{item.price_incl_tax.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">
                                税率: {item.tax_rate}%
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>小計（税抜）:</span>
                              <span>¥{(item.unit_price * item.quantity).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>消費税:</span>
                              <span>¥{item.tax_amount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 合計金額 */}
                  <div className="bg-green-50 p-4 rounded-md">
                    <h3 className="font-medium mb-2">合計金額</h3>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>小計（税抜）:</span>
                        <span>¥{transactionDetail.total_excl_tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>消費税:</span>
                        <span>¥{transactionDetail.total_tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>合計（税込）:</span>
                        <span>¥{transactionDetail.total_incl_tax.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="font-medium">エラー</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 購入結果表示 */}
        {purchaseResult && activeTab === 'purchase' && (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-700 p-6 rounded-md">
            <h3 className="font-bold text-lg mb-4">購入完了！</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">取引情報</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">取引ID:</span> {purchaseResult.TRD_ID}</p>
                  <p><span className="font-medium">日時:</span> {new Date(purchaseResult.DATETIME).toLocaleString('ja-JP')}</p>
                  <p><span className="font-medium">従業員コード:</span> {purchaseResult.EMP_CD}</p>
                  <p><span className="font-medium">店舗コード:</span> {purchaseResult.STORE_CD}</p>
                  <p><span className="font-medium">POS番号:</span> {purchaseResult.POS_NO}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">金額情報</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">税抜合計:</span> ¥{purchaseResult.TTL_AMT_EX_TAX.toLocaleString()}</p>
                  <p><span className="font-medium">税込合計:</span> ¥{purchaseResult.TOTAL_AMT.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">購入商品</h4>
              <div className="text-sm">
                {purchaseResult.details.map((detail) => (
                  <div key={detail.DTL_ID} className="flex justify-between py-1 border-b">
                    <span>{detail.PRD_NAME} × {detail.QTY}</span>
                    <span>¥{(detail.PRD_PRICE * detail.QTY).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API情報 */}
        <div className="mt-6 text-xs text-gray-500 bg-white p-4 rounded-lg">
          <h4 className="font-medium mb-2">API情報</h4>
          <p>商品検索: GET https://app-step4-34.azurewebsites.net/product/{"{code}"}</p>
          <p>購入処理: POST https://app-step4-34.azurewebsites.net/purchase</p>
          <p>取引詳細: GET https://app-step4-34.azurewebsites.net/transactions/{"{id}"}</p>
          <p>※ バックエンドAPI（Azure）と通信中</p>
        </div>
      </div>
    </div>
  );
}