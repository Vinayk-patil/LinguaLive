'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LiveTranscriptionTab from './LiveTranscriptionTab';
import CorrectedGrammarTab from './CorrectedGrammarTab';
import NextQuestionTab from './NextQuestionTab';
import WebcamFeed from './WebcamFeed';
import AiCoachFeedbackTab from './AiCoachFeedbackTab';
import ConversationControls from './ConversationControls';
import { useToast } from '@/hooks/use-toast';
import { correctGrammar } from '@/ai/flows/grammar-correction';
import { generateNextQuestion } from '@/ai/flows/ai-question-generator';
import { aiCoachFeedback as getAiCoachFeedback } from '@/ai/flows/ai-coach-feedback';
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
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [isLoadingGrammar, setIsLoadingGrammar] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  const { toast } = useToast();

  const processSpeech = useCallback(async (speechText: string) => {
    if (!speechText.trim()) return;

    setIsLoadingGrammar(true);
    setIsLoadingQuestion(true);
    setIsLoadingFeedback(true);

    try {
      const grammarPromise = correctGrammar({ text: speechText });
      const questionPromise = generateNextQuestion({ topic, userResponse: speechText });
      const feedbackPromise = getAiCoachFeedback({ transcription: speechText, topic });

      const [grammarResult, questionResult, feedbackResult] = await Promise.all([
        grammarPromise,
        questionPromise,
        feedbackPromise,
      ]);

      setCorrectedGrammarText(grammarResult.correctedText);
      setNextAiQuestionText(questionResult.nextQuestion);
      setAiCoachFeedback(feedbackResult);

    } catch (error) {
      console.error('AI processing error:', error);
      toast({
        title: 'AI Error',
        description: 'Could not process speech with AI. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGrammar(false);
      setIsLoadingQuestion(false);
      setIsLoadingFeedback(false);
    }
  }, [topic, toast]);


  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
        variant: 'destructive',
      });
      return;
    }
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

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
      if (finalTranscriptChunk) {
        setLiveTranscript(prev => prev + finalTranscriptChunk + '. ');
        processSpeech(finalTranscriptChunk); 
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let errorMsg = 'An error occurred during speech recognition.';
      if (event.error === 'no-speech') {
        errorMsg = 'No speech detected. Please try speaking louder.';
      } else if (event.error === 'audio-capture') {
        errorMsg = 'Microphone error. Please check your microphone settings.';
      } else if (event.error === 'not-allowed') {
        errorMsg = 'Permission to use microphone was denied or not granted.';
      }
      toast({ title: 'Speech Recognition Error', description: errorMsg, variant: 'destructive' });
      setIsRecording(false); // Stop recording UI state if error
    };
    
    recognition.onend = () => {
      // If isRecording is true, it means it stopped unexpectedly or due to user action.
      // If it stopped but user still wants to record, restart it.
      // This logic is tricky with continuous; typically continuous keeps it running.
      // For now, let's assume if it ends and `isRecording` is true, it was an error or manual stop.
      if (isRecording) {
         // It might be better to let user manually restart if it stops unexpectedly.
         // For simplicity, we just update the UI state.
        // setIsRecording(false); 
      }
    };
    
    // Get webcam stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        webcamStreamRef.current = stream;
        // Initial AI question
        const initialPrompt = `Let's talk about ${topic}. What are your first thoughts?`;
        setNextAiQuestionText(initialPrompt);
      })
      .catch(err => {
        console.error("Failed to get media stream", err);
        toast({title: "Media Error", description: "Failed to access webcam/microphone.", variant: "destructive"});
      });

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [processSpeech, topic, toast]);

  const handleStartRecording = () => {
    if (webcamStreamRef.current && recognitionRef.current) {
      setIsRecording(true);
      setLiveTranscript('');
      setInterimTranscript('');
      setAudioUrl(null);
      audioChunksRef.current = [];

      recognitionRef.current.start();
      
      mediaRecorderRef.current = new MediaRecorder(webcamStreamRef.current);
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
      mediaRecorderRef.current.start();
      toast({ title: 'Recording Started', description: 'Speak now!' });
    } else {
      toast({ title: 'Error', description: 'Microphone or speech recognition not ready.', variant: 'destructive' });
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    toast({ title: 'Recording Stopped' });
  };


  return (
    <div className="w-full h-full p-2 md:p-4 bg-card shadow-lg rounded-xl">
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-4 md:mb-6">Topic: {topic}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="lg:col-span-1 space-y-4">
          <WebcamFeed stream={webcamStreamRef.current} />
          <ConversationControls
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            audioUrl={audioUrl}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:col-span-1">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
            <TabsTrigger value="grammar">Corrected</TabsTrigger>
            <TabsTrigger value="question">Next Question</TabsTrigger>
            <TabsTrigger value="feedback">AI Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="transcription" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
            <LiveTranscriptionTab transcript={liveTranscript} interimTranscript={interimTranscript} />
          </TabsContent>
          <TabsContent value="grammar" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
            {isLoadingGrammar && <Loader2 className="mx-auto animate-spin text-primary" size={24} />}
            <CorrectedGrammarTab correctedText={correctedGrammarText} />
          </TabsContent>
          <TabsContent value="question" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
            {isLoadingQuestion && <Loader2 className="mx-auto animate-spin text-primary" size={24} />}
            <NextQuestionTab nextQuestion={nextAiQuestionText} />
          </TabsContent>
          <TabsContent value="feedback" className="h-[300px] md:h-[400px] overflow-y-auto p-4 border rounded-md bg-background">
             {isLoadingFeedback && <Loader2 className="mx-auto animate-spin text-primary" size={24} />}
            <AiCoachFeedbackTab feedback={aiCoachFeedback} />
          </TabsContent>
        </Tabs>
      </div>
       {/* Conceptual Progress Tracker - Not functional yet */}
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
