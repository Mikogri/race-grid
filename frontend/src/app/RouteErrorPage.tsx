import type { ReactNode } from 'react';
import { Link, isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { Button, ButtonLink } from '../components/ui/Button';
import { LogoSymbol } from '../components/ui/Logo';
import styles from './RouteErrorPage.module.css';

const SHORTCUTS = [
  { to: '/calendar', label: 'Calendar' },
  { to: '/standings', label: 'Standings' },
  { to: '/replay', label: 'Race Replay' },
];

/** Shared layout of every error screen: a large outlined code, a title, one line of help, then the way out. */
function ErrorScreen({ code, eyebrow, title, text, actions, detail }: { code: string; eyebrow: string; title: string; text: string; actions: ReactNode; detail?: string }) {
  return (
    <section className={styles.screen} aria-labelledby="error-title">
      <p className={styles.code} aria-hidden="true">
        {code}
      </p>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 id="error-title" className={styles.title}>
        {title}
      </h1>
      <p className={styles.text}>{text}</p>
      {detail && <pre className={styles.detail}>{detail}</pre>}
      <div className={styles.actions}>{actions}</div>
      <nav aria-label="Popular pages" className={styles.shortcuts}>
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className={styles.shortcut}>
            {s.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}

/** Unknown address inside the app (rendered in the normal layout). */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <ErrorScreen
      code="404"
      eyebrow="Page not found"
      title="This page is off the track"
      text="The address may be mistyped, or the page has moved."
      actions={
        <>
          <ButtonLink to="/" variant="primary">
            Back to dashboard
          </ButtonLink>
          <Button variant="secondary" icon={<IconArrowLeft size={14} stroke={1.5} aria-hidden="true" />} onClick={() => navigate(-1)}>
            Go back
          </Button>
        </>
      }
    />
  );
}

/** A lazy page chunk that no longer exists on the server: the app was redeployed since this tab loaded. */
const isStaleBuild = (error: unknown) =>
  error instanceof Error && /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(error.message);

/**
 * Last-resort boundary for the whole app (rendering bugs, failed chunk loads). It replaces the layout,
 * so it brings its own minimal frame with the logo.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const reload = (
    <Button variant="primary" icon={<IconRefresh size={14} stroke={1.5} aria-hidden="true" />} onClick={() => window.location.reload()}>
      Reload
    </Button>
  );

  let screen: ReactNode;
  if (isRouteErrorResponse(error) && error.status === 404) {
    screen = <NotFoundPage />;
  } else if (isStaleBuild(error)) {
    screen = (
      <ErrorScreen code="New" eyebrow="Update available" title="RaceGrid has been updated" text="This tab is running an older version. Reload to continue with the latest one." actions={reload} />
    );
  } else {
    screen = (
      <ErrorScreen
        code="Oops"
        eyebrow="Unexpected error"
        title="Something went wrong"
        text="The page could not be shown. Reloading usually helps; if it keeps happening, start again from the dashboard."
        detail={error instanceof Error ? error.message : undefined}
        actions={
          <>
            {reload}
            <ButtonLink to="/" variant="secondary">
              Back to dashboard
            </ButtonLink>
          </>
        }
      />
    );
  }

  return (
    <div className={styles.frame}>
      <Link to="/" className={styles.brand} aria-label="RaceGrid home">
        <LogoSymbol size={24} />
        RaceGrid
      </Link>
      {screen}
    </div>
  );
}
