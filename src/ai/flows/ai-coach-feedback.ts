'use server';

/**
 * @fileOverview Provides AI-driven feedback on pronunciation, clarity, and vocabulary.
 *
 * - aiCoachFeedback - A function that provides feedback on the user's speech.
 * - AiCoachFeedbackInput - The input type for the aiCoachFeedback function.
 * - AiCoachFeedbackOutput - The return type for the aiCoachFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiCoachFeedbackInputSchema = z.object({
  transcription: z.string().describe('The transcribed text of the user\'s speech.'),
  topic: z.string().describe('The topic of the conversation.'),
});
export type AiCoachFeedbackInput = z.infer<typeof AiCoachFeedbackInputSchema>;

const AiCoachFeedbackOutputSchema = z.object({
  pronunciationFeedback: z.string().describe('Feedback on the user\'s pronunciation.'),
  clarityFeedback: z.string().describe('Feedback on the clarity of the user\'s speech.'),
  vocabularyFeedback: z.string().describe('Feedback on the user\'s vocabulary usage.'),
  overallFeedback: z.string().describe('Overall feedback and suggestions for improvement.'),
});
export type AiCoachFeedbackOutput = z.infer<typeof AiCoachFeedbackOutputSchema>;

export async function aiCoachFeedback(input: AiCoachFeedbackInput): Promise<AiCoachFeedbackOutput> {
  return aiCoachFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiCoachFeedbackPrompt',
  input: {schema: AiCoachFeedbackInputSchema},
  output: {schema: AiCoachFeedbackOutputSchema},
  prompt: `You are an AI-powered English language coach providing feedback to the user based on their speech transcription.

  Topic: {{{topic}}}

  Transcription: {{{transcription}}}

  Provide feedback on the following aspects:
  - Pronunciation: Identify any mispronounced words and provide guidance on correct pronunciation.
  - Clarity: Assess the clarity of the user's speech and provide tips for improving articulation and pace.
  - Vocabulary: Evaluate the user's vocabulary usage and suggest alternative words or phrases to enhance their expression.
  - Overall Feedback: Provide overall feedback and actionable steps for improvement.

  Format your response as follows:
  {
    "pronunciationFeedback": "...",
    "clarityFeedback": "...",
    "vocabularyFeedback": "...",
    "overallFeedback": "..."
  }`,
});

const aiCoachFeedbackFlow = ai.defineFlow(
  {
    name: 'aiCoachFeedbackFlow',
    inputSchema: AiCoachFeedbackInputSchema,
    outputSchema: AiCoachFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
