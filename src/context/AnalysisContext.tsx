"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { requestAnalysisService } from "@/lib/requestAnalysisService";

interface AnalysisContextType {
  analysis: any | null;
  isLoading: boolean;
  refreshAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const [analysis, setAnalysis] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = useRef(true);

  const fetchAnalysis = useCallback(async (silent = false) => {
    if (!analysisId) return;

    if (!silent) {
      setIsLoading(true);
    }
    try {
      const res = await requestAnalysisService.getProject(analysisId);
      if (res?.data) {
        setAnalysis(res.data);
      }
    } catch (error) {
      if (!silent) {
        console.error("Failed to fetch analysis:", error);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [analysisId]);

  const refreshAnalysis = useCallback(() => {
    fetchAnalysis(true);
  }, [fetchAnalysis]);

  useEffect(() => {
    if (analysisId && isInitialMount.current) {
      isInitialMount.current = false;
      fetchAnalysis(false);
    }

    // Listen to window custom events from sockets
    const handleRealtimeMessage = (e: any) => {
      const payload = e?.detail;
      const targetId = payload?.projectId || payload?.data?.projectId || payload?.analysisId;
      if (!targetId || targetId === analysisId) {
        fetchAnalysis(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAnalysis(true);
      }
    };

    window.addEventListener("notification:new", handleRealtimeMessage);
    window.addEventListener("project_message", handleRealtimeMessage);
    window.addEventListener("project_updated", handleRealtimeMessage);
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isInitialMount.current = true;
      window.removeEventListener("notification:new", handleRealtimeMessage);
      window.removeEventListener("project_message", handleRealtimeMessage);
      window.removeEventListener("project_updated", handleRealtimeMessage);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [analysisId, fetchAnalysis]);

  const value = useMemo(
    () => ({
      analysis,
      isLoading,
      refreshAnalysis,
    }),
    [analysis, isLoading, refreshAnalysis],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
