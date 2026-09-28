'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  RegisteredItem, 
  FoundReport, 
  MatchRecord, 
  VerificationAttempt, 
  RecoveryRecord, 
  RewardRecord, 
  V15Metrics,
  ItemCategory 
} from '@/types';

interface KhojContextType {
  // Current user session
  currentRole: 'student' | 'finder' | 'admin';
  setCurrentRole: (role: 'student' | 'finder' | 'admin') => void;
  currentUserEmail: string;
  setCurrentUserEmail: (email: string) => void;
  
  // V1.5 Database Tables
  items: RegisteredItem[];
  foundReports: FoundReport[];
  matches: MatchRecord[];
  verifications: VerificationAttempt[];
  recoveries: RecoveryRecord[];
  rewards: RewardRecord[];
  metrics: V15Metrics;
  isLoading: boolean;

  // Actions
  refreshDb: () => Promise<void>;
  registerNewItem: (item: {
    name: string;
    category: ItemCategory;
    brand: string;
    model: string;
    colour: string;
    unique_detail: string;
    photos: string[];
  }) => Promise<void>;
  markItemAsLost: (itemId: string, location: string, lost_at: string, notes?: string) => Promise<void>;
  markItemAsSafe: (itemId: string) => Promise<void>;
  submitFoundReport: (report: {
    image_url: string;
    detail_image_url?: string;
    location: string;
    category_guess?: ItemCategory;
    rough_description?: string;
    finder_phone?: string;
  }) => Promise<FoundReport>;
  verifyOwnershipAttempt: (reportId: string, matchId: string, ownerAnswer: string, attemptNumber?: number) => Promise<{ success: boolean; result: string; message: string }>;
  confirmHandover: (reportId: string, role: 'owner' | 'finder') => Promise<void>;
  handleRewardAction: (reportId: string, subAction: 'skip' | 'provide_upi' | 'pay_complete', upiId?: string, txRef?: string) => Promise<void>;
  claimUnclaimedItem: (reportId: string, itemId: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
}

const KhojContext = createContext<KhojContextType | undefined>(undefined);

export function KhojProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<'student' | 'finder' | 'admin'>('student');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('student@campus.edu');
  
  const [items, setItems] = useState<RegisteredItem[]>([]);
  const [foundReports, setFoundReports] = useState<FoundReport[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [verifications, setVerifications] = useState<VerificationAttempt[]>([]);
  const [recoveries, setRecoveries] = useState<RecoveryRecord[]>([]);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [metrics, setMetrics] = useState<V15Metrics>({
    studentsCount: 1,
    registeredItemsCount: 0,
    lostItemsCount: 0,
    foundReportsCount: 0,
    potentialMatchesCount: 0,
    ambiguousCasesCount: 0,
    manualReviewsCount: 0,
    verifiedMatchesCount: 0,
    returnedItemsCount: 0,
    rewardsCount: 0,
    recoveryRate: 0,
    avgAttemptsPerMatch: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load from /api/db on mount
  const refreshDb = useCallback(async () => {
    try {
      const res = await fetch('/api/db');
      const data = await res.json();
      if (data.success && data.db) {
        setItems(data.db.items || []);
        setFoundReports(data.db.found_reports || []);
        setMatches(data.db.matches || []);
        setVerifications(data.db.verification || []);
        setRecoveries(data.db.recovery || []);
        setRewards(data.db.rewards || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch from /api/db:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDb();
  }, [refreshDb]);

  // Action helpers sending to /api/db
  const registerNewItem = async (itemData: {
    name: string;
    category: ItemCategory;
    brand: string;
    model: string;
    colour: string;
    unique_detail: string;
    photos: string[];
  }) => {
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_item',
          payload: {
            ...itemData,
            ownerEmail: currentUserEmail,
            ownerName: 'Campus Student',
          },
        }),
      });
      await refreshDb();
    } catch (err) {
      console.error(err);
    }
  };

  const markItemAsLost = async (itemId: string, location: string, lost_at: string, notes?: string) => {
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_lost',
          payload: { itemId, location, lost_at, notes },
        }),
      });
      await refreshDb();
    } catch (err) {
      console.error(err);
    }
  };

  const markItemAsSafe = async (itemId: string) => {
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_safe',
          payload: { itemId },
        }),
      });
      await refreshDb();
    } catch (err) {
      console.error(err);
    }
  };

  const submitFoundReport = async (reportData: {
    image_url: string;
    detail_image_url?: string;
    location: string;
    category_guess?: ItemCategory;
    rough_description?: string;
    finder_phone?: string;
  }): Promise<FoundReport> => {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_found',
        payload: reportData,
      }),
    });
    const data = await res.json();
    await refreshDb();
    return data.report;
  };

  const verifyOwnershipAttempt = async (
    reportId: string,
    matchId: string,
    ownerAnswer: string,
    attemptNumber = 1
  ): Promise<{ success: boolean; result: string; message: string }> => {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_attempt',
        payload: { reportId, matchId, ownerAnswer, attemptNumber },
      }),
    });
    const data = await res.json();
    await refreshDb();
    return data;
  };

  const confirmHandover = async (reportId: string, role: 'owner' | 'finder') => {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'confirm_handover',
        payload: { reportId, role },
      }),
    });
    await refreshDb();
  };

  const handleRewardAction = async (
    reportId: string,
    subAction: 'skip' | 'provide_upi' | 'pay_complete',
    upiId?: string,
    txRef?: string
  ) => {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reward_action',
        payload: { reportId, subAction, upiId, txRef },
      }),
    });
    await refreshDb();
  };

  const claimUnclaimedItem = async (reportId: string, itemId: string) => {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'claim_item',
        payload: { reportId, itemId },
      }),
    });
    await refreshDb();
  };

  const resetDatabaseAction = async () => {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    await refreshDb();
  };

  return (
    <KhojContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        currentUserEmail,
        setCurrentUserEmail,
        items,
        foundReports,
        matches,
        verifications,
        recoveries,
        rewards,
        metrics,
        isLoading,
        refreshDb,
        registerNewItem,
        markItemAsLost,
        markItemAsSafe,
        submitFoundReport,
        verifyOwnershipAttempt,
        confirmHandover,
        handleRewardAction,
        claimUnclaimedItem,
        resetDatabase: resetDatabaseAction,
      }}
    >
      {children}
    </KhojContext.Provider>
  );
}

export function useKhoj() {
  const context = useContext(KhojContext);
  if (!context) {
    throw new Error('useKhoj must be used within a KhojProvider');
  }
  return context;
}
