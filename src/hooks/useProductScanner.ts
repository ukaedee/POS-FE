import { useRef, useState, useCallback, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';

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
  videoReady: boolean;
  
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
  const [videoReady, setVideoReady] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ZXingの設定を最適化
  const initializeReader = useCallback(() => {
    const hints = new Map();
    
    // サポートするバーコード形式を指定
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E
    ]);
    
    // スキャン精度を向上
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    // ピュアバーコード（周囲の余白なし）にも対応
    hints.set(DecodeHintType.PURE_BARCODE, false);
    
    const reader = new BrowserMultiFormatReader(hints);
    codeReaderRef.current = reader;
    
    console.log("🚀 ZXing BrowserMultiFormatReader initialized with enhanced settings");
  }, []);

  // カメラ権限の状態を確認
  const checkCameraPermission = useCallback(async () => {
    if (!mounted) return;
    
    try {
      console.log("🔍 カメラ権限の確認開始...");
      
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log("📋 権限状態:", permission.state);
        setCameraPermission(permission.state as 'granted' | 'denied' | 'prompt');
        
        permission.onchange = () => {
          console.log("🔄 権限状態が変更されました:", permission.state);
          setCameraPermission(permission.state as 'granted' | 'denied' | 'prompt');
        };
      } else {
        console.log("⚠️ Permissions API未対応");
        setCameraPermission('unknown');
      }
      
      setPermissionChecked(true);
    } catch (err) {
      console.error("❌ 権限確認エラー:", err);
      setCameraPermission('unknown');
      setPermissionChecked(true);
    }
  }, [mounted]);

  // カメラ権限をリクエスト
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (!mounted) return false;
    
    try {
      setError("");
      console.log("🎯 カメラ権限をリクエスト中...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      console.log("✅ カメラ権限が許可されました");
      setCameraPermission('granted');
      
      // ストリームを一旦停止（権限確認のみ）
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (err) {
      console.error("❌ カメラ権限リクエストエラー:", err);
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
  const startScanning = useCallback((forceStart = false) => {
    // 強制開始フラグがある場合は、基本条件のみチェック
    if (!forceStart && (!codeReaderRef.current || !videoRef.current || !scanning || !videoReady)) {
      console.log("⏸️ スキャン開始条件が満たされていません:", {
        codeReader: !!codeReaderRef.current,
        video: !!videoRef.current,
        scanning,
        videoReady,
        forceStart
      });
      return;
    }
    
    // 強制開始の場合は最低限の条件のみチェック
    if (forceStart && (!codeReaderRef.current || !videoRef.current)) {
      console.log("⏸️ 強制開始でも基本条件が満たされていません:", {
        codeReader: !!codeReaderRef.current,
        video: !!videoRef.current
      });
      return;
    }
    
    console.log("🔍 ZXing高精度スキャンループ開始", forceStart ? "(強制開始)" : "");
    
    let consecutiveSuccesses = 0;
    let lastDetectedCode = '';
    let scanSpeed = 150; // 初期スキャン間隔
    
    const performScan = async () => {
      if (!videoRef.current || !codeReaderRef.current) return;
      
      try {
        setScanCount(prev => prev + 1);
        
        // ビデオの準備状態確認（より緩和された条件）
        const videoElement = videoRef.current;
        const videoState = {
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          paused: videoElement.paused,
          ended: videoElement.ended,
          currentTime: videoElement.currentTime,
          srcObject: !!videoElement.srcObject
        };
        
        console.log(`🔍 スキャン試行 #${scanCount} - ビデオ状態:`, videoState);
        
        // readyState >= 2 (HAVE_CURRENT_DATA) があれば試行
        // videoWidth = 0 でも一度は試行してみる（一部の環境では動作する場合がある）
        if (videoElement.readyState < 2) {
          console.log("⏳ ビデオ準備中... readyState不足");
          return;
        }
        
        if (videoElement.paused) {
          console.log("⏸️ ビデオが一時停止中 - 再生を試行");
          try {
            await videoElement.play();
          } catch (playErr) {
            console.warn("⚠️ ビデオ再生失敗:", playErr);
          }
          return;
        }
        
        // ZXingを使用してスキャン実行（videoWidth = 0 でも試行）
        console.log(`🎯 ZXing decodeFromVideoElement 実行 - ビデオサイズ: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
        
        // スキャン前の最終チェック
        if (!videoElement.srcObject) {
          console.warn("⚠️ srcObject が null です");
          return;
        }
        
        const result = await codeReaderRef.current.decodeFromVideoElement(videoElement);
        
        if (result && result.getText()) {
          const detectedCode = result.getText().trim();
          const format = result.getBarcodeFormat();
          console.log("🎯 コード検出:", {
            code: detectedCode,
            format: format,
            length: detectedCode.length,
            points: result.getResultPoints()?.length || 0,
            videoSize: `${videoElement.videoWidth}x${videoElement.videoHeight}`
          });
          
          // 有効なコードかチェック（空文字列や極端に短いコードを除外）
          if (detectedCode.length < 3) {
            console.log("⚠️ コードが短すぎます:", detectedCode);
            return;
          }
          
          // 連続検証ロジック（誤検出防止）
          if (detectedCode === lastDetectedCode) {
            consecutiveSuccesses++;
            console.log(`✓ 連続検証: ${consecutiveSuccesses}/2 - コード: ${detectedCode}`);
            
            if (consecutiveSuccesses >= 2) {
              console.log("🎉 スキャン確定:", {
                code: detectedCode,
                format: format,
                attempts: scanCount
              });
              
              // スキャン成功時の処理
              setScanning(false);
              if (scanIntervalRef.current) {
                clearTimeout(scanIntervalRef.current);
                scanIntervalRef.current = null;
              }
              
              // 成功フィードバック
              console.log("🔊 スキャン成功フィードバック - コード:", detectedCode);
              
              // 少し遅延を入れてからコールバック実行（UI更新のため）
              setTimeout(() => {
                onCodeDetected?.(detectedCode);
              }, 100);
              return;
            }
          } else {
            // 新しいコードの場合は検証をリセット
            lastDetectedCode = detectedCode;
            consecutiveSuccesses = 1;
            console.log("🔄 新しいコード検出、検証開始:", detectedCode);
          }
          
          // 検出成功時はスキャン頻度を上げる
          scanSpeed = Math.max(100, scanSpeed - 10);
        } else {
          // 何も検出されない場合は段階的にスキャン頻度を下げる
          scanSpeed = Math.min(300, scanSpeed + 5);
          consecutiveSuccesses = 0;
          lastDetectedCode = '';
        }
        
      } catch (err) {
        if (err instanceof NotFoundException) {
          // 通常の「何も見つからない」状態（ログ出力を減らす）
          const currentScanCount = scanCount;
          if (currentScanCount % 50 === 0) { // 50回に1回だけログ出力
            console.log(`📊 スキャン状況: ${currentScanCount}回試行中 - 現在の間隔: ${scanSpeed}ms`);
          }
          scanSpeed = Math.min(250, scanSpeed + 2);
          consecutiveSuccesses = 0;
        } else {
          console.error("⚠️ スキャンエラー:", {
            error: err,
            message: err instanceof Error ? err.message : String(err),
            name: err instanceof Error ? err.name : 'Unknown',
            scanCount,
            videoReady: !!videoRef.current && videoRef.current.readyState >= 2,
            videoSize: videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : 'N/A'
          });
          // エラー時は一時的にスキャン頻度を下げる
          scanSpeed = Math.min(400, scanSpeed + 30);
        }
      }
    };
    
    // 初回スキャン実行
    let dynamicScanSpeed = scanSpeed;
    
    const scanLoop = () => {
      if (!videoRef.current || !codeReaderRef.current) {
        return;
      }
      
      performScan().then(() => {
        // 動的に間隔を調整
        dynamicScanSpeed = scanSpeed;
        
        // 次のスキャンをスケジュール
        if (scanIntervalRef.current === null) { // scanning状態に依存しない
          scanIntervalRef.current = setTimeout(scanLoop, dynamicScanSpeed);
        }
      });
    };
    
    // 初回実行
    scanLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCodeDetected, scanCount]);

  // 既存ストリームの確実な停止
  const stopExistingStream = useCallback(() => {
    console.log("🛑 既存ストリーム停止処理");
    
    // スキャンも停止
    if (scanIntervalRef.current) {
      clearTimeout(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log("🔚 トラック停止:", track.kind, track.label);
        track.stop();
      });
      streamRef.current = null;
    }
    
    // videoRef.currentを事前に変数に保存
    const currentVideo = videoRef.current;
    if (currentVideo) {
      currentVideo.srcObject = null;
    }
    
    setVideoReady(false);
    setScanning(false);
  }, []);

  // カメラストリームを開始
  const startCamera = useCallback(async () => {
    if (!mounted || !codeReaderRef.current) {
      console.log("❌ 初期化未完了");
      return;
    }
    
    // videoRef が存在しない場合は待機
    if (!videoRef.current) {
      console.log("⏳ videoRef準備待機中...");
      setTimeout(() => startCamera(), 100);
      return;
    }

    // すでにカメラが起動している場合はスキップ
    if (streamRef.current && streamRef.current.active) {
      console.log("📹 カメラはすでに起動済み");
      if (videoRef.current && !videoRef.current.srcObject) {
        console.log("🔄 既存のストリームをvideoRefに再設定");
        videoRef.current.srcObject = streamRef.current;
        setVideoReady(true);
        setScanning(true);
      }
      return;
    }
    
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
      setVideoReady(false);
      
      // 既存ストリームを確実に停止
      stopExistingStream();
      
      console.log("📹 カメラアクセスを開始...");
      
      // より厳密なカメラ制約設定
      let constraints = {
        video: {
          facingMode: "environment", // 背面カメラ優先
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          // 接続維持のための追加設定
          autoGainControl: false, // 自動ゲイン制御を無効化
          noiseSuppression: false, // ノイズ抑制を無効化（カメラ専用）
          echoCancellation: false // エコーキャンセル無効化（カメラ専用）
        },
        audio: false
      };
      
      let stream: MediaStream | null = null;
      
      try {
        console.log("🎯 高解像度背面カメラでアクセス試行...");
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        console.log("🔄 高解像度失敗、標準解像度で再試行...");
        // 解像度を下げて再試行
        constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            frameRate: { ideal: 30, min: 15 },
            autoGainControl: false,
            noiseSuppression: false,
            echoCancellation: false
          },
          audio: false
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          console.log("🔄 背面カメラ失敗、フロントカメラを試行...");
          // フロントカメラで試行
          constraints = {
            video: {
              facingMode: "user",
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
              frameRate: { ideal: 30, min: 15 },
              autoGainControl: false,
              noiseSuppression: false,
              echoCancellation: false
            },
            audio: false
          };
          
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch {
            console.log("🔄 制約なしで最終試行...");
            // 制約なしで最終試行
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { min: 640 },
                height: { min: 480 },
                autoGainControl: false
              },
              audio: false
            });
          }
        }
      }
      
      if (!stream) {
        throw new Error("カメラストリームの取得に失敗しました");
      }

      // ストリームの接続維持設定
      stream.getTracks().forEach(track => {
        console.log("🔧 トラック設定:", track.kind, track.label);
        // トラックが終了した時の再接続処理
        track.onended = () => {
          console.warn("⚠️ カメラトラックが終了しました。再接続を試行します。");
          // 自動再接続（必要に応じて）
          if (scanning) {
            setTimeout(() => {
              console.log("🔄 カメラ自動再接続開始");
              startCamera();
            }, 1000);
          }
        };
      });
      
      // ストリームを保存
      streamRef.current = stream;
      setCameraPermission('granted');
      
      if (videoRef.current) {
        console.log("🎥 ストリームをビデオ要素に設定...");
        
        const video = videoRef.current;
        
        // デバッグ：設定前の状態
        console.log("📊 ビデオ設定前の状態:", {
          srcObject: !!video.srcObject,
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          paused: video.paused,
          currentTime: video.currentTime
        });
        
        // 🎯 確実にsrcObjectを設定
        console.log("📹 videoRef.current.srcObject にストリームを設定");
        video.srcObject = stream;
        
        // HTMLの属性とJavaScriptプロパティを設定
        video.playsInline = true;
        video.muted = true;
        video.controls = false;
        video.disablePictureInPicture = true;
        video.defaultMuted = true;
        video.defaultPlaybackRate = 1.0;
        
        // 属性も明示的に設定
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        
        // デバッグ：設定後の状態
        console.log("📊 ビデオ設定後の状態:", {
          srcObject: !!video.srcObject,
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          paused: video.paused,
          streamTracks: stream.getTracks().length
        });
        
        // 🎯 onloadedmetadata イベントで play() を呼び出し
        const handleLoadedMetadata = async () => {
          console.log("🎯 ビデオメタデータ読み込み完了:", {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            duration: video.duration,
            readyState: video.readyState
          });
          
          try {
            console.log("🎬 onloadedmetadata内でvideo.play()を呼び出し");
            await video.play();
            console.log("✅ ビデオ再生成功");
            
            // 🎯 videoReady を true に更新
            setVideoReady(true);
            setScanning(true);
            
            // 最終的なデバッグ情報
            console.log("📊 最終ビデオ状態:", {
              srcObject: !!video.srcObject,
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              paused: video.paused,
              currentTime: video.currentTime,
              duration: video.duration
            });
            
            // スキャン開始を即座に実行（強制開始フラグ付き）
            console.log("🚀 スキャンを強制開始します");
            startScanning(true);
            
          } catch (playErr) {
            console.error("❌ onloadedmetadata内でのビデオ再生エラー:", playErr);
            setError(`ビデオの再生に失敗しました: ${playErr instanceof Error ? playErr.message : String(playErr)}`);
          }
        };
        
        // 🆕 複数の方法でビデオの準備を試行
        const initializeVideo = async () => {
          try {
            console.log("🎬 ビデオ初期化開始");
            
            // 即座にplay()を試行（macOS Chrome対策）
            console.log("🎯 即座にvideo.play()を実行（メタデータ待ちなし）");
            await video.play();
            console.log("✅ 即座再生成功");
            
            // 短時間待機してサイズ情報取得を試行
            let retryCount = 0;
            const maxRetries = 50; // 5秒間試行
            
            const checkVideoSize = () => {
              console.log(`🔍 ビデオサイズチェック ${retryCount + 1}/${maxRetries}:`, {
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                readyState: video.readyState,
                currentTime: video.currentTime,
                paused: video.paused
              });
              
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                console.log("✅ ビデオサイズ取得成功!");
                setVideoReady(true);
                setScanning(true);
                startScanning(true);
                return;
              }
              
              retryCount++;
              if (retryCount < maxRetries) {
                setTimeout(checkVideoSize, 100);
              } else {
                console.warn("⚠️ ビデオサイズ取得タイムアウト - 強制的にスキャン開始");
                // サイズが0でも強制的にスキャンを開始（一部環境では動作する場合がある）
                setVideoReady(true);
                setScanning(true);
                startScanning(true);
              }
            };
            
            // サイズチェック開始
            checkVideoSize();
            
          } catch (immediatePlayErr) {
            console.log("⚠️ 即座再生失敗、従来方式にフォールバック:", immediatePlayErr);
            
            // 従来の loadedmetadata イベント待ちにフォールバック
            video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
            
            // さらなるフォールバック：複数のイベントでplay()を試行
            const tryPlayOnEvent = async (eventName: string) => {
              console.log(`🎯 ${eventName}イベントでplay()試行`);
              try {
                await video.play();
                console.log(`✅ ${eventName}でのplay()成功`);
              } catch (err) {
                console.log(`⚠️ ${eventName}でのplay()失敗:`, err);
              }
            };
            
            ['loadeddata', 'canplay', 'canplaythrough'].forEach(eventName => {
              video.addEventListener(eventName, () => tryPlayOnEvent(eventName), { once: true });
            });
            
            // 最終フォールバック：タイマーで定期的にplay()を試行
            let playRetryCount = 0;
            const maxPlayRetries = 20;
            
            const retryPlay = async () => {
              if (video.paused && playRetryCount < maxPlayRetries) {
                playRetryCount++;
                console.log(`🔄 play()再試行 ${playRetryCount}/${maxPlayRetries}`);
                try {
                  await video.play();
                  console.log("✅ 再試行play()成功");
                  
                  // 成功後のサイズチェック
                  setTimeout(() => {
                    if (video.videoWidth > 0) {
                      setVideoReady(true);
                      setScanning(true);
                      startScanning(true);
                    }
                  }, 500);
                } catch (err) {
                  console.log(`⚠️ 再試行${playRetryCount}失敗:`, err);
                  setTimeout(retryPlay, 500);
                }
              } else if (playRetryCount >= maxPlayRetries) {
                console.warn("⚠️ play()再試行回数上限に達しました");
              }
            };
            
            setTimeout(retryPlay, 1000);
          }
        };
        
        // ビデオ初期化実行
        await initializeVideo();
        
        // 接続維持のためのイベントリスナー追加
        video.addEventListener('pause', () => {
          console.log("🎬 ビデオが一時停止されました");
          if (scanning && !video.ended) {
            console.log("🔄 スキャン中のビデオ再生を再開");
            video.play().catch(err => console.error("再生再開エラー:", err));
          }
        });
        
        video.addEventListener('ended', () => {
          console.warn("⚠️ ビデオストリームが終了しました");
          // ストリーム終了時の自動再接続
          if (scanning) {
            console.log("🔄 ストリーム終了による自動再接続開始");
            setTimeout(() => startCamera(), 1000);
          }
        });
        
        // すでにメタデータが読み込まれている場合の処理（従来のフォールバック用）
        if (video.readyState >= 1) {
          console.log("🚀 メタデータがすでに読み込み済み - 追加チェック実行");
          setTimeout(() => {
            if (video.videoWidth > 0 && !videoReady) {
              console.log("✅ 遅延ビデオサイズ取得成功");
              setVideoReady(true);
              setScanning(true);
              startScanning(true);
            }
          }, 1000);
        }
        
      } else {
        console.error("❌ videoRef.current が存在しません");
        throw new Error("ビデオ要素が見つかりません");
      }
    } catch (err) {
      console.error("❌ Camera access error:", err);
      stopExistingStream();
      
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
  }, [mounted, cameraPermission, requestCameraPermission, startScanning, stopExistingStream, onError, scanning, videoReady]);

  // カメラストリームを停止
  const stopCamera = useCallback(() => {
    console.log("🛑 カメラ停止");
    
    if (scanIntervalRef.current) {
      clearTimeout(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    stopExistingStream();
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    setScanning(false);
    setVideoReady(false);
  }, [stopExistingStream]);

  // 初期化
  useEffect(() => {
    setMounted(true);
    initializeReader();
    
    // cleanup用にvideoRefをキャプチャ
    const videoRefForCleanup = videoRef;
    
    return () => {
      console.log("🧹 フック全体のクリーンアップ");
      
      if (scanIntervalRef.current) {
        clearTimeout(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // videoRef.currentを事前に変数に保存
      const currentVideo = videoRefForCleanup.current;
      if (currentVideo && currentVideo.srcObject) {
        currentVideo.srcObject = null;
      }
      
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [initializeReader]);

  // マウント後に権限状態を確認
  useEffect(() => {
    if (mounted) {
      checkCameraPermission();
    }
  }, [mounted, checkCameraPermission]);

  // videoRef のマウント状態を監視してデバッグ情報を出力
  useEffect(() => {
    if (mounted && videoRef.current) {
      const video = videoRef.current;
      console.log("🔍 videoRef マウント確認:", {
        videoElement: !!video,
        srcObject: !!video.srcObject,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        currentTime: video.currentTime
      });
      
      // 定期的なデバッグ情報出力（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        const debugInterval = setInterval(() => {
          if (video && scanning) {
            console.log("🔄 ビデオ状態監視:", {
              srcObject: !!video.srcObject,
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              paused: video.paused,
              currentTime: video.currentTime,
              scanCount
            });
          }
        }, 5000); // 5秒ごと
        
        return () => clearInterval(debugInterval);
      }
    }
  }, [mounted, scanning, scanCount]);

  return {
    // 状態
    scanning,
    mounted,
    cameraPermission,
    permissionChecked,
    scanCount,
    error,
    videoReady,
    
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