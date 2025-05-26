import type { AiCoachFeedbackOutput } from '@/ai/flows/ai-coach-feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, MicVocal, BookOpenText, Award } from 'lucide-react'; // Replaced BookOpen with BookOpenText, Sparkles with Award

interface AiCoachFeedbackTabProps {
  feedback: AiCoachFeedbackOutput | null;
}

export default function AiCoachFeedbackTab({ feedback }: AiCoachFeedbackTabProps) {
  if (!feedback) {
    return <p className="text-muted-foreground italic text-center py-10">AI coach feedback will appear here after you speak and processing is complete...</p>;
  }

  return (
    <div className="space-y-4">
      <FeedbackCard Icon={MicVocal} title="Pronunciation" content={feedback.pronunciationFeedback} />
      <FeedbackCard Icon={Lightbulb} title="Clarity" content={feedback.clarityFeedback} />
      <FeedbackCard Icon={BookOpenText} title="Vocabulary" content={feedback.vocabularyFeedback} />
      <FeedbackCard Icon={Award} title="Overall Feedback" content={feedback.overallFeedback} isPrimary />
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
    <Card className={isPrimary ? "bg-primary/10 border-primary/50 shadow-md" : "bg-muted/30 border-border/50"}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className={`text-base sm:text-lg font-semibold flex items-center gap-2.5 ${isPrimary ? "text-primary" : "text-foreground"}`}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isPrimary ? "text-primary" : "text-accent"}`} strokeWidth={2}/>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-sm sm:text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">{content}</p>
      </CardContent>
    </Card>
  );
}
