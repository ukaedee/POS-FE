"use client";
import { useState } from "react";

interface Product {
  name: string;
  price: number;
}

export default function Home() {
  const [productCode, setProductCode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetchProduct = async () => {
    if (!productCode.trim()) {
      setError("商品コードを入力してください");
      return;
    }

    setLoading(true);
    setError("");
    setProduct(null);

    try {
      // 実際のAPIのURLに更新
      const response = await fetch(`https://app-step4-34.azurewebsites.net/product/${productCode}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setProduct(data);
        } else {
          setError("商品が見つかりませんでした");
        }
      } else if (response.status === 404) {
        setError("商品が見つかりませんでした");
      } else {
        setError(`エラーが発生しました: ${response.status}`);
      }
    } catch (err) {
      setError("通信エラーが発生しました");
      console.error("API call error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleFetchProduct();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          商品取得テスト
        </h1>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="productCode" className="block text-sm font-medium text-gray-700 mb-2">
              商品コード（13桁）
            </label>
            <input
              id="productCode"
              type="text"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="例: 4902505130267"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={13}
            />
          </div>
          
          <button
            onClick={handleFetchProduct}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "取得中..." : "商品を取得"}
          </button>
        </div>

        {/* 結果表示エリア */}
        <div className="mt-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p className="font-medium">エラー</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {product && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <p className="font-medium">商品情報</p>
              <div className="text-sm mt-2 space-y-1">
                <p><span className="font-medium">商品名:</span> {product.name}</p>
                <p><span className="font-medium">価格:</span> ¥{product.price.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* API情報 */}
        <div className="mt-6 text-xs text-gray-500">
          <p>API URL: https://app-step4-34.azurewebsites.net/product/{productCode || "{code}"}</p>
          <p>※ バックエンドAPI（Azure）と通信中</p>
        </div>
      </div>
    </div>
  );
}
