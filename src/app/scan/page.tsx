"use client";
import React, { useRef, useEffect, useState } from "react";

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manualInput, setManualInput] = useState("");

  // カメラストリームを開始
  const startCamera = async () => {
    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // 背面カメラを優先
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("カメラにアクセスできませんでした。手動入力をご利用ください。");
    }
  };

  // カメラストリームを停止
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  // 商品情報を取得する関数
  const fetchProduct = async (code: string) => {
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`https://app-step4-34.azurewebsites.net/product/${code}`);
      
      if (response.ok) {
        const productData = await response.json();
        setProduct(productData);
        setError("");
      } else if (response.status === 404) {
        setError("商品が見つかりませんでした");
        setProduct(null);
      } else {
        setError(`エラーが発生しました: ${response.status}`);
        setProduct(null);
      }
    } catch (err) {
      setError("商品検索でエラーが発生しました");
      setProduct(null);
      console.error("Product fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 手動入力の処理
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (code) {
      setScannedCode(code);
      stopCamera();
      fetchProduct(code);
    }
  };

  // 簡易的なバーコード/QRコード検出（デモ用）
  const captureFrame = () => {
    if (videoRef.current && canvasRef.current && scanning) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // 実際のコード検出はここで行います
      // デモとして、特定の条件でサンプルコードを返す
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 簡易的な明度チェック（実際のコード検出の代替）
      let totalBrightness = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        totalBrightness += (r + g + b) / 3;
      }
      const avgBrightness = totalBrightness / (imageData.data.length / 4);
      
      // デモ用：特定の明度条件でサンプルコードを検出
      if (avgBrightness > 100 && avgBrightness < 150) {
        // サンプルコードを検出したとして処理
        setTimeout(() => {
          if (scanning && !scannedCode) {
            const demoCode = "1234567890001";
            setScannedCode(demoCode);
            stopCamera();
            fetchProduct(demoCode);
          }
        }, 1000);
      }
    }
  };

  // フレームキャプチャのループ
  useEffect(() => {
    let animationId: number;
    if (scanning) {
      const loop = () => {
        captureFrame();
        animationId = requestAnimationFrame(loop);
      };
      animationId = requestAnimationFrame(loop);
    }
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [scanning, scannedCode]);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // スキャンを再開する関数
  const restartScan = () => {
    setScannedCode("");
    setProduct(null);
    setError("");
    setManualInput("");
    startCamera();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        
        {/* ヘッダー */}
        <div className="bg-blue-600 text-white p-4 text-center">
          <h1 className="text-xl font-bold">商品スキャナー</h1>
          <p className="text-sm opacity-90">カメラ＋手動入力対応</p>
        </div>

        {/* カメラ部分 */}
        {scanning && !cameraError && (
          <div className="relative bg-black">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              autoPlay
              playsInline
              muted
            />
            
            {/* 隠しcanvas（フレーム解析用） */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* スキャンエリアの枠 */}
            <div className="absolute inset-4 border-2 border-green-400 rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400"></div>
            </div>
            
            {/* スキャン中のメッセージ */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full inline-block">
                📱 コードを枠内に合わせてください
              </p>
            </div>

            {/* カメラ停止ボタン */}
            <button
              onClick={stopCamera}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
            >
              ❌
            </button>
          </div>
        )}

        {/* カメラエラー表示 */}
        {cameraError && (
          <div className="p-4 bg-orange-50 border-l-4 border-orange-400">
            <div className="flex items-center">
              <span className="text-orange-500 text-xl mr-2">📷</span>
              <p className="text-sm text-orange-700">{cameraError}</p>
            </div>
          </div>
        )}

        {/* カメラ開始ボタン */}
        {!scanning && !scannedCode && (
          <div className="p-4 text-center">
            <button
              onClick={startCamera}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium mb-4"
            >
              📷 カメラでスキャン
            </button>
            <p className="text-xs text-gray-500">
              ※ カメラ許可が必要です
            </p>
          </div>
        )}

        {/* 手動入力エリア */}
        <div className="p-4 border-b">
          <form onSubmit={handleManualSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              手動入力（13桁の商品コード）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="例: 1234567890001"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={13}
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                🔍
              </button>
            </div>
          </form>
          
          {/* サンプルコードボタン */}
          <div className="mt-2">
            <button
              onClick={() => {
                setManualInput("1234567890001");
                setScannedCode("1234567890001");
                stopCamera();
                fetchProduct("1234567890001");
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              📝 サンプル商品コードを試す
            </button>
          </div>
        </div>

        {/* 結果表示エリア */}
        <div className="p-4">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">商品情報を取得中...</p>
            </div>
          )}

          {scannedCode && !loading && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">読み取ったコード:</p>
              <p className="font-mono text-lg font-bold text-blue-600">{scannedCode}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-red-500 text-xl mr-2">⚠️</span>
                <div>
                  <p className="font-medium text-red-800">エラー</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {product && !loading && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <span className="text-green-500 text-2xl mr-3">✅</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-green-800 mb-2">{product.NAME}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品ID:</span>
                      <span className="font-medium">{product.PRD_ID}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品コード:</span>
                      <span className="font-mono font-medium">{product.CODE}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">価格:</span>
                      <span className="font-bold text-green-600">¥{product.PRICE.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">在庫:</span>
                      <span className={`font-medium ${product.STOCK > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {product.STOCK}個
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-2">
            {scannedCode && (
              <button
                onClick={restartScan}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🔄 新しくスキャン
              </button>
            )}
            
            {product && (
              <button
                onClick={() => {
                  // ここで商品をカートに追加する処理などを実装
                  alert(`${product.NAME} をカートに追加しました！`);
                }}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                🛒 カートに追加
              </button>
            )}
          </div>
        </div>

        {/* フッター情報 */}
        <div className="bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500">
            HTML5 Camera API + 手動入力対応
          </p>
          <p className="text-xs text-gray-400 mt-1">
            標準ブラウザ機能のみ使用 | Azure POS API連携
          </p>
        </div>
      </div>

      {/* 使用方法のヒント */}
      <div className="mt-4 p-4 bg-blue-900 bg-opacity-80 text-white rounded-lg max-w-md w-full">
        <h4 className="font-bold mb-2">💡 使用方法</h4>
        <div className="text-sm space-y-1">
          <p>• 「カメラでスキャン」でカメラを起動</p>
          <p>• QRコードやバーコードを枠内に合わせる</p>
          <p>• 手動入力で直接商品コードを入力</p>
          <p>• サンプル商品コード: 1234567890001</p>
        </div>
      </div>
    </div>
  );
}