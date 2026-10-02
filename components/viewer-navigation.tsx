import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import styles from './viewer-navigation.module.css';

export function ViewerNavigation({ currentView }: { currentView: string }) {
  return (
    <header className={styles.navigation}>
      <Link href="/" className={styles.back} aria-label="뷰 선택으로 돌아가기">
        <ChevronLeft strokeWidth={1.75} />
        <span>VIEWS</span>
      </Link>
      <span className={styles.current}>{currentView}</span>
    </header>
  );
}
