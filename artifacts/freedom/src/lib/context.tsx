import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useFirestoreSync } from "./sync";

export type UrgeSession = {
  timestamp: string;
  completed: boolean;
};

export type JournalEntry = {
  id: string;
  timestamp: string;
  text: string;
  tags: string[];
};

export type CommunityPost = {
  id: string;
  username: string;
  message: string;
  streak: string;
  timestamp: string;
  reactions: Record<string, number>;
  isMine?: boolean;
};

export type FreedomContextType = {
  startDate: string | null;
  setStartDate: (date: string | null) => void;
  urgeSessions: UrgeSession[];
  addUrgeSession: (session: UrgeSession) => void;
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  deleteJournalEntry: (id: string) => void;
  fortressItems: string[];
  toggleFortressItem: (id: string) => void;
  isUrgeSurfing: boolean;
  setIsUrgeSurfing: (val: boolean) => void;
  appName: string;
  setAppName: (name: string) => { ok: boolean; error?: string };
  myPosts: CommunityPost[];
  addMyPost: (post: CommunityPost) => void;
  reactions: Record<string, Record<string, number>>;
  toggleReaction: (postId: string, emoji: string) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  resetAll: () => void;
};

const FreedomContext = createContext<FreedomContextType | undefined>(undefined);

export function FreedomProvider({ children }: { children: React.ReactNode }) {
  const [startDate, setStartDate] = useState<string | null>(() => localStorage.getItem("freedom_start"));
  const [urgeSessions, setUrgeSessions] = useState<UrgeSession[]>(() => JSON.parse(localStorage.getItem("freedom_urges") || "[]"));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => JSON.parse(localStorage.getItem("freedom_journal") || "[]"));
  const [fortressItems, setFortressItems] = useState<string[]>(() => JSON.parse(localStorage.getItem("freedom_fortress") || "[]"));
  const [isUrgeSurfing, setIsUrgeSurfing] = useState(false);
  const [appName, setAppNameState] = useState<string>(() => localStorage.getItem("freedom_app_name") || "Freedom");
  const [myPosts, setMyPosts] = useState<CommunityPost[]>(() => JSON.parse(localStorage.getItem("freedom_my_posts") || "[]"));
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>(() => JSON.parse(localStorage.getItem("freedom_reactions") || "{}"));
  const [theme, setThemeState] = useState<"light" | "dark">(() => (localStorage.getItem("freedom_theme") as "light" | "dark") || "dark");

  useEffect(() => {
    localStorage.setItem("freedom_theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  const setTheme = useCallback((t: "light" | "dark") => setThemeState(t), []);

  // Sync user data with Firestore when signed in. localStorage stays the
  // device-side source of truth, so the app keeps working offline.
  useFirestoreSync({
    startDate,
    urgeSessions,
    journalEntries,
    fortressItems,
    appName,
    myPosts,
    reactions,
    theme,
    onRemoteLoad: (remote) => {
      setStartDate(remote.startDate);
      setUrgeSessions(remote.urgeSessions as UrgeSession[]);
      setJournalEntries(remote.journalEntries as JournalEntry[]);
      setFortressItems(remote.fortressItems);
      if (remote.appName) setAppNameState(remote.appName);
      if (remote.theme) setThemeState(remote.theme);
    },
  });

  useEffect(() => {
    if (startDate) localStorage.setItem("freedom_start", startDate);
    else localStorage.removeItem("freedom_start");
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem("freedom_urges", JSON.stringify(urgeSessions));
  }, [urgeSessions]);

  useEffect(() => {
    localStorage.setItem("freedom_journal", JSON.stringify(journalEntries));
  }, [journalEntries]);

  useEffect(() => {
    localStorage.setItem("freedom_fortress", JSON.stringify(fortressItems));
  }, [fortressItems]);

  useEffect(() => {
    localStorage.setItem("freedom_app_name", appName);
    document.title = appName;
  }, [appName]);

  useEffect(() => {
    localStorage.setItem("freedom_my_posts", JSON.stringify(myPosts));
  }, [myPosts]);

  useEffect(() => {
    localStorage.setItem("freedom_reactions", JSON.stringify(reactions));
  }, [reactions]);

  const addUrgeSession = useCallback((session: UrgeSession) => {
    setUrgeSessions((prev) => [...prev, session]);
  }, []);

  const addJournalEntry = useCallback((entry: JournalEntry) => {
    setJournalEntries((prev) => [entry, ...prev]);
  }, []);

  const deleteJournalEntry = useCallback((id: string) => {
    setJournalEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const toggleFortressItem = useCallback((id: string) => {
    setFortressItems((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const resetAll = useCallback(() => {
    setStartDate(null);
    setUrgeSessions([]);
    setJournalEntries([]);
    setFortressItems([]);
  }, []);

  const setAppName = useCallback((name: string): { ok: boolean; error?: string } => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Name cannot be empty." };
    if (trimmed.length > 24) return { ok: false, error: "Name must be 24 characters or less." };

    const BLOCKED_WORDS = [
      "fuck","shit","bitch","ass","asshole","damn","cunt","dick","pussy","cock","slut","whore",
      "porn","sex","nigger","nigga","faggot","fag","retard","rape","nazi","kill","drugs","weed",
      "cocaine","heroin","meth"
    ];
    const lower = trimmed.toLowerCase().replace(/[^a-z]/g, "");
    if (BLOCKED_WORDS.some((w) => lower.includes(w))) {
      return { ok: false, error: "That name contains inappropriate language." };
    }

    const RESERVED = ["freedom","admin","moderator","support","system","null","undefined"];
    if (RESERVED.includes(lower)) {
      return { ok: false, error: "That name is reserved. Try another." };
    }

    const usedNames: string[] = JSON.parse(localStorage.getItem("freedom_used_names") || "[]");
    if (usedNames.map((n) => n.toLowerCase()).includes(trimmed.toLowerCase())) {
      return { ok: false, error: "That name has already been used. Choose a different one." };
    }

    const previous = appName;
    const updated = [...usedNames.filter((n) => n.toLowerCase() !== previous.toLowerCase()), trimmed];
    localStorage.setItem("freedom_used_names", JSON.stringify(updated));
    setAppNameState(trimmed);
    return { ok: true };
  }, [appName]);

  const addMyPost = useCallback((post: CommunityPost) => {
    setMyPosts((prev) => [post, ...prev]);
  }, []);

  const toggleReaction = useCallback((postId: string, emoji: string) => {
    setReactions((prev) => {
      const key = `${postId}|${emoji}`;
      const next = { ...prev };
      const post = { ...(next[postId] || {}) };
      post[emoji] = post[emoji] ? 0 : 1;
      next[postId] = post;
      // collapse zeroes
      Object.keys(next[postId]).forEach((k) => { if (!next[postId][k]) delete next[postId][k]; });
      void key;
      return next;
    });
  }, []);

  return (
    <FreedomContext.Provider
      value={{
        startDate,
        setStartDate,
        urgeSessions,
        addUrgeSession,
        journalEntries,
        addJournalEntry,
        deleteJournalEntry,
        fortressItems,
        toggleFortressItem,
        isUrgeSurfing,
        setIsUrgeSurfing,
        appName,
        setAppName,
        myPosts,
        addMyPost,
        reactions,
        toggleReaction,
        theme,
        setTheme,
        resetAll,
      }}
    >
      {children}
    </FreedomContext.Provider>
  );
}

export function useFreedom() {
  const context = useContext(FreedomContext);
  if (context === undefined) {
    throw new Error("useFreedom must be used within a FreedomProvider");
  }
  return context;
}
