"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { vocabularySets, VocabularySet } from "@/data/vocabulary";
import { getSetStatistics } from "@/lib/storage";

interface SetWithStats extends VocabularySet {
    stats: {
        mastered: number;
        learning: number;
        new: number;
        total: number;
    };
}

export default function Dashboard() {
    const [setsWithStats, setSetsWithStats] = useState<SetWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load vocabulary sets with their statistics
        const loadStats = () => {
            const enrichedSets = vocabularySets.map((set) => {
                const wordIds = set.words.map((w) => w.id);
                const stats = getSetStatistics(wordIds);
                return { ...set, stats };
            });
            setSetsWithStats(enrichedSets);
            setIsLoading(false);
        };

        loadStats();
    }, []);

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    // Calculate overall stats
    const totalWords = setsWithStats.reduce((sum, set) => sum + set.stats.total, 0);
    const totalMastered = setsWithStats.reduce(
        (sum, set) => sum + set.stats.mastered,
        0
    );
    const totalLearning = setsWithStats.reduce(
        (sum, set) => sum + set.stats.learning,
        0
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <Link href="/" className={styles.logo}>
                        Vocard
                    </Link>
                    <h1 className={styles.title}>Your Vocabulary</h1>
                </div>
            </header>

            {/* Overall Progress */}
            <div className={styles.overallProgress}>
                <div className={styles.progressStat}>
                    <span className={styles.progressNumber}>{totalMastered}</span>
                    <span className={styles.progressLabel}>Mastered</span>
                </div>
                <div className={styles.progressStat}>
                    <span className={styles.progressNumber}>{totalLearning}</span>
                    <span className={styles.progressLabel}>Learning</span>
                </div>
                <div className={styles.progressStat}>
                    <span className={styles.progressNumber}>{totalWords}</span>
                    <span className={styles.progressLabel}>Total Words</span>
                </div>
            </div>

            <div className={styles.grid}>
                {setsWithStats.map((set) => {
                    const progressPercent =
                        set.stats.total > 0
                            ? Math.round((set.stats.mastered / set.stats.total) * 100)
                            : 0;

                    return (
                        <div key={set.id} className={styles.card}>
                            <div className={styles.cardContent}>
                                <h2 className={styles.cardTitle}>{set.title}</h2>
                                <p className={styles.cardDescription}>{set.description}</p>

                                <div className={styles.cardStats}>
                                    <div className={styles.progressBarContainer}>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        <span className={styles.progressPercent}>
                                            {progressPercent}%
                                        </span>
                                    </div>

                                    <div className={styles.statBadges}>
                                        <span className={styles.badgeMastered}>
                                            {set.stats.mastered} mastered
                                        </span>
                                        <span className={styles.badgeLearning}>
                                            {set.stats.learning} learning
                                        </span>
                                        <span className={styles.badgeNew}>
                                            {set.stats.new} new
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardActions}>
                                <Link
                                    href={`/study?set=${set.id}`}
                                    className={styles.buttonPrimary}
                                >
                                    Study Flashcards
                                </Link>
                                <Link
                                    href={`/quiz?set=${set.id}`}
                                    className={styles.buttonOutline}
                                >
                                    Take Quiz
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
