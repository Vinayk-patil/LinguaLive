'use client';

import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Play, Pause } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useRef, useState } from 'react';

interface ConversationControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  audioUrl: string | null;
}

export default function ConversationControls({
  isRecording,
  onStartRecording,
  onStopRecording,
  audioUrl,
}: ConversationControlsProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <Card className="shadow-md">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-2">
          {!isRecording ? (
            <Button onClick={onStartRecording} className="bg-green-500 hover:bg-green-600 text-white">
              <Mic className="mr-2 h-4 w-4" /> Start Speaking
            </Button>
          ) : (
            <Button onClick={onStopRecording} variant="destructive">
              <StopCircle className="mr-2 h-4 w-4" /> Stop Speaking
            </Button>
          )}
        </div>
        
        {audioUrl && (
          <div className="flex items-center gap-2">
            <Button onClick={handlePlayPause} variant="outline" size="icon" aria-label={isPlaying ? "Pause playback" : "Play recording"}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} className="hidden" />
            <p className="text-sm text-muted-foreground">Listen to your recording</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
