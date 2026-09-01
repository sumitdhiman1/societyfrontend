"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/lib/projectService";
import { authService } from "@/lib/authService";

interface ProjectContextType {
  project: any | null;
  isLoading: boolean;
  refreshProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialMount = useRef(true);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const res = await projectService.getProjectById(projectId);
      if (res?.data) {
        setProject(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push(`/login?redirect=/dashboard/my-projects/${projectId}`);
      return;
    }

    if (projectId && isInitialMount.current) {
      isInitialMount.current = false;
      fetchProject();
    }
    
    return () => {
      isInitialMount.current = true;
    };
  }, [projectId, fetchProject, router]);

  const value = useMemo(() => ({
    project,
    isLoading,
    refreshProject: fetchProject
  }), [project, isLoading, fetchProject]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
