
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import LiveTranscriptionTab from './LiveTranscriptionTab';
import CorrectedGrammarTab from './CorrectedGrammarTab';
import NextQuestionTab from './NextQuestionTab';
import AiCoachFeedbackTab from './AiCoachFeedbackTab';
import IdealAnswerTab from './IdealAnswerTab';
import RecordedVideoTab from './RecordedVideoTab'; // New import
import WebcamFeed from './WebcamFeed';
import ConversationControls from './ConversationControls';
import { useToast } from '@/hooks/use-toast';
import { correctGrammar } from '@/ai/flows/grammar-correction';
import { generateNextQuestion } from '@/ai/flows/ai-question-generator';
import { aiCoachFeedback as getAiCoachFeedback } from '@/ai/flows/ai-coach-feedback';
import { generateIdealAnswer } from '@/ai/flows/generate-ideal-answer-flow';
import type { AiCoachFeedbackOutput } from '@/ai/flows/ai-coach-feedback';
import { Loader2, FileText, Sparkles, CheckCircle, MessageSquareQuote, HelpCircle, Video as VideoIcon } from 'lucide-react'; // Added VideoIcon

interface ConversationRoomProps {
  topic: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function ConversationRoom({ topic }: ConversationRoomProps) {
  const [activeTab, setActiveTab] = useState('transcription');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [correctedGrammarText, setCorrectedGrammarText] = useState('');
  const [nextAiQuestionText, setNextAiQuestionText] = useState('');
  const [aiCoachFeedback, setAiCoachFeedback] = useState<AiCoachFeedbackOutput | null>(null);
  const [idealAnswerText, setIdealAnswerText] = useState('');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null); // New state for video URL

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null); // New ref for video recorder
  const videoChunksRef = useRef<Blob[]>([]); // New ref for video chunks

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const recognitionRef = useRef<any>(null);
  const userStoppedManuallyRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedFinalTranscriptRef = useRef('');

  const [isLoadingGrammar, setIsLoadingGrammar] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [isLoadingIdealAnswer, setIsLoadingIdealAnswer] = useState(false);

  const { toast } = useToast();

  const fetchIdealAnswer = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setIsLoadingIdealAnswer(true);
    setIdealAnswerText('');
    try {
      const idealAnswerResult = await generateIdealAnswer({ question, topic });
      setIdealAnswerText(idealAnswerResult.idealAnswer);
    } catch (error) {
      console.error('Ideal answer generation error:', error);
      toast({
        title: 'AI Error',
        description: 'Could not generate an ideal answer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingIdealAnswer(false);
    }
  }, [topic, toast]);

  const processSpeechAndGenerateNextContent = useCallback(async (lastUtterance: string, fullTranscript: string) => {
    if (!fullTranscript.trim()) return;

    const grammarInputText = fullTranscript.trim();
    const questionInputText = lastUtterance.trim();
    const feedbackInputText = fullTranscript.trim();

    setIsLoadingGrammar(true);
    if (questionInputText) setIsLoadingQuestion(true);
    setIsLoadingFeedback(true);
    setCorrectedGrammarText('');
    setAiCoachFeedback(null);

    try {
      const promises = [];
      promises.push(correctGrammar({ text: grammarInputText }));
      if (questionInputText) {
        promises.push(generateNextQuestion({ topic, userResponse: questionInputText }));
      } else {
        promises.push(Promise.resolve(null));
      }
      promises.push(getAiCoachFeedback({ transcription: feedbackInputText, topic }));

      const [grammarResult, questionResult, feedbackResult] = await Promise.all(promises);

      if (grammarResult) setCorrectedGrammarText(grammarResult.correctedText);
      if (questionResult) {
        setNextAiQuestionText(questionResult.nextQuestion);
        fetchIdealAnswer(questionResult.nextQuestion);
      }
      if (feedbackResult) setAiCoachFeedback(feedbackResult);

    } catch (error: any) {
      console.error('AI processing error:', error);
      let description = 'Could not process speech with AI. Please try again.';
      if (error.message && error.message.includes('429')) {
        description = 'AI service is temporarily busy (rate limit). Please wait a moment and try again.';
      } else if (error.message && error.message.includes('SAFETY')) {
        description = 'AI could not process the request due to safety filters. Please rephrase and try again.';
      }
      toast({
        title: 'AI Processing Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGrammar(false);
      if (questionInputText) setIsLoadingQuestion(false);
      setIsLoadingFeedback(false);
    }
  }, [topic, toast, fetchIdealAnswer]);


  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
        variant: 'destructive',
      });
      setHasCameraPermission(false);
      return;
    }

    if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
    }
    
    const getMediaPermissionsAndInitialQuestion = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setMediaStream(stream);
        setHasCameraPermission(true);
        
        if (!nextAiQuestionText && topic) { 
            const initialPrompt = `Let's talk about ${topic}. What are your first thoughts?`;
            setNextAiQuestionText(initialPrompt);
            fetchIdealAnswer(initialPrompt);
        }

      } catch (err) {
        console.error("Failed to get media stream", err);
        setHasCameraPermission(false);
        toast({title: "Media Permissions Denied", description: "Failed to access webcam/microphone. Please check permissions and refresh.", variant: "destructive"});
      }
    };

    getMediaPermissionsAndInitialQuestion();

    return () => {
      console.log("Main useEffect cleanup: Stopping recognition and media tracks.");
      if (recognitionRef.current && typeof recognitionRef.current.stop === 'function') {
        try {
            recognitionRef.current.stop();
        } catch(e) {
            console.warn("Error stopping recognition in main cleanup:", e);
        }
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (videoMediaRecorderRef.current && videoMediaRecorderRef.current.state === 'recording') { // Cleanup video recorder
        videoMediaRecorderRef.current.stop();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);


  useEffect(() => {
    if (!recognitionRef.current || hasCameraPermission === null || !mediaStream) {
      return;
    }
    if (hasCameraPermission === false) {
        if (isRecording) setIsRecording(false);
        return;
    }

    const recognition = recognitionRef.current;

    const handleResult = (event: any) => {
      let finalTranscriptChunk = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptChunk += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(currentInterim);

      if (finalTranscriptChunk) {
        const newFinalText = finalTranscriptChunk.trim() + ' ';
        setLiveTranscript(prev => prev + newFinalText);
        accumulatedFinalTranscriptRef.current += newFinalText;

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          const textToProcess = accumulatedFinalTranscriptRef.current.trim();
          const currentFullTranscript = liveTranscript + (accumulatedFinalTranscriptRef.current.trim() ? (liveTranscript ? ' ' : '') + accumulatedFinalTranscriptRef.current.trim() : '');

          if (textToProcess) {
            processSpeechAndGenerateNextContent(finalTranscriptChunk.trim(), currentFullTranscript);
            accumulatedFinalTranscriptRef.current = ''; 
          }
        }, 2000);
      }
    };

    const handleError = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast({ 
            title: 'No Speech Detected', 
            description: "We couldn't hear you. Please try speaking louder or check your microphone.",
            variant: 'default' 
        });
        return; 
      } else if (event.error === 'audio-capture') {
        toast({ title: 'Microphone Error', description: 'Please check your microphone connection and settings.', variant: 'destructive' });
        userStoppedManuallyRef.current = true; 
        setIsRecording(false);
        return;
      } else if (event.error === 'not-allowed') {
        toast({ title: 'Permission Error', description: 'Microphone permission denied. Please enable it in browser settings.', variant: 'destructive' });
        setHasCameraPermission(false);
        userStoppedManuallyRef.current = true;
        setIsRecording(false);
        return;
      } else if (event.error === 'network') {
        toast({ title: 'Network Issue', description: 'Speech recognition network error. Attempting to recover.', variant: 'default' });
        return; 
      }
      toast({ title: 'Speech Recognition Issue', description: `Error: ${event.error}. Attempting to continue.`, variant: 'default' });
    };
    
    const handleEnd = () => {
      if (isRecording && !userStoppedManuallyRef.current) {
        console.log('Speech recognition ended, attempting to restart...');
        try {
          if(recognitionRef.current && typeof recognitionRef.current.start === 'function') {
            recognitionRef.current.start();
          } else {
            console.warn('Recognition object or start method not available for restart in onend.');
             setIsRecording(false);
          }
        } catch (e: any) {
          if (e.name === 'InvalidStateError') {
            console.warn('SpeechRecognition.start() in onEnd called when already started. Ignoring.');
          } else {
            console.error("Error restarting speech recognition in onend:", e);
            setIsRecording(false);
          }
        }
      } else {
        console.log('Speech recognition ended. Current isRecording state:', isRecording, 'User stopped manually:', userStoppedManuallyRef.current);
      }
    };

    if (isRecording) {
      console.log("useEffect [isRecording=true]: Attaching listeners and attempting to start recognition.");
      recognition.onresult = handleResult;
      recognition.onerror = handleError;
      recognition.onend = handleEnd;
      
      try {
        recognition.start();
        console.log("useEffect [isRecording=true]: recognition.start() called successfully.");
      } catch (e: any) {
        if (e.name === 'InvalidStateError') {
          console.warn("SpeechRecognition.start() in useEffect called when already started. Ignoring. Recognition should be running.");
        } else {
          console.error("Error starting speech recognition in useEffect (isRecording true):", e);
          toast({ title: 'Recognition Start Error', description: `Could not start speech recognition: ${e.message}`, variant: 'destructive' });
          setIsRecording(false);
        }
      }
    } else {
      console.log("useEffect [isRecording=false]: Stopping recognition and detaching listeners.");
      try {
        if (recognitionRef.current && typeof recognitionRef.current.stop === 'function') {
          recognitionRef.current.stop();
          console.log("useEffect [isRecording=false]: recognition.stop() called.");
        }
      } catch (e: any) {
        console.warn("Error stopping recognition (isRecording false), possibly already stopped:", e.message);
      }
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    }

    return () => {
      console.log("Speech recognition useEffect cleanup. Current isRecording:", isRecording);
      try {
        if (recognitionRef.current && typeof recognitionRef.current.stop === 'function') {
          recognitionRef.current.stop();
          console.log("Cleanup: recognition.stop() called.");
        }
      } catch (e: any) {
         console.warn("Error stopping recognition in effect cleanup:", e.message);
      }
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  }, [isRecording, hasCameraPermission, processSpeechAndGenerateNextContent, toast, liveTranscript, mediaStream]);


  const handleStartRecording = () => {
    if (!mediaStream || !recognitionRef.current || hasCameraPermission === null || hasCameraPermission === false) {
      let errorDescription = 'Microphone or speech recognition not ready.';
      if (hasCameraPermission === false) {
        errorDescription = 'Camera and microphone permissions are required. Please enable them in your browser settings and refresh the page.';
      } else if (hasCameraPermission === null) {
        errorDescription = 'Waiting for camera and microphone permissions...';
      }
      toast({ title: 'Error Starting Recording', description: errorDescription, variant: 'destructive' });
      return;
    }

    userStoppedManuallyRef.current = false;
    setLiveTranscript('');
    setInterimTranscript('');
    setCorrectedGrammarText('');
    setAiCoachFeedback(null);
    setAudioUrl(null);
    audioChunksRef.current = [];
    accumulatedFinalTranscriptRef.current = '';

    // Video recording setup
    setRecordedVideoUrl(null);
    videoChunksRef.current = [];

    try {
      // Audio Recorder
      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.onerror = (event: Event) => {
        console.error('MediaRecorder (audio) error:', event);
        toast({ title: 'Audio Recording Error', description: 'An error occurred with the audio recorder.', variant: 'destructive'});
        userStoppedManuallyRef.current = true;
        setIsRecording(false);
      };
      mediaRecorderRef.current.start();

      // Video Recorder
      try {
        videoMediaRecorderRef.current = new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp8,opus' });
      } catch (e) {
        console.warn("Failed to create MediaRecorder with video/webm;codecs=vp8,opus. Trying default.", e);
        try {
            videoMediaRecorderRef.current = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
        } catch (e2) {
            console.error("Failed to create MediaRecorder with video/webm. Trying system default.", e2);
            videoMediaRecorderRef.current = new MediaRecorder(mediaStream); // Fallback to browser default
        }
      }
      
      videoMediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) videoChunksRef.current.push(event.data);
      };
      videoMediaRecorderRef.current.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);
        setRecordedVideoUrl(videoUrl);
        videoChunksRef.current = [];
      };
       videoMediaRecorderRef.current.onerror = (event: Event) => {
        console.error('MediaRecorder (video) error:', event);
        toast({ title: 'Video Recording Error', description: 'An error occurred with the video recorder.', variant: 'destructive'});
        // Don't stop overall recording for video error alone if audio might still work
      };
      videoMediaRecorderRef.current.start();

      toast({ title: 'Recording Started', description: 'Speak now!', className: 'bg-green-500 text-white dark:bg-green-700' });
      setIsRecording(true);

    } catch (recorderError) {
       console.error('Failed to start MediaRecorder(s):', recorderError);
       toast({ title: 'Recording Start Error', description: 'Could not start audio/video recording.', variant: 'destructive' });
    }
  };

  const handleStopRecording = () => {
    console.log("handleStopRecording called. Setting userStoppedManuallyRef to true and isRecording to false.");
    userStoppedManuallyRef.current = true; 
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (videoMediaRecorderRef.current && videoMediaRecorderRef.current.state === "recording") { // Stop video recorder
      videoMediaRecorderRef.current.stop();
    }
    
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const remainingText = accumulatedFinalTranscriptRef.current.trim();
    const fullContextForAnalysis = liveTranscript + (remainingText ? (liveTranscript ? ' ' : '') + remainingText : '');

    if (fullContextForAnalysis.trim()) { 
      const lastUtteranceForQuestion = remainingText || liveTranscript.trim().split(" ").pop() || "";
      processSpeechAndGenerateNextContent(lastUtteranceForQuestion, fullContextForAnalysis);
      accumulatedFinalTranscriptRef.current = '';
    }
    toast({ title: 'Recording Stopped' });
  };

  const isLoadingAnything = isLoadingGrammar || isLoadingQuestion || isLoadingFeedback || isLoadingIdealAnswer;

  return (
    <div className="w-full h-full p-1 md:p-0 space-y-4 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">
        Topic: <span className="text-primary">{topic}</span>
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <WebcamFeed stream={mediaStream} hasPermission={hasCameraPermission} />
          <ConversationControls
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            audioUrl={audioUrl}
            isPermissionGranted={hasCameraPermission}
            isLoading={isLoadingAnything || (hasCameraPermission === null)}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:col-span-3">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 mb-4 md:mb-6 p-1.5 h-auto bg-muted rounded-lg">
            <TabsTrigger value="transcription" className="text-xs sm:text-sm"><FileText className="mr-1.5 hidden sm:inline-block" size={16}/>Transcription</TabsTrigger>
            <TabsTrigger value="grammar" className="text-xs sm:text-sm"><CheckCircle className="mr-1.5 hidden sm:inline-block" size={16}/>Corrected</TabsTrigger>
            <TabsTrigger value="question" className="text-xs sm:text-sm"><HelpCircle className="mr-1.5 hidden sm:inline-block" size={16}/>Next Question</TabsTrigger>
            <TabsTrigger value="idealAnswer" className="text-xs sm:text-sm"><MessageSquareQuote className="mr-1.5 hidden sm:inline-block" size={16}/>Ideal Answer</TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs sm:text-sm"><Sparkles className="mr-1.5 hidden sm:inline-block" size={16}/>AI Coach</TabsTrigger>
            <TabsTrigger value="recordedVideo" className="text-xs sm:text-sm"><VideoIcon className="mr-1.5 hidden sm:inline-block" size={16}/>Recorded Video</TabsTrigger>
          </TabsList>

          <Card className="rounded-xl shadow-lg border-border/70">
            <CardContent className="p-0">
              <div className="h-[350px] md:h-[calc(theme(spacing.96)_+_theme(spacing.12))] overflow-y-auto p-4 sm:p-6">
                <TabsContent value="transcription" tabIndex={-1} className="mt-0">
                  <LiveTranscriptionTab transcript={liveTranscript} interimTranscript={interimTranscript} />
                </TabsContent>
                <TabsContent value="grammar" tabIndex={-1} className="mt-0">
                  {isLoadingGrammar && <div className="flex flex-col justify-center items-center h-full text-muted-foreground"><Loader2 className="animate-spin text-primary mb-2" size={28} /><p>Correcting grammar...</p></div>}
                  {!isLoadingGrammar && <CorrectedGrammarTab correctedText={correctedGrammarText} />}
                </TabsContent>
                <TabsContent value="question" tabIndex={-1} className="mt-0">
                  {isLoadingQuestion && <div className="flex flex-col justify-center items-center h-full text-muted-foreground"><Loader2 className="animate-spin text-primary mb-2" size={28} /><p>Generating question...</p></div>}
                  {!isLoadingQuestion && <NextQuestionTab nextQuestion={nextAiQuestionText} />}
                </TabsContent>
                <TabsContent value="idealAnswer" tabIndex={-1} className="mt-0">
                  <IdealAnswerTab idealAnswer={idealAnswerText} isLoading={isLoadingIdealAnswer} />
                </TabsContent>
                <TabsContent value="feedback" tabIndex={-1} className="mt-0">
                  {isLoadingFeedback && <div className="flex flex-col justify-center items-center h-full text-muted-foreground"><Loader2 className="animate-spin text-primary mb-2" size={28} /><p>Analyzing feedback...</p></div>}
                  {!isLoadingFeedback &&<AiCoachFeedbackTab feedback={aiCoachFeedback} />}
                </TabsContent>
                <TabsContent value="recordedVideo" tabIndex={-1} className="mt-0">
                  <RecordedVideoTab videoUrl={recordedVideoUrl} />
                </TabsContent>
              </div>
            </CardContent>
          </Card>
        </Tabs>
      </div>
       <Card className="mt-4 md:mt-6 rounded-xl shadow-lg border-border/70">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">Progress Tracker</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">View your improvement over time. (Feature coming soon!)</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="text-center py-8 bg-muted/50 rounded-lg">
            <Sparkles className="mx-auto text-primary mb-2" size={32}/>
            <p className="text-muted-foreground">This section will display charts and stats on grammar, fluency, and vocabulary.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
