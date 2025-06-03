"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface Product {
  PRD_ID: number;
  CODE: string;
  NAME: string;
  PRICE: number;
  STOCK: number;
}

const ScanPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // クライアントサイドでのマウント確認
  useEffect(() => {
    setMounted(true);
    // ZXingライブラリの初期化
    codeReaderRef.current = new BrowserMultiFormatReader();
    console.log("ZXing BrowserMultiFormatReader initialized");
    
    return () => {
      // クリーンアップ
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // カメラストリームを開始
  const startCamera = async () => {
    if (!mounted || !codeReaderRef.current) return;
    
    try {
      setError("");
      setScanCount(0);
      console.log("カメラアクセスを開始...");
      
      // より詳細なカメラ設定
      const constraints = {
        video: {
          facingMode: "environment", // 背面カメラ優先
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          frameRate: { ideal: 30, min: 10 }
        },
        audio: false
      };
      
      console.log("getUserMedia constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Stream obtained:", stream);
      console.log("Video tracks:", stream.getVideoTracks());
      
      if (videoRef.current && stream) {
        console.log("Setting stream to video element...");
        videoRef.current.srcObject = stream;
        
        // ビデオの状態をログ
        videoRef.current.addEventListener('loadstart', () => console.log("Video loadstart"));
        videoRef.current.addEventListener('loadeddata', () => console.log("Video loadeddata"));
        videoRef.current.addEventListener('canplay', () => console.log("Video canplay"));
        videoRef.current.addEventListener('play', () => console.log("Video play"));
        
        // メタデータ読み込み完了時
        videoRef.current.onloadedmetadata = () => {
          console.log("ビデオメタデータ読み込み完了");
          console.log("Video dimensions:", {
            width: videoRef.current?.videoWidth,
            height: videoRef.current?.videoHeight
          });
          
          if (videoRef.current) {
            // 再生開始
            videoRef.current.play().then(() => {
              console.log("ビデオ再生開始成功");
              setScanning(true);
              // 少し遅延してからスキャン開始
              setTimeout(() => {
                startScanning();
              }, 500);
            }).catch((playErr) => {
              console.error("ビデオ再生エラー:", playErr);
              setError(`ビデオの再生に失敗しました: ${playErr.message}`);
            });
          }
        };
        
        // エラーハンドリング
        videoRef.current.onerror = (e) => {
          console.error("Video element error:", e);
          setError("ビデオの読み込みでエラーが発生しました");
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err instanceof Error) {
        setError(`カメラアクセスエラー: ${err.name} - ${err.message}`);
      } else {
        setError("カメラにアクセスできませんでした。手動入力をご利用ください。");
      }
    }
  };

  // ZXingを使用したスキャン開始
  const startScanning = () => {
    if (!codeReaderRef.current || !videoRef.current || !scanning) return;
    
    console.log("ZXingスキャンループ開始");
    
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !codeReaderRef.current || !scanning) return;
      
      try {
        setScanCount(prev => prev + 1);
        
        // ZXingでバーコード/QRコードを検出
        const result = await codeReaderRef.current.decodeFromVideoElement(videoRef.current);
        
        if (result && result.getText()) {
          const detectedCode = result.getText();
          console.log("🎉 コード検出成功:", detectedCode);
          console.log("検出フォーマット:", result.getBarcodeFormat());
          
          // スキャン停止
          setScanning(false);
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
          }
          
          setScannedCode(detectedCode);
          stopCamera();
          fetchProduct(detectedCode);
        }
      } catch (err) {
        // NotFoundException は正常（コードが見つからないだけ）
        if (err instanceof NotFoundException) {
          // 何もしない（継続スキャン）
        } else {
          console.error("スキャンエラー:", err);
        }
      }
    }, 100); // 100msごとにスキャン
  };

  // カメラストリームを停止
  const stopCamera = useCallback(() => {
    console.log("カメラ停止");
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
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
    setScanCount(0);
    startCamera();
  };

  // 商品詳細ページへ遷移
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

  // SSRとクライアントの不一致を防ぐ
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
        <div className="relative w-80 h-80 max-w-full mb-6">
          <div className="w-full h-full bg-gray-800 rounded-2xl flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📱</div>
              <p>ZXingライブラリ読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      {/* ヘッダー */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-white mb-2">📱 QRコード・バーコードリーダー</h1>
        <p className="text-gray-400 text-sm">ZXing-js による実際のコード認識</p>
      </div>

      {/* メインスキャナー部分 */}
      <div className="relative w-80 h-80 max-w-full mb-6 border-2 border-gray-600 rounded-2xl overflow-hidden">
        {scanning ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover bg-gray-900"
              autoPlay
              playsInline
              muted
              style={{
                transform: 'scaleX(-1)', // 鏡像表示（自然な見た目）
                minWidth: '100%',
                minHeight: '100%'
              }}
            />
            
            {/* スキャンエリアの枠 */}
            <div className="absolute inset-4 border-2 border-green-400 rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 animate-pulse"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 animate-pulse"></div>
              
              {/* 中央ライン */}
              <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-green-400 animate-pulse transform -translate-y-1/2"></div>
            </div>
            
            {/* 停止ボタン */}
            <button
              onClick={stopCamera}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
              type="button"
            >
              ❌
            </button>
            
            {/* スキャン状態表示 */}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-80 text-white text-xs p-2 rounded backdrop-blur-sm">
              <p>🔍 スキャン中... ({scanCount})</p>
              <p>📱 コードを枠内に合わせてください</p>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">
                {scannedCode ? "✅" : "📱"}
              </div>
              <p className="text-lg font-medium">
                {scannedCode ? "スキャン完了" : "スキャン待機中"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {scannedCode ? "結果を確認してください" : "カメラを起動してください"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* デバッグ情報（開発時のみ表示） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-800 text-white text-xs rounded-lg max-w-md w-full">
          <h4 className="font-bold mb-2">🔧 デバッグ情報</h4>
          <div className="space-y-1">
            <p>マウント状態: {mounted ? "✅" : "❌"}</p>
            <p>スキャン状態: {scanning ? "🔍 実行中" : "⏸️ 停止中"}</p>
            <p>スキャン回数: {scanCount}</p>
            <p>読み取りコード: {scannedCode || "なし"}</p>
            <p>商品情報: {product ? "✅ 取得済み" : "❌ なし"}</p>
            <p>ローディング: {loading ? "🔄" : "⏹️"}</p>
            {videoRef.current && (
              <div>
                <p>ビデオ要素: ✅ 存在</p>
                <p>ビデオサイズ: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}</p>
                <p>再生状態: {videoRef.current.paused ? "⏸️ 停止" : "▶️ 再生中"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* メッセージエリア */}
      <div className="text-center mb-6">
        {scanning ? (
          <div className="text-center">
            <p className="text-green-400 text-lg">🔍 リアルタイムスキャン中</p>
            <p className="text-gray-400 text-sm">QRコード・バーコードを枠内に合わせてください</p>
          </div>
        ) : scannedCode ? (
          <div className="text-center">
            <p className="text-green-400 text-lg mb-2">✅ コードを読み取りました！</p>
            <p className="text-white font-mono bg-gray-800 px-3 py-2 rounded">{scannedCode}</p>
          </div>
        ) : (
          <p className="text-gray-400 text-lg">スキャンを開始してください</p>
        )}
        {error && <p className="text-red-500 mt-2 bg-red-900 bg-opacity-50 px-3 py-2 rounded">{error}</p>}
      </div>

      {/* 商品情報表示 */}
      {loading && (
        <div className="text-center mb-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-white mt-2">商品情報を取得中...</p>
        </div>
      )}

      {product && !loading && (
        <div className="bg-white rounded-lg p-4 mb-6 max-w-sm w-full shadow-xl">
          <h3 className="font-bold text-lg text-gray-800 mb-2">{product.NAME || '商品名不明'}</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>商品ID:</span>
              <span className="font-medium">{product.PRD_ID || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>商品コード:</span>
              <span className="font-mono font-medium">{product.CODE || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>価格:</span>
              <span className="font-bold text-green-600">¥{(product.PRICE || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>在庫:</span>
              <span className={(product.STOCK || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                {product.STOCK || 0}個
              </span>
            </div>
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
            📷 リアルタイムスキャン開始
          </button>
        )}

        {scannedCode && (
          <div className="space-y-2">
            <button
              onClick={restartScan}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              type="button"
            >
              🔄 新しいコードをスキャン
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
              手動入力（バックアップ用）
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
            📝 サンプルコードでテスト (1234567890001)
          </button>
        </div>
      </div>

      {/* 機能説明 */}
      <div className="mt-6 p-4 bg-blue-900 bg-opacity-50 text-white rounded-lg max-w-md w-full text-sm">
        <h4 className="font-bold mb-2">🎯 対応コード形式</h4>
        <div className="space-y-1 text-xs">
          <p>• QRコード（すべてのバージョン）</p>
          <p>• JAN/EAN バーコード（13桁）</p>
          <p>• Code 128, Code 39</p>
          <p>• Data Matrix, PDF417</p>
          <p>• ITF, Codabar など</p>
        </div>
      </div>
    </div>
  );
};

export default ScanPage;