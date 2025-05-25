
'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoOff, Loader2 } from 'lucide-react';

interface WebcamFeedProps {
  stream: MediaStream | null;
  hasPermission: boolean | null;
}

export default function WebcamFeed({ stream, hasPermission }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(error => console.error("Error playing video:", error));
    }
  }, [stream]);

  return (
    <Card className="overflow-hidden shadow-md aspect-video bg-muted"> {/* Removed flex items-center justify-center */}
      <CardContent className="p-0 w-full h-full flex items-center justify-center">
        {hasPermission === null && (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 size={48} className="mb-2 animate-spin text-primary"/>
            <p>Checking camera permissions...</p>
          </div>
        )}
        {hasPermission === false && (
           <Alert variant="destructive" className="m-4">
              <VideoOff className="h-5 w-5" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                LinguaLive needs camera and microphone access to function.
                Please enable them in your browser settings and refresh the page.
              </AlertDescription>
            </Alert>
        )}
        {hasPermission === true && !stream && (
           <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 size={48} className="mb-2 animate-spin text-primary"/>
            <p>Initializing webcam...</p>
          </div>
        )}
        {hasPermission === true && stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            data-ai-hint="webcam placeholder"
          />
        )}
      </CardContent>
    </Card>
  );
}
