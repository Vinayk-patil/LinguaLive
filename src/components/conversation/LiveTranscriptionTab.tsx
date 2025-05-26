interface LiveTranscriptionTabProps {
  transcript: string;
  interimTranscript: string;
}

export default function LiveTranscriptionTab({ transcript, interimTranscript }: LiveTranscriptionTabProps) {
  return (
    <div className="space-y-2">
      {transcript && (
        <p className="text-foreground text-base sm:text-lg leading-relaxed whitespace-pre-wrap">{transcript}</p>
      )}
      {interimTranscript && (
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed whitespace-pre-wrap">{interimTranscript}</p>
      )}
      {!transcript && !interimTranscript && (
        <p className="text-muted-foreground italic text-center py-10">Start speaking to see your words transcribed here in real-time...</p>
      )}
    </div>
  );
}
