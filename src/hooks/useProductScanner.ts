import { useRef, useState, useCallback, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface UseProductScannerOptions {
  onCodeDetected?: (code: string) => void;
  onError?: (error: string) => void;
}

interface UseProductScannerReturn {
  // 状態
  scanning: boolean;
  mounted: boolean;
  cameraPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  permissionChecked: boolean;
  scanCount: number;
  error: string;
  
  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  
  // 関数
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  checkCameraPermission: () => Promise<void>;
  requestCameraPermission: () => Promise<boolean>;
  setError: (error: string) => void;
}

export const useProductScanner = (options: UseProductScannerOptions = {}): UseProductScannerReturn => {
  const { onCodeDetected, onError } = options;
  
  // 状態管理
  const [mounted, setMounted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [error, setError] = useState('');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // カメラ権限の状態を確認
  const checkCameraPermission = useCallback(async () => {
    if (!mounted) return;
    
    try {
      console.log("カメラ権限の確認開始...");
      
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log("権限状態:", permission.state);
        setCameraPermission(permission.state as 'granted' | 'denied' | 'prompt');
        
        permission.onchange = () => {
          console.log("権限状態が変更されました:", permission.state);
          setCameraPermission(permission.state as 'granted' | 'denied' | 'prompt');
        };
      } else {
        console.log("Permissions API未対応");
        setCameraPermission('unknown');
      }
      
      setPermissionChecked(true);
    } catch (err) {
      console.error("権限確認エラー:", err);
      setCameraPermission('unknown');
      setPermissionChecked(true);
    }
  }, [mounted]);

  // カメラ権限をリクエスト
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (!mounted) return false;
    
    try {
      setError("");
      console.log("カメラ権限をリクエスト中...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      console.log("カメラ権限が許可されました");
      setCameraPermission('granted');
      
      // ストリームを一旦停止（権限確認のみ）
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (err) {
      console.error("カメラ権限リクエストエラー:", err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraPermission('denied');
          const errorMessage = "カメラへのアクセスが拒否されました。ブラウザの設定でカメラ権限を許可してください。";
          setError(errorMessage);
          onError?.(errorMessage);
        } else if (err.name === 'NotFoundError') {
          const errorMessage = "カメラが見つかりませんでした。";
          setError(errorMessage);
          onError?.(errorMessage);
        } else {
          const errorMessage = `カメラエラー: ${err.message}`;
          setError(errorMessage);
          onError?.(errorMessage);
        }
      }
      return false;
    }
  }, [mounted, onError]);

  // ZXingを使用したスキャン開始
  const startScanning = useCallback(() => {
    if (!codeReaderRef.current || !videoRef.current || !scanning) return;
    
    console.log("ZXingスキャンループ開始");
    
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !codeReaderRef.current || !scanning) return;
      
      try {
        setScanCount(prev => prev + 1);
        
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
          
          // コールバック実行
          onCodeDetected?.(detectedCode);
        }
      } catch (err) {
        if (err instanceof NotFoundException) {
          // 何もしない（継続スキャン）
        } else {
          console.error("スキャンエラー:", err);
        }
      }
    }, 100);
  }, [scanning, onCodeDetected]);

  // カメラストリームを開始
  const startCamera = useCallback(async () => {
    if (!mounted || !codeReaderRef.current) return;
    
    // 権限チェック
    if (cameraPermission === 'denied') {
      const errorMessage = "カメラ権限が拒否されています。ブラウザの設定でカメラアクセスを許可してください。";
      setError(errorMessage);
      onError?.(errorMessage);
      return;
    }
    
    if (cameraPermission === 'prompt' || cameraPermission === 'unknown') {
      const permissionGranted = await requestCameraPermission();
      if (!permissionGranted) {
        return;
      }
    }
    
    try {
      setError("");
      setScanCount(0);
      console.log("カメラアクセスを開始...");
      
      // まず背面カメラを試行
      let constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      };
      
      let stream: MediaStream | null = null;
      
      try {
        console.log("背面カメラでアクセス試行...");
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        console.log("背面カメラ失敗、フロントカメラを試行...");
        // 背面カメラが失敗した場合はフロントカメラを試行
        constraints = {
          video: {
            facingMode: "user",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 }
          },
          audio: false
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          console.log("フロントカメラも失敗、制約なしで試行...");
          // 制約なしで試行
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }
      
      setCameraPermission('granted');
      
      if (videoRef.current && stream) {
        console.log("ストリームをビデオ要素に設定...");
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log("ビデオメタデータ読み込み完了");
          if (videoRef.current) {
            console.log("ビデオサイズ:", {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight
            });
            
            videoRef.current.play().then(() => {
              console.log("ビデオ再生開始成功");
              setScanning(true);
              setTimeout(() => {
                startScanning();
              }, 500);
            }).catch((playErr) => {
              console.error("ビデオ再生エラー:", playErr);
              const errorMessage = `ビデオの再生に失敗しました: ${playErr.message}`;
              setError(errorMessage);
              onError?.(errorMessage);
            });
          }
        };
        
        videoRef.current.onerror = (e) => {
          console.error("Video element error:", e);
          const errorMessage = "ビデオの読み込みでエラーが発生しました";
          setError(errorMessage);
          onError?.(errorMessage);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraPermission('denied');
          const errorMessage = "カメラへのアクセスが拒否されました。ブラウザの設定でカメラ権限を許可してください。";
          setError(errorMessage);
          onError?.(errorMessage);
        } else {
          const errorMessage = `カメラアクセスエラー: ${err.name} - ${err.message}`;
          setError(errorMessage);
          onError?.(errorMessage);
        }
      } else {
        const errorMessage = "カメラにアクセスできませんでした。";
        setError(errorMessage);
        onError?.(errorMessage);
      }
    }
  }, [mounted, cameraPermission, requestCameraPermission, startScanning, onError]);

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

  // 初期化
  useEffect(() => {
    setMounted(true);
    codeReaderRef.current = new BrowserMultiFormatReader();
    console.log("ZXing BrowserMultiFormatReader initialized");
    
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // マウント後に権限状態を確認
  useEffect(() => {
    if (mounted) {
      checkCameraPermission();
    }
  }, [mounted, checkCameraPermission]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    // 状態
    scanning,
    mounted,
    cameraPermission,
    permissionChecked,
    scanCount,
    error,
    
    // Refs
    videoRef,
    
    // 関数
    startCamera,
    stopCamera,
    checkCameraPermission,
    requestCameraPermission,
    setError,
  };
}; 