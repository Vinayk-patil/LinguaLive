'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight } from 'lucide-react';
import TopicChip from '@/components/shared/TopicChip';

const suggestedTopics = ['Interviews', 'Travel', 'Movies', 'Hobbies', 'Daily Life', 'Technology'];

export default function TopicSelector() {
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const router = useRouter();

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setCustomTopic(''); // Clear custom input if a chip is selected
  };

  const handleCustomTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTopic(e.target.value);
    setSelectedTopic(''); // Clear chip selection if typing custom topic
  };

  const handleSubmit = () => {
    const topicToSubmit = customTopic || selectedTopic;
    if (topicToSubmit) {
      router.push(`/conversation?topic=${encodeURIComponent(topicToSubmit)}`);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2 text-primary">
          <Sparkles size={28} />
          <CardTitle className="text-2xl">Choose Your Topic</CardTitle>
        </div>
        <CardDescription>
          What would you like to talk about today? Select a suggestion or enter your own.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Suggested Topics:</h3>
          <div className="flex flex-wrap gap-2">
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
        <div>
          <label htmlFor="customTopic" className="block mb-2 text-sm font-medium text-muted-foreground">
            Or enter your own topic:
          </label>
          <Input
            id="customTopic"
            type="text"
            value={customTopic}
            onChange={handleCustomTopicChange}
            placeholder="e.g., My favorite book"
            className="bg-background"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={!customTopic && !selectedTopic}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Start Conversation <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
