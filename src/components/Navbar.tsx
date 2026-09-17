"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useChatWidget } from "@/context/ChatWidgetContext";
import { useCurrency } from "@/context/CurrencyContext";
import { authService } from "@/lib/authService";
import { notificationService, searchService } from "@/lib/services";
import Notification from "@/components/common/Notification";
import Avatar from "@/components/common/Avatar";
import { Profile } from "@/components/common/Profile";
import { io, Socket } from "socket.io-client";
const SearchIcon = ({ className = "h-5 w-5", ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
);

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-9 w-9"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const HaveQuestionsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.05566 12.7191C-3.30398 3.29209 8.32684 -3.98504 14.8193 2.68491C21.4988 9.21804 14.2093 20.8 4.78906 16.4554L1.4707 16.7787C1.26975 16.798 1.07029 16.726 0.927734 16.5833C0.785324 16.4407 0.713988 16.2413 0.733398 16.0404L1.05566 12.7191ZM13.8652 3.64194C8.09139 -2.15271 -1.63995 4.53226 2.41113 12.598L2.42383 12.6234L2.4209 12.6527L2.15723 15.3529L4.85742 15.0902L4.88477 15.0882L4.91016 15.0999C7.90666 16.5489 11.4652 16.4 13.8936 13.9291C15.5869 12.0956 16.1729 10.1214 16.042 8.30991C15.9108 6.49524 15.0592 4.83681 13.8652 3.64194ZM8.74219 12.1712V12.1722C9.10604 12.185 9.39453 12.4839 9.39453 12.848C9.39438 13.2124 9.10616 13.5117 8.74219 13.5238H8.73535C8.37102 13.5119 8.08316 13.2124 8.08301 12.848C8.08301 12.484 8.37124 12.1849 8.73535 12.1722L8.74219 12.1712ZM9.41406 10.9544C9.409 11.3244 9.10813 11.6214 8.73828 11.6214C8.36917 11.6213 8.06839 11.324 8.0625 10.9544V10.3744C8.05825 9.49604 8.56937 8.6961 9.36914 8.33139L9.37012 8.33042C9.99024 8.05971 10.3555 7.40894 10.2617 6.73862L10.2607 6.73667C10.1675 5.92486 9.45605 5.32638 8.64062 5.37436C7.82531 5.42172 7.18841 6.09841 7.19043 6.91636L7.17773 7.04917C7.1518 7.17879 7.0881 7.29892 6.99316 7.39389C6.86669 7.5204 6.69473 7.59205 6.51562 7.59214H6.50293V7.59116C6.33136 7.57032 6.19169 7.51453 6.08398 7.42612C5.9761 7.33756 5.90642 7.2217 5.86719 7.09116C5.79004 6.83402 5.82822 6.51497 5.92188 6.20346C6.01643 5.88905 6.17181 5.56772 6.34375 5.29819C6.5113 5.03555 6.70133 4.81164 6.87598 4.6937L7.08398 4.53647C7.58346 4.19287 8.17989 4.01407 8.79004 4.02768C9.48829 4.04334 10.1574 4.30992 10.6738 4.77964C11.1905 5.24897 11.5195 5.88885 11.6025 6.58139L11.625 6.81186C11.6549 7.35027 11.5302 7.88806 11.2627 8.36069C10.9581 8.89931 10.4843 9.32256 9.91504 9.56675C9.60477 9.71347 9.40891 10.0298 9.41406 10.3734V10.9544Z" fill="#0D1939" stroke="#0D1939" strokeWidth="0.2"/>
  </svg>
);

