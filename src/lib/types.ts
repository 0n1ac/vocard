// Shared TypeScript interfaces for the vocabulary learning service
// Extensible architecture ready for Firebase/Supabase integration

// ==========================================
// VOCABULARY TYPES
// ==========================================

export interface Word {
    id: string;
    term: string;
    pronunciation: string;
    definition: string;
    example: string;
    difficulty: 1 | 2 | 3; // 1: Easy, 2: Medium, 3: Hard
    category: string;
}

export interface VocabularySet {
    id: string;
    title: string;
    description: string;
    words: Word[];
}

// ==========================================
// USER PROGRESS TYPES
// ==========================================

export type MasteryStatus = "new" | "learning" | "mastered";

export interface QuizAttempt {
    date: string; // ISO date string
    correct: boolean;
    responseTime: number; // in milliseconds
}

export interface WordProgress {
    wordId: string;
    status: MasteryStatus;
    correctCount: number;
    incorrectCount: number;
    lastStudied: string | null; // ISO date string
    averageResponseTime: number | null; // in milliseconds
    quizAttempts: QuizAttempt[];
}

export interface UserProgress {
    words: Record<string, WordProgress>;
    lastStudySession: string | null;
    totalStudySessions: number;
}

// ==========================================
// QUIZ TYPES
// ==========================================

export type QuestionType = "definition" | "term";

export interface QuizQuestion {
    id: string;
    word: Word;
    questionType: QuestionType;
    options: string[];
    correctIndex: number;
}

export interface QuizResult {
    questionId: string;
    wordId: string;
    correct: boolean;
    responseTime: number;
    selectedIndex: number;
}

export interface QuizSession {
    setId: string;
    questions: QuizQuestion[];
    results: QuizResult[];
    startTime: string;
    endTime: string | null;
}

// ==========================================
// STORAGE PROVIDER INTERFACE
// ==========================================

/**
 * StorageProvider interface for abstracting data persistence.
 * Implement this interface for different backends:
 * - LocalStorageProvider (current)
 * - FirebaseProvider (future)
 * - SupabaseProvider (future)
 */
export interface StorageProvider {
    // User Progress
    getUserProgress(): Promise<UserProgress>;
    saveUserProgress(progress: UserProgress): Promise<void>;
    getWordProgress(wordId: string): Promise<WordProgress>;

    // Flashcard Updates
    updateWordFromFlashcard(wordId: string, remembered: boolean): Promise<void>;

    // Quiz Updates
    updateWordFromQuiz(
        wordId: string,
        correct: boolean,
        responseTime: number
    ): Promise<void>;

    // Statistics
    getSetStatistics(wordIds: string[]): Promise<{
        mastered: number;
        learning: number;
        new: number;
        total: number;
    }>;

    // Spaced Repetition
    getWordsNeedingPractice(wordIds: string[]): Promise<string[]>;

    // Session Management
    startStudySession(): Promise<void>;

    // Clear Data
    clearAllProgress(): Promise<void>;
}

// ==========================================
// PROVIDER CONTEXT TYPE
// ==========================================

export interface StorageContextType {
    provider: StorageProvider;
    isLoading: boolean;
}
