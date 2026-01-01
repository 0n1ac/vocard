import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>
          Master English Vocabulary
        </h1>
        <p className={styles.subtitle}>
          The simple, beautiful way to expand your vocabulary.
          <br />
          Experience a focused study environment designed for retention.
        </p>
        <Link href="/dashboard">
          <button className={styles.ctaButton}>
            Get Started
          </button>
        </Link>
      </div>
    </main>
  );
}
