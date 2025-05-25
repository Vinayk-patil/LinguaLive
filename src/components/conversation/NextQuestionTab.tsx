interface NextQuestionTabProps {
  nextQuestion: string;
}

export default function NextQuestionTab({ nextQuestion }: NextQuestionTabProps) {
  return (
    <div>
      {nextQuestion ? (
        <p className="text-lg font-semibold text-primary whitespace-pre-wrap">{nextQuestion}</p>
      ) : (
        <p className="text-muted-foreground italic">The AI's next question will appear here to keep the conversation flowing...</p>
      )}
    </div>
  );
}
