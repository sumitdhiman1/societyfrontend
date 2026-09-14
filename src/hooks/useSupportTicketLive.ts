"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { authService } from "@/lib/authService";

export function useSupportTicketLive(
  ticketId: string | undefined,
  onLive: () => void,
): void {
  useEffect(() => {
    if (!ticketId) return;

    let activeSocket: Socket | null = null;
    let cancelled = false;

    const handlePayload = (data: unknown) => {
      const incoming =
        (data as { ticketId?: string; ticket?: { _id?: string }; data?: { ticketId?: string } })
          ?.ticketId ||
        (data as { ticket?: { _id?: string } })?.ticket?._id ||
        (data as { data?: { ticketId?: string } })?.data?.ticketId;
      if (!incoming || String(incoming) === String(ticketId)) {
        onLive();
      }
    };

    const connect = async () => {
      let token = authService.getAccessToken();
      if (!token) {
        token = await authService.refreshToken();
      }
      if (cancelled) return;

      const currentUser = authService.getUser();
      const userId = currentUser?.id || currentUser?._id || authService.getUserId();
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
        "http://localhost:5001";

      const authPayload: Record<string, string> = {};
      const queryPayload: Record<string, string> = {};
      if (token) {
        authPayload.token = token;
        queryPayload.token = token;
      }
      if (userId) {
        authPayload.userId = String(userId);
        queryPayload.userId = String(userId);
      }

      const sock: Socket = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: authPayload,
        query: queryPayload,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      if (cancelled) {
        sock.disconnect();
        return;
      }

      activeSocket = sock;

      sock.on("connect", () => {
        sock.emit("joinTicket", ticketId);
        sock.emit("joinTicket", { ticketId });
      });

      sock.on("support_ticket_message", handlePayload);
      sock.on("supportTicketMessage", handlePayload);
      sock.on("notification", (notif: { data?: { ticketId?: string }; ticketId?: string }) => {
        const tId = notif?.data?.ticketId || notif?.ticketId;
        if (tId && String(tId) === String(ticketId)) {
          onLive();
        }
      });
    };

    const onWindow = (event: Event) => {
      handlePayload((event as CustomEvent).detail);
    };
    window.addEventListener("support_ticket_message", onWindow);

    void connect();

    return () => {
      cancelled = true;
      window.removeEventListener("support_ticket_message", onWindow);
      if (activeSocket) {
        try {
          activeSocket.emit("leaveTicket", ticketId);
          activeSocket.disconnect();
        } catch {
          /* ignore */
        }
      }
    };
  }, [ticketId, onLive]);
}
