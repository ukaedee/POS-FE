"use client";
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, FileText, CheckCircle } from 'lucide-react';
import { useProductScanner } from '../hooks/useProductScanner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeDetected: (code: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onCodeDetected
}) => {
  const [manualInput, setManualInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCode, setSuccessCode] = useState('');
  
  // timeout管理用のref
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    scanning,
    mounted,
    cameraPermission,
    permissionChecked,
    scanCount,
    error,
    videoReady,
    videoRef,
    startCamera,
    stopCamera,
    checkCameraPermission,
    requestCameraPermission,
    setError
  } = useProductScanner({
    onCodeDetected: (code) => {
      // 成功アニメーション表示
      setSuccessCode(code);
      setShowSuccess(true);
      
      // 既存のタイマーをクリア
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      
      // 1.5秒後にモーダルを閉じてコールバック実行
      successTimeoutRef.current = setTimeout(() => {
        onCodeDetected(code);
        handleClose();
      }, 1500);
    },
    onError: (errorMessage) => {
      console.error('Scanner error:', errorMessage);
    }
  });

  // モーダルクローズ処理
  const handleClose = () => {
    // タイマーをクリア
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    
    stopCamera();
    setManualInput('');
    setError('');
    setShowSuccess(false);
    setSuccessCode('');
    onClose();
  };

  // 成功状態をリセット
  useEffect(() => {
    if (!isOpen) {
      // タイマーをクリア
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
      setShowSuccess(false);
      setSuccessCode('');
    }
  }, [isOpen]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // 手動入力の処理
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (code) {
      onCodeDetected(code);
      handleClose();
    }
  };

  // サンプルコードテスト
  const handleSampleCode = () => {
    const testCode = "1234567890001";
    onCodeDetected(testCode);
    handleClose();
  };

  // カメラ開始ボタン
  const handleStartCamera = async () => {
    console.log("カメラ開始ボタンがクリックされました");
    console.log("現在の権限状態:", cameraPermission);
    await startCamera();
  };

  if (!isOpen || !mounted) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-lg h-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">バーコードスキャナー</span>
            <span className="sm:hidden">スキャナー</span>
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            type="button"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
        </div>

        {/* スキャナー部分 */}
        <div className="p-2 sm:p-4">
          {/* カメラプレビュー */}
          <div className="relative w-full h-72 sm:h-80 lg:h-96 bg-black rounded-lg overflow-hidden mb-3 sm:mb-4 shadow-lg">
            {/* ビデオ要素 - HTMLとJavaScript属性の両方を設定 */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover bg-black"
              autoPlay
              playsInline
              muted
              controls={false}
              style={{ 
                transform: 'scaleX(1)', // 鏡像なし
                filter: 'brightness(1.1) contrast(1.2)' // 映像を明るく鮮明に
              }}
            />
            
            {/* スキャン中のオーバーレイ - videoReadyを条件に追加 */}
            {scanning && videoReady && (
              <>
                {/* メインスキャンエリア */}
                <div className="absolute inset-4 sm:inset-8 border-2 border-green-400 rounded-xl bg-transparent">
                  {/* 四隅のアニメーション */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-yellow-400 animate-pulse rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-yellow-400 animate-pulse rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-yellow-400 animate-pulse rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-yellow-400 animate-pulse rounded-br-lg"></div>
                  
                  {/* 中央スキャンライン */}
                  <div className="absolute inset-2 sm:inset-4 flex items-center justify-center">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                  </div>
                  
                  {/* スキャンエリア内のガイド */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white rounded-full flex items-center justify-center mb-1 sm:mb-2 mx-auto bg-black bg-opacity-30">
                        <span className="text-white text-lg sm:text-xl">📱</span>
                      </div>
                      <p className="text-white text-xs sm:text-sm font-bold bg-black bg-opacity-60 px-2 sm:px-3 py-1 rounded-full">
                        バーコードを枠内に
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 上部情報エリア */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                  {/* スキャン状態 */}
                  <div className="bg-gradient-to-r from-green-600 to-green-500 text-white text-xs px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="font-bold">スキャン中 ({scanCount})</span>
                  </div>
                  
                  {/* 停止ボタン */}
                  <button
                    onClick={stopCamera}
                    className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 shadow-lg transition-all duration-200 hover:scale-110"
                    type="button"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 下部ガイドエリア */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black bg-opacity-80 text-white p-3 rounded-lg backdrop-blur-sm text-center">
                    <p className="font-bold text-sm mb-1">📷 スキャンのコツ</p>
                    <p className="text-xs opacity-90">
                      • バーコードを緑の枠内に合わせてください<br/>
                      • 十分な明るさを確保してください<br/>
                      • カメラから15-30cm離してください
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* カメラ起動中だがまだビデオ準備未完了の状態 */}
            {scanning && !videoReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-gradient-to-br from-blue-800 to-blue-900">
                <div className="text-center p-6">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">📹 カメラ準備中...</h3>
                  <p className="text-sm opacity-80 mb-2">ビデオストリームを初期化しています</p>
                  <div className="text-xs text-blue-200">
                    <p>• ストリーム接続中</p>
                    <p>• ビデオ解析準備中</p>
                    <p>• しばらくお待ちください</p>
                  </div>
                </div>
              </div>
            )}

            {/* 成功アニメーション（スキャン成功時） */}
            {showSuccess && (
              <div className="absolute inset-0 bg-green-500 bg-opacity-90 flex items-center justify-center z-20 animate-pulse">
                <div className="text-center text-white">
                  <div className="mb-4 relative">
                    <CheckCircle className="w-24 h-24 mx-auto animate-bounce" />
                    <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-white rounded-full animate-ping"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">✅ スキャン成功！</h3>
                  <p className="text-lg font-mono bg-black bg-opacity-40 px-4 py-2 rounded-lg">
                    {successCode}
                  </p>
                  <p className="text-sm mt-2 opacity-90">商品情報を取得中...</p>
                </div>
              </div>
            )}

            {/* カメラ未起動時の表示 */}
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center p-6">
                  <div className="relative mb-6">
                    <Camera className="w-20 h-20 mx-auto opacity-60 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping"></div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">カメラ準備完了</h3>
                  <p className="text-sm opacity-80 mb-4">下のボタンを押してスキャンを開始</p>
                </div>
              </div>
            )}

            {/* デバッグ情報（開発環境のみ） - 強化版 */}
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute top-2 right-2 bg-blue-900 bg-opacity-90 text-white text-xs p-2 rounded-lg shadow max-w-48">
                <p className="font-bold mb-1">🐛 Debug Info</p>
                {videoRef.current && (
                  <>
                    <p>📹 {videoRef.current.videoWidth}×{videoRef.current.videoHeight}</p>
                    <p>🎬 {videoRef.current.paused ? '⏸️停止' : '▶️再生'}</p>
                    <p>📡 {videoRef.current.srcObject ? '🟢接続' : '🔴切断'}</p>
                    <p>🎥 Ready: {videoRef.current.readyState}</p>
                  </>
                )}
                <p>🔍 Scanning: {scanning ? '✅' : '❌'}</p>
                <p>📺 VideoReady: {videoReady ? '✅' : '❌'}</p>
                <p>🎯 ScanCount: {scanCount}</p>
                <p>🔑 Permission: {cameraPermission}</p>
              </div>
            )}
          </div>

          {/* 権限状態表示 */}
          {permissionChecked && (
            <div className="mb-4 p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">カメラ権限:</span>
                {cameraPermission === 'granted' && <span className="text-green-600">✅ 許可済み</span>}
                {cameraPermission === 'denied' && <span className="text-red-600">❌ 拒否済み</span>}
                {cameraPermission === 'prompt' && <span className="text-yellow-600">❓ 未確認</span>}
                {cameraPermission === 'unknown' && <span className="text-gray-600">❓ 不明</span>}
              </div>
              
              {cameraPermission === 'denied' && (
                <div className="mt-2 p-2 bg-red-100 rounded text-red-800 text-xs">
                  <p>ブラウザの設定でカメラアクセスを許可してください</p>
                </div>
              )}
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* コントロールボタン */}
          <div className="space-y-3">
            {/* カメラ起動ボタン */}
            {cameraPermission === 'granted' && !scanning && (
              <button
                onClick={handleStartCamera}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 px-6 rounded-full hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-bold text-lg shadow-lg hover:scale-105 flex items-center gap-2 justify-center"
                type="button"
              >
                <Camera className="w-6 h-6" />
                スキャン開始
              </button>
            )}

            {/* 権限リクエストボタン */}
            {cameraPermission === 'prompt' && (
              <button
                onClick={requestCameraPermission}
                className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg hover:bg-yellow-700 transition-colors font-medium flex items-center justify-center gap-2"
                type="button"
              >
                <Camera className="w-5 h-5" />
                カメラアクセス許可
              </button>
            )}
            
            {/* 権限再確認ボタン */}
            {cameraPermission === 'denied' && (
              <div className="space-y-2">
                <button
                  onClick={checkCameraPermission}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  type="button"
                >
                  🔄 権限状態を再確認
                </button>
                <button
                  onClick={requestCameraPermission}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                  type="button"
                >
                  <Camera className="w-5 h-5" />
                  カメラアクセスを再試行
                </button>
              </div>
            )}

            {/* 手動入力 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <label className="block text-gray-700 text-sm font-medium">
                  手動入力（バックアップ用）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="1234567890001"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={13}
                  />
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    確認
                  </button>
                </div>
              </form>
              
              {/* サンプルコードボタン */}
              <button
                onClick={handleSampleCode}
                className="text-blue-600 hover:text-blue-800 underline text-sm mt-2"
                type="button"
              >
                📝 サンプルコードでテスト (1234567890001)
              </button>
            </div>
          </div>

          {/* 機能説明 */}
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
            <h4 className="font-bold mb-2">🎯 対応コード形式</h4>
            <div className="space-y-1 text-xs">
              <p>• QRコード（すべてのバージョン）</p>
              <p>• JAN/EAN バーコード（13桁）</p>
              <p>• Code 128, Code 39, ITF, Codabar など</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;