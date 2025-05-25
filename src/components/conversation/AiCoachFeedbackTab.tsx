import type { AiCoachFeedbackOutput } from '@/ai/flows/ai-coach-feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, MicVocal, BookOpen, Sparkles } from 'lucide-react';

interface AiCoachFeedbackTabProps {
  feedback: AiCoachFeedbackOutput | null;
}

export default function AiCoachFeedbackTab({ feedback }: AiCoachFeedbackTabProps) {
  if (!feedback) {
    return <p className="text-muted-foreground italic">AI coach feedback will appear here after you speak...</p>;
  }

  return (
    <div className="space-y-4">
      <FeedbackCard Icon={MicVocal} title="Pronunciation" content={feedback.pronunciationFeedback} />
      <FeedbackCard Icon={Lightbulb} title="Clarity" content={feedback.clarityFeedback} />
      <FeedbackCard Icon={BookOpen} title="Vocabulary" content={feedback.vocabularyFeedback} />
      <FeedbackCard Icon={Sparkles} title="Overall Feedback" content={feedback.overallFeedback} isPrimary />
    </div>
  );
}

interface FeedbackCardProps {
  Icon: React.ElementType;
  title: string;
  content: string;
  isPrimary?: boolean;
}

function FeedbackCard({ Icon, title, content, isPrimary = false }: FeedbackCardProps) {
  return (
    <Card className={isPrimary ? "bg-primary/10 border-primary" : "bg-muted/50"}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-md font-semibold flex items-center gap-2 ${isPrimary ? "text-primary" : ""}`}>
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  );
}