const MobileUserIcon = () => (
  <svg width="15" height="19" viewBox="0 0 15 19" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.1604 0.100391C9.65605 0.100436 11.6858 2.13012 11.6858 4.62578C11.6857 7.1214 9.65592 9.15113 7.1604 9.15117C4.66474 9.15117 2.63505 7.12143 2.63501 4.62578C2.63501 2.1301 4.66471 0.100391 7.1604 0.100391ZM7.1604 1.56426C5.47064 1.56426 4.09888 2.93602 4.09888 4.62578C4.09892 6.31551 5.47067 7.68731 7.1604 7.68731C8.8501 7.68726 10.2219 6.31548 10.2219 4.62578C10.2219 2.93605 8.85012 1.5643 7.1604 1.56426Z" fill="#0D1939" stroke="#0D1939" strokeWidth="0.2"/>
    <path d="M10.1707 9.17482C10.4616 9.00464 10.794 8.94431 11.1082 9.01076L11.1072 9.01174C12.9081 9.38426 14.2097 10.9848 14.2097 12.8194V17.2451C14.2097 17.648 13.8802 17.9774 13.4773 17.9776H0.831787C0.429 17.9773 0.100342 17.648 0.100342 17.2451V12.8194C0.100392 10.9829 1.40396 9.38093 3.20776 9.01076C3.57354 8.93484 3.95571 9.03208 4.26636 9.2549H4.26733C5.95828 10.4812 8.35765 10.4813 10.0486 9.2549L10.1707 9.17482ZM10.8552 10.4551C9.78281 11.2464 8.49976 11.6553 7.16089 11.6553C5.81419 11.6553 4.52445 11.2421 3.43042 10.4551C2.36558 10.7013 1.57109 11.6855 1.57104 12.8194V16.5127H12.7507V12.8194C12.7507 11.6861 11.957 10.7015 10.8552 10.4551Z" fill="#0D1939" stroke="#0D1939" strokeWidth="0.2"/>
  </svg>
);

const MobileSearchButtonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.7552 15.5622L14.2499 12.0574C14.0917 11.8992 13.8772 11.8113 13.6522 11.8113H13.0791C14.0495 10.5705 14.6261 9.00967 14.6261 7.31179C14.6261 3.27273 11.3528 0 7.31303 0C3.27329 0 0 3.27273 0 7.31179C0 11.3508 3.27329 14.6236 7.31303 14.6236C9.01121 14.6236 10.5723 14.0471 11.8134 13.0768V13.6498C11.8134 13.8748 11.9013 14.0892 12.0595 14.2474L15.5648 17.7522C15.8953 18.0826 16.4297 18.0826 16.7567 17.7522L17.7517 16.7573C18.0822 16.4269 18.0822 15.8926 17.7552 15.5622ZM7.31303 11.8113C4.82731 11.8113 2.81271 9.80061 2.81271 7.31179C2.81271 4.82648 4.82379 2.81223 7.31303 2.81223C9.79876 2.81223 11.8134 4.82297 11.8134 7.31179C11.8134 9.79709 9.80228 11.8113 7.31303 11.8113Z" fill="white"/>
  </svg>
);

const mobileNavLinks = [
  { label: "Home", href: "/" },
  { label: "Graphic Design & Branding", href: "/dashboard/new-project/packages?categorycode=GDB" },
  { label: "Website Development", href: "/dashboard/new-project/packages?categorycode=WD" },
  { label: "Website Maintenance", href: "/dashboard/new-project/packages?categorycode=WM" },
  { label: "Search Engine Optimization", href: "/dashboard/new-project/packages?categorycode=SEO" },
  { label: "Social Media Marketing", href: "/dashboard/new-project/packages?categorycode=SMM" },
  { label: "Paid Ads Marketing", href: "/dashboard/new-project/packages?categorycode=PAM" },
];

