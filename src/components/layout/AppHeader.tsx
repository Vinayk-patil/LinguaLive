import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="bg-card border-b border-border/60 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          <MessageSquareText size={26} strokeWidth={2.25} />
          <span className="font-mono tracking-tight">LinguaLive</span>
        </Link>
        {/* Navigation items can be added here if needed */}
        {/* Example: <Button variant="ghost">Sign In</Button> */}
      </div>
    </header>
  );
}
