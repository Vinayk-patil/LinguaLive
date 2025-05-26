'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Video, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
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
      videoGranted = true;
      audioGranted = true;
      setVideoStatus('granted');
      setAudioStatus('granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Error requesting permissions:', err);
      const newVideoStatus = 'denied';
      const newAudioStatus = 'denied';
      setVideoStatus(newVideoStatus);
      setAudioStatus(newAudioStatus);

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           toast({
            title: 'Permissions Denied',
            description: 'Webcam and microphone access are required. Please enable them in your browser settings.',
            variant: 'destructive',
          });
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
           toast({
            title: 'Devices Not Found',
            description: 'No webcam or microphone found. Please ensure they are connected and enabled.',
            variant: 'destructive',
          });
        } else {
           toast({
            title: 'Permission Error',
            description: 'An error occurred accessing your webcam and microphone.',
            variant: 'destructive',
          });
        }
      } else {
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
        className: 'bg-green-600 text-white dark:bg-green-700 dark:text-white', // Use a success color
      });
      router.push('/topic-selection');
    }
  }, [router, toast]);

  useEffect(() => {
    if (videoStatus === 'idle' && audioStatus === 'idle') {
      requestPermissions();
    }
  }, [requestPermissions, videoStatus, audioStatus]);

  const allGranted = videoStatus === 'granted' && audioStatus === 'granted';
  const anyDenied = videoStatus === 'denied' || audioStatus === 'denied';
  const anyPending = videoStatus === 'pending' || audioStatus === 'pending';

  return (
    <Card className="w-full max-w-lg shadow-xl rounded-xl border-border/70">
      <CardHeader className="text-center p-6 sm:p-8">
        <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Welcome to LinguaLive!</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          To practice your spoken English, we need access to your webcam and microphone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 sm:p-8 pt-0">
        <PermissionItem icon={Video} label="Webcam Access" status={videoStatus} />
        <PermissionItem icon={Mic} label="Microphone Access" status={audioStatus} />
        
        {anyDenied && (
          <p className="text-sm text-destructive text-center pt-2">
            Please grant permissions to continue. You may need to adjust your browser settings.
          </p>
        )}
      </CardContent>
      <CardFooter className="p-6 sm:p-8 pt-0">
        <Button 
          onClick={requestPermissions} 
          className="w-full text-base py-3 h-auto"
          size="lg"
          variant={allGranted ? "default" : "primary"}
          disabled={anyPending || allGranted}
        >
          {anyPending && <Loader2 className="mr-2 animate-spin" size={20} />}
          {anyPending ? 'Requesting Permissions...' : allGranted ? 'Permissions Granted' : 'Grant Permissions'}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface PermissionItemProps {
  icon: React.ElementType;
  label: string;
  status: PermissionStatus;
}

function PermissionItem({ icon: Icon, label, status }: PermissionItemProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/60 rounded-lg border border-border/50">
      <div className="flex items-center gap-3">
        <Icon className="text-primary" size={20} />
        <span className="text-foreground font-medium">{label}</span>
      </div>
      {status === 'granted' && <CheckCircle2 className="text-green-500" size={20} />}
      {status === 'denied' && <AlertTriangle className="text-destructive" size={20} />}
      {status === 'pending' && <Loader2 className="animate-spin text-primary" size={20} />}
      {status === 'idle' && <div className="w-5 h-5"></div>}
    </div>
  );
}
