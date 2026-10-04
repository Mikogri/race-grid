import { useState } from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  src: string | null | undefined;
  /** Used for the initials fallback. */
  name: string;
  /** Team colour ring. */
  ring?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Round portrait (driver headshot). Falls back to initials when there is no image or it fails to load. */
export function Avatar({ src, name, size = 'md', ring }: AvatarProps) {
  const [failed, setFailed] = useState(false);
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
      {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials}
    </span>
  );
}
