'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight, MessageCircleQuestion } from 'lucide-react';
import TopicChip from '@/components/shared/TopicChip';

const suggestedTopics = ['Interviews', 'Travel', 'Movies', 'Hobbies', 'Daily Life', 'Technology', 'Food', 'Books'];

export default function TopicSelector() {
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const router = useRouter();

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setCustomTopic('');
  };

  const handleCustomTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTopic(e.target.value);
    setSelectedTopic('');
  };

  const handleSubmit = () => {
    const topicToSubmit = customTopic || selectedTopic;
    if (topicToSubmit) {
      router.push(`/conversation?topic=${encodeURIComponent(topicToSubmit)}`);
    }
  };

  return (
    <Card className="w-full max-w-xl shadow-xl rounded-xl border-border/70">
      <CardHeader className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2 text-primary">
          <MessageCircleQuestion size={32} strokeWidth={2} />
          <CardTitle className="text-2xl sm:text-3xl font-bold">Choose Your Topic</CardTitle>
        </div>
        <CardDescription className="text-base text-muted-foreground">
          What would you like to talk about today? Select a suggestion or enter your own.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6 sm:p-8 pt-0">
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground">Suggested Topics:</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {suggestedTopics.map((topic) => (
              <TopicChip
                key={topic}
                topic={topic}
                isSelected={selectedTopic === topic}
                onSelect={() => handleTopicSelect(topic)}
              />
            ))}
          </div>
        </div>
        <div className="pt-2">
          <label htmlFor="customTopic" className="block mb-2 text-sm font-medium text-foreground">
            Or enter your own topic:
          </label>
          <Input
            id="customTopic"
            type="text"
            value={customTopic}
            onChange={handleCustomTopicChange}
            placeholder="e.g., My favorite book, Future of AI"
            className="text-base"
          />
        </div>
      </CardContent>
      <CardFooter className="p-6 sm:p-8 pt-0">
        <Button 
          onClick={handleSubmit} 
          disabled={!customTopic && !selectedTopic}
          className="w-full text-base py-3 h-auto"
          size="lg"
          variant="primary"
        >
          Start Conversation <ArrowRight className="ml-2" size={18} />
        </Button>
      </CardFooter>
    </Card>
  );
}
