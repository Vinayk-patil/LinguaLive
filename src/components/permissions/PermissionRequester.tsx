'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Video, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type PermissionStatus = 'idle' | 'pending' | 'granted' | 'denied';

export default function PermissionRequester() {
  const [videoStatus, setVideoStatus] = useState<PermissionStatus>('idle');
  const [audioStatus, setAudioStatus] = useState<PermissionStatus>('idle');
  const router = useRouter();
  const { toast } = useToast();

  const requestPermissions = useCallback(async () => {
    setVideoStatus('pending');
    setAudioStatus('pending');

    let videoGranted = false;
    let audioGranted = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Successfully got both
      videoGranted = true;
      audioGranted = true;
      setVideoStatus('granted');
      setAudioStatus('granted');
      // Stop tracks immediately as they are only for permission check here
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Error requesting permissions:', err);
      // Check what was denied
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          // User denied one or both
          // We can't know which one specifically without separate requests,
          // but for this app, both are needed.
          setVideoStatus('denied');
          setAudioStatus('denied');
           toast({
            title: 'Permissions Denied',
            description: 'Webcam and microphone access are required to use LinguaLive. Please enable them in your browser settings.',
            variant: 'destructive',
          });
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
           setVideoStatus('denied');
           setAudioStatus('denied');
           toast({
            title: 'Devices Not Found',
            description: 'No webcam or microphone found. Please ensure they are connected and enabled.',
            variant: 'destructive',
          });
        } else {
           setVideoStatus('denied');
           setAudioStatus('denied');
           toast({
            title: 'Permission Error',
            description: 'An error occurred while trying to access your webcam and microphone.',
            variant: 'destructive',
          });
        }
      } else {
        setVideoStatus('denied');
        setAudioStatus('denied');
         toast({
            title: 'Permission Error',
            description: 'An unexpected error occurred.',
            variant: 'destructive',
          });
      }
    }
    
    if (videoGranted && audioGranted) {
      toast({
        title: 'Permissions Granted!',
        description: 'Redirecting to topic selection...',
        className: 'bg-green-500 text-white',
      });
      router.push('/topic-selection');
    }

  }, [router, toast]);

  useEffect(() => {
    // Automatically request permissions when component mounts if not already granted or denied
    if (videoStatus === 'idle' && audioStatus === 'idle') {
      requestPermissions();
    }
  }, [requestPermissions, videoStatus, audioStatus]);

  const allGranted = videoStatus === 'granted' && audioStatus === 'granted';
  const anyDenied = videoStatus === 'denied' || audioStatus === 'denied';
  const anyPending = videoStatus === 'pending' || audioStatus === 'pending';

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Welcome to LinguaLive!</CardTitle>
        <CardDescription className="text-center">
          To help you practice your spoken English, we need access to your webcam and microphone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Video className="text-primary" />
            <span>Webcam Access</span>
          </div>
          {videoStatus === 'granted' && <CheckCircle2 className="text-green-500" />}
          {videoStatus === 'denied' && <AlertTriangle className="text-destructive" />}
          {videoStatus === 'pending' && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Mic className="text-primary" />
            <span>Microphone Access</span>
          </div>
          {audioStatus === 'granted' && <CheckCircle2 className="text-green-500" />}
          {audioStatus === 'denied' && <AlertTriangle className="text-destructive" />}
          {audioStatus === 'pending' && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
        </div>
        
        {anyDenied && (
          <p className="text-sm text-destructive text-center">
            Please grant permissions to continue. You may need to adjust your browser settings.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={requestPermissions} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={anyPending || allGranted}
        >
          {anyPending ? 'Requesting...' : allGranted ? 'Permissions Granted' : 'Grant Permissions'}
        </Button>
      </CardFooter>
    </Card>
  );
}
