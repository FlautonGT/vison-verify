"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";

type CaptureMode = "document" | "selfie";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function CameraCapture({
  mode,
  title,
  description,
  onCapture,
}: {
  mode: CaptureMode;
  title: string;
  description: string;
  onCapture: (imageDataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>("");

  const facingMode = useMemo(() => (mode === "document" ? "environment" : "user"), [mode]);

  useEffect(() => {
    return () => {
      stopStream(stream);
    };
  }, [stream]);

  async function startCamera() {
    try {
      setStarting(true);
      setError("");
      stopStream(stream);

      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(nextStream);
      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
        await videoRef.current.play();
      }
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : "Kamera tidak dapat diakses");
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    void startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    if (mode === "document") {
      const targetRatio = 1.58;
      const sourceWidth = video.videoWidth * 0.82;
      const sourceHeight = sourceWidth / targetRatio;
      const x = (video.videoWidth - sourceWidth) / 2;
      const y = (video.videoHeight - sourceHeight) / 2;
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      context.drawImage(video, x, y, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
    } else {
      const size = Math.min(video.videoWidth, video.videoHeight) * 0.84;
      const x = (video.videoWidth - size) / 2;
      const y = (video.videoHeight - size) / 2;
      canvas.width = size;
      canvas.height = size;
      context.drawImage(video, x, y, size, size, 0, 0, size, size);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopStream(stream);
    setStream(null);
    setCaptured(dataUrl);
    onCapture(dataUrl);
  }

  function resetCapture() {
    setCaptured("");
    void startCamera();
  }

  return (
    <section className="capture-card">
      <div className="capture-card__head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className={`camera-stage ${mode === "selfie" ? "camera-stage--selfie" : ""}`}>
        {captured ? (
          <img alt={mode === "document" ? "Foto KTP" : "Foto selfie"} className="camera-preview" src={captured} />
        ) : (
          <>
            <video autoPlay muted playsInline ref={videoRef} />
            <div className={`camera-guide ${mode === "selfie" ? "camera-guide--circle" : "camera-guide--document"}`} />
          </>
        )}
      </div>

      <div className="capture-card__actions">
        {!captured ? (
          <button className="verify-button verify-button--primary" disabled={starting} onClick={captureFrame} type="button">
            <Camera size={18} />
            {mode === "document" ? "Ambil foto KTP" : "Ambil selfie"}
          </button>
        ) : (
          <button className="verify-button verify-button--secondary" onClick={resetCapture} type="button">
            <RefreshCw size={18} />
            Ambil ulang
          </button>
        )}
      </div>

      {error ? <p className="capture-card__error">{error}</p> : null}
      <canvas className="visually-hidden" ref={canvasRef} />
    </section>
  );
}
