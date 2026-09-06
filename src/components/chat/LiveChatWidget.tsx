"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChatWidget } from "@/context/ChatWidgetContext";
import { chatService } from "@/lib/chatService";
import { mediaService } from "@/lib/mediaService";
import { authService } from "@/lib/authService";
import { io, Socket } from "socket.io-client";

export default function LiveChatWidget() {
  const { isOpen, toggleChat, closeChat, bottomOffset } = useChatWidget();
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const activeChatRef = useRef<any>(null);

  // Keep activeChatRef synchronized
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAgentTyping]);

  // Connect Socket.IO
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      setIsConnected(true);
      return socketRef.current;
    }

    const token = authService.getAccessToken();
    const user = authService.getUser();
    const userId = user?.id || user?._id;

    const socketUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
      (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : "http://localhost:5000");

    const newSocket = io(socketUrl, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: token ? { token, userId } : undefined,
      query: token ? { token, userId } : undefined,
    });

    newSocket.on("connect", () => {
      console.log("[LiveChat] Socket connected:", newSocket.id);
      setIsConnected(true);
      const currentId = activeChatRef.current?._id;
      if (currentId) {
        newSocket.emit("joinRoom", currentId);
        newSocket.emit("joinChat", { chatId: currentId });
      }
    });

    newSocket.on("disconnect", () => {
      console.log("[LiveChat] Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("[LiveChat] Socket connection warning:", err.message);
      setIsConnected(false);
    });

    newSocket.on("newMessage", (data: any) => {
      const msg = data?.message || data;
      if (msg) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) =>
              (m._id && msg._id && m._id.toString() === msg._id.toString()) ||
              (m.text === msg.text &&
                Math.abs(
                  new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()
                ) < 3000)
          );
          if (exists) {
            return prev.map((m) =>
              m._id?.toString().startsWith("temp-") && m.text === msg.text ? msg : m
            );
          }
          return [...prev, msg];
        });

        if (!isOpen) {
          setUnreadCount((count) => count + 1);
        }
      }
    });

    newSocket.on("userTyping", (data: any) => {
      if (data?.chatId === activeChatRef.current?._id) {
        setIsAgentTyping(!!data?.isTyping);
      }
    });

    socketRef.current = newSocket;
    return newSocket;
  }, [isOpen]);

  // Connect socket on mount and whenever widget opens
  useEffect(() => {
    const socket = connectSocket();
    if (socket?.connected) {
      setIsConnected(true);
    }
  }, [connectSocket, isOpen]);

  // Resume existing ongoing chat if present in session storage or logged-in user
  useEffect(() => {
    if (!isOpen) return;
    setUnreadCount(0);

    const checkExistingChat = async () => {
      const savedChatId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("society_active_chat_id")
          : null;

      if (savedChatId && !activeChatRef.current) {
        try {
          const chat = await chatService.getChatDetails(savedChatId);
          if (chat && chat._id && chat.status === "active" && Array.isArray(chat.messages) && chat.messages.length > 0) {
            setActiveChat(chat);
            setMessages(chat.messages);

            const socket = socketRef.current || connectSocket();
            if (socket) {
              socket.emit("joinRoom", chat._id);
              socket.emit("joinChat", { chatId: chat._id });
            }
          } else {
            sessionStorage.removeItem("society_active_chat_id");
          }
        } catch {
          sessionStorage.removeItem("society_active_chat_id");
        }
      }
    };

    checkExistingChat();
  }, [isOpen, connectSocket]);

  // Typing indicator emission
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (socketRef.current && activeChat?._id) {
      socketRef.current.emit("typing", { chatId: activeChat._id, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("typing", { chatId: activeChat?._id, isTyping: false });
      }, 2000);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isSending) return;

    setIsSending(true);

    let currentChat = activeChat;
    // If no active chat session exists yet, create one on first message
    if (!currentChat || !currentChat._id) {
      try {
        currentChat = await chatService.startChat();
        if (currentChat?._id) {
          setActiveChat(currentChat);
          sessionStorage.setItem("society_active_chat_id", currentChat._id);
          const socket = socketRef.current || connectSocket();
          socket?.emit("joinRoom", currentChat._id);
          socket?.emit("joinChat", { chatId: currentChat._id });
        }
      } catch (err) {
        console.error("[LiveChat] Failed to start chat:", err);
        setIsSending(false);
        return;
      }
    }

    if (!currentChat?._id) {
      console.error("[LiveChat] Could not obtain chat ID");
      setIsSending(false);
      return;
    }

    const currentAttachments = [...attachments];
    const optimisticMessage = {
      _id: "temp-" + Date.now(),
      sender: authService.getUser()?.id || authService.getUser()?._id || null,
      senderName: authService.getUser()?.fullName || "You",
      text: trimmed,
      attachments: currentAttachments,
      createdAt: new Date().toISOString(),
      isRead: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");
    setAttachments([]);

    const socket = socketRef.current || connectSocket();
    if (socket) {
      socket.emit("sendMessage", {
        chatId: currentChat._id,
        text: trimmed,
        attachments: currentAttachments,
      });
    }

    setIsSending(false);
  };

  // End chat handler
  const handleEndChat = async () => {
    if (!activeChat?._id) return;
    if (confirm("Are you sure you want to end this chat session?")) {
      try {
        await chatService.closeChat(activeChat._id);
      } catch (err) {
        console.error("[LiveChat] Error closing chat:", err);
      } finally {
        if (socketRef.current && activeChat._id) {
          socketRef.current.emit("leaveRoom", activeChat._id);
          socketRef.current.emit("leaveChat", { chatId: activeChat._id });
        }
        sessionStorage.removeItem("society_active_chat_id");
        setActiveChat(null);
        setMessages([]);
        closeChat();
      }
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      try {
        const file = e.target.files[0];
        const res = await mediaService.uploadImage({ file, folder: "chat-attachments" });
        const url =
          res?.data?.secure_url || res?.data?.url || res?.secure_url || res?.url || "";
        if (url) {
          setAttachments((prev) => [
            ...prev,
            { url, filename: file.name, fileType: file.type },
          ]);
        }
      } catch (error) {
        console.error("[LiveChat] Upload failed:", error);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const currentUser = authService.getUser();
  const currentUserId = currentUser?.id || currentUser?._id;

  // Only show END CHAT button if there is an active ongoing chat with messages
  const hasActiveConversation = activeChat?._id && activeChat.status === "active" && messages.length > 0;

  return (
    <>
      {/* Chat Window */}
      <div
        className={`fixed right-4 sm:right-6 z-[999] transition-all duration-300 ease-in-out origin-bottom-right transform ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        }`}
        style={{ bottom: "calc(1rem + 80px)" }}
      >
        <div className="w-[calc(100vw-32px)] sm:w-[380px] h-[520px] sm:h-[600px] max-h-[82vh] bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="bg-[#0D1939] p-4 flex justify-between items-center text-white shrink-0 shadow-sm">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">Live Support</h2>
              <div className="flex items-center gap-3 mt-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-400"
                    }`}
                  ></span>
                  <span className="text-xs font-medium text-gray-300">
                    {isConnected ? "Connected" : "Connecting..."}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-400">Helper Active</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {hasActiveConversation && (
                <button
                  onClick={handleEndChat}
                  className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-wider transition-colors shadow-sm"
                >
                  End Chat
                </button>
              )}
              <button
                onClick={closeChat}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body / Messages List */}
          <div className="flex-1 p-4 bg-[#F8F9FB] overflow-y-auto flex flex-col space-y-3">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold text-sm mb-1">How can we help you today?</p>
                <p className="text-gray-400 text-xs max-w-[240px] leading-relaxed">
                  Start a conversation with our support team. We typically reply in a few minutes.
                </p>
              </div>
            ) : (
              messages.map((msg: any, idx: number) => {
                const senderId =
                  typeof msg.sender === "object"
                    ? msg.sender?._id || msg.sender?.id
                    : msg.sender;
                const isMe =
                  (currentUserId && senderId && currentUserId.toString() === senderId.toString()) ||
                  (!senderId && msg.senderName === "You") ||
                  msg._id?.toString().startsWith("temp-");

                return (
                  <div
                    key={msg._id || idx}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    {!isMe && (
                      <span className="text-[11px] font-semibold text-gray-500 mb-0.5 ml-1">
                        {msg.senderName || "Support"}
                      </span>
                    )}
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe
                          ? "bg-[#5356ff] text-white rounded-br-none"
                          : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                      }`}
                    >
                      {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {msg.attachments.map((file: any, fIdx: number) => {
                            const isImage =
                              file.fileType?.startsWith("image/") ||
                              /\.(png|jpe?g|gif|webp)$/i.test(file.url || "");
                            return isImage ? (
                              <a
                                key={fIdx}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-lg overflow-hidden border border-black/10 max-h-48 hover:opacity-95"
                              >
                                <img
                                  src={file.url}
                                  alt={file.filename || "Attachment"}
                                  className="w-full h-auto object-cover max-h-48"
                                />
                              </a>
                            ) : (
                              <a
                                key={fIdx}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border ${
                                  isMe
                                    ? "bg-white/20 border-white/30 text-white"
                                    : "bg-gray-50 border-gray-200 text-gray-700"
                                }`}
                              >
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">{file.filename || "Download File"}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}

                      <div
                        className={`text-[9px] mt-1 ${
                          isMe ? "text-indigo-100 text-right" : "text-gray-400"
                        }`}
                      >
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isAgentTyping && (
              <div className="flex items-center gap-2 text-xs text-gray-500 italic bg-white px-3 py-1.5 rounded-full w-fit border border-gray-200 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span>Support is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview Bar */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 overflow-x-auto">
              {attachments.map((att, i) => (
                <div key={i} className="relative group shrink-0">
                  <div className="h-14 w-14 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden p-1">
                    {att.fileType?.startsWith("image/") ? (
                      <img src={att.url} alt={att.filename} className="w-full h-full object-cover rounded" />
                    ) : (
                      <span className="text-[10px] text-gray-500 truncate">{att.filename}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`p-2 rounded-lg transition-colors ${
                  isUploading
                    ? "text-indigo-600 animate-spin"
                    : "text-gray-400 hover:text-indigo-600 hover:bg-gray-100"
                }`}
                title="Attach file"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input
                type="text"
                value={text}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5356ff]/20 focus:border-[#5356ff] placeholder-gray-400"
              />

              <button
                type="submit"
                disabled={(!text.trim() && attachments.length === 0) || isUploading || isSending}
                className={`p-2.5 rounded-full transition-all flex items-center justify-center shrink-0 shadow-sm ${
                  (!text.trim() && attachments.length === 0) || isUploading || isSending
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-[#5356ff] text-white hover:bg-[#3232b7] hover:scale-105"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <div
        className="fixed right-4 sm:right-6 z-[999] transition-all duration-500 ease-in-out"
        style={{ bottom: `calc(${bottomOffset}px + 1rem)` }}
      >
        <button
          onClick={() => {
            if (!hasInteracted) setHasInteracted(true);
            toggleChat();
          }}
          className={`p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center relative ${
            isOpen
              ? "bg-red-500 hover:bg-red-600 rotate-90"
              : "bg-[#5356ff] hover:bg-[#3232b7]"
          }`}
          aria-label="Toggle Live Chat"
        >
          {unreadCount > 0 && !isOpen && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
          {isOpen ? (
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
