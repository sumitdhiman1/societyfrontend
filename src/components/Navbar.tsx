"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
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
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
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

  const router = useRouter();
  const pathname = usePathname();
  const isCalculatorPage = pathname === "/calculator";
  const shouldHideMenu = hideMenu || isCalculatorPage;
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const { openChat } = useChatWidget();
  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    const initAuth = async () => {
      const auth = authService.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) {
        const u = authService.getUser();
        setCurrentUser(u);
        if (u) setAvatar(u.avatar || null);
      } else {
        setCurrentUser(null);
      }
    };
    initAuth();

    const handleLogout = () => {
      setIsAuthenticated(false);
      setAvatar(null);
      setCurrentUser(null);
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

  const userId = currentUser?._id || currentUser?.id;
  const user = currentUser || authService.getUser() || {};

  // Real-time notifications socket connection
  useEffect(() => {
    let activeSocket: Socket | null = null;
    let isCancelled = false;

    if (!userId) {
      console.log("[Frontend Navbar Socket] ⏳ Waiting for userId before connecting...");
      return;
    }
    if (socketRef.current) {
      console.log("[Frontend Navbar Socket] ✅ Socket already open, skipping re-connect.");
      return;
    }

    const connectSocket = async () => {
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
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
        "http://localhost:5001";

      console.log("[Frontend Navbar Socket] 🔌 Connecting to", socketUrl, "| userId:", userId);

      const sock = io(socketUrl, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: { token, userId },
        query: { token, userId },
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
      });

      activeSocket = sock;
      socketRef.current = sock;

      sock.on("connect", () => {
        console.log("[Frontend Navbar Socket] ✅ Connected! Socket ID:", sock.id, "| userId room: user-" + userId);
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
        setUnreadCount((prev) => {
          console.log("[Frontend Navbar Socket] Badge count:", prev, "→", prev + 1);
          return prev + 1;
        });
        window.dispatchEvent(new CustomEvent("notification:received", { detail: notif }));
        window.dispatchEvent(new CustomEvent("notification:new", { detail: notif }));
      });

      sock.on("project_message", (data: any) => {
        console.log("[Frontend Navbar Socket] 💬 project_message received:", data);
        window.dispatchEvent(new CustomEvent("project_message", { detail: data }));
      });

      sock.on("project_updated", (data: any) => {
        console.log("[Frontend Navbar Socket] 🔄 project_updated received:", data);
        window.dispatchEvent(new CustomEvent("project_updated", { detail: data }));
      });

      sock.on("quote_message", (data: any) => {
        console.log("[Frontend Navbar Socket] 💬 quote_message received:", data);
        window.dispatchEvent(new CustomEvent("quote_message", { detail: data }));
      });

      sock.on("quote_updated", (data: any) => {
        console.log("[Frontend Navbar Socket] 🔄 quote_updated received:", data);
        window.dispatchEvent(new CustomEvent("quote_updated", { detail: data }));
      });
    };

    connectSocket();

    return () => {
      isCancelled = true;
      console.log("[Frontend Navbar Socket] 🧹 Cleaning up socket for userId:", userId);
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
        notificationService.getUnreadCount().then((res: any) => {
          setUnreadCount(
            res.data?.count ?? (typeof res.data === "number" ? res.data : 0),
          );
        });
      };

      fetchCount();

      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target))
        setNotificationsOpen(false);
      if (profileRef.current && !profileRef.current.contains(target))
        setProfileDropdownOpen(false);
      if (searchRef.current && !searchRef.current.contains(target))
        setShowSuggestions(false);
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
    <nav className="w-full h-[88px] bg-[#00102E] text-white shadow-[0px_5px_20px_#0000000D] relative z-50 font-sans">
      <div className="max-w-[1536px]  mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] h-full flex items-center justify-between">
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile view - lefside menu trigger visible only if the user is logined  */}
          {isAuthenticated && (
            <button
              className="xl:hidden  text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <MenuIcon />
            </button>
          )}

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 z-50 shrink-0"
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

        {/* Mobile Search - Visible only on mobile/tablet */}
        {!shouldHideMenu && (
          <div className="flex-1 mx-4 h-10 bg-white rounded-md flex items-center overflow-hidden lg:hidden max-w-[400px]">
            <input
              type="text"
              placeholder="Search"
              className="flex-1 pl-3 pr-1 text-gray-700 bg-transparent outline-none placeholder-gray-400 text-sm font-medium font-sans"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchSuggestions(e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              onFocus={() => setShowSuggestions(true)}
            />
            <button
              onClick={() => handleSearch()}
              className="h-full w-10 bg-[#4343F0] hover:bg-[#3232b7] text-white flex items-center justify-center transition-colors shrink-0"
            >
              <SearchIcon />
            </button>
          </div>
        )}

        {/* Desktop Search */}
        {!shouldHideMenu && (
          <div
            className="hidden lg:block flex-1 max-w-md xl:max-w-2xl lg:mx-4 xl:mx-8 px-4 relative"
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
                          setSearchQuery(item.text);
                          handleSearch(item.text);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-800 group-hover:text-[#4343F0]">
                            {item.text}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
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

              <div className="flex items-center gap-5 pl-2">
                <Notification
                  notificationRef={notificationRef}
                  notificationsOpen={notificationsOpen}
                  setNotificationsOpen={setNotificationsOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                  isAuthenticated={isAuthenticated}
                  unreadCount={unreadCount}
                  setUnreadCount={setUnreadCount}
                />

                <button
                  onClick={openChat}
                  className="w-10 h-10 rounded-full bg-white text-gray-700 flex items-center justify-center transition-transform hover:scale-105 shadow-sm"
                >
                  <ChatIcon />
                </button>

                <div className="h-10 w-[1px] bg-gray-600 mx-2" />

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
        <div className="xl:hidden flex items-center gap-4 shrink-0">
          {isAuthenticated ? (
            <>
              <Notification
                notificationRef={notificationRef}
                notificationsOpen={notificationsOpen}
                setNotificationsOpen={setNotificationsOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                isAuthenticated={isAuthenticated}
                unreadCount={unreadCount}
                setUnreadCount={setUnreadCount}
              />
              <Profile
                profileRef={profileRef}
                avatar={user.avatar ?? ""}
                profileDropdownOpen={profileDropdownOpen}
                setIsAuthenticated={setIsAuthenticated}
                setProfileDropdownOpen={setProfileDropdownOpen}
              />
            </>
          ) : (
            <button
              className="p-2 text-white hover:bg-gray-700 rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <MenuIcon />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu - slides in from right */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-[300px] max-w-[85vw] bg-[#EAEAFF] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-6 py-3    shrink-0">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#4343F0] p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {!isAuthenticated && (
              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-gray-300">
                <button
                  onClick={() => {
                    router.push("/login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full h-11  bg-[#4343F0]   text-white text-sm font-bold flex items-center justify-center rounded-md"
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
                    setMobileMenuOpen(false);
                  }}
                  className="w-full h-11 border-2 text-[#4343F0] border-[#4343F0] text-sm font-bold flex items-center justify-center rounded-md"
                >
                  Register
                </button>
              </div>
            )}


            {isAuthenticated && (
              <div className="flex flex-col gap-5 pb-4 border-b border-gray-300">
                <button
                  onClick={() => {
                    router.push("/dashboard/my-analyses");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left text-[#363636] hover:text-[#4343F0] hover:bg-white/5 px-4 rounded-md text-sm font-medium transition-colors"
                >
                  My Analyses
                </button>
                <button
                  onClick={() => {
                    router.push("/dashboard/my-quotes");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left  text-[#363636]
                   hover:text-[#4343F0] hover:bg-white/5 px-4  
                   rounded-md text-sm font-medium transition-colors"
                >
                  My Quotes
                </button>
                <button
                  onClick={() => {
                    router.push("/dashboard/my-projects");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left  text-[#363636] hover:text-[#4343F0]
                   hover:bg-white/5 px-4 pb-2 rounded-md text-sm font-medium transition-colors"
                >
                  My Projects
                </button>
                <button
                  onClick={() => {
                    router.push("/dashboard/new-project");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-[#4343F0] hover:bg-[#3232b7]
                   text-white text-sm font-bold px-4 py-3 rounded-md shadow-sm 
                   transition-colors text-center"
                >
                  New Project
                </button>

                <button
                  onClick={() => {
                    authService.logout();
                    setIsAuthenticated(false);
                    router.push("/");
                    setMobileMenuOpen(false);
                  }}
                  className="text-red-600 hover:text-red-800 hover:bg-red-500/10 px-4 py-2 rounded-md text-sm font-medium text-left transition-colors w-full flex items-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log Out
                </button>
              </div>
            )}

            {/* {isAuthenticated && (
              <>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                      onClick={() => openChat()}
                    >
                      <ChatIcon />
                    </button>
                  </div>
                </div>
              </>
            )} */}
          </div>
        </div>
      </div>
    </nav>
  );
}
