export type JobError = DatabaseError | ConfigError | TransformError | LLMError;

export interface DatabaseError {
  readonly _tag: 'DatabaseError';
  readonly message: string;
  readonly cause?: unknown;
}

export interface ConfigError {
  readonly _tag: 'ConfigError';
  readonly message: string;
  readonly field?: string;
}

export interface TransformError {
  readonly _tag: 'TransformError';
  readonly message: string;
  readonly transactionHash?: string;
  readonly cause?: unknown;
}

export interface LLMError {
  readonly _tag: 'LLMError';
  readonly message: string;
  readonly provider?: string;
  readonly cause?: unknown;
}

export function databaseError(message: string, cause?: unknown): DatabaseError {
  return { _tag: 'DatabaseError', message, cause };
}

export function configError(message: string, field?: string): ConfigError {
  return { _tag: 'ConfigError', message, field };
}

export function transformError(
  message: string,
  transactionHash?: string,
  cause?: unknown
): TransformError {
  return { _tag: 'TransformError', message, transactionHash, cause };
}

export function llmError(message: string, provider?: string, cause?: unknown): LLMError {
  return { _tag: 'LLMError', message, provider, cause };
}

export function formatJobError(error: JobError): string {
  switch (error._tag) {
    case 'DatabaseError':
      return `[Database] ${error.message}`;
    case 'ConfigError':
      return `[Config] ${error.message}${error.field ? ` (field: ${error.field})` : ''}`;
    case 'TransformError':
      return `[Transform] ${error.message}${error.transactionHash ? ` (hash: ${error.transactionHash})` : ''}`;
    case 'LLMError':
      return `[LLM${error.provider ? `:${error.provider}` : ''}] ${error.message}`;
  }
}