export default function Navbar({ hideMenu = false }: { hideMenu?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen || mobileProfileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, mobileProfileOpen]);

  const router = useRouter();
  const shouldHideMenu = hideMenu;
  const navRef = useRef<HTMLElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const [navBottom, setNavBottom] = useState(88);

  const updateNavBottom = useCallback(() => {
    if (navRef.current) {
      const rect = navRef.current.getBoundingClientRect();
      setNavBottom(rect.bottom);
    }
  }, []);

  useEffect(() => {
    updateNavBottom();
    window.addEventListener("resize", updateNavBottom);
    window.addEventListener("scroll", updateNavBottom, { passive: true });
    return () => {
      window.removeEventListener("resize", updateNavBottom);
      window.removeEventListener("scroll", updateNavBottom);
    };
  }, [updateNavBottom]);

  useEffect(() => {
    if (mobileMenuOpen) {
      updateNavBottom();
    }
  }, [mobileMenuOpen, updateNavBottom]);

  const { openChat } = useChatWidget();
  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    const initAuth = async () => {
      const auth = authService.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) {
        const u = authService.getUser();
        if (u) {
          setCurrentUser(u);
          if (u.avatar) setAvatar(u.avatar);
        }
        authService.getProfile().then((profile) => {
          if (profile) {
            setCurrentUser(profile);
            if (profile.avatar) setAvatar(profile.avatar);
          }
        });
      } else {
        setCurrentUser(null);
        setAvatar(null);
      }
    };
    initAuth();

    const handleLogout = () => {
      setIsAuthenticated(false);
      setAvatar(null);
      setCurrentUser(null);
      setUnreadCount(0);
    };
    const handleLogin = () => {
      setIsAuthenticated(true);
      initAuth();
    };

    window.addEventListener("auth:logout", handleLogout);
    window.addEventListener("auth:login", handleLogin);
    return () => {
      window.removeEventListener("auth:logout", handleLogout);
      window.removeEventListener("auth:login", handleLogin);
    };
  }, []);

  const userId =
    currentUser?._id ||
    currentUser?.id ||
    authService.getUserId();
  const user = currentUser || authService.getUser() || {};

  // Real-time notifications socket connection
  useEffect(() => {
    let activeSocket: Socket | null = null;
    let isCancelled = false;

    if (!userId) {
      console.log("[Frontend Navbar Socket] ⏳ Waiting for userId before connecting...");
      return;
    }

    const refreshCountFromServer = () => {
      notificationService.getUnreadCount(true).then((res: any) => {
        const count = res.data?.count ?? (typeof res.data === "number" ? res.data : null);
        if (typeof count === "number") {
          setUnreadCount(count);
        }
      });
    };

    const connectSocket = async () => {
      if (socketRef.current?.connected) {
        console.log("[Frontend Navbar Socket] ✅ Socket already open, skipping re-connect.");
        return;
      }

      let token = authService.getAccessToken();
      if (!token) {
        console.log("[Frontend Navbar Socket] 🔄 Access token missing, attempting refresh...");
        token = await authService.refreshToken();
      }

      if (isCancelled) return;

      if (!token) {
        console.warn("[Frontend Navbar Socket] ⚠️ No access token found after refresh attempt, cannot connect.");
        return;
      }

      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
        "http://localhost:5001";

      console.log("[Frontend Navbar Socket] 🔌 Connecting to", socketUrl, "| userId:", userId);

      const authPayload: Record<string, any> = { token };
      const queryPayload: Record<string, any> = { token };
      if (userId && String(userId) !== "undefined" && String(userId) !== "null") {
        authPayload.userId = String(userId);
        queryPayload.userId = String(userId);
      }

      const sock = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: authPayload,
        query: queryPayload,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
      });

      activeSocket = sock;
      socketRef.current = sock;

      sock.on("connect", () => {
        console.log("[Frontend Navbar Socket] ✅ Connected! Socket ID:", sock.id, "| userId room: user-" + userId);
        refreshCountFromServer();
      });

      sock.on("disconnect", (reason) => {
        console.warn("[Frontend Navbar Socket] 🔴 Disconnected. Reason:", reason);
      });

      sock.on("connect_error", (err) => {
        console.error("[Frontend Navbar Socket] ❌ Connection error:", err.message);
      });

      sock.on("auth_error", (data: any) => {
        console.error("[Frontend Navbar Socket] 🔒 Auth error from server:", data);
      });

      sock.on("notification", (notif: any) => {
        console.log("[Frontend Navbar Socket] 🔔 Notification received:", notif);
        setUnreadCount((prev) => prev + 1);
        refreshCountFromServer();
        window.dispatchEvent(new CustomEvent("notification:received", { detail: notif }));
        window.dispatchEvent(new CustomEvent("notification:new", { detail: notif }));
      });

      sock.on("unread_count_updated", (data: any) => {
        console.log("[Frontend Navbar Socket] 🔢 unread_count_updated received:", data);
        if (typeof data?.count === "number") {
          setUnreadCount(data.count);
        }
      });

      sock.on("project_message", (data: any) => {
        console.log("[Frontend Navbar Socket] 💬 project_message received:", data);
        refreshCountFromServer();
        window.dispatchEvent(new CustomEvent("project_message", { detail: data }));
      });

      sock.on("project_updated", (data: any) => {
        console.log("[Frontend Navbar Socket] 🔄 project_updated received:", data);
        refreshCountFromServer();
        window.dispatchEvent(new CustomEvent("project_updated", { detail: data }));
      });

      sock.on("quote_message", (data: any) => {
        console.log("[Frontend Navbar Socket] 💬 quote_message received:", data);
        refreshCountFromServer();
        window.dispatchEvent(new CustomEvent("quote_message", { detail: data }));
      });

      sock.on("quote_updated", (data: any) => {
        console.log("[Frontend Navbar Socket] 🔄 quote_updated received:", data);
        refreshCountFromServer();
        window.dispatchEvent(new CustomEvent("quote_updated", { detail: data }));
      });

      sock.on("support_ticket_message", (data: any) => {
        refreshCountFromServer();
        window.dispatchEvent(new CustomEvent("support_ticket_message", { detail: data }));
      });
    };

    connectSocket();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!socketRef.current?.connected) {
          console.log("[Frontend Navbar Socket] 👁️ Tab visible, socket reconnecting...");
          connectSocket();
        }
        refreshCountFromServer();
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted || !socketRef.current?.connected) {
        console.log("[Frontend Navbar Socket] 🔄 pageshow event (bfcache restored), reconnecting...");
        connectSocket();
        refreshCountFromServer();
      }
    };

    const handleForceRefresh = () => refreshCountFromServer();

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("notification:refresh", handleForceRefresh);

    return () => {
      isCancelled = true;
      console.log("[Frontend Navbar Socket] 🧹 Cleaning up socket for userId:", userId);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("notification:refresh", handleForceRefresh);
      if (activeSocket) {
        activeSocket.disconnect();
      }
      socketRef.current = null;
    };
  }, [userId]);

  // Initial fetch and fallback poll
  useEffect(() => {
    if (isAuthenticated) {
      const fetchCount = () => {
        notificationService.getUnreadCount(true).then((res: any) => {
          const count = res.data?.count ?? (typeof res.data === "number" ? res.data : 0);
          setUnreadCount(count);
        });
      };

      fetchCount();

      const interval = setInterval(fetchCount, 25000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Use notificationContainerRef which wraps both desktop & mobile Notification
      // instances — avoids the stale ref problem when the same ref is passed to two
      // components and the mobile one overwrites the desktop one.
      const insideNotification =
        (notificationContainerRef.current && notificationContainerRef.current.contains(target)) ||
        (notificationRef.current && notificationRef.current.contains(target));
      if (!insideNotification) setNotificationsOpen(false);
      const insideProfile = profileRef.current && profileRef.current.contains(target);
      if (!insideProfile) {
        setProfileDropdownOpen(false);
      }
      const insideMobileProfile =
        (mobileProfileRef.current && mobileProfileRef.current.contains(target)) ||
        (mobileProfileMenuRef.current && mobileProfileMenuRef.current.contains(target));
      if (!insideMobileProfile) {
        setMobileProfileOpen(false);
      }
      const insideSearch =
        (searchRef.current && searchRef.current.contains(target)) ||
        (mobileSearchRef.current && mobileSearchRef.current.contains(target));
      if (!insideSearch) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await searchService.getSuggestions(query);
      const data = res.data?.data || res.data || [];
      setSuggestions(Array.isArray(data) ? data : []);
      setShowSuggestions(data.length > 0);
    } catch (err) {
      console.error("Suggestions fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => fetchSuggestions(searchQuery), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchSuggestions]);

  const handleSearch = (query?: string) => {
    const q = query || searchQuery;
    if (q.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav ref={navRef} className="w-full h-[88px] bg-[#00102E] text-white shadow-[0px_5px_20px_#0000000D] relative z-50 font-sans">
      <div className="max-w-[1536px]  mx-auto px-5 md:px-8 lg:pl-[54px] lg:pr-[62px] h-full flex items-center justify-between">
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Mobile view - menu trigger (hamburger when closed, X when open) */}
          <button
            className="xl:hidden text-white p-1 hover:bg-white/10 rounded-md transition-colors flex items-center justify-center"
            onClick={() => {
              if (mobileMenuOpen || mobileProfileOpen) {
                setMobileMenuOpen(false);
                setMobileProfileOpen(false);
              } else {
                setMobileMenuOpen(true);
              }
            }}
            aria-label={mobileMenuOpen || mobileProfileOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen || mobileProfileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <MenuIcon />
            )}
          </button>

          {/* Logo */}
          <Link
            href="/"
            onClick={() => {
              setMobileMenuOpen(false);
              setMobileProfileOpen(false);
            }}
            className="flex items-center gap-2 shrink-0"
          >
            <Image
              src="/images/Brand.svg"
              alt="Society Logo"
              width={162}
              height={32}
              priority
              className="object-contain w-[100px] lg:w-[162px] h-[24px] lg:h-[32px]"
              style={{ width: "auto", height: "auto" }}
            />
          </Link>
        </div>

        {/* Desktop Search */}
        {!shouldHideMenu && (
          <div
            className="hidden xl:block flex-1 max-w-md xl:max-w-2xl lg:mx-4 xl:mx-8 px-4 relative"
            ref={searchRef}
          >
            <div className="flex items-center w-full bg-white rounded-sm overflow-hidden h-11 shadow-sm border border-transparent focus-within:border-[#4343F0] transition-all">
              <input
                type="text"
                placeholder="What are you looking to create?"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 pl-4 pr-2 text-gray-700 bg-transparent outline-none placeholder-gray-400 text-sm font-medium font-sans"
              />
              <button
                onClick={() => handleSearch()}
                className="h-full px-5 bg-[#4343F0]  hover:bg-[#3232b7] text-white flex items-center justify-center transition-colors rounded-[6px]"
              >
                <SearchIcon />
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-white rounded-md shadow-xl border border-gray-100 overflow-hidden z-[100]">
                <ul className="py-2">
                  {suggestions.map((item, i) => (
                    <li key={i}>
                      <button
                        onClick={() => {
                          if (item.link) {
                            setShowSuggestions(false);
                            router.push(item.link);
                          } else {
                            setSearchQuery(item.text);
                            handleSearch(item.text);
                          }
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-800 group-hover:text-[#4343F0]">
                            {item.text}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wider font-bold ${item.category === "Free Package"
                                ? "text-emerald-600"
                                : "text-gray-400"
                              }`}
                          >
                            {item.category}
                          </span>
                        </div>
                        <svg
                          className="w-4 h-4  text-[#363636] group-hover:text-[#4343F0]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Desktop Menu */}
        <div className="hidden xl:flex items-center gap-4 xl:gap-8 shrink-0">

          {isAuthenticated ? (
            <>
              {!shouldHideMenu && (
                <div className="hidden xl:flex items-center gap-6">
                  <button
                    onClick={() => router.push("/dashboard/my-analyses")}
                    className=" text-white hover:text-gray-300 text-[15px] font-medium"
                  >
                    My Analyses
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/my-quotes")}
                    className=" text-white hover:text-gray-300 text-[15px] font-medium"
                  >
                    My Quotes
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/my-projects")}
                    className=" text-white hover:text-gray-300 text-[15px] font-medium"
                  >
                    My Projects
                  </button>
                </div>
              )}

              <button
                onClick={() => router.push("/dashboard/new-project")}
                className="bg-[#4343F0] hover:bg-white text-white hover:text-[#0D1939] px-4 xl:px-6 py-2.5 rounded-[7px] text-sm font-bold shadow-sm hover:shadow-md transition-all whitespace-nowrap font-sans border-2 border-[#4343F0] min-w-[140px] h-[46px]"
              >
                New Project
              </button>

              <div className="flex items-center gap-4 pl-2">
                <div ref={notificationContainerRef} className="flex items-center justify-center shrink-0">
                  <Notification
                    notificationRef={notificationRef}
                    notificationsOpen={notificationsOpen}
                    setNotificationsOpen={setNotificationsOpen}
                    setMobileMenuOpen={setMobileMenuOpen}
                    isAuthenticated={isAuthenticated}
                    unreadCount={unreadCount}
                    setUnreadCount={setUnreadCount}
                  />
                </div>

                <button
                  onClick={openChat}
                  className="w-10 h-10 rounded-full bg-white text-gray-700 flex items-center justify-center transition-transform hover:scale-105 shadow-sm shrink-0"
                >
                  <ChatIcon />
                </button>

                <div className="h-6 w-[1px] bg-white/20 shrink-0 self-center mx-1" />

                <Profile
                  profileRef={profileRef}
                  avatar={user.avatar ?? ""}
                  profileDropdownOpen={profileDropdownOpen}
                  setIsAuthenticated={setIsAuthenticated}
                  setProfileDropdownOpen={setProfileDropdownOpen}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/login")}
                className="w-[176px] h-[46px] border-2 border-[#E3E6E6] text-white text-[15px] font-bold flex items-center justify-center rounded-[7px] transition-colors hover:bg-white/10 whitespace-nowrap"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Log in
              </button>
              <button
                onClick={() => {
                  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                  if (currentPath.startsWith("/dashboard/my-analyses/")) {
                    router.push(`/register?from=analysis&redirect=${encodeURIComponent(currentPath)}`);
                  } else {
                    router.push("/register");
                  }
                }}
                className="w-[148px] h-[46px] bg-[#4545F0] hover:bg-[#3232b7] text-white text-[15px] font-bold flex items-center justify-center rounded-[7px] transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}
              >
                Register
              </button>
            </div>
          )}
        </div>

        {/* Mobile Right Side */}
        <div className="xl:hidden flex items-center gap-2.5 shrink-0">
          {isAuthenticated && (
            <Notification
              notificationRef={notificationRef}
              notificationsOpen={notificationsOpen}
              setNotificationsOpen={setNotificationsOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              isAuthenticated={isAuthenticated}
              unreadCount={unreadCount}
              setUnreadCount={setUnreadCount}
            />
          )}

          {/* User icon button */}
          <div className="relative" ref={mobileProfileRef}>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setMobileProfileOpen(!mobileProfileOpen);
                  setMobileMenuOpen(false);
                } else {
                  router.push("/login");
                }
              }}
              aria-label="Account"
              className="w-[38px] h-[38px] rounded-full bg-white flex items-center justify-center transition-transform hover:scale-105 shadow-sm shrink-0 overflow-hidden relative"
            >
              <MobileUserIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - 100% full width, search at top, same for logged in and logged out */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-x-0 bottom-0 z-40 bg-white flex flex-col transition-all duration-300 ease-in-out xl:hidden overflow-y-auto ${
              mobileMenuOpen
                ? "opacity-100 pointer-events-auto translate-y-0"
                : "opacity-0 pointer-events-none -translate-y-2"
            }`}
            style={{
              top: `${navBottom}px`,
              height: `calc(100dvh - ${navBottom}px)`,
              width: "100%",
            }}
          >
            {/* Search Bar at Top of Menu */}
            <div className="px-5 pt-5 pb-4 relative" ref={mobileSearchRef}>
              <div className="w-full flex items-center bg-white border-[0.5px] border-[#C4C4C4] rounded-[5px] h-[50px] overflow-hidden">
                <input
                  type="text"
                  placeholder="Search for it..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  onFocus={() => setShowSuggestions(true)}
                  className="flex-1 pl-4 pr-2 outline-none text-[14px] leading-[21px] text-[#8B8B8B] placeholder-[#8B8B8B] font-normal bg-transparent"
                  style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
                />
                <button
                  onClick={() => handleSearch()}
                  className="w-[50px] h-[50px] bg-[#4343F0] hover:bg-[#3232b7] text-white flex items-center justify-center transition-colors shrink-0 rounded-r-[5px]"
                  aria-label="Search"
                >
                  <MobileSearchButtonIcon />
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-5 right-5 mt-1 bg-white rounded-md shadow-xl border border-gray-100 overflow-hidden z-50">
                  <ul className="py-2">
                    {suggestions.map((item, i) => (
                      <li key={i}>
                        <button
                          onClick={() => {
                            if (item.link) {
                              setShowSuggestions(false);
                              setMobileMenuOpen(false);
                              router.push(item.link);
                            } else {
                              setSearchQuery(item.text);
                              handleSearch(item.text);
                            }
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-800 group-hover:text-[#4343F0]">
                              {item.text}
                            </span>
                            <span
                              className={`text-[10px] uppercase tracking-wider font-bold ${
                                item.category === "Free Package"
                                  ? "text-emerald-600"
                                  : "text-gray-400"
                              }`}
                            >
                              {item.category}
                            </span>
                          </div>
                          <svg
                            className="w-4 h-4 text-[#363636] group-hover:text-[#4343F0]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Divider below search bar */}
            <div style={{ borderBottom: "1px solid rgba(139, 139, 139, 0.29)", opacity: 0.5 }} />

            {/* Navigation links */}
            <div className="flex flex-col">
              {mobileNavLinks.map((link, index) => (
                <div key={link.label}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-5 hover:text-[#4343F0] hover:bg-gray-50 transition-colors"
                    style={{
                      fontFamily: "var(--font-inter), 'Inter', sans-serif",
                      fontWeight: 500,
                      fontSize: "14px",
                      lineHeight: "40px",
                      color: "#363636",
                      paddingTop: "6px",
                      paddingBottom: "6px",
                    }}
                  >
                    {link.label}
                  </Link>
                  {index < mobileNavLinks.length - 1 && (
                    <div style={{ borderBottom: "1px solid rgba(139, 139, 139, 0.29)", opacity: 0.5 }} />
                  )}
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}

      {/* Mobile Account Menu - 100% full width, exact like attached PDF */}
      {mounted &&
        typeof document !== "undefined" &&
        isAuthenticated &&
        createPortal(
          <div
            ref={mobileProfileMenuRef}
            className={`fixed inset-x-0 bottom-0 z-40 bg-white flex flex-col transition-all duration-300 ease-in-out xl:hidden overflow-y-auto ${
              mobileProfileOpen
                ? "opacity-100 pointer-events-auto translate-y-0"
                : "opacity-0 pointer-events-none -translate-y-2"
            }`}
            style={{
              top: `${navBottom}px`,
              height: `calc(100dvh - ${navBottom}px)`,
              width: "100%",
            }}
          >
            {/* ACCOUNT Section */}
            <div className="px-6 pt-6 pb-4 flex flex-col">
              <div className="flex items-center justify-between py-2">
                <button
                  onClick={() => {
                    setMobileProfileOpen(false);
                    router.push("/dashboard/myAccount");
                  }}
                  className="text-left font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                >
                  My Account
                </button>
                <span
                  className="text-[13px] font-bold text-[#A0AEC0] tracking-wider uppercase select-none"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                >
                  ACCOUNT
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileProfileOpen(false);
                  router.push("/dashboard/payment-history");
                }}
                className="w-full text-left py-2 font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                My Payments
              </button>
              <button
                onClick={() => {
                  setMobileProfileOpen(false);
                  router.push("/dashboard/renewals");
                }}
                className="w-full text-left py-2 font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                Renewals
              </button>
              <button
                onClick={() => {
                  setMobileProfileOpen(false);
                  router.push("/dashboard/settings");
                }}
                className="w-full text-left py-2 font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                Settings
              </button>
            </div>

            {/* Divider */}
            <div style={{ borderBottom: "1px solid rgba(139, 139, 139, 0.29)", opacity: 0.5 }} />

            {/* PROJECTS Section */}
            <div className="px-6 py-4 flex flex-col">
              <div className="flex items-center justify-between py-2">
                <button
                  onClick={() => {
                    setMobileProfileOpen(false);
                    router.push("/dashboard/new-project");
                  }}
                  className="text-left font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                >
                  New Project
                </button>
                <span
                  className="text-[13px] font-bold text-[#A0AEC0] tracking-wider uppercase select-none"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                >
                  PROJECTS
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileProfileOpen(false);
                  router.push("/dashboard/my-projects");
                }}
                className="w-full text-left py-2 font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                My Projects
              </button>
              <button
                onClick={() => {
                  setMobileProfileOpen(false);
                  router.push("/dashboard/my-quotes");
                }}
                className="w-full text-left py-2 font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                My Quotes
              </button>
              <button
                onClick={() => {
                  setMobileProfileOpen(false);
                  router.push("/dashboard/my-analyses");
                }}
                className="w-full text-left py-2 font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                My Analyses
              </button>
            </div>

            {/* Divider */}
            <div style={{ borderBottom: "1px solid rgba(139, 139, 139, 0.29)", opacity: 0.5 }} />

            {/* CONTACT Section */}
            <div className="px-6 py-4 flex flex-col">
              <div className="flex items-center justify-between py-2">
                <button
                  onClick={() => {
                    setMobileProfileOpen(false);
                    router.push("/help-support");
                  }}
                  className="text-left font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                >
                  Help & Support
                </button>
                <span
                  className="text-[13px] font-bold text-[#A0AEC0] tracking-wider uppercase select-none"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                >
                  CONTACT
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileProfileOpen(false);
                  openChat();
                }}
                className="w-full text-left py-2 font-medium text-[15px] text-[#363636] hover:text-[#4343F0] transition-colors"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                Live Chat
              </button>
            </div>

            {/* Divider */}
            <div style={{ borderBottom: "1px solid rgba(139, 139, 139, 0.29)", opacity: 0.5 }} />

            {/* Log Out Section */}
            <div className="flex items-center justify-center py-6">
              <button
                onClick={() => {
                  authService.logout();
                  setIsAuthenticated(false);
                  setMobileProfileOpen(false);
                  router.push("/");
                }}
                className="inline-flex items-center justify-center gap-2 text-[16px] font-semibold text-[#EF4444] hover:text-red-700 transition-colors"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log Out</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </nav>
  );
}
