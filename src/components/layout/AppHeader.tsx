import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
          <MessageSquareText size={28} />
          <span>LinguaLive</span>
        </Link>
        {/* Navigation items can be added here if needed */}
      </div>
    </header>
  );
}
