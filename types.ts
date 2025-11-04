export interface RealWorldExample {
  example: string;
  explanation: string;
}

export interface CoreConcept {
  title: string;
  explanation: string;
  realWorldExamples: RealWorldExample[];
}

export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface PracticeProblem {
  problemText: string;
  answer: string;
}

export interface PracticeProblems {
  title: string;
  problems: PracticeProblem[];
}

export interface Lesson {
  topic: string;
  introduction: string;
  coreConcept: CoreConcept;
  quiz: Quiz;
  practiceProblems: PracticeProblems;
}

export type ActiveTab = 'lesson' | 'quiz' | 'problems';

export type TopicSource = 'manual' | 'upload' | 'khan';

export type Subject = 'Math' | 'Science';

export interface Mistake {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
}

// Updated types for progress tracking
export interface LessonRecord {
  date: string; // ISO date string (e.g., "2023-10-27")
  topic: string;
  quizScore: number;
  quizTotal: number;
  quizTimeTaken: number; // in seconds
  problemsScore: number;
  problemsTotal: number;
  problemsTimeTaken: number; // in seconds
  mistakes: Mistake[];
}

export interface UserProgress {
  records: LessonRecord[];
}

export interface ProgressStats {
    currentStreak: number;
    longestStreak: number;
    lessonsCompleted: number;
    averageScore: number;
}