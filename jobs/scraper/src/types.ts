export interface Transaction {
  hash: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  subCategory: string | null;
  accountName: string;
  memo: string | null;
  isTransfer: boolean;
  isRecurring: boolean;
}

export interface DailyAsset {
  date: Date;
  institutionName: string;
  accountName: string;
  assetType: string;
  balance: number;
}

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

export interface MfSession {
  id: string;
  storageState: StorageState;
  createdAt: Date;
  updatedAt: Date;
}

export type JobType = 'initial-run' | 'fetch-daily' | 'refresh' | 'login-only';
export type JobStatus = 'running' | 'completed' | 'failed';

export interface JobRun {
  id: string;
  jobType: JobType;
  status: JobStatus;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  transactionsCount: number;
  assetsCount: number;
}

export interface FetchResult {
  transactions: Transaction[];
  transactionsInserted: number;
}

export interface AssetFetchResult {
  assets: DailyAsset[];
  assetsInserted: number;
}

export interface RefreshResult {
  success: boolean;
  accountsRefreshed: number;
}
