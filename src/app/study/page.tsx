"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import { vocabularySets, getVocabularySet, Word } from "@/data/vocabulary";
import {
    updateWordFromFlashcard,
    getWordProgress,
    startStudySession,
    MasteryStatus,
} from "@/lib/storage";

interface StudyResult {
    wordId: string;
    term: string;
    remembered: boolean;
}

export default function StudyPage() {
    const searchParams = useSearchParams();
    const setId = searchParams.get("set") || vocabularySets[0].id;

    const [words, setWords] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState<StudyResult[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
    const [wordStatuses, setWordStatuses] = useState<Record<string, MasteryStatus>>({});

    // Load vocabulary set and word statuses
    useEffect(() => {
        const vocabSet = getVocabularySet(setId);
        if (vocabSet) {
            setWords(vocabSet.words);
            // Load current mastery status for each word
            const statuses: Record<string, MasteryStatus> = {};
            vocabSet.words.forEach((word) => {
                const progress = getWordProgress(word.id);
                statuses[word.id] = progress.status;
            });
            setWordStatuses(statuses);
        }
        startStudySession();
    }, [setId]);

    const currentWord = words[currentIndex];

    const handleFlip = () => {
        if (!isAnimating) {
            setIsFlipped(!isFlipped);
        }
    };

    const handleAnswer = useCallback(
        (remembered: boolean) => {
            if (isAnimating || !currentWord) return;

            // Save progress
            updateWordFromFlashcard(currentWord.id, remembered);

            // Update local status
            setWordStatuses((prev) => ({
                ...prev,
                [currentWord.id]: remembered ? "mastered" : "learning",
            }));

            // Track result
            setResults((prev) => [
                ...prev,
                { wordId: currentWord.id, term: currentWord.term, remembered },
            ]);

            // Animate transition
            setIsAnimating(true);
            setSlideDirection(remembered ? "right" : "left");

            setTimeout(() => {
                setIsFlipped(false);
                setSlideDirection(null);

                if (currentIndex < words.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                } else {
                    setIsFinished(true);
                }
                setIsAnimating(false);
            }, 400);
        },
        [currentWord, currentIndex, words.length, isAnimating]
    );

    // Summary statistics
    const rememberedCount = results.filter((r) => r.remembered).length;
    const forgotCount = results.filter((r) => !r.remembered).length;

    if (words.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading vocabulary...</div>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className={styles.container}>
                <div className={styles.summaryCard}>
                    <h1 className={styles.summaryTitle}>Session Complete! 🎉</h1>
                    <p className={styles.summarySubtitle}>
                        You&apos;ve reviewed all {words.length} cards in this set.
                    </p>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>{rememberedCount}</span>
                            <span className={styles.statLabel}>Remembered</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>{forgotCount}</span>
                            <span className={styles.statLabel}>Need Practice</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>
                                {words.length > 0
                                    ? Math.round((rememberedCount / words.length) * 100)
                                    : 0}
                                %
                            </span>
                            <span className={styles.statLabel}>Accuracy</span>
                        </div>
                    </div>

                    {forgotCount > 0 && (
                        <div className={styles.reviewSection}>
                            <h3 className={styles.reviewTitle}>Words to Review</h3>
                            <div className={styles.reviewWords}>
                                {results
                                    .filter((r) => !r.remembered)
                                    .map((r) => (
                                        <span key={r.wordId} className={styles.reviewWord}>
                                            {r.term}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.summaryActions}>
                        <button
                            onClick={() => {
                                setCurrentIndex(0);
                                setIsFinished(false);
                                setResults([]);
                                setIsFlipped(false);
                            }}
                            className={styles.buttonSecondary}
                        >
                            Study Again
                        </button>
                        <Link href="/dashboard">
                            <button className={styles.buttonPrimary}>Back to Dashboard</button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const currentStatus = wordStatuses[currentWord?.id] || "new";

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/dashboard" className={styles.backLink}>
                    ← Back
                </Link>
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                        />
                    </div>
                    <span className={styles.progressText}>
                        {currentIndex + 1} / {words.length}
                    </span>
                </div>
            </header>

            <div
                className={`${styles.cardScene} ${slideDirection === "left" ? styles.slideLeft : ""} ${slideDirection === "right" ? styles.slideRight : ""}`}
                onClick={handleFlip}
            >
                <div className={`${styles.card} ${isFlipped ? styles.cardFlipped : ""}`}>
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                        <div
                            className={`${styles.statusBadge} ${styles[`status${currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}`]}`}
                        >
                            {currentStatus === "new"
                                ? "New"
                                : currentStatus === "learning"
                                    ? "Learning"
                                    : "Mastered"}
                        </div>
                        <h2 className={styles.term}>{currentWord.term}</h2>
                        <p className={styles.pronunciation}>{currentWord.pronunciation}</p>
                        <span className={styles.category}>{currentWord.category}</span>
                        <p className={styles.flipHint}>Tap to flip</p>
                    </div>
                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                        <p className={styles.definition}>{currentWord.definition}</p>
                        <p className={styles.example}>&quot;{currentWord.example}&quot;</p>
                    </div>
                </div>
            </div>

            <div className={styles.controls}>
                <button
                    className={`${styles.controlButton} ${styles.buttonForgot}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAnswer(false);
                    }}
                    disabled={isAnimating}
                >
                    <span className={styles.buttonIcon}>✕</span>
                    Forgot
                </button>
                <button
                    className={`${styles.controlButton} ${styles.buttonRemember}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAnswer(true);
                    }}
                    disabled={isAnimating}
                >
                    <span className={styles.buttonIcon}>✓</span>
                    Remembered
                </button>
            </div>
        </div>
    );
}
