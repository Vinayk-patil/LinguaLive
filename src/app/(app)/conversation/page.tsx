'use client';
import ConversationRoom from '@/components/conversation/ConversationRoom';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

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
    <div className="w-full h-full p-1 md:p-0 space-y-4 md:space-y-6">
      <Skeleton className="h-10 w-1/2 md:w-1/3 mb-2 md:mb-4 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="rounded-xl shadow-lg">
          <Skeleton className="aspect-video w-full rounded-t-xl" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-8 w-3/4 rounded-md" />
          </div>
        </Card>
        <Card className="rounded-xl shadow-lg">
           <div className="p-4 border-b">
            <div className="flex space-x-1">
                <Skeleton className="h-9 w-1/5 rounded-md" />
                <Skeleton className="h-9 w-1/5 rounded-md" />
                <Skeleton className="h-9 w-1/5 rounded-md" />
                <Skeleton className="h-9 w-1/5 rounded-md" />
                <Skeleton className="h-9 w-1/5 rounded-md" />
            </div>
           </div>
           <div className="p-4">
            <Skeleton className="h-64 w-full rounded-md" />
           </div>
        </Card>
      </div>
      <Card className="rounded-xl shadow-lg p-4 md:p-6">
        <Skeleton className="h-8 w-1/4 mb-3 rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
      </Card>
    </div>
  )
}
