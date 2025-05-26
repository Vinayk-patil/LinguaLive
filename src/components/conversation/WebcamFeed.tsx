'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoOff, Loader2, Camera } from 'lucide-react';

interface WebcamFeedProps {
  stream: MediaStream | null;
  hasPermission: boolean | null;
}

export default function WebcamFeed({ stream, hasPermission }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(error => {
        console.error("Error playing video:", error);
        // Potentially show a user-facing error if playback fails repeatedly
      });
    }
  }, [stream]);

  return (
    <Card className="overflow-hidden shadow-lg rounded-xl border-border/70 aspect-video bg-muted">
      <CardContent className="p-0 w-full h-full flex items-center justify-center relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ 
            transform: 'scaleX(-1)', 
            display: (hasPermission === true && stream) ? 'block' : 'none' 
          }}
          data-ai-hint="webcam placeholder"
        />

        {/* Overlays for different states */}
        {hasPermission === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm text-foreground p-4 text-center">
            <Loader2 size={40} className="mb-3 animate-spin text-primary"/>
            <p className="font-medium">Checking camera permissions...</p>
          </div>
        )}

        {hasPermission === false && (
           <Alert variant="destructive" className="m-4 sm:m-6 absolute inset-0 flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm">
              <VideoOff className="h-8 w-8 mb-2" />
              <AlertTitle className="text-lg font-semibold">Camera Access Denied</AlertTitle>
              <AlertDescription className="text-center">
                LinguaLive needs camera and microphone access.
                Please enable them in browser settings and refresh.
              </AlertDescription>
            </Alert>
        )}
        
        {hasPermission === true && !stream && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm text-foreground p-4 text-center">
            <Loader2 size={40} className="mb-3 animate-spin text-primary"/>
            <p className="font-medium">Initializing webcam...</p>
            <p className="text-sm text-muted-foreground">Make sure your camera is not covered.</p>
          </div>
        )}

        {/* Fallback Icon if video somehow fails to load but stream exists (less likely) */}
        {hasPermission === true && stream && videoRef.current && videoRef.current.paused && !videoRef.current.srcObject && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground p-4 text-center">
            <Camera size={48} className="mb-2 text-primary"/>
            <p>Webcam feed active</p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
