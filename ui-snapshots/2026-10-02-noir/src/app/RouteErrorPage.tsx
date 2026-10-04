import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState } from '../components/ui/StateViews';

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState title="Page not found">
        <ButtonLink to="/" variant="ghost">
          Back to dashboard
        </ButtonLink>
      </EmptyState>
    </Card>
  );
}

/** Last-resort boundary: rendering bugs or failed chunk loads. */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <div style={{ padding: 24 }}>
      <Card>
        <ErrorState title="Something went wrong" error={error} onRetry={() => window.location.reload()} />
      </Card>
    </div>
  );
}
