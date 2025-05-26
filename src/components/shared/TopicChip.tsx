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
      variant={isSelected ? "primary" : "outline"}
      size="sm"
      onClick={onSelect}
      className={cn(
        "rounded-full transition-all duration-200 ease-in-out text-sm font-medium h-9 px-4",
        isSelected 
          ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
          : "bg-card border-border/80 text-foreground hover:bg-muted hover:border-border",
      )}
    >
      {topic}
    </Button>
  );
}
