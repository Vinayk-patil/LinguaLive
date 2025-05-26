interface CorrectedGrammarTabProps {
  correctedText: string;
}

export default function CorrectedGrammarTab({ correctedText }: CorrectedGrammarTabProps) {
  return (
    <div>
      {correctedText ? (
        <p className="text-foreground text-base sm:text-lg leading-relaxed whitespace-pre-wrap">{correctedText}</p>
      ) : (
        <p className="text-muted-foreground italic text-center py-10">AI-corrected version of your speech will appear here after processing...</p>
      )}
    </div>
  );
}
