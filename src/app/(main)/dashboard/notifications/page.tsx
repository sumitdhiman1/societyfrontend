"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notificationService } from "@/lib/services";
import { authService } from "@/lib/authService";

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill="currentColor" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.6666 5L7.49992 14.1667L3.33325 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EyeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const fetchNotifications = async (targetPage = 1, append = false) => {
    try {
      if (append) setIsFetchingMore(true);
      else setLoading(true);

      const res = await notificationService.getAllNotifications({ page: targetPage, limit: 10 });
      if (res?.data) {
        const newNotifications = res.data.notifications || [];
        if (append) {
          setNotifications(prev => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }

        if (res.data.pagination) {
          const { currentPage, totalPages } = res.data.pagination;
          setPagination(res.data.pagination);
          setHasMore(currentPage < totalPages);
          setPage(currentPage);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      if (res?.data) {
        setUnreadCount(typeof res.data.count === 'number' ? res.data.count : (typeof res.data === 'number' ? res.data : 0));
      }
    } catch (error) {
      console.error("Failed to fetch unread count", error);
    }
  };

  useEffect(() => {
    if (authService.isAuthenticated()) {
      fetchNotifications(1, false);
      fetchUnreadCount();
    } else {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 50 >=
        document.documentElement.offsetHeight
      ) {
        if (hasMore && !isFetchingMore && !loading) {
          fetchNotifications(page + 1, true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, isFetchingMore, loading, page]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      // Optimistic update
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      notificationService.markRead(notif._id).catch(error => {
        console.error("Failed to mark notification as read", error);
      });
    }

    let redirectUrl = notif.redirectUrl || "/dashboard/notifications";

    if (redirectUrl) {
      router.push(redirectUrl);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4">
          <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100">
            Notifications {unreadCount > 0 && <span className="text-sm bg-primary-300 text-white px-2 py-0.5 rounded-full ml-2">{unreadCount}</span>}
          </h1>
        </div>

        <div className="border border-gray-300 rounded-[4px] bg-white overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
            <h3 className="font-bold text-gray-500 text-lg">
              Recent Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[#5356ff] hover:text-[#3232b7] hover:underline transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="flex justify-center mb-4 text-gray-300">
                <BellIcon />
              </div>
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`px-8 py-6 border-b border-gray-100 transition-colors flex items-center gap-5 ${!notif.isRead ? "bg-blue-50/50 hover:bg-blue-100/50" : "bg-white hover:bg-gray-50"}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${!notif.isRead ? "bg-[#5356ff] text-white" : "bg-gray-500/10 text-gray-400"}`}>
                    <BellIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-base font-bold truncate ${!notif.isRead ? "text-gray-800" : "text-gray-600"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNotificationClick(notif); }}
                    className="flex items-center gap-2 bg-[#5356ff] hover:bg-[#3232b7] text-white text-xs font-bold px-6 py-3 rounded-[4px] shadow-sm transition-colors shrink-0"
                  >
                    <EyeIcon className="w-4 h-4 pointer-events-none" />
                    View
                  </button>
                </div>
              ))}
              {isFetchingMore && (
                <div className="py-6 text-center text-sm text-gray-400 animate-pulse">
                  Loading more notifications...
                </div>
              )}
            </div>
          )}
        </div>


      </main>
    </div>
  );
}
