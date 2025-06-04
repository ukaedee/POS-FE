"use client";
import React, { useState } from 'react';
import { X, Camera, FileText } from 'lucide-react';
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
  
  const {
    scanning,
    mounted,
    cameraPermission,
    permissionChecked,
    scanCount,
    error,
    videoRef,
    startCamera,
    stopCamera,
    checkCameraPermission,
    requestCameraPermission,
    setError
  } = useProductScanner({
    onCodeDetected: (code) => {
      onCodeDetected(code);
      handleClose();
    },
    onError: (errorMessage) => {
      console.error('Scanner error:', errorMessage);
    }
  });

  // モーダルクローズ処理
  const handleClose = () => {
    stopCamera();
    setManualInput('');
    setError('');
    onClose();
  };

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

  if (!isOpen || !mounted) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Camera className="w-6 h-6" />
            バーコードスキャナー
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* スキャナー部分 */}
        <div className="p-4">
          {/* カメラプレビュー */}
          <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden mb-4">
            {scanning ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain bg-black"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* スキャンエリアの枠 */}
                <div className="absolute inset-4 border-2 border-green-400 rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 animate-pulse"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 animate-pulse"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 animate-pulse"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 animate-pulse"></div>
                  <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-green-400 animate-pulse transform -translate-y-1/2"></div>
                </div>
                
                {/* 停止ボタン */}
                <button
                  onClick={stopCamera}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
                
                {/* スキャン状態表示 */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-80 text-white text-xs p-2 rounded backdrop-blur-sm">
                  <p>🔍 スキャン中... ({scanCount})</p>
                  <p>📱 バーコードを画面に向けてください</p>
                </div>

                {/* デバッグ情報（開発環境のみ） */}
                {process.env.NODE_ENV === 'development' && videoRef.current && (
                  <div className="absolute top-2 left-2 bg-blue-900 bg-opacity-80 text-white text-xs p-2 rounded">
                    <p>📹 ビデオ: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}</p>
                    <p>🎬 再生: {videoRef.current.paused ? '停止' : '再生中'}</p>
                    <p>📡 ストリーム: {videoRef.current.srcObject ? '有効' : '無効'}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <Camera className="w-16 h-16 mb-4 mx-auto opacity-50" />
                  <p className="text-lg font-medium">カメラ待機中</p>
                  <p className="text-sm opacity-75 mt-1">スキャンボタンを押してください</p>
                </div>
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

            {/* 通常のスキャンボタン */}
            {cameraPermission === 'granted' && !scanning && (
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                type="button"
              >
                <Camera className="w-5 h-5" />
                スキャン開始
              </button>
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