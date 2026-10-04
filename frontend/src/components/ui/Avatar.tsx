import { Headshot } from './Headshot';
import styles from './Avatar.module.css';

interface AvatarProps {
  src: string | null | undefined;
  /** Used for the initials fallback. */
  name: string;
  /** Team colour ring. */
  ring?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Round portrait (driver headshot, the cached sharp copy when there is one). Falls back to initials. */
export function Avatar({ src, name, size = 'md', ring }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={`${styles.avatar} ${styles[size]}`}
      style={ring ? { borderColor: ring } : undefined}
      aria-hidden="true"
    >
      <Headshot url={src} fallback={initials} />
    </span>
  );
}
