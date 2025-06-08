"use client";
import React, { useState, useRef } from 'react';
import { X, Camera, FileText, CheckCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import PrimaryButton from './ui/PrimaryButton';

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
  const [error, setError] = useState('');
  
  // 重複読み取り防止用のref
  const lastScannedCodeRef = useRef<string>('');
  const isProcessingRef = useRef<boolean>(false);

  // QRコードスキャン成功時の処理
  const handleScan = (result: { rawValue: string }[]) => {
    const data = result?.[0]?.rawValue;
    if (!data || isProcessingRef.current) return;
    
    // 重複読み取り防止
    if (data === lastScannedCodeRef.current) return;
    
    console.log("📱 QRコードスキャン成功:", data);
    
    // 処理中フラグを立てる
    isProcessingRef.current = true;
    lastScannedCodeRef.current = data;
    
    // 成功アニメーション表示
    setSuccessCode(data);
    setShowSuccess(true);
    setError('');
    
    // コールバック実行
    onCodeDetected(data);
    
    // 1秒待ってモーダルを閉じる
    setTimeout(() => {
      handleClose();
    }, 1000);
  };

  // スキャンエラー処理
  const handleError = (err: unknown) => {
    console.warn('QRスキャンエラー:', err);
    // エラーメッセージは表示しない（カメラが見つからない等の初期エラーが多いため）
  };

  // モーダルクローズ処理
  const handleClose = () => {
    setManualInput('');
    setError('');
    setShowSuccess(false);
    setSuccessCode('');
    // フラグをリセット
    isProcessingRef.current = false;
    lastScannedCodeRef.current = '';
    onClose();
  };

  // 手動入力の処理
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (code) {
      console.log("📝 手動入力:", code);
      onCodeDetected(code);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-lg h-hug max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">QRコードスキャン</span>
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
          {/* QRスキャナープレビュー */}
          <div className="relative w-full h-72 sm:h-80 lg:h-96 bg-black rounded-lg overflow-hidden mb-3 sm:mb-4 shadow-lg">
            <Scanner
              onScan={handleScan}
              onError={handleError}
              constraints={{
                facingMode: 'environment'
              }}
              styles={{
                container: {
                  width: '100%',
                  height: '100%',
                },
                video: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                },
              }}
            />
            
            {/* 成功アニメーション（スキャン成功時） */}
            {showSuccess && (
              <div className="absolute inset-0 bg-green-500 bg-opacity-90 flex items-center justify-center z-20 animate-pulse">
                <div className="text-center text-white">
                  <div className="mb-4 relative">
                    <CheckCircle className="w-24 h-24 mx-auto animate-bounce" />
                    <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-white rounded-full animate-ping"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">スキャン成功！</h3>
                  <p className="text-lg font-mono bg-black bg-opacity-40 px-4 py-2 rounded-lg">
                    {successCode}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* 手動入力 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="block text-gray-700 text-sm font-medium">
                手動入力
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="QRコード番号を入力"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={50}
                />
                <PrimaryButton
                  type="submit"
                  className="w-full"
                >
                  <FileText className="w-4 h-4" />
                  確認
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;