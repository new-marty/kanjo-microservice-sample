import pg from 'pg';
import { ResultAsync } from 'neverthrow';
import { databaseError, type DatabaseError } from '../errors.js';
import { getLogger } from '../logger.js';

export interface JobCompletedEvent {
  job_id: string;
  job_type: string;
  transactions_count: number;
  assets_count: number;
}

export type EventHandler<T> = (event: T) => Promise<void>;

export function listenForJobCompleted(
  pool: pg.Pool,
  handler: EventHandler<JobCompletedEvent>
): ResultAsync<() => Promise<void>, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      const log = getLogger();
      const client = await pool.connect();

      client.on('notification', async (msg) => {
        if (msg.channel === 'mf_job_completed' && msg.payload) {
          try {
            const event = JSON.parse(msg.payload) as JobCompletedEvent;
            log.info({ event }, 'Received mf_job_completed notification');
            await handler(event);
          } catch (e) {
            log.error({ error: e, payload: msg.payload }, 'Failed to handle notification');
          }
        }
      });

      await client.query('LISTEN mf_job_completed');
      log.info('Listening for mf_job_completed events');

      return async () => {
        await client.query('UNLISTEN mf_job_completed');
        client.release();
        log.info('Stopped listening for mf_job_completed events');
      };
    })(),
    (e) => databaseError('Failed to listen for job completed events', e)
  );
}

export function notify(
  pool: pg.Pool,
  channel: string,
  payload: unknown
): ResultAsync<void, DatabaseError> {
  return ResultAsync.fromPromise(
    (async () => {
      await pool.query('SELECT pg_notify($1, $2)', [channel, JSON.stringify(payload)]);
    })(),
    (e) => databaseError(`Failed to notify channel ${channel}`, e)
  );
}
