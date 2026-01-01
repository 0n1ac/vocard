// Quiz generation logic with spaced repetition
// Generates multiple-choice questions from vocabulary data

import { Word, QuizQuestion, QuestionType } from "./types";
import { getWordProgress, getWordsNeedingPractice } from "./storage";

/**
 * Generate quiz questions for a vocabulary set
 * Uses spaced repetition to prioritize difficult words
 */
export function generateQuiz(
    words: Word[],
    questionCount: number = 10,
    questionType: QuestionType = "definition"
): QuizQuestion[] {
    if (words.length < 4) {
        throw new Error("Need at least 4 words to generate a quiz");
    }

    // Get words prioritized by difficulty (spaced repetition)
    const wordIds = words.map((w) => w.id);
    const prioritizedIds = getWordsNeedingPractice(wordIds);

    // Select words for the quiz (up to questionCount)
    const selectedWordIds = prioritizedIds.slice(0, Math.min(questionCount, words.length));

    // Generate questions
    const questions: QuizQuestion[] = selectedWordIds.map((wordId, index) => {
        const word = words.find((w) => w.id === wordId)!;
        return generateQuestion(word, words, questionType, `q-${index}`);
    });

    return shuffleArray(questions);
}

/**
 * Generate a single quiz question with distractors
 */
function generateQuestion(
    targetWord: Word,
    allWords: Word[],
    questionType: QuestionType,
    id: string
): QuizQuestion {
    // Get distractors (wrong answers) from other words
    const otherWords = allWords.filter((w) => w.id !== targetWord.id);
    const distractors = selectDistractors(otherWords, 3);

    // Build options based on question type
    let options: string[];
    let correctAnswer: string;

    if (questionType === "definition") {
        // Question: Show term, ask for definition
        correctAnswer = targetWord.definition;
        options = [correctAnswer, ...distractors.map((w) => w.definition)];
    } else {
        // Question: Show definition, ask for term
        correctAnswer = targetWord.term;
        options = [correctAnswer, ...distractors.map((w) => w.term)];
    }

    // Shuffle options and find correct index
    const shuffledOptions = shuffleArray(options);
    const correctIndex = shuffledOptions.indexOf(correctAnswer);

    return {
        id,
        word: targetWord,
        questionType,
        options: shuffledOptions,
        correctIndex,
    };
}

/**
 * Select random distractors, prioritizing words with similar difficulty
 */
function selectDistractors(words: Word[], count: number): Word[] {
    const shuffled = shuffleArray([...words]);
    return shuffled.slice(0, count);
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Calculate quiz score as percentage
 */
export function calculateScore(
    correctCount: number,
    totalCount: number
): number {
    if (totalCount === 0) return 0;
    return Math.round((correctCount / totalCount) * 100);
}

/**
 * Format response time for display
 */
export function formatResponseTime(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get performance rating based on accuracy and speed
 */
export function getPerformanceRating(
    accuracy: number,
    averageResponseTime: number
): "excellent" | "good" | "fair" | "needs-practice" {
    if (accuracy >= 90 && averageResponseTime < 3000) {
        return "excellent";
    } else if (accuracy >= 70) {
        return "good";
    } else if (accuracy >= 50) {
        return "fair";
    }
    return "needs-practice";
}
