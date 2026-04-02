import { ok, err, type Result } from 'neverthrow';

export { ok, err };
export type { Result };

export function tryCatch<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error as E);
  }
}
