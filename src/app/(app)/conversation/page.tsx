'use client';
import ConversationRoom from '@/components/conversation/ConversationRoom';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function ConversationPageContent() {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') || 'General Conversation';

  return <ConversationRoom topic={topic} />;
}

export default function ConversationPage() {
  return (
    <Suspense fallback={<ConversationPageSkeleton />}>
      <ConversationPageContent />
    </Suspense>
  );
}


function ConversationPageSkeleton() {
  return (
    <div className="w-full h-full p-4 md:p-6 space-y-6">
      <Skeleton className="h-8 w-1/3 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
