import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  size?: number;
  className?: string;
  text?: string;
}

export default function LoadingIndicator({ size = 24, className, text }: LoadingIndicatorProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className="animate-spin text-primary" size={size} />
      {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
