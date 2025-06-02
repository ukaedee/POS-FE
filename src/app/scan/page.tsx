"use client";
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useRouter } from "next/navigation";

const ScanPage = () => {
  const webcamRef = useRef<Webcam>(null);
  const [error] = useState("");
  const router = useRouter();
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (!scanning) return;
    let active = true;
    const codeReader = new BrowserMultiFormatReader();

    const scan = async () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        try {
          const result = await codeReader.decodeOnceFromVideoElement(
            webcamRef.current.video
          );
          if (!active) return;
          setScanning(false);
          // バーコード取得後APIリクエスト
          fetch(`/api/product/${result.getText()}`)
            .then((res) => {
              if (res.status === 200) {
                router.push(`/product/${result.getText()}`);
              } else {
                router.push("/not-found");
              }
            })
            .catch(() => {
              router.push("/not-found");
            });
        } catch {
          // 読み取り失敗時は何もしない（継続）
        }
      }
      if (active) setTimeout(scan, 500);
    };
    scan();
    return () => {
      active = false;
    };
  }, [scanning, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="relative w-80 h-80 max-w-full">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          className="rounded-2xl object-cover w-full h-full"
          videoConstraints={{ facingMode: "environment" }}
        />
        {/* バーコード読取枠 */}
        <div className="absolute top-0 left-0 w-full h-full border-4 border-white rounded-2xl pointer-events-none" style={{ boxShadow: "0 0 0 4px rgba(0,0,0,0.5) inset" }} />
      </div>
      <p className="text-white text-lg mt-6">バーコードを枠内に合わせてください</p>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
};

export default ScanPage; 