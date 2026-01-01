"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { vocabularySets, getVocabularySet } from "@/data/vocabulary";
import { updateWordFromQuiz, startStudySession } from "@/lib/storage";
import { QuizQuestion } from "@/lib/types";
import {
    generateQuiz,
    calculateScore,
    formatResponseTime,
    getPerformanceRating,
} from "@/lib/quizGenerator";

interface QuizState {
    questions: QuizQuestion[];
    currentIndex: number;
    selectedAnswer: number | null;
    showResult: boolean;
    results: {
        questionId: string;
        wordId: string;
        correct: boolean;
        responseTime: number;
    }[];
    questionStartTime: number;
    isFinished: boolean;
}

export default function QuizPage() {
    const searchParams = useSearchParams();
    const setId = searchParams.get("set") || vocabularySets[0].id;
    const questionCountParam = parseInt(searchParams.get("count") || "10", 10);

    const [state, setState] = useState<QuizState>({
        questions: [],
        currentIndex: 0,
        selectedAnswer: null,
        showResult: false,
        results: [],
        questionStartTime: Date.now(),
        isFinished: false,
    });

    const [isLoading, setIsLoading] = useState(true);
    const timerRef = useRef<number>(0);

    // Initialize quiz
    useEffect(() => {
        const vocabSet = getVocabularySet(setId);
        if (vocabSet && vocabSet.words.length >= 4) {
            const questions = generateQuiz(vocabSet.words, questionCountParam);
            setState((prev) => ({
                ...prev,
                questions,
                questionStartTime: Date.now(),
            }));
            startStudySession();
        }
        setIsLoading(false);
    }, [setId, questionCountParam]);

    // Update timer display
    useEffect(() => {
        if (state.showResult || state.isFinished) return;

        const interval = setInterval(() => {
            timerRef.current = Date.now() - state.questionStartTime;
        }, 100);

        return () => clearInterval(interval);
    }, [state.questionStartTime, state.showResult, state.isFinished]);

    const currentQuestion = state.questions[state.currentIndex];

    const handleSelectAnswer = useCallback(
        (index: number) => {
            if (state.showResult || !currentQuestion) return;

            const responseTime = Date.now() - state.questionStartTime;
            const correct = index === currentQuestion.correctIndex;

            // Save progress to storage
            updateWordFromQuiz(currentQuestion.word.id, correct, responseTime);

            setState((prev) => ({
                ...prev,
                selectedAnswer: index,
                showResult: true,
                results: [
                    ...prev.results,
                    {
                        questionId: currentQuestion.id,
                        wordId: currentQuestion.word.id,
                        correct,
                        responseTime,
                    },
                ],
            }));
        },
        [state.showResult, state.questionStartTime, currentQuestion]
    );

    const handleNext = useCallback(() => {
        if (state.currentIndex < state.questions.length - 1) {
            setState((prev) => ({
                ...prev,
                currentIndex: prev.currentIndex + 1,
                selectedAnswer: null,
                showResult: false,
                questionStartTime: Date.now(),
            }));
        } else {
            setState((prev) => ({
                ...prev,
                isFinished: true,
            }));
        }
    }, [state.currentIndex, state.questions.length]);

    // Loading state
    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Generating quiz...</div>
            </div>
        );
    }

    // Not enough words
    if (state.questions.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.errorCard}>
                    <h2>Not enough words</h2>
                    <p>Need at least 4 words to generate a quiz.</p>
                    <Link href="/dashboard">
                        <button className={styles.buttonPrimary}>Back to Dashboard</button>
                    </Link>
                </div>
            </div>
        );
    }

    // Results screen
    if (state.isFinished) {
        const correctCount = state.results.filter((r) => r.correct).length;
        const totalCount = state.results.length;
        const accuracy = calculateScore(correctCount, totalCount);
        const avgResponseTime =
            state.results.reduce((sum, r) => sum + r.responseTime, 0) / totalCount;
        const rating = getPerformanceRating(accuracy, avgResponseTime);

        const incorrectWords = state.results
            .filter((r) => !r.correct)
            .map((r) => {
                const q = state.questions.find((q) => q.id === r.questionId);
                return q?.word.term;
            })
            .filter(Boolean);

        return (
            <div className={styles.container}>
                <div className={styles.resultsCard}>
                    <div className={styles.ratingBadge} data-rating={rating}>
                        {rating === "excellent" && "🌟 Excellent!"}
                        {rating === "good" && "👍 Good Job!"}
                        {rating === "fair" && "📚 Keep Practicing"}
                        {rating === "needs-practice" && "💪 Don't Give Up!"}
                    </div>

                    <h1 className={styles.resultsTitle}>Quiz Complete!</h1>

                    <div className={styles.resultsStats}>
                        <div className={styles.statBlock}>
                            <span className={styles.statValue}>{accuracy}%</span>
                            <span className={styles.statLabel}>Accuracy</span>
                        </div>
                        <div className={styles.statBlock}>
                            <span className={styles.statValue}>{correctCount}/{totalCount}</span>
                            <span className={styles.statLabel}>Correct</span>
                        </div>
                        <div className={styles.statBlock}>
                            <span className={styles.statValue}>
                                {formatResponseTime(avgResponseTime)}
                            </span>
                            <span className={styles.statLabel}>Avg Time</span>
                        </div>
                    </div>

                    {incorrectWords.length > 0 && (
                        <div className={styles.incorrectSection}>
                            <h3>Review These Words:</h3>
                            <div className={styles.incorrectWords}>
                                {incorrectWords.map((word, i) => (
                                    <span key={i} className={styles.incorrectWord}>
                                        {word}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.resultsActions}>
                        <button
                            onClick={() => {
                                const vocabSet = getVocabularySet(setId);
                                if (vocabSet) {
                                    const questions = generateQuiz(vocabSet.words, questionCountParam);
                                    setState({
                                        questions,
                                        currentIndex: 0,
                                        selectedAnswer: null,
                                        showResult: false,
                                        results: [],
                                        questionStartTime: Date.now(),
                                        isFinished: false,
                                    });
                                }
                            }}
                            className={styles.buttonSecondary}
                        >
                            Try Again
                        </button>
                        <Link href="/dashboard">
                            <button className={styles.buttonPrimary}>Back to Dashboard</button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Quiz question
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/dashboard" className={styles.backLink}>
                    ← Exit Quiz
                </Link>
                <div className={styles.progressInfo}>
                    <span className={styles.questionCount}>
                        {state.currentIndex + 1} / {state.questions.length}
                    </span>
                </div>
            </header>

            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{
                        width: `${((state.currentIndex + 1) / state.questions.length) * 100}%`,
                    }}
                />
            </div>

            <div className={styles.questionCard}>
                <div className={styles.questionHeader}>
                    <span className={styles.questionType}>
                        {currentQuestion.questionType === "definition"
                            ? "What does this word mean?"
                            : "Which word matches this definition?"}
                    </span>
                </div>

                <h2 className={styles.questionText}>
                    {currentQuestion.questionType === "definition"
                        ? currentQuestion.word.term
                        : currentQuestion.word.definition}
                </h2>

                {currentQuestion.questionType === "definition" && (
                    <p className={styles.pronunciation}>
                        {currentQuestion.word.pronunciation}
                    </p>
                )}

                <div className={styles.options}>
                    {currentQuestion.options.map((option, index) => {
                        let optionClass = styles.option;

                        if (state.showResult) {
                            if (index === currentQuestion.correctIndex) {
                                optionClass = `${styles.option} ${styles.correct}`;
                            } else if (
                                index === state.selectedAnswer &&
                                index !== currentQuestion.correctIndex
                            ) {
                                optionClass = `${styles.option} ${styles.incorrect}`;
                            } else {
                                optionClass = `${styles.option} ${styles.disabled}`;
                            }
                        } else if (state.selectedAnswer === index) {
                            optionClass = `${styles.option} ${styles.selected}`;
                        }

                        return (
                            <button
                                key={index}
                                className={optionClass}
                                onClick={() => handleSelectAnswer(index)}
                                disabled={state.showResult}
                            >
                                <span className={styles.optionLetter}>
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span className={styles.optionText}>{option}</span>
                            </button>
                        );
                    })}
                </div>

                {state.showResult && (
                    <div className={styles.resultFeedback}>
                        {state.selectedAnswer === currentQuestion.correctIndex ? (
                            <div className={styles.feedbackCorrect}>
                                <span className={styles.feedbackIcon}>✓</span>
                                <span>Correct!</span>
                                <span className={styles.responseTime}>
                                    {formatResponseTime(
                                        state.results[state.results.length - 1].responseTime
                                    )}
                                </span>
                            </div>
                        ) : (
                            <div className={styles.feedbackIncorrect}>
                                <span className={styles.feedbackIcon}>✗</span>
                                <span>Incorrect</span>
                            </div>
                        )}

                        <button onClick={handleNext} className={styles.nextButton}>
                            {state.currentIndex < state.questions.length - 1
                                ? "Next Question"
                                : "See Results"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
