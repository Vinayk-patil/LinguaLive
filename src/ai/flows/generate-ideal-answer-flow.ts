'use server';
/**
 * @fileOverview Generates an ideal or sample answer to a given question.
 *
 * - generateIdealAnswer - A function that generates a sample answer.
 * - GenerateIdealAnswerInput - The input type for the generateIdealAnswer function.
 * - GenerateIdealAnswerOutput - The return type for the generateIdealAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateIdealAnswerInputSchema = z.object({
  question: z.string().describe('The question for which an ideal answer is needed.'),
  topic: z.string().describe('The general topic of the conversation for context.'),
});
export type GenerateIdealAnswerInput = z.infer<typeof GenerateIdealAnswerInputSchema>;

const GenerateIdealAnswerOutputSchema = z.object({
  idealAnswer: z.string().describe('A well-structured, grammatically correct, and fluent sample answer to the question.'),
});
export type GenerateIdealAnswerOutput = z.infer<typeof GenerateIdealAnswerOutputSchema>;

export async function generateIdealAnswer(input: GenerateIdealAnswerInput): Promise<GenerateIdealAnswerOutput> {
  return generateIdealAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateIdealAnswerPrompt',
  input: {schema: GenerateIdealAnswerInputSchema},
  output: {schema: GenerateIdealAnswerOutputSchema},
  prompt: `You are an English language coach. A user is practicing their spoken English.
The current conversation topic is: {{{topic}}}
The user has just been asked the following question: "{{{question}}}"

Please provide an ideal, well-structured, grammatically correct, and fluent sample answer to this question.
The answer should be natural and conversational, suitable for someone learning English.
It should demonstrate good vocabulary usage and sentence structure.
Keep the answer concise but complete, typically a few sentences long.
Do not ask a follow-up question in your ideal answer. Just provide the sample answer itself.
`,
});

const generateIdealAnswerFlow = ai.defineFlow(
  {
    name: 'generateIdealAnswerFlow',
    inputSchema: GenerateIdealAnswerInputSchema,
    outputSchema: GenerateIdealAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
