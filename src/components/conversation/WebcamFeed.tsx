'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { VideoOff } from 'lucide-react';

interface WebcamFeedProps {
  stream: MediaStream | null;
}

export default function WebcamFeed({ stream }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Card className="overflow-hidden shadow-md">
      <CardContent className="p-0">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted // Mute local playback to avoid echo; microphone is still captured
            className="w-full h-auto aspect-video object-cover rounded-t-lg"
            data-ai-hint="webcam placeholder"
          />
        ) : (
          <div className="w-full aspect-video bg-muted flex flex-col items-center justify-center text-muted-foreground rounded-lg">
            <VideoOff size={48} className="mb-2"/>
            <p>Webcam feed unavailable</p>
            <p className="text-xs">Please ensure permissions are granted.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
