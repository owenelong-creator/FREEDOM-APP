import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

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
  resetAll: () => void;
};

const FreedomContext = createContext<FreedomContextType | undefined>(undefined);

export function FreedomProvider({ children }: { children: React.ReactNode }) {
  const [startDate, setStartDate] = useState<string | null>(() => localStorage.getItem("freedom_start"));
  const [urgeSessions, setUrgeSessions] = useState<UrgeSession[]>(() => JSON.parse(localStorage.getItem("freedom_urges") || "[]"));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => JSON.parse(localStorage.getItem("freedom_journal") || "[]"));
  const [fortressItems, setFortressItems] = useState<string[]>(() => JSON.parse(localStorage.getItem("freedom_fortress") || "[]"));
  const [isUrgeSurfing, setIsUrgeSurfing] = useState(false);

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
