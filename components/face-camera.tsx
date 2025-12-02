'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  loadModels,
  detectFace,
  getFaceEmbedding,
} from '@/lib/face-recognition';
import { Camera, Loader2 } from 'lucide-react';

interface FaceCameraProps {
  onCapture: (embedding: Float32Array) => Promise<void>;
  disabled?: boolean;
}

export function FaceCamera({ onCapture, disabled }: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load face-api.js models
        await loadModels();
        setModelsLoaded(true);

        // Start camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError(
          'Failed to access camera. Please ensure permissions are granted.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || disabled) {
      return;
    }

    try {
      setIsCapturing(true);
      setError(null);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Detect face and get embedding
      const detection = await detectFace(video);

      if (!detection) {
        throw new Error(
          'No face detected. Please ensure your face is clearly visible.'
        );
      }

      const embedding = await getFaceEmbedding(video);

      if (!embedding) {
        throw new Error('Failed to extract face features.');
      }

      await onCapture(embedding);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to capture face';
      setError(message);
    } finally {
      setIsCapturing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading camera...</p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          onClick={handleCapture}
          disabled={disabled || isCapturing || !modelsLoaded}
          className="w-full"
          size="lg"
        >
          {isCapturing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Capture Face
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
