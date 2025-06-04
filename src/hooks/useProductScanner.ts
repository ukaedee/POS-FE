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
    
    console.log("🔍 ZXing高精度スキャンループ開始");
    
    let consecutiveSuccesses = 0;
    let lastDetectedCode = '';
    let scanSpeed = 150; // 初期スキャン間隔
    
    const performScan = async () => {
      if (!videoRef.current || !codeReaderRef.current || !scanning) return;
      
      try {
        setScanCount(prev => prev + 1);
        
        // ビデオの準備状態確認
        if (videoRef.current.readyState < 2 || videoRef.current.paused) {
          console.log("⏳ ビデオ準備中...");
          return;
        }
        
        const result = await codeReaderRef.current.decodeFromVideoElement(videoRef.current);
        
        if (result && result.getText()) {
          const detectedCode = result.getText().trim();
          console.log("🎯 コード検出:", detectedCode, "フォーマット:", result.getBarcodeFormat());
          
          // 連続検証ロジック（誤検出防止）
          if (detectedCode === lastDetectedCode) {
            consecutiveSuccesses++;
            console.log(`✓ 連続検証: ${consecutiveSuccesses}/2`);
            
            if (consecutiveSuccesses >= 2) {
              console.log("🎉 スキャン確定:", detectedCode);
              
              // スキャン成功時の処理
              setScanning(false);
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
              }
              
              // 成功フィードバック（ビープ音の代わりにコンソール）
              console.log("🔊 スキャン成功フィードバック");
              
              // コールバック実行
              onCodeDetected?.(detectedCode);
              return;
            }
          } else {
            // 新しいコードの場合は検証をリセット
            lastDetectedCode = detectedCode;
            consecutiveSuccesses = 1;
            console.log("🔄 新しいコード検出、検証開始");
          }
          
          // 検出成功時はスキャン頻度を上げる
          scanSpeed = Math.max(50, scanSpeed - 10);
        } else {
          // 何も検出されない場合は段階的にスキャン頻度を下げる
          scanSpeed = Math.min(200, scanSpeed + 5);
          consecutiveSuccesses = 0;
          lastDetectedCode = '';
        }
        
      } catch (err) {
        if (err instanceof NotFoundException) {
          // 通常の「何も見つからない」状態（ログ出力なし）
          scanSpeed = Math.min(200, scanSpeed + 2);
          consecutiveSuccesses = 0;
        } else {
          console.error("⚠️ スキャンエラー:", err);
          // エラー時は一時的にスキャン頻度を下げる
          scanSpeed = Math.min(300, scanSpeed + 20);
        }
      }
    };
    
    // 初回スキャン実行
    scanIntervalRef.current = setInterval(performScan, scanSpeed);
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
      
      // より厳密なカメラ制約設定
      let constraints = {
        video: {
          facingMode: "environment", // 背面カメラ優先
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      };
      
      let stream: MediaStream | null = null;
      
      try {
        console.log("高解像度背面カメラでアクセス試行...");
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        console.log("高解像度失敗、標準解像度で再試行...");
        // 解像度を下げて再試行
        constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 }
          },
          audio: false
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          console.log("背面カメラ失敗、フロントカメラを試行...");
          // フロントカメラで試行
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
            console.log("制約なしで最終試行...");
            // 制約なしで最終試行
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { min: 640 },
                height: { min: 480 }
              },
              audio: false
            });
          }
        }
      }
      
      if (!stream) {
        throw new Error("カメラストリームの取得に失敗しました");
      }
      
      setCameraPermission('granted');
      
      if (videoRef.current) {
        console.log("ストリームをビデオ要素に設定...");
        
        // video要素の属性を適切に設定
        const video = videoRef.current;
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.controls = false;
        video.disablePictureInPicture = true;
        
        // 明示的にデフォルト処理をONにする
        video.defaultMuted = true;
        video.defaultPlaybackRate = 1.0;
        
        // より堅牢なイベントハンドリング
        const handleLoadedMetadata = () => {
          console.log("ビデオメタデータ読み込み完了");
          console.log("ビデオサイズ:", {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState
          });
          
          // 明示的に再生開始
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log("✅ ビデオ再生開始成功");
              setScanning(true);
              // スキャン開始を少し遅らせる（安定性向上）
              setTimeout(() => {
                if (mounted && !scanIntervalRef.current) {
                  startScanning();
                }
              }, 1000);
            }).catch((playErr) => {
              console.error("❌ ビデオ再生エラー:", playErr);
              const errorMessage = `ビデオの再生に失敗しました: ${playErr.message}`;
              setError(errorMessage);
              onError?.(errorMessage);
            });
          }
        };
        
        const handleCanPlay = () => {
          console.log("ビデオ再生準備完了");
          // もしまだロードされていない場合のフォールバック
          if (video.readyState >= 2 && video.paused) {
            video.play().catch(console.error);
          }
        };
        
        const handleError = (e: Event) => {
          console.error("❌ Video element error:", e);
          const errorMessage = "ビデオの読み込みでエラーが発生しました";
          setError(errorMessage);
          onError?.(errorMessage);
        };
        
        // イベントリスナー設定
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);
        
        // 既にメタデータが読み込まれている場合の処理
        if (video.readyState >= 1) {
          handleLoadedMetadata();
        }
      }
    } catch (err) {
      console.error("❌ Camera access error:", err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraPermission('denied');
          const errorMessage = "カメラへのアクセスが拒否されました。ブラウザの設定でカメラ権限を許可してください。";
          setError(errorMessage);
          onError?.(errorMessage);
        } else if (err.name === 'NotFoundError') {
          const errorMessage = "カメラデバイスが見つかりませんでした。";
          setError(errorMessage);
          onError?.(errorMessage);
        } else if (err.name === 'NotReadableError') {
          const errorMessage = "カメラが他のアプリケーションで使用中です。";
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
    
    // クリーンアップ用に参照をキャプチャ
    const currentVideo = videoRef.current;
    const currentCodeReader = codeReaderRef.current;
    const currentScanInterval = scanIntervalRef.current;
    
    return () => {
      // 直接的なクリーンアップ処理（循環依存を回避）
      console.log("フック全体のクリーンアップ");
      
      if (currentScanInterval) {
        clearInterval(currentScanInterval);
      }
      
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      // 安全なvideo参照
      if (currentVideo && currentVideo.srcObject) {
        const tracks = (currentVideo.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        currentVideo.srcObject = null;
      }
      
      if (currentCodeReader) {
        currentCodeReader.reset();
      }
    };
  }, []);

  // マウント後に権限状態を確認
  useEffect(() => {
    if (mounted) {
      checkCameraPermission();
    }
  }, [mounted, checkCameraPermission]);

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