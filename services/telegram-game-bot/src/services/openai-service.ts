import OpenAI from 'openai';
import config from '@/config/config';
import { QuizQuestion } from '@/models/types';
import { v4 as uuidv4 } from 'uuid';

export class OpenAIService {
  private openai: OpenAI;
  private static instance: OpenAIService;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  async generateQuizQuestions(
    gameId: string,
    count: number = 20,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    categories?: string[]
  ): Promise<QuizQuestion[]> {
    try {
      const categoryString = categories && categories.length > 0 
        ? `Focus on these categories: ${categories.join(', ')}. ` 
        : '';

      const prompt = `Generate ${count} multiple-choice trivia questions for a quiz game.
${categoryString}
Difficulty: ${difficulty}

Requirements:
1. Each question should have exactly 4 answer options
2. Only one answer should be correct
3. Questions should be engaging and varied
4. Include a mix of topics if no specific categories are provided
5. Make sure answers are not too obvious or too obscure

Format your response as a JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "category": "Category Name",
    "difficulty": "${difficulty}"
  }
]

The correctAnswer should be the index (0-3) of the correct option in the options array.`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a quiz game master creating engaging and educational trivia questions. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Parse the response
      let questionsData;
      try {
        const parsed = JSON.parse(content);
        // Handle if the response is wrapped in an object
        questionsData = parsed.questions || parsed;
      } catch (error) {
        console.error('Error parsing OpenAI response:', content);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Validate and format questions
      const questions: QuizQuestion[] = [];
      for (let i = 0; i < questionsData.length && i < count; i++) {
        const q = questionsData[i];
        
        // Validate question structure
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
          console.warn(`Invalid question structure at index ${i}:`, q);
          continue;
        }

        questions.push({
          id: uuidv4(),
          gameId,
          questionNumber: i + 1,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          category: q.category || 'General Knowledge',
          difficulty: q.difficulty || difficulty,
          timeLimit: config.games.quiz.defaultTimePerQuestion,
          createdAt: new Date()
        });
      }

      // If we don't have enough valid questions, throw an error
      if (questions.length < count) {
        console.warn(`Only generated ${questions.length} valid questions out of ${count} requested`);
      }

      return questions;
    } catch (error) {
      console.error('Error generating quiz questions:', error);
      throw new Error(`Failed to generate quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateQuizSummary(questions: QuizQuestion[], winners: string[]): Promise<string> {
    try {
      const prompt = `Create a brief, engaging summary of a quiz game that just ended.

Game details:
- Total questions: ${questions.length}
- Categories covered: ${[...new Set(questions.map(q => q.category))].join(', ')}
- Difficulty: ${questions[0]?.difficulty || 'medium'}
- Winners: ${winners.length} player(s)

Generate a fun, congratulatory message that:
1. Celebrates the winners
2. Mentions some interesting questions from the quiz
3. Encourages players to join the next game
4. Keeps it under 200 words

Be enthusiastic and use emojis!`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an enthusiastic quiz game host creating engaging announcements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300
      });

      return response.choices[0]?.message?.content || 'Great game everyone! 🎉';
    } catch (error) {
      console.error('Error generating quiz summary:', error);
      return '🎉 Congratulations to our winners! That was an amazing quiz game! Stay tuned for the next round! 🎮';
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      if (!config.openai.apiKey) {
        return false;
      }

      // Make a simple API call to validate the key
      await this.openai.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI API key validation failed:', error);
      return false;
    }
  }
}

export default OpenAIService;