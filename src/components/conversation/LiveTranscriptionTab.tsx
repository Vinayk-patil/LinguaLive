interface LiveTranscriptionTabProps {
  transcript: string;
  interimTranscript: string;
}

export default function LiveTranscriptionTab({ transcript, interimTranscript }: LiveTranscriptionTabProps) {
  return (
    <div>
      <p className="text-foreground whitespace-pre-wrap">{transcript}</p>
      <p className="text-muted-foreground whitespace-pre-wrap">{interimTranscript}</p>
      {!transcript && !interimTranscript && (
        <p className="text-muted-foreground italic">Start speaking to see your words transcribed here...</p>
      )}
    </div>
  );
}
