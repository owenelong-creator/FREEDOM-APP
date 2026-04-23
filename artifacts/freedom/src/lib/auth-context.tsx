import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  auth,
  isFirebaseConfigured,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  User,
} from "./firebase";

type AuthState = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, pw: string) => Promise<void>;
  signUpWithEmail: (email: string, pw: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const requireAuth = () => {
    if (!auth) throw new Error("Sign-in is not available — Firebase isn't configured yet.");
    return auth;
  };

  const signInWithGoogle = useCallback(async () => {
    const a = requireAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(a, provider);
  }, []);

  const signInWithApple = useCallback(async () => {
    const a = requireAuth();
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    await signInWithPopup(a, provider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, pw: string) => {
    const a = requireAuth();
    await signInWithEmailAndPassword(a, email, pw);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pw: string) => {
    const a = requireAuth();
    await createUserWithEmailAndPassword(a, email, pw);
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await fbSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: isFirebaseConfigured,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
