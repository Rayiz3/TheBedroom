import Link from 'next/link';
import { BedDouble, SwatchBook, Palette } from 'lucide-react';

import styles from './page.module.css';

const views = [
  {
    href: '/configurator',
    title: 'Configurator',
    icon: Palette,
    variant: styles.room,
  },
  {
    href: '/room',
    title: 'Room View',
    icon: BedDouble,
    variant: styles.room,
  },
  {
    href: '/texture',
    title: 'Texture View',
    icon: SwatchBook,
    variant: styles.texture,
  },
] as const;

export default function Home() {
  return (
    <main className={styles.launcher}>
      <nav className={styles.grid} aria-label="뷰 선택">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <Link
              key={view.href}
              href={view.href}
              className={`${styles.card} ${view.variant}`}
            >
              <Icon
                className={styles.icon}
                strokeWidth={1.25}
                aria-hidden="true"
              />
              <h2>{view.title}</h2>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
