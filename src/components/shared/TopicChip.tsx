import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TopicChipProps {
  topic: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function TopicChip({ topic, isSelected, onSelect }: TopicChipProps) {
  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      size="sm"
      onClick={onSelect}
      className={cn(
        "rounded-full transition-all duration-200 ease-in-out",
        isSelected ? "bg-primary text-primary-foreground shadow-md" : "bg-card hover:bg-muted",
      )}
    >
      {topic}
    </Button>
  );
}
