import BellIcon from "@/components/icons/bell";
import EyeIcon from "@/components/icons/eye";
import { notificationService } from "@/lib/services";
import { capitalizeCurrencyInText } from "@/lib/currencyUtils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NotificationProps {
  notificationRef: React.RefObject<HTMLDivElement | null>;
  setNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  notificationsOpen: boolean;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAuthenticated: boolean;
}

const Notification = ({
  notificationRef,
  setNotificationsOpen,
  notificationsOpen,
  unreadCount,
  setUnreadCount,
  setMobileMenuOpen,
  isAuthenticated,
}: NotificationProps) => {
  const router = useRouter();

  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const loadNotifications = async (page: number, append = false) => {
    if (!isAuthenticated || (loading && !append)) return;
    try {
      setLoading(true);
      const res = await notificationService.getAllNotifications({
        page,
        limit: 10,
      });
      const { notifications: items, pagination } = res.data || {
        notifications: [],
        pagination: {},
      };
      if (append) {
        setNotifications((prev) => [...prev, ...items]);
      } else {
        setNotifications(items);
      }
      setHasMore(pagination.currentPage < pagination.totalPages);
      setCurrentPage(page);
    } catch (err) {
      console.error("Notifications fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (notificationsOpen && isAuthenticated) {
      loadNotifications(1, false);
    }
  }, [notificationsOpen, isAuthenticated]);

  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const notif = (e as CustomEvent).detail;
      console.log("[Notification Component] Received custom event:", notif);
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notif._id)) return prev;
        return [notif, ...prev];
      });
    };

    window.addEventListener("notification:received", handleNewNotification);
    return () => {
      window.removeEventListener("notification:received", handleNewNotification);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20 && hasMore && !loading) {
      loadNotifications(currentPage + 1, true);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, isRead: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Fire and forget (or handle error in background)
      notificationService.markRead(notification._id).catch((err) => {
        console.error("Mark read error:", err);
        // Rollback if needed, but usually not necessary for this
      });
    }
    let redirectUrl = notification.redirectUrl || "/dashboard/notifications";

    if (redirectUrl) {
      router.push(redirectUrl);
    }
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  return (
    <div className="flex items-center justify-center shrink-0" ref={notificationRef}>
      <div className="relative flex items-center justify-center shrink-0">
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-white text-gray-700 flex items-center justify-center transition-transform hover:scale-105 shadow-sm shrink-0"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
        >
          <BellIcon />
        </button>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#5356FF] text-[10px] font-bold text-white ring-2 ring-[#00102E] z-10 pointer-events-none">
            {unreadCount}
          </span>
        )}
      </div>

      {notificationsOpen && (
        <div
          className="absolute top-[100%] mt-[14px] right-[120px] rounded-[16px] w-[500px] bg-white shadow-2xl z-50 text-left overflow-hidden formobile-cs pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-6 sm:px-8 py-5 sm:py-6 border-b border-gray-100 bg-white flex justify-between items-center">
            <h3 className="font-bold text-gray-700 text-base sm:text-lg">Notifications</h3>
            <div className="flex items-center gap-3 sm:gap-4">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllRead();
                  }}
                  className="text-xs font-semibold text-[#4343F0] hover:text-[#3232b7] hover:underline transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  router.push("/dashboard/notifications");
                  setNotificationsOpen(false);
                }}
                className="text-xs font-semibold text-[#4343F0] hover:text-[#3232b7] hover:underline transition-colors"
              >
                View All
              </button>
            </div>
          </div>
          <div
            className="max-h-[263px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
            onScroll={handleScroll}
          >
            {notifications.length === 0 ? (
              <div className="px-8 py-16 text-center text-gray-400 font-medium text-lg">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`px-5 sm:px-8 py-4 sm:py-6 order-b border-gray-100 flex items-center gap-5 transition-colors ${n.isRead ? "bg-white" : "bg-[#f7faff]  hover:bg-blue-100/50"}`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-500 flex items-center justify-center shrink-0">
                    <BellIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-base sm:text-base font-bold truncate mb-1 ${n.isRead ? "text-gray-600" : "text-gray-700"}`}
                    >
                      {capitalizeCurrencyInText(n.title)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {capitalizeCurrencyInText(n.message)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(n);
                    }}
                    className="flex items-center gap-1.5 sm:gap-2 bg-[#4343f0] hover:bg-[#5c5cf2] text-white text-xs font-bold px-3 sm:px-6 py-2 sm:py-3 rounded-[4px] shadow-sm transition-colors shrink-0"
                  >
                    <EyeIcon className="w-4 h-4 pointer-events-none" />
                    View
                  </button>
                </div>
              ))
            )}
            {loading && (
              <div className="py-4 text-center text-sm text-gray-400">
                Loading...
              </div>
            )}
          </div>
          <div className="px-8 py-5 border-t border-gray-100 bg-white text-center">
            <button
              type="button"
              onClick={() => {
                router.push("/dashboard/notifications");
                setNotificationsOpen(false);
              }}
              className="text-[#5356ff] hover:text-[#3232b7] font-bold flex items-center justify-center gap-2 mx-auto transition-all hover:gap-3"
            >
              See all notifications <span className="text-lg">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
