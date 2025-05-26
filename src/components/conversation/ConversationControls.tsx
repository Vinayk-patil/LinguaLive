'use client';

import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Play, Pause, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useRef, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ConversationControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  audioUrl: string | null;
  isPermissionGranted: boolean | null;
  isLoading: boolean; // To disable controls during AI processing
}

export default function ConversationControls({
  isRecording,
  onStartRecording,
  onStopRecording,
  audioUrl,
  isPermissionGranted,
  isLoading,
}: ConversationControlsProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
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
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error("Error playing audio:", error);
          if (error.name === 'AbortError') {
            // This is common if the src changes rapidly, usually okay.
            setIsPlaying(false); // Ensure state is correct
          } else {
            toast({
              title: "Playback Error",
              description: "Could not play audio.",
              variant: "destructive",
            });
            setIsPlaying(false);
          }
        });
      }
    }
  };
  
  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const baseButtonDisabled = isLoading || isPermissionGranted === null;
  const startButtonDisabled = baseButtonDisabled || isRecording || isPermissionGranted === false;
  const stopButtonDisabled = baseButtonDisabled || !isRecording;

  return (
    <Card className="shadow-lg rounded-xl border-border/70">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          {!isRecording ? (
            <Button 
              onClick={onStartRecording} 
              className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white text-base py-3 h-auto"
              disabled={startButtonDisabled}
              aria-label="Start Speaking"
              size="lg"
            >
              <Mic className="mr-2" size={18} /> Start Speaking
            </Button>
          ) : (
            <Button 
              onClick={onStopRecording} 
              variant="destructive"
              className="flex-1 sm:flex-none text-base py-3 h-auto"
              disabled={stopButtonDisabled}
              aria-label="Stop Speaking"
              size="lg"
            >
              {isLoading ? <Loader2 className="mr-2 animate-spin" size={18}/> : <StopCircle className="mr-2" size={18}/>}
              {isLoading ? 'Processing...' : 'Stop Speaking'}
            </Button>
          )}
        </div>
        
        {isPermissionGranted === false && (
          <div className="flex items-center text-sm text-destructive font-medium">
            <AlertTriangle className="mr-2" size={18} />
            Permissions denied. Enable in browser.
          </div>
        )}
         {isPermissionGranted === null && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="animate-spin mr-2" size={18} />
            Checking permissions...
          </div>
        )}

        {audioUrl && isPermissionGranted && (
          <div className="flex items-center gap-2 sm:gap-3">
             <p className="text-sm text-muted-foreground hidden sm:block">Your recording:</p>
            <Button 
              onClick={handlePlayPause} 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-full"
              disabled={!audioUrl || isLoading}
              aria-label={isPlaying ? "Pause playback" : "Play recording"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </Button>
            <audio 
              key={audioUrl}
              ref={audioRef} 
              src={audioUrl} 
              onEnded={handleAudioEnded} 
              className="hidden" 
              onLoadedMetadata={() => {
                 if (audioRef.current) audioRef.current.currentTime = 0;
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
