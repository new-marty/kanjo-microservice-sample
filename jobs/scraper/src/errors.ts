export type AppError =
  | AuthError
  | ConfigError
  | DatabaseError
  | NetworkError
  | ParseError
  | FileSystemError
  | OtpError;

export interface AuthError {
  readonly _tag: 'AuthError';
  readonly message: string;
  readonly cause?: unknown;
}

export interface ConfigError {
  readonly _tag: 'ConfigError';
  readonly message: string;
  readonly field?: string;
}

export interface DatabaseError {
  readonly _tag: 'DatabaseError';
  readonly message: string;
  readonly cause?: unknown;
}

export interface NetworkError {
  readonly _tag: 'NetworkError';
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}

export interface ParseError {
  readonly _tag: 'ParseError';
  readonly message: string;
  readonly row?: number;
  readonly cause?: unknown;
}

export interface FileSystemError {
  readonly _tag: 'FileSystemError';
  readonly message: string;
  readonly path?: string;
  readonly cause?: unknown;
}

export interface OtpError {
  readonly _tag: 'OtpError';
  readonly message: string;
  readonly source: 'gmail' | 'bluebubbles' | 'tty';
  readonly cause?: unknown;
}

export function authError(message: string, cause?: unknown): AuthError {
  return { _tag: 'AuthError', message, cause };
}

export function configError(message: string, field?: string): ConfigError {
  return { _tag: 'ConfigError', message, field };
}

export function databaseError(message: string, cause?: unknown): DatabaseError {
  return { _tag: 'DatabaseError', message, cause };
}

export function networkError(message: string, statusCode?: number, cause?: unknown): NetworkError {
  return { _tag: 'NetworkError', message, statusCode, cause };
}

export function parseError(message: string, row?: number, cause?: unknown): ParseError {
  return { _tag: 'ParseError', message, row, cause };
}

export function fileSystemError(message: string, path?: string, cause?: unknown): FileSystemError {
  return { _tag: 'FileSystemError', message, path, cause };
}

export function otpError(
  message: string,
  source: 'gmail' | 'bluebubbles' | 'tty',
  cause?: unknown
): OtpError {
  return { _tag: 'OtpError', message, source, cause };
}

export function formatAppError(error: AppError): string {
  switch (error._tag) {
    case 'AuthError':
      return `[Auth] ${error.message}`;
    case 'ConfigError':
      return `[Config] ${error.message}${error.field ? ` (field: ${error.field})` : ''}`;
    case 'DatabaseError':
      return `[Database] ${error.message}`;
    case 'NetworkError':
      return `[Network] ${error.message}${error.statusCode ? ` (status: ${error.statusCode})` : ''}`;
    case 'ParseError':
      return `[Parse] ${error.message}${error.row !== undefined ? ` (row: ${error.row})` : ''}`;
    case 'FileSystemError':
      return `[FileSystem] ${error.message}${error.path ? ` (path: ${error.path})` : ''}`;
    case 'OtpError':
      return `[OTP:${error.source}] ${error.message}`;
  }
}
