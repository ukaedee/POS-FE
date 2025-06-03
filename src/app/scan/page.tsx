"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Product {
  PRD_ID: number;
  CODE: string;
  NAME: string;
  PRICE: number;
  STOCK: number;
}

const ScanPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const router = useRouter();

  // クライアントサイドでのマウント確認
  useEffect(() => {
    setMounted(true);
  }, []);

  // カメラストリームを開始
  const startCamera = async () => {
    if (!mounted) return;
    
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
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
      setError("カメラにアクセスできませんでした。手動入力をご利用ください。");
    }
  };

  // カメラストリームを停止
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  // 商品情報を取得する関数
  const fetchProduct = async (code: string) => {
    setLoading(true);
    setError("");
    
    try {
      console.log(`商品検索開始: ${code}`);
      const response = await fetch(`https://app-step4-34.azurewebsites.net/product/${code}`);
      
      if (response.ok) {
        const productData = await response.json();
        console.log("受信した商品データ:", productData);
        
        // データ構造を確認してから設定
        if (productData && typeof productData === 'object') {
          setProduct(productData as Product);
          setError("");
        } else {
          setError("商品データの形式が正しくありません");
          setProduct(null);
        }
      } else if (response.status === 404) {
        setError("商品が見つかりませんでした");
        setProduct(null);
      } else {
        const errorText = await response.text();
        console.error("APIエラーレスポンス:", errorText);
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

  // 簡易的なコード検出（デモ用）
  const captureFrame = useCallback(() => {
    if (!mounted || !videoRef.current || !canvasRef.current || !scanning) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== 4) return;
    
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // 簡易的な明度チェック（実際のコード検出の代替）
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let totalBrightness = 0;
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i] || 0;
        const g = imageData.data[i + 1] || 0;
        const b = imageData.data[i + 2] || 0;
        totalBrightness += (r + g + b) / 3;
      }
      const avgBrightness = totalBrightness / (imageData.data.length / 4);
      
      // デモ用：特定の明度条件でサンプルコードを検出
      if (avgBrightness > 100 && avgBrightness < 150 && !scannedCode) {
        setTimeout(() => {
          if (scanning && !scannedCode && mounted) {
            const demoCode = "1234567890001";
            setScannedCode(demoCode);
            stopCamera();
            fetchProduct(demoCode);
          }
        }, 1000);
      }
    } catch (err) {
      console.error("Frame capture error:", err);
    }
  }, [mounted, scanning, scannedCode, stopCamera]);

  // フレームキャプチャのループ
  useEffect(() => {
    if (!mounted) return;
    
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
  }, [mounted, scanning, captureFrame]);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 手動入力の処理
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (code && mounted) {
      setScannedCode(code);
      stopCamera();
      fetchProduct(code);
    }
  };

  // スキャンを再開
  const restartScan = () => {
    if (!mounted) return;
    setScannedCode("");
    setProduct(null);
    setError("");
    setManualInput("");
    startCamera();
  };

  // 商品詳細ページへ遷移（元の機能を維持）
  const goToProductPage = () => {
    if (product && mounted) {
      router.push(`/product/${product.CODE}`);
    }
  };

  // サンプルコードテスト
  const handleSampleCode = () => {
    if (!mounted) return;
    const testCode = "1234567890001";
    setManualInput(testCode);
    setScannedCode(testCode);
    stopCamera();
    fetchProduct(testCode);
  };

  // SSRとクライアントの不一致を防ぐため、マウント前は基本的なUIのみ表示
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
        <div className="relative w-80 h-80 max-w-full mb-6">
          <div className="w-full h-full bg-gray-800 rounded-2xl flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📱</div>
              <p>読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      {/* メインスキャナー部分 */}
      <div className="relative w-80 h-80 max-w-full mb-6">
        {scanning ? (
          <>
            <video
              ref={videoRef}
              className="rounded-2xl object-cover w-full h-full"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* バーコード読取枠 */}
            <div 
              className="absolute top-0 left-0 w-full h-full border-4 border-white rounded-2xl pointer-events-none" 
              style={{ boxShadow: "0 0 0 4px rgba(0,0,0,0.5) inset" }} 
            />
            
            {/* 停止ボタン */}
            <button
              onClick={stopCamera}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              type="button"
            >
              ❌
            </button>
          </>
        ) : (
          <div className="w-full h-full bg-gray-800 rounded-2xl flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📱</div>
              <p>カメラ待機中</p>
            </div>
          </div>
        )}
      </div>

      {/* メッセージエリア */}
      <div className="text-center mb-6">
        {scanning ? (
          <p className="text-white text-lg">QRコード・バーコードを枠内に合わせてください</p>
        ) : scannedCode ? (
          <div className="text-center">
            <p className="text-green-400 text-lg mb-2">✅ コードを読み取りました</p>
            <p className="text-white font-mono">{scannedCode}</p>
          </div>
        ) : (
          <p className="text-gray-400 text-lg">スキャンを開始してください</p>
        )}
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* 商品情報表示 */}
      {loading && (
        <div className="text-center mb-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-white mt-2">商品情報を取得中...</p>
        </div>
      )}

      {product && !loading && (
        <div className="bg-white rounded-lg p-4 mb-6 max-w-sm w-full">
          <h3 className="font-bold text-lg text-gray-800 mb-2">{product.NAME || '商品名不明'}</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>商品ID: {product.PRD_ID || 'N/A'}</p>
            <p>商品コード: {product.CODE || 'N/A'}</p>
            <p>価格: <span className="font-bold text-green-600">¥{(product.PRICE || 0).toLocaleString()}</span></p>
            <p>在庫: <span className={(product.STOCK || 0) > 0 ? 'text-green-600' : 'text-red-600'}>{product.STOCK || 0}個</span></p>
          </div>
        </div>
      )}

      {/* コントロールボタン */}
      <div className="space-y-3 w-full max-w-sm">
        {!scanning && !scannedCode && (
          <button
            onClick={startCamera}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            type="button"
          >
            📷 スキャン開始
          </button>
        )}

        {scannedCode && (
          <div className="space-y-2">
            <button
              onClick={restartScan}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              type="button"
            >
              🔄 再スキャン
            </button>
            
            {product && (
              <button
                onClick={goToProductPage}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                type="button"
              >
                📄 商品詳細ページへ
              </button>
            )}
          </div>
        )}

        {/* 手動入力 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-white text-sm font-medium">
              手動入力（13桁商品コード）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="1234567890001"
                className="flex-1 px-3 py-2 rounded border-0 text-black"
                maxLength={13}
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                🔍
              </button>
            </div>
          </form>
          
          {/* サンプルコードボタン */}
          <button
            onClick={handleSampleCode}
            className="text-blue-400 hover:text-blue-300 underline text-sm mt-2"
            type="button"
          >
            📝 サンプルコードを試す (1234567890001)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanPage;