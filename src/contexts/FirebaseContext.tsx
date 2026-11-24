import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import {
  auth,
  getDriveAccessToken,
  googleAuthProvider,
  googleDriveProvider,
  setDriveAccessToken,
} from '../firebase';
import { ADMIN_EMAIL, ensureUserProfile } from '../utils/firestoreService';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  profileReady: boolean;
  isAdminUser: boolean;
  signingIn: boolean;
  authError: string;
  driveToken: string | null;
  needsDriveAuth: boolean;
  signInWithGoogle: () => Promise<string | null>;
  connectGoogleDrive: () => Promise<string | null>;
  clearDriveToken: () => void;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  user: null,
  authReady: false,
  profileReady: false,
  isAdminUser: false,
  signingIn: false,
  authError: '',
  driveToken: null,
  needsDriveAuth: true,
  signInWithGoogle: async () => null,
  connectGoogleDrive: async () => null,
  clearDriveToken: () => {},
  signOutUser: async () => {},
  clearAuthError: () => {},
});

function formatAuthErrorMessage(err: any): string {
  const code = String(err?.code || '');
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
    if (inIframe) {
      return 'Popup blocked inside embedded preview. Please allow popups for this site or open the app in a new browser tab to sign in.';
    }
    return 'Browser popup was blocked. Please allow popups and try again.';
  }
  if (code === 'auth/web-storage-unsupported') {
    return 'Browser cookies or site storage appear disabled. Please enable cookies/storage for this site to sign in.';
  }
  if (code === 'auth/unauthorized-domain') {
    return `Domain "${host}" is not yet in Firebase Authorized Domains. Add it in Firebase Console → Authentication → Settings.`;
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error during Google Sign-In. Check your internet connection and try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many sign-in attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using a different sign-in method.';
  }
  if (code === 'auth/internal-error') {
    return 'Browser blocked third-party auth storage or cookies. Allow site cookies/popups or open in a standalone Chrome tab.';
  }
  return err?.message || 'Google Sign-In failed';
}

function formatProfileSyncError(err: any): string {
  const raw = String(err?.message || '');
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) {
      return `Signed in, but cloud profile sync failed: ${parsed.error}`;
    }
  } catch {
    // plain string
  }
  return raw || 'Signed in, but unable to sync cloud profile right now. Local studio continues working.';
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [driveToken, setDriveToken] = useState<string | null>(() => getDriveAccessToken());

  useEffect(() => {
    let mounted = true;

    getRedirectResult(auth)
      .then((result) => {
        if (!mounted || !result) return;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken ?? null;
        if (token) {
          setDriveAccessToken(token);
          setDriveToken(token);
        }
      })
      .catch((err: any) => {
        if (!mounted) return;
        if (err?.code && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          setAuthError(formatAuthErrorMessage(err));
        }
      });

    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!mounted) return;
      setUser(nextUser);
      setProfileReady(false);
      setAuthReady(true);

      if (nextUser) {
        try {
          await ensureUserProfile(nextUser);
          if (mounted) setProfileReady(true);
        } catch (err: any) {
          console.error('Failed to ensure Firestore user profile:', err);
          if (mounted) {
            setAuthError(formatProfileSyncError(err));
          }
        }
      } else {
        setDriveAccessToken(null);
        setDriveToken(null);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const runGoogleAuth = async (provider: GoogleAuthProvider): Promise<string | null> => {
    setSigningIn(true);
    setAuthError('');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken ?? null;
      if (token) {
        setDriveAccessToken(token);
        setDriveToken(token);
      }
      return token;
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return null;
      }

      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (
        !inIframe &&
        (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment')
      ) {
        try {
          await signInWithRedirect(auth, provider);
          return null;
        } catch (redirectErr: any) {
          setAuthError(formatAuthErrorMessage(redirectErr));
          return null;
        }
      }

      setAuthError(formatAuthErrorMessage(err));
      return null;
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithGoogle = () => runGoogleAuth(googleAuthProvider);
  const connectGoogleDrive = () => runGoogleAuth(googleDriveProvider);

  const clearDriveToken = () => {
    setDriveAccessToken(null);
    setDriveToken(null);
  };

  const signOutUser = async () => {
    setAuthError('');
    clearDriveToken();
    await signOut(auth);
  };

  const isAdminUser = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        profileReady,
        isAdminUser,
        signingIn,
        authError,
        driveToken,
        needsDriveAuth: !driveToken,
        signInWithGoogle,
        connectGoogleDrive,
        clearDriveToken,
        signOutUser,
        clearAuthError: () => setAuthError(''),
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export function useFirebase() {
  return useContext(FirebaseContext);
}
