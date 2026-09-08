"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/lib/projectService";
import { authService } from "@/lib/authService";
import { io, Socket } from "socket.io-client";

interface ProjectContextType {
  project: any | null;
  isLoading: boolean;
  refreshProject: (silent?: boolean) => Promise<any>;
  setProject: React.Dispatch<React.SetStateAction<any | null>>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProject = useCallback(async (silent = false) => {
    if (!projectId) return null;
    
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const res = await projectService.getProjectById(projectId);
      if (res?.data) {
        setProject(res.data);
        return res.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch project:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push(`/login?redirect=/dashboard/my-projects/${projectId}`);
      return;
    }

    if (projectId) {
      fetchProject();
    }
  }, [projectId, router, fetchProject]);

  const refreshProject = useCallback((silent = true) => {
    return fetchProject(silent);
  }, [fetchProject]);

  // Real-time socket connection for live updates
  useEffect(() => {
    if (!projectId) return;

    let activeSocket: Socket | null = null;
    let isCancelled = false;

    const connectSocket = async () => {
      let token = authService.getAccessToken();
      if (!token) {
        token = await authService.refreshToken();
      }

      if (isCancelled) return;

      const currentUserObj = authService.getUser();
      const uId = currentUserObj?.id || currentUserObj?._id;

      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
        "http://localhost:5001";

      const authPayload: Record<string, any> = {};
      const queryPayload: Record<string, any> = {};

      if (token) {
        authPayload.token = token;
        queryPayload.token = token;
      }
      if (uId) {
        authPayload.userId = uId;
        queryPayload.userId = uId;
      }

      const sock: Socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: authPayload,
        query: queryPayload,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      if (isCancelled) {
        sock.disconnect();
        return;
      }

      activeSocket = sock;

      sock.on("connect", () => {
        sock.emit("joinProject", projectId);
        sock.emit("joinProject", { projectId });
      });

      const handleMessageUpdate = (data: any) => {
        const incomingId =
          data?.projectId ||
          data?.id ||
          data?._id ||
          data?.project?._id ||
          data?.project?.id;
        if (!incomingId || String(incomingId) === String(projectId)) {
          if (data?.project && (String(data.project._id || data.project.id) === String(projectId))) {
            setProject((prev: any) => ({ ...prev, ...data.project }));
          } else if (data?.message) {
            setProject((prev: any) => {
              if (!prev) return prev;
              const existingMsgs = prev.messages || [];
              const incomingMsgId = data.message._id || data.message.id;
              if (incomingMsgId && existingMsgs.some((m: any) => (m._id || m.id) === incomingMsgId)) {
                return prev;
              }
              return {
                ...prev,
                messages: [...existingMsgs, data.message],
                status: data.project?.status || prev.status,
              };
            });
          }
          fetchProject(true);
        }
      };

      sock.on("projectMessage", handleMessageUpdate);
      sock.on("project_message", handleMessageUpdate);
      sock.on("projectUpdated", handleMessageUpdate);
      sock.on("project_updated", handleMessageUpdate);
      sock.on("newMessage", handleMessageUpdate);
      sock.on("new_message", handleMessageUpdate);
      sock.on("notification", (notif: any) => {
        const pId = notif?.data?.projectId || notif?.projectId;
        if (!pId || String(pId) === String(projectId)) {
          fetchProject(true);
        }
      });
    };

    connectSocket();

    return () => {
      isCancelled = true;
      if (activeSocket) {
        try {
          activeSocket.emit("leaveProject", projectId);
          activeSocket.disconnect();
        } catch {}
      }
    };
  }, [projectId, fetchProject]);

  const value = useMemo(() => ({
    project,
    isLoading,
    refreshProject,
    setProject
  }), [project, isLoading, refreshProject]);

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
