import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ErrorRouteComponent } from '@tanstack/react-router';

export const ErrorBoundary: ErrorRouteComponent = ({ error, reset }) => {
  const { t } = useTranslation();

  return (
    <div className="flex h-64 items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">{t('error.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{error.message}</p>
          {import.meta.env.DEV && (
            <pre className="bg-muted max-h-48 overflow-auto rounded p-3 text-xs">{error.stack}</pre>
          )}
          <Button onClick={reset}>{t('error.retry')}</Button>
        </CardContent>
      </Card>
    </div>
  );
};
