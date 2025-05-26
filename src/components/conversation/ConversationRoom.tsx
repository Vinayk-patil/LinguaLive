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
    const questionInputText = lastUtterance.trim();
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
        variant: 'destructive',
      });
      setHasCameraPermission(false); // Explicitly set to false
      return;
    }

    if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
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
      if (recognitionRef.current && recognitionRef.current.stop) {
        recognitionRef.current.stop();
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
  // Only run on mount and when topic changes to set initial question.
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [topic, toast]); // fetchIdealAnswer and nextAiQuestionText are stable or managed internally


  useEffect(() => {
    if (!recognitionRef.current || !hasCameraPermission) return; // Only attach listeners if permission is granted

    const recognition = recognitionRef.current;

    recognition.onresult = (event: any) => {
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
          if (textToProcess) {
            // Use the last utterance for question context, but the full accumulated transcript for grammar/feedback
            processSpeechAndGenerateNextContent(finalTranscriptChunk.trim(), liveTranscript + textToProcess);
            accumulatedFinalTranscriptRef.current = ''; 
          }
        }, 2000); 
      }
    };

    recognition.onerror = (event: any) => {
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
        setIsRecording(false); 
        userStoppedManuallyRef.current = true;
        return;
      } else if (event.error === 'not-allowed') {
        toast({ title: 'Permission Error', description: 'Microphone permission denied. Please enable it in browser settings.', variant: 'destructive' });
        setHasCameraPermission(false); 
        setIsRecording(false);
        userStoppedManuallyRef.current = true; 
        return;
      } else if (event.error === 'network') {
        toast({ title: 'Network Issue', description: 'Speech recognition network error. Attempting to recover.', variant: 'default' });
        return; // Allow onend to try and restart
      }
      // For other errors, show a generic message but try to continue
      toast({ title: 'Speech Recognition Issue', description: `Error: ${event.error}. Attempting to continue.`, variant: 'default' });
    };
    
    recognition.onend = () => {
      if (isRecording && !userStoppedManuallyRef.current && hasCameraPermission) {
        console.log('Speech recognition ended, attempting to restart...');
        try {
          if(recognitionRef.current && typeof recognitionRef.current.start === 'function') {
            recognitionRef.current.start();
          } else {
            console.warn('Recognition object or start method not available for restart in onend.');
            // toast({ title: 'Recovery Issue', description: 'Speech recognition service unavailable for restart.', variant: 'destructive'});
            // setIsRecording(false); 
            // userStoppedManuallyRef.current = true; // This might be too aggressive, let it try again
          }
        } catch (e) {
          console.error("Error restarting speech recognition in onend:", e);
          // toast({ title: 'Recovery Failed', description: 'Could not restart speech recognition after it stopped.', variant: 'destructive'});
          // setIsRecording(false); 
          // userStoppedManuallyRef.current = true;
        }
      }
    };

    return () => { // Cleanup listeners
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  }, [isRecording, processSpeechAndGenerateNextContent, toast, liveTranscript, hasCameraPermission]);


  const handleStartRecording = () => {
    if (mediaStream && recognitionRef.current && hasCameraPermission) {
      userStoppedManuallyRef.current = false;
      setIsRecording(true);
      setLiveTranscript('');
      setInterimTranscript('');
      setCorrectedGrammarText('');
      setAiCoachFeedback(null);
      setIdealAnswerText(''); 
      setAudioUrl(null);
      audioChunksRef.current = [];
      accumulatedFinalTranscriptRef.current = '';

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting speech recognition on button click:", e);
        toast({ title: 'Recognition Start Error', description: 'Could not start speech recognition.', variant: 'destructive' });
        setIsRecording(false);
        return;
      }
      
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
        };
        mediaRecorderRef.current.onerror = (event: Event) => { 
          console.error('MediaRecorder error:', event);
          toast({ title: 'Audio Recording Error', description: 'An error occurred with the audio recorder.', variant: 'destructive'});
          if (recognitionRef.current && recognitionRef.current.stop) recognitionRef.current.stop();
          setIsRecording(false);
          userStoppedManuallyRef.current = true;
        };
        mediaRecorderRef.current.start();
        toast({ title: 'Recording Started', description: 'Speak now!', className: 'bg-green-500 text-white dark:bg-green-700' });
      } catch (mediaRecorderError) {
         console.error('Failed to start MediaRecorder:', mediaRecorderError);
         toast({ title: 'Audio Recording Error', description: 'Could not start audio recording.', variant: 'destructive' });
         if (recognitionRef.current && recognitionRef.current.stop) recognitionRef.current.stop(); 
         setIsRecording(false);
      }
    } else {
      let errorDescription = 'Microphone or speech recognition not ready.';
      if (hasCameraPermission === false) {
        errorDescription = 'Camera and microphone permissions are required. Please enable them in your browser settings and refresh the page.';
      } else if (hasCameraPermission === null) {
        errorDescription = 'Waiting for camera and microphone permissions...';
      }
      toast({ title: 'Error Starting Recording', description: errorDescription, variant: 'destructive' });
    }
  };

  const handleStopRecording = () => {
    userStoppedManuallyRef.current = true; 
    if (recognitionRef.current && recognitionRef.current.stop) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const remainingText = accumulatedFinalTranscriptRef.current.trim();
    // Use liveTranscript + remainingText to ensure all spoken words are processed.
    const fullContextForAnalysis = liveTranscript + (remainingText ? (liveTranscript ? ' ' : '') + remainingText : '');
    if (remainingText) { // If there was new text accumulated by debounce
      processSpeechAndGenerateNextContent(remainingText, fullContextForAnalysis);
      accumulatedFinalTranscriptRef.current = '';
    } else if (liveTranscript.trim() && !remainingText && !isRecording) { // Process only if not recording and live transcript exists
       //This case might be redundant if debouncer always flushes or if stopping already processed.
       //But good as a fallback. Ensure it only processes if necessary.
       // For example, if user stops very quickly after speaking but before debounce.
       processSpeechAndGenerateNextContent("", liveTranscript.trim());
    }
    toast({ title: 'Recording Stopped' });
  };

  const isLoadingAnything = isLoadingGrammar || isLoadingQuestion || isLoadingFeedback || isLoadingIdealAnswer;


  return (
    <div className="w-full h-full space-y-4 md:space-y-6">
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
            isLoading={isLoadingAnything}
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
