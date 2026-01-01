// LocalStorage utility for persisting user progress
// Handles word mastery status, quiz history, and statistics

export type MasteryStatus = "new" | "learning" | "mastered";

export interface WordProgress {
    wordId: string;
    status: MasteryStatus;
    correctCount: number;
    incorrectCount: number;
    lastStudied: string | null; // ISO date string
    averageResponseTime: number | null; // in milliseconds
    quizAttempts: QuizAttempt[];
}

export interface QuizAttempt {
    date: string; // ISO date string
    correct: boolean;
    responseTime: number; // in milliseconds
}

export interface UserProgress {
    words: Record<string, WordProgress>;
    lastStudySession: string | null;
    totalStudySessions: number;
}

const STORAGE_KEY = "vocard_user_progress";

// Initialize default progress for a word
const createDefaultWordProgress = (wordId: string): WordProgress => ({
    wordId,
    status: "new",
    correctCount: 0,
    incorrectCount: 0,
    lastStudied: null,
    averageResponseTime: null,
    quizAttempts: [],
});

// Initialize empty user progress
const createDefaultUserProgress = (): UserProgress => ({
    words: {},
    lastStudySession: null,
    totalStudySessions: 0,
});

// Get user progress from localStorage
export const getUserProgress = (): UserProgress => {
    if (typeof window === "undefined") {
        return createDefaultUserProgress();
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored) as UserProgress;
        }
    } catch (error) {
        console.error("Error reading progress from localStorage:", error);
    }

    return createDefaultUserProgress();
};

// Save user progress to localStorage
export const saveUserProgress = (progress: UserProgress): void => {
    if (typeof window === "undefined") return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
        console.error("Error saving progress to localStorage:", error);
    }
};

// Get progress for a specific word
export const getWordProgress = (wordId: string): WordProgress => {
    const progress = getUserProgress();
    return progress.words[wordId] || createDefaultWordProgress(wordId);
};

// Update progress after a flashcard study session
export const updateWordFromFlashcard = (
    wordId: string,
    remembered: boolean
): void => {
    const progress = getUserProgress();
    const wordProgress = progress.words[wordId] || createDefaultWordProgress(wordId);

    // Update counts
    if (remembered) {
        wordProgress.correctCount += 1;
    } else {
        wordProgress.incorrectCount += 1;
    }

    // Update mastery status based on performance
    const totalAttempts = wordProgress.correctCount + wordProgress.incorrectCount;
    const correctRate = wordProgress.correctCount / totalAttempts;

    if (correctRate >= 0.8 && totalAttempts >= 3) {
        wordProgress.status = "mastered";
    } else if (totalAttempts > 0) {
        wordProgress.status = "learning";
    }

    wordProgress.lastStudied = new Date().toISOString();

    // Save updated progress
    progress.words[wordId] = wordProgress;
    saveUserProgress(progress);
};

// Update progress after a quiz attempt
export const updateWordFromQuiz = (
    wordId: string,
    correct: boolean,
    responseTime: number
): void => {
    const progress = getUserProgress();
    const wordProgress = progress.words[wordId] || createDefaultWordProgress(wordId);

    // Add quiz attempt
    const attempt: QuizAttempt = {
        date: new Date().toISOString(),
        correct,
        responseTime,
    };
    wordProgress.quizAttempts.push(attempt);

    // Update counts
    if (correct) {
        wordProgress.correctCount += 1;
    } else {
        wordProgress.incorrectCount += 1;
    }

    // Update average response time
    const totalResponseTime = wordProgress.quizAttempts.reduce(
        (sum, a) => sum + a.responseTime,
        0
    );
    wordProgress.averageResponseTime =
        totalResponseTime / wordProgress.quizAttempts.length;

    // Update mastery status
    const totalAttempts = wordProgress.correctCount + wordProgress.incorrectCount;
    const correctRate = wordProgress.correctCount / totalAttempts;

    if (correctRate >= 0.8 && totalAttempts >= 3) {
        wordProgress.status = "mastered";
    } else if (totalAttempts > 0) {
        wordProgress.status = "learning";
    }

    wordProgress.lastStudied = new Date().toISOString();

    // Save updated progress
    progress.words[wordId] = wordProgress;
    saveUserProgress(progress);
};

// Start a new study session
export const startStudySession = (): void => {
    const progress = getUserProgress();
    progress.lastStudySession = new Date().toISOString();
    progress.totalStudySessions += 1;
    saveUserProgress(progress);
};

// Get statistics for a vocabulary set
export const getSetStatistics = (wordIds: string[]) => {
    const progress = getUserProgress();

    let mastered = 0;
    let learning = 0;
    let newWords = 0;

    for (const wordId of wordIds) {
        const wordProgress = progress.words[wordId];
        if (!wordProgress || wordProgress.status === "new") {
            newWords += 1;
        } else if (wordProgress.status === "learning") {
            learning += 1;
        } else if (wordProgress.status === "mastered") {
            mastered += 1;
        }
    }

    return { mastered, learning, new: newWords, total: wordIds.length };
};

// Get words that need more practice (for quiz prioritization)
export const getWordsNeedingPractice = (wordIds: string[]): string[] => {
    const progress = getUserProgress();

    // Sort words by priority:
    // 1. Words with low correct rate
    // 2. Words not studied recently
    // 3. New words
    return wordIds
        .map((id) => {
            const wordProgress = progress.words[id];
            if (!wordProgress) {
                return { id, priority: 50 }; // New words get medium priority
            }

            const totalAttempts =
                wordProgress.correctCount + wordProgress.incorrectCount;
            if (totalAttempts === 0) {
                return { id, priority: 50 };
            }

            const correctRate = wordProgress.correctCount / totalAttempts;
            // Lower correct rate = higher priority
            // Not studied recently = higher priority
            const daysSinceStudied = wordProgress.lastStudied
                ? (Date.now() - new Date(wordProgress.lastStudied).getTime()) /
                (1000 * 60 * 60 * 24)
                : 30;

            const priority = (1 - correctRate) * 100 + daysSinceStudied;
            return { id, priority };
        })
        .sort((a, b) => b.priority - a.priority)
        .map((item) => item.id);
};

// Clear all progress data
export const clearAllProgress = (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
};
