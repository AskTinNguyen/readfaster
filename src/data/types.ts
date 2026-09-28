export interface Question {
  prompt: string;
  options: string[];
  /** Index into `options` of the correct answer. */
  answer: number;
}

export type Level = 'easy' | 'medium' | 'hard';

export interface Passage {
  id: string;
  title: string;
  topic: string;
  level: Level;
  /** Plain text. Paragraphs are separated by a blank line. */
  text: string;
  questions: Question[];
}
