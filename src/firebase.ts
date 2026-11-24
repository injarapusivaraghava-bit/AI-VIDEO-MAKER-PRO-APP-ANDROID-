import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
] as const;

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
  'ai-studio-kalaaivideostudi-b54e0580-a5de-4445-ab53-3ccc563be5ae';

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(
    app,
    {
      ...(typeof window !== 'undefined'
        ? {
            experimentalForceLongPolling: true,
            experimentalLongPollingOptions: { timeoutSeconds: 5 },
          }
        : {}),
      localCache: memoryLocalCache(),
      ignoreUndefinedProperties: true,
    },
    firestoreDatabaseId
  );
} catch {
  dbInstance = getFirestore(app, firestoreDatabaseId);
}

export const db = dbInstance;
export const auth = getAuth(app);

// Standard Google Sign-In provider (no sensitive Drive scopes so browser & mobile login succeeds cleanly)
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

// Scoped Google Drive provider used only when the user explicitly connects Google Drive
export const googleDriveProvider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => googleDriveProvider.addScope(scope));
googleDriveProvider.setCustomParameters({ prompt: 'consent select_account' });

export const googleProvider = googleAuthProvider;

// In-memory-only Google Workspace access token (never stored in localStorage/sessionStorage)
let cachedDriveAccessToken: string | null = null;

export function setDriveAccessToken(token: string | null) {
  cachedDriveAccessToken = token;
}

export function getDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
