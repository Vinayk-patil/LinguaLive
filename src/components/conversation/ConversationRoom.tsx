
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
import { Loader2 } from 'lucide-react';

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

  const processSpeechAndGenerateNextContent = useCallback(async (speechText: string, fullTranscript: string) => {
    if (!speechText.trim() && !fullTranscript.trim()) return;

    const grammarInputText = fullTranscript.trim() || speechText.trim();
    const questionInputText = speechText.trim(); 
    const feedbackInputText = fullTranscript.trim() || speechText.trim();

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
        title: 'AI Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGrammar(false);
      if (questionInputText) setIsLoadingQuestion(false);
      setIsLoadingFeedback(false);
    }
  }, [topic, toast, fetchIdealAnswer]);

  // Effect for SpeechRecognition setup, media permissions, and initial AI question
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
        variant: 'destructive',
      });
      setHasCameraPermission(false);
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
        toast({title: "Media Error", description: "Failed to access webcam/microphone. Please check permissions.", variant: "destructive"});
      }
    };

    getMediaPermissionsAndInitialQuestion();

    return () => {
      if (recognitionRef.current) {
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
  }, [topic, fetchIdealAnswer, toast, nextAiQuestionText]); // Added nextAiQuestionText dependency


  // Effect for managing speech recognition event listeners
  useEffect(() => {
    if (!recognitionRef.current) return; 

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
          const textToProcess = accumulatedFinalTranscriptRef.current;
          // Use the last utterance for question context, but the full accumulated transcript for grammar/feedback
          const latestUtteranceForQuestion = finalTranscriptChunk.trim(); 
          const fullContextForAnalysis = liveTranscript + textToProcess;

          processSpeechAndGenerateNextContent(latestUtteranceForQuestion, fullContextForAnalysis);
          accumulatedFinalTranscriptRef.current = ''; 
        }, 2000); 
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let errorMsg = `Speech recognition error: ${event.error}.`;
      if (event.error === 'no-speech') {
        toast({ 
            title: 'No Speech Detected', 
            description: "We couldn't hear you. Please try speaking louder or check your microphone.",
            variant: 'default' 
        });
        return; 
      } else if (event.error === 'audio-capture') {
        errorMsg = 'Microphone error. Please check your microphone settings.';
        toast({ title: 'Critical Error', description: errorMsg, variant: 'destructive' });
        setIsRecording(false); 
        userStoppedManuallyRef.current = true;
        return;
      } else if (event.error === 'not-allowed') {
        errorMsg = 'Permission to use microphone was denied or not granted.';
        setHasCameraPermission(false); 
        toast({ title: 'Critical Error', description: errorMsg, variant: 'destructive' });
        setIsRecording(false);
        userStoppedManuallyRef.current = true; 
        return;
      } else if (event.error === 'network') {
        errorMsg = 'Network error during speech recognition.';
        toast({ title: 'Network Issue', description: `${errorMsg} Attempting to recover.`, variant: 'default' });
        return;
      }
      toast({ title: 'Speech Recognition Issue', description: `${errorMsg} Attempting to continue.`, variant: 'default' });
    };
    
    recognition.onend = () => {
      if (isRecording && !userStoppedManuallyRef.current) {
        console.log('Speech recognition ended, attempting to restart...');
        try {
          if(recognitionRef.current && typeof recognitionRef.current.start === 'function') {
            recognitionRef.current.start();
          } else {
            console.warn('Recognition object or start method not available for restart in onend.');
            toast({ title: 'Recovery Issue', description: 'Speech recognition service unavailable for restart.', variant: 'destructive'});
            setIsRecording(false); 
            userStoppedManuallyRef.current = true;
          }
        } catch (e) {
          console.error("Error restarting speech recognition in onend:", e);
          toast({ title: 'Recovery Failed', description: 'Could not restart speech recognition after it stopped.', variant: 'destructive'});
          setIsRecording(false); 
          userStoppedManuallyRef.current = true;
        }
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  }, [isRecording, processSpeechAndGenerateNextContent, toast, liveTranscript]);


  const handleStartRecording = () => {
    if (mediaStream && recognitionRef.current && hasCameraPermission) {
      userStoppedManuallyRef.current = false;
      setIsRecording(true);
      setLiveTranscript('');
      setInterimTranscript('');
      setCorrectedGrammarText('');
      // setNextAiQuestionText(''); // Keep current question or allow initial useEffect to set it
      setAiCoachFeedback(null);
      setIdealAnswerText(''); // Clear ideal answer too
      setAudioUrl(null);
      audioChunksRef.current = [];
      accumulatedFinalTranscriptRef.current = '';

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting speech recognition on button click:", e);
        toast({ title: 'Error', description: 'Could not start speech recognition.', variant: 'destructive' });
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
          toast({ title: 'Recording Error', description: 'An error occurred with the audio recorder.', variant: 'destructive'});
          if (recognitionRef.current) recognitionRef.current.stop();
          setIsRecording(false);
          userStoppedManuallyRef.current = true;
        };
        mediaRecorderRef.current.start();
        toast({ title: 'Recording Started', description: 'Speak now!' });
      } catch (mediaRecorderError) {
         console.error('Failed to start MediaRecorder:', mediaRecorderError);
         toast({ title: 'Recording Error', description: 'Could not start audio recording.', variant: 'destructive' });
         if (recognitionRef.current) recognitionRef.current.stop(); 
         setIsRecording(false);
      }
    } else {
      let errorDescription = 'Microphone or speech recognition not ready.';
      if (hasCameraPermission === false) {
        errorDescription = 'Camera and microphone permissions are required. Please enable them in your browser settings.';
      } else if (hasCameraPermission === null) {
        errorDescription = 'Waiting for camera and microphone permissions...';
      }
      toast({ title: 'Error Starting Recording', description: errorDescription, variant: 'destructive' });
    }
  };

  const handleStopRecording = () => {
    userStoppedManuallyRef.current = true; 
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const remainingText = accumulatedFinalTranscriptRef.current.trim();
    const fullContextForAnalysis = liveTranscript + remainingText;
    if (remainingText) {
      processSpeechAndGenerateNextContent(remainingText, fullContextForAnalysis);
      accumulatedFinalTranscriptRef.current = '';
    } else if (liveTranscript.trim() && !remainingText) { // Process live transcript if no new accumulated text
      processSpeechAndGenerateNextContent("", liveTranscript.trim());
    }

    toast({ title: 'Recording Stopped' });
  };


  return (
    <div className="w-full h-full p-2 md:p-4 bg-card shadow-lg rounded-xl">
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-6">Topic: {topic}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="lg:col-span-1 space-y-4">
          <WebcamFeed stream={mediaStream} hasPermission={hasCameraPermission} />
          <ConversationControls
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            audioUrl={audioUrl}
            isPermissionGranted={hasCameraPermission}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:col-span-1">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-4">
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
            <TabsTrigger value="grammar">Corrected</TabsTrigger>
            <TabsTrigger value="question">Next Question</TabsTrigger>
            <TabsTrigger value="idealAnswer">Ideal Answer</TabsTrigger>
            <TabsTrigger value="feedback">AI Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="transcription" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
            <LiveTranscriptionTab transcript={liveTranscript} interimTranscript={interimTranscript} />
          </TabsContent>
          <TabsContent value="grammar" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
            {isLoadingGrammar && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary" size={24} /></div>}
            {!isLoadingGrammar && <CorrectedGrammarTab correctedText={correctedGrammarText} />}
          </TabsContent>
          <TabsContent value="question" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
            {isLoadingQuestion && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary" size={24} /></div>}
            {!isLoadingQuestion && <NextQuestionTab nextQuestion={nextAiQuestionText} />}
          </TabsContent>
          <TabsContent value="idealAnswer" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
            <IdealAnswerTab idealAnswer={idealAnswerText} isLoading={isLoadingIdealAnswer} />
          </TabsContent>
          <TabsContent value="feedback" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
            {isLoadingFeedback && <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-primary" size={24} /></div>}
            {!isLoadingFeedback &&<AiCoachFeedbackTab feedback={aiCoachFeedback} />}
          </TabsContent>
        </Tabs>
      </div>
       <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Progress Tracker (Conceptual)</CardTitle>
          <CardDescription>View your improvement over time. (Feature coming soon)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This section will display charts and stats on grammar, fluency, and vocabulary.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    
