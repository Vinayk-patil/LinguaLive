
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import LiveTranscriptionTab from './LiveTranscriptionTab';
import CorrectedGrammarTab from './CorrectedGrammarTab';
import NextQuestionTab from './NextQuestionTab';
import AiCoachFeedbackTab from './AiCoachFeedbackTab';
import IdealAnswerTab from './IdealAnswerTab';
import WebcamFeed from './WebcamFeed';
import ConversationControls from './ConversationControls';
import { useToast } from '@/hooks/use-toast';
import { correctGrammar } from '@/ai/flows/grammar-correction';
import { generateNextQuestion } from '@/ai/flows/ai-question-generator';
import { aiCoachFeedback as getAiCoachFeedback } from '@/ai/flows/ai-coach-feedback';
import { generateIdealAnswer } from '@/ai/flows/generate-ideal-answer-flow';
import type { AiCoachFeedbackOutput } from '@/ai/flows/ai-coach-feedback';
import { Loader2, FileText, Sparkles, CheckCircle, MessageSquareQuote, HelpCircle } from 'lucide-react';

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

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
    if (!lastUtterance.trim() && !fullTranscript.trim()) return;

    const grammarInputText = fullTranscript.trim();
    const questionInputText = lastUtterance.trim(); // Use last utterance for question to keep it contextual to recent speech
    const feedbackInputText = fullTranscript.trim();

    if (!grammarInputText) return;

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
        // If there's no specific last utterance (e.g., only accumulated transcript from a previous session fragment),
        // we might not want to generate a new question, or use a generic prompt.
        // For now, we'll resolve with null if no questionInputText.
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


  // useEffect for initializing SpeechRecognition and media permissions
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
        variant: 'destructive',
      });
      setHasCameraPermission(false); // Also imply no mic permission if SR isn't supported
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
        
        // Fetch initial question only if it hasn't been fetched yet and topic is available
        if (!nextAiQuestionText && topic) { 
            const initialPrompt = `Let's talk about ${topic}. What are your first thoughts?`;
            setNextAiQuestionText(initialPrompt);
            fetchIdealAnswer(initialPrompt); // Fetch ideal answer for initial question
        }

      } catch (err) {
        console.error("Failed to get media stream", err);
        setHasCameraPermission(false);
        toast({title: "Media Permissions Denied", description: "Failed to access webcam/microphone. Please check permissions and refresh.", variant: "destructive"});
      }
    };

    getMediaPermissionsAndInitialQuestion();

    return () => { // Cleanup for this effect (main setup)
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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]); // Only re-run if topic changes (for initial question) or on mount for permissions


  // useEffect for managing speech recognition lifecycle (listeners, start/stop)
  useEffect(() => {
    if (!recognitionRef.current || hasCameraPermission === null) {
      // Recognition not initialized or permission status pending
      return;
    }
    if (hasCameraPermission === false) {
        // If permission was revoked or failed, ensure recording stops
        if (isRecording) setIsRecording(false);
        return;
    }

    const recognition = recognitionRef.current;

    // Define event handlers within this effect so they capture the correct state
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
             // Pass the latest finalized chunk for question generation context
             // Pass the full accumulated transcript for grammar and feedback
            processSpeechAndGenerateNextContent(finalTranscriptChunk.trim(), currentFullTranscript);
            accumulatedFinalTranscriptRef.current = ''; 
          }
        }, 2000); // Debounce for 2 seconds
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
        // Allow onend to attempt restart
        return; 
      } else if (event.error === 'audio-capture') {
        toast({ title: 'Microphone Error', description: 'Please check your microphone connection and settings.', variant: 'destructive' });
        userStoppedManuallyRef.current = true; // Treat as a manual stop to prevent restart loop
        setIsRecording(false); // This will trigger cleanup in this effect
        return;
      } else if (event.error === 'not-allowed') {
        toast({ title: 'Permission Error', description: 'Microphone permission denied. Please enable it in browser settings.', variant: 'destructive' });
        setHasCameraPermission(false); // Update permission state
        userStoppedManuallyRef.current = true; // Treat as a manual stop
        setIsRecording(false);
        return;
      } else if (event.error === 'network') {
        toast({ title: 'Network Issue', description: 'Speech recognition network error. Attempting to recover.', variant: 'default' });
        // Allow onend to try and restart
        return; 
      }
      // For other errors, show a generic message and let onend try to handle it
      toast({ title: 'Speech Recognition Issue', description: `Error: ${event.error}. Attempting to continue.`, variant: 'default' });
    };
    
    const handleEnd = () => {
      // isRecording state here is from the closure of this useEffect instance.
      // userStoppedManuallyRef.current is a ref, so it's always current.
      if (isRecording && !userStoppedManuallyRef.current) {
        console.log('Speech recognition ended, attempting to restart...');
        try {
          if(recognitionRef.current && typeof recognitionRef.current.start === 'function') {
            recognitionRef.current.start(); // Attempt to restart
          } else {
            console.warn('Recognition object or start method not available for restart in onend.');
             setIsRecording(false); // If cannot restart, ensure recording state is false
          }
        } catch (e: any) {
          if (e.name === 'InvalidStateError') {
            console.warn('SpeechRecognition.start() in onEnd called when already started. Ignoring.');
            // It's already started, let it continue.
          } else {
            console.error("Error restarting speech recognition in onend:", e);
            setIsRecording(false); // If restart fails for other reasons, ensure recording state is false
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
      recognition.onend = handleEnd; // Attach the robust onend handler
      
      try {
        recognition.start();
        console.log("useEffect [isRecording=true]: recognition.start() called successfully.");
      } catch (e: any) {
        if (e.name === 'InvalidStateError') { // This is the error name for "already started"
          console.warn("SpeechRecognition.start() in useEffect called when already started. Ignoring. Recognition should be running.");
          // It's already started, so this specific call can be ignored.
          // The listeners are re-attached which is important.
        } else {
          console.error("Error starting speech recognition in useEffect (isRecording true):", e);
          toast({ title: 'Recognition Start Error', description: `Could not start speech recognition: ${e.message}`, variant: 'destructive' });
          setIsRecording(false); // If it's a different error, stop recording.
        }
      }
    } else {
      // This block runs when isRecording becomes false, or on initial render if isRecording is false.
      console.log("useEffect [isRecording=false]: Stopping recognition and detaching listeners.");
      try {
        if (recognitionRef.current && typeof recognitionRef.current.stop === 'function') {
          recognitionRef.current.stop();
          console.log("useEffect [isRecording=false]: recognition.stop() called.");
        }
      } catch (e: any) {
        // It's possible stop() is called when already stopped, which can also throw an error in some implementations.
        console.warn("Error stopping recognition (isRecording false), possibly already stopped:", e.message);
      }
      // Detach listeners to prevent them from firing on a stopped instance
      // or an instance that's about to be cleaned up.
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    }

    return () => { // Cleanup function for this effect
      console.log("Speech recognition useEffect cleanup. Current isRecording:", isRecording);
      // This cleanup runs when isRecording changes or hasCameraPermission changes, or when the component unmounts.
      // Ensure recognition is stopped and listeners are detached.
      try {
        if (recognitionRef.current && typeof recognitionRef.current.stop === 'function') {
          // Only stop if it was supposed to be recording or to ensure it is stopped
          recognitionRef.current.stop();
          console.log("Cleanup: recognition.stop() called.");
        }
      } catch (e: any) {
         // This can happen if stop is called on an already stopped instance.
         console.warn("Error stopping recognition in effect cleanup:", e.message);
      }
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  // Key dependencies:
  // isRecording: To start/stop and manage listeners.
  // hasCameraPermission: To ensure we only try to record if permission is granted.
  // processSpeechAndGenerateNextContent, toast, liveTranscript: Dependencies for the event handlers.
  }, [isRecording, hasCameraPermission, processSpeechAndGenerateNextContent, toast, liveTranscript]);


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
    // setIdealAnswerText(''); // Keep ideal answer for the current question
    setAudioUrl(null);
    audioChunksRef.current = [];
    accumulatedFinalTranscriptRef.current = '';

    try {
      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        audioChunksRef.current = []; // Clear chunks for next recording
      };
      mediaRecorderRef.current.onerror = (event: Event) => { // Specify Event type
        console.error('MediaRecorder error:', event);
        toast({ title: 'Audio Recording Error', description: 'An error occurred with the audio recorder.', variant: 'destructive'});
        userStoppedManuallyRef.current = true; // Treat as manual stop
        setIsRecording(false); // This will trigger cleanup
      };
      mediaRecorderRef.current.start();
      toast({ title: 'Recording Started', description: 'Speak now!', className: 'bg-green-500 text-white dark:bg-green-700' });
      
      // Set isRecording to true, which will trigger the useEffect to attach listeners and start recognition
      setIsRecording(true);

    } catch (mediaRecorderError) {
       console.error('Failed to start MediaRecorder:', mediaRecorderError);
       toast({ title: 'Audio Recording Error', description: 'Could not start audio recording.', variant: 'destructive' });
       // Do not set isRecording to true if MediaRecorder fails
    }
  };

  const handleStopRecording = () => {
    console.log("handleStopRecording called. Setting userStoppedManuallyRef to true and isRecording to false.");
    userStoppedManuallyRef.current = true; 
    setIsRecording(false); // This triggers the cleanup in useEffect for speech recognition

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    
    // Process any remaining text immediately
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const remainingText = accumulatedFinalTranscriptRef.current.trim();
    const fullContextForAnalysis = liveTranscript + (remainingText ? (liveTranscript ? ' ' : '') + remainingText : '');

    if (fullContextForAnalysis.trim()) { 
      // Use the last spoken part for question generation if available, else the whole remaining text.
      // For grammar and feedback, use the entire context.
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-4 md:mb-6 p-1.5 h-auto bg-muted rounded-lg">
            <TabsTrigger value="transcription" className="text-xs sm:text-sm"><FileText className="mr-1.5 hidden sm:inline-block" size={16}/>Transcription</TabsTrigger>
            <TabsTrigger value="grammar" className="text-xs sm:text-sm"><CheckCircle className="mr-1.5 hidden sm:inline-block" size={16}/>Corrected</TabsTrigger>
            <TabsTrigger value="question" className="text-xs sm:text-sm"><HelpCircle className="mr-1.5 hidden sm:inline-block" size={16}/>Next Question</TabsTrigger>
            <TabsTrigger value="idealAnswer" className="text-xs sm:text-sm"><MessageSquareQuote className="mr-1.5 hidden sm:inline-block" size={16}/>Ideal Answer</TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs sm:text-sm"><Sparkles className="mr-1.5 hidden sm:inline-block" size={16}/>AI Coach</TabsTrigger>
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

