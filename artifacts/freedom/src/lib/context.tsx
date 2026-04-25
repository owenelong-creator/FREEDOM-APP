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

export type Reason = {
  id: string;
  text: string;
  createdAt: number;
};

export const MAX_REASONS = 10;
export const MAX_REASON_LENGTH = 250;

function migrateReasons(legacyWhy: string | null, raw: string | null): Reason[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((r: { id?: unknown; text?: unknown; createdAt?: unknown }) => ({
            id: typeof r.id === "string" ? r.id : crypto.randomUUID(),
            text: typeof r.text === "string" ? r.text.slice(0, MAX_REASON_LENGTH) : "",
            createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
          }))
          .filter((r) => r.text.trim().length > 0)
          .slice(0, MAX_REASONS);
      }
    } catch {
      /* fall through to legacy migration */
    }
  }
  const trimmed = (legacyWhy || "").trim();
  if (!trimmed) return [];
  return [
    {
      id: crypto.randomUUID(),
      text: trimmed.slice(0, MAX_REASON_LENGTH),
      createdAt: Date.now(),
    },
  ];
}

export type CommunityPost = {
  id: string;
  uid?: string;
  username: string;
  message: string;
  imageUrl?: string | null;
  streak: string;
  timestamp: string;
  editedAt?: string | null;
  reactions: Record<string, number>;
  isMine?: boolean;
};

export const USERNAME_COOLDOWN_DAYS = 30;
export const USERNAME_COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export type FreedomContextType = {
  startDate: string | null;
  setStartDate: (date: string | null) => void;
  urgeSessions: UrgeSession[];
  addUrgeSession: (session: UrgeSession) => void;
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => void;
  deleteJournalEntry: (id: string) => void;
  reasons: Reason[];
  addReason: (text: string) => { ok: boolean; error?: string };
  updateReason: (id: string, text: string) => { ok: boolean; error?: string };
  deleteReason: (id: string) => void;
  fortressItems: string[];
  toggleFortressItem: (id: string) => void;
  isUrgeSurfing: boolean;
  setIsUrgeSurfing: (val: boolean) => void;
  appName: string;
  setAppName: (name: string) => { ok: boolean; error?: string };
  usernameChangedAt: number | null;
  usernameCooldownRemainingMs: number;
  myPosts: CommunityPost[];
  addMyPost: (post: CommunityPost) => void;
  reactions: Record<string, Record<string, number>>;
  toggleReaction: (postId: string, emoji: string) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  showDailyVerse: boolean;
  setShowDailyVerse: (val: boolean) => void;
  resetAll: () => void;
};

const FreedomContext = createContext<FreedomContextType | undefined>(undefined);

