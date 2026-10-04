import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { squareFrame } from '../lib/trackFrame';
import { TrackOutline } from './ui/TrackOutline';
import styles from './CircuitCard.module.css';

export interface CardFact {
  label: string;
  value: ReactNode;
}

interface CircuitCardProps {
  to: string;
  outline: string | null;
  /** Small line above the title, e.g. "Round 7" or country. */
  eyebrow: ReactNode;
  /** Country flag image (OpenF1 country_flag) shown before the eyebrow. */
  flag?: string | null;
  badge?: ReactNode;
  title: string;
  subtitle: ReactNode;
  /** Exactly three facts keep every card the same shape. */
  facts: [CardFact, CardFact, CardFact];
  /** Buttons at the bottom. With actions the card is no longer one big link; the title links instead. */
  actions?: ReactNode;
  /** Colour of the circuit line. */
  accent?: string;
  muted?: boolean;
}

/**
 * Card used by Calendar, Tracks and the replay list. Every card has the same anatomy (header, outline tile, title,
 * three facts, optional actions), and the outline is rotated to fill its tile the same way on every circuit.
 */
export function CircuitCard({ to, outline, eyebrow, flag, badge, title, subtitle, facts, actions, accent, muted = false }: CircuitCardProps) {
  const frame = outline ? squareFrame(outline) : null;
  const className = [styles.card, muted ? styles.muted : '', actions ? styles.static : ''].filter(Boolean).join(' ');
  const body = (
    <>
      <div className={styles.top}>
        <span className={styles.eyebrow}>
          {flag && <img src={flag} alt="" className={styles.flag} loading="lazy" onError={(e) => (e.currentTarget.hidden = true)} />}
          {eyebrow}
        </span>
        {badge}
      </div>
      <div className={styles.visual}>
        {outline && frame ? (
          <TrackOutline
            outline={outline}
            variant="thumb"
            viewBox={`${frame.viewBox.x} ${frame.viewBox.y} ${frame.viewBox.width} ${frame.viewBox.height}`}
            rotation={frame}
            title={`${title} outline`}
            className={styles.outline}
          />
        ) : (
          <span className={styles.noOutline}>No local outline</span>
        )}
      </div>
      <div className={styles.text}>
        <h3 className={styles.title} title={title}>
          {actions ? (
            <Link to={to} className={styles.titleLink}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className={styles.subtitle} title={typeof subtitle === 'string' ? subtitle : undefined}>
          {subtitle}
        </p>
      </div>
      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.fact}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {actions && <div className={styles.actions}>{actions}</div>}
    </>
  );
  const style = accent ? ({ '--card-accent': accent } as CSSProperties) : undefined;
  return actions ? (
    <article className={className} style={style}>
      {body}
    </article>
  ) : (
    <Link to={to} className={className} style={style}>
      {body}
    </Link>
  );
}
