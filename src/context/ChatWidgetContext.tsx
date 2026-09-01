"use client";

import React, { createContext, useContext, useState } from "react";

interface ChatWidgetContextType {
  isOpen: boolean;
  bottomOffset: number;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setBottomOffset: (offset: number) => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextType>({
  isOpen: false,
  bottomOffset: 0,
  openChat: () => {},
  closeChat: () => {},
  toggleChat: () => {},
  setBottomOffset: () => {},
});

export function ChatWidgetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen((prev) => !prev);

  return (
    <ChatWidgetContext.Provider
      value={{ isOpen, bottomOffset, openChat, closeChat, toggleChat, setBottomOffset }}
    >
      {children}
    </ChatWidgetContext.Provider>
  );
}

export const useChatWidget = () => useContext(ChatWidgetContext);
