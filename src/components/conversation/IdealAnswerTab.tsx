import { Loader2 } from 'lucide-react';

interface IdealAnswerTabProps {
  idealAnswer: string;
  isLoading: boolean;
}

export default function IdealAnswerTab({ idealAnswer, isLoading }: IdealAnswerTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-primary" size={24} />
        <p className="ml-2 text-muted-foreground">Generating ideal answer...</p>
      </div>
    );
  }

  return (
    <div>
      {idealAnswer ? (
        <p className="text-foreground whitespace-pre-wrap">{idealAnswer}</p>
      ) : (
        <p className="text-muted-foreground italic">An ideal answer for the AI's question will appear here...</p>
      )}
    </div>
  );
}