export function FreedomProvider({ children }: { children: React.ReactNode }) {
  const [startDate, setStartDate] = useState<string | null>(() => localStorage.getItem("freedom_start"));
  const [urgeSessions, setUrgeSessions] = useState<UrgeSession[]>(() => JSON.parse(localStorage.getItem("freedom_urges") || "[]"));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => JSON.parse(localStorage.getItem("freedom_journal") || "[]"));
  const [reasons, setReasons] = useState<Reason[]>(() =>
    migrateReasons(
      localStorage.getItem("freedom_why_reason"),
      localStorage.getItem("freedom_reasons")
    )
  );
  const [fortressItems, setFortressItems] = useState<string[]>(() => JSON.parse(localStorage.getItem("freedom_fortress") || "[]"));
  const [isUrgeSurfing, setIsUrgeSurfing] = useState(false);
  const [appName, setAppNameState] = useState<string>(() => localStorage.getItem("freedom_app_name") || "Freedom");
  const [usernameChangedAt, setUsernameChangedAt] = useState<number | null>(() => {
    const v = localStorage.getItem("freedom_username_changed_at");
    return v ? Number(v) || null : null;
  });
  const [myPosts, setMyPosts] = useState<CommunityPost[]>(() => JSON.parse(localStorage.getItem("freedom_my_posts") || "[]"));
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>(() => JSON.parse(localStorage.getItem("freedom_reactions") || "{}"));
  const [theme, setThemeState] = useState<"light" | "dark">(() => (localStorage.getItem("freedom_theme") as "light" | "dark") || "dark");
  const [showDailyVerse, setShowDailyVerseState] = useState<boolean>(
    () => localStorage.getItem("freedom_show_daily_verse") === "1"
  );

  useEffect(() => {
    localStorage.setItem("freedom_show_daily_verse", showDailyVerse ? "1" : "0");
  }, [showDailyVerse]);

  const setShowDailyVerse = useCallback((val: boolean) => setShowDailyVerseState(val), []);

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
    theme,
    reasons,
    showDailyVerse,
    onRemoteLoad: (remote) => {
      setStartDate(remote.startDate);
      setUrgeSessions(remote.urgeSessions as UrgeSession[]);
      setJournalEntries(remote.journalEntries as JournalEntry[]);
      setFortressItems(remote.fortressItems);
      if (remote.appName) setAppNameState(remote.appName);
      if (remote.theme) setThemeState(remote.theme);
      if (Array.isArray(remote.reasons)) {
        setReasons(remote.reasons);
      } else if (typeof remote.whyReason === "string" && remote.whyReason.trim()) {
        // Legacy remote: migrate single string into one reason
        setReasons(migrateReasons(remote.whyReason, null));
      }
      if (typeof remote.showDailyVerse === "boolean") {
        setShowDailyVerseState(remote.showDailyVerse);
      }
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
    localStorage.setItem("freedom_reasons", JSON.stringify(reasons));
    // Keep legacy key cleared so we don't re-migrate on next load.
    localStorage.removeItem("freedom_why_reason");
  }, [reasons]);

  const addReason = useCallback(
    (text: string): { ok: boolean; error?: string } => {
      const trimmed = text.trim().slice(0, MAX_REASON_LENGTH);
      if (!trimmed) return { ok: false, error: "Reason can't be empty." };
      let result: { ok: boolean; error?: string } = { ok: true };
      setReasons((prev) => {
        if (prev.length >= MAX_REASONS) {
          result = { ok: false, error: `You can only have ${MAX_REASONS} reasons.` };
          return prev;
        }
        return [
          ...prev,
          { id: crypto.randomUUID(), text: trimmed, createdAt: Date.now() },
        ];
      });
      return result;
    },
    []
  );

  const updateReason = useCallback(
    (id: string, text: string): { ok: boolean; error?: string } => {
      const trimmed = text.trim().slice(0, MAX_REASON_LENGTH);
      if (!trimmed) return { ok: false, error: "Reason can't be empty." };
      setReasons((prev) =>
        prev.map((r) => (r.id === id ? { ...r, text: trimmed } : r))
      );
      return { ok: true };
    },
    []
  );

  const deleteReason = useCallback((id: string) => {
    setReasons((prev) => prev.filter((r) => r.id !== id));
  }, []);

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
    setReasons([]);
    setShowDailyVerseState(false);
  }, []);

  const setAppName = useCallback((name: string): { ok: boolean; error?: string } => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Name cannot be empty." };
    if (trimmed.length > 24) return { ok: false, error: "Name must be 24 characters or less." };

    // No-op if it's the same name — don't trigger the cooldown.
    if (trimmed.toLowerCase() === appName.trim().toLowerCase()) {
      return { ok: true };
    }

    // 30-day cooldown between username changes.
    if (usernameChangedAt) {
      const elapsed = Date.now() - usernameChangedAt;
      if (elapsed < USERNAME_COOLDOWN_MS) {
        const daysLeft = Math.ceil((USERNAME_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
        return {
          ok: false,
          error: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
        };
      }
    }

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
    const now = Date.now();
    localStorage.setItem("freedom_username_changed_at", String(now));
    setUsernameChangedAt(now);
    setAppNameState(trimmed);
    return { ok: true };
  }, [appName, usernameChangedAt]);

  const usernameCooldownRemainingMs = usernameChangedAt
    ? Math.max(0, USERNAME_COOLDOWN_MS - (Date.now() - usernameChangedAt))
    : 0;

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
        reasons,
        addReason,
        updateReason,
        deleteReason,
        fortressItems,
        toggleFortressItem,
        isUrgeSurfing,
        setIsUrgeSurfing,
        appName,
        setAppName,
        usernameChangedAt,
        usernameCooldownRemainingMs,
        myPosts,
        addMyPost,
        reactions,
        toggleReaction,
        theme,
        setTheme,
        showDailyVerse,
        setShowDailyVerse,
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
