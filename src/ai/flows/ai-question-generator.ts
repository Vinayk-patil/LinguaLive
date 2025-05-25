'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating the next question in a conversation.
 *
 * - generateNextQuestion - A function that generates the next question based on the topic and user's response.
 * - GenerateNextQuestionInput - The input type for the generateNextQuestion function.
 * - GenerateNextQuestionOutput - The return type for the generateNextQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNextQuestionInputSchema = z.object({
  topic: z.string().describe('The topic of the conversation.'),
  userResponse: z.string().describe('The user\'s previous response.'),
});
export type GenerateNextQuestionInput = z.infer<typeof GenerateNextQuestionInputSchema>;

const GenerateNextQuestionOutputSchema = z.object({
  nextQuestion: z.string().describe('The next question to ask the user.'),
});
export type GenerateNextQuestionOutput = z.infer<typeof GenerateNextQuestionOutputSchema>;

export async function generateNextQuestion(input: GenerateNextQuestionInput): Promise<GenerateNextQuestionOutput> {
  return generateNextQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNextQuestionPrompt',
  input: {schema: GenerateNextQuestionInputSchema},
  output: {schema: GenerateNextQuestionOutputSchema},
  prompt: `You are an AI conversation partner helping a user practice their spoken english.

The user has selected the topic: {{{topic}}}

The user's previous response was: {{{userResponse}}}

Generate the next question to ask the user to keep the conversation flowing naturally.  The question should be engaging and relevant to the topic and the user's response.

Next Question: `,
});

const generateNextQuestionFlow = ai.defineFlow(
  {
    name: 'generateNextQuestionFlow',
    inputSchema: GenerateNextQuestionInputSchema,
    outputSchema: GenerateNextQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
