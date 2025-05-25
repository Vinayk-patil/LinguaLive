interface CorrectedGrammarTabProps {
  correctedText: string;
}

export default function CorrectedGrammarTab({ correctedText }: CorrectedGrammarTabProps) {
  return (
    <div>
      {correctedText ? (
        <p className="text-foreground whitespace-pre-wrap">{correctedText}</p>
      ) : (
        <p className="text-muted-foreground italic">AI-corrected version of your speech will appear here...</p>
      )}
    </div>
  );
}
