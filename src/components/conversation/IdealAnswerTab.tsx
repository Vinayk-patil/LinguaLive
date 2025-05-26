import { Loader2 } from 'lucide-react';

interface IdealAnswerTabProps {
  idealAnswer: string;
  isLoading: boolean;
}

export default function IdealAnswerTab({ idealAnswer, isLoading }: IdealAnswerTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="animate-spin text-primary mb-2" size={28} />
        <p>Generating ideal answer...</p>
      </div>
    );
  }

  return (
    <div>
      {idealAnswer ? (
        <p className="text-foreground text-base sm:text-lg leading-relaxed whitespace-pre-wrap">{idealAnswer}</p>
      ) : (
        <p className="text-muted-foreground italic text-center py-10">An ideal answer for the AI's question will appear here once generated...</p>
      )}
    </div>
  );
}
