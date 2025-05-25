import { config } from 'dotenv';
config();

import '@/ai/flows/grammar-correction.ts';
import '@/ai/flows/ai-coach-feedback.ts';
import '@/ai/flows/ai-question-generator.ts';
import '@/ai/flows/generate-ideal-answer-flow.ts';
