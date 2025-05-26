interface NextQuestionTabProps {
  nextQuestion: string;
}

export default function NextQuestionTab({ nextQuestion }: NextQuestionTabProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      {nextQuestion ? (
        <p className="text-xl sm:text-2xl font-semibold text-primary leading-snug whitespace-pre-wrap">
          {nextQuestion}
        </p>
      ) : (
        <p className="text-muted-foreground italic py-10">The AI's next question will appear here to keep the conversation flowing...</p>
      )}
    </div>
  );
}
