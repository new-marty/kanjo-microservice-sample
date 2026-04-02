import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetSyncStatus } from '@repo/api-client';
import type { HandlerSyncStatusResponse } from '@repo/api-client';

export function useSyncStatus() {
  const queryClient = useQueryClient();
  const lastSeenRef = useRef<string | null>(localStorage.getItem('lastSeenSync'));

  const { data } = useGetSyncStatus<{
    data: HandlerSyncStatusResponse;
    status: number;
    headers: Headers;
  }>({
    query: { refetchInterval: 30_000, staleTime: 0 },
  });

  const lastSyncAt: string | undefined = data?.data?.last_sync_at;

  useEffect(() => {
    if (lastSyncAt && lastSyncAt !== lastSeenRef.current) {
      void queryClient.invalidateQueries();
      lastSeenRef.current = lastSyncAt;
      localStorage.setItem('lastSeenSync', lastSyncAt);
    }
  }, [lastSyncAt, queryClient]);
}
