'use client';

import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Play, Pause, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useRef, useState, useEffect } from 'react';

interface ConversationControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  audioUrl: string | null;
  isPermissionGranted: boolean | null;
}

export default function ConversationControls({
  isRecording,
  onStartRecording,
  onStopRecording,
  audioUrl,
  isPermissionGranted,
}: ConversationControlsProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // When a new audio URL comes in, pause any current playback and reset state.
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, [audioUrl]);


  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error("Error playing audio:", error);
          // Potentially show a toast message to the user
        });
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset for next play
    }
  };

  const startButtonDisabled = isRecording || isPermissionGranted === false || isPermissionGranted === null;
  const stopButtonDisabled = !isRecording;

  return (
    <Card className="shadow-md">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-2">
          {!isRecording ? (
            <Button 
              onClick={onStartRecording} 
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={startButtonDisabled}
              aria-label="Start Speaking"
            >
              <Mic className="mr-2 h-4 w-4" /> Start Speaking
            </Button>
          ) : (
            <Button 
              onClick={onStopRecording} 
              variant="destructive"
              disabled={stopButtonDisabled}
              aria-label="Stop Speaking"
            >
              <StopCircle className="mr-2 h-4 w-4" /> Stop Speaking
            </Button>
          )}
        </div>
        
        {isPermissionGranted === false && (
          <div className="flex items-center text-sm text-destructive">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Permissions denied.
          </div>
        )}
         {isPermissionGranted === null && (
          <div className="flex items-center text-sm text-muted-foreground">
            Checking permissions...
          </div>
        )}

        {audioUrl && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={handlePlayPause} 
              variant="outline" 
              size="icon" 
              disabled={!audioUrl}
              aria-label={isPlaying ? "Pause playback" : "Play recording"}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <audio 
              key={audioUrl} // Force re-render on new URL
              ref={audioRef} 
              src={audioUrl} 
              onEnded={handleAudioEnded} 
              className="hidden" 
              onLoadedMetadata={() => {
                 if (audioRef.current) audioRef.current.currentTime = 0; // Ensure it starts from beginning
              }}
            />
            <p className="text-sm text-muted-foreground">Listen to your recording</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
