"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { requestAnalysisService } from "@/lib/requestAnalysisService";
import { authService } from "@/lib/authService";

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

  const fetchAnalysis = useCallback(async () => {
    if (!analysisId) return;

    setIsLoading(true);
    try {
      const res = await requestAnalysisService.getProject(analysisId);
      if (res?.data) {
        setAnalysis(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch analysis:", error);
    } finally {
      setIsLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    if (analysisId && isInitialMount.current) {
      isInitialMount.current = false;
      fetchAnalysis();
    }

    return () => {
      isInitialMount.current = true;
    };
  }, [analysisId, fetchAnalysis]);

  const value = useMemo(
    () => ({
      analysis,
      isLoading,
      refreshAnalysis: fetchAnalysis,
    }),
    [analysis, isLoading, fetchAnalysis],
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
