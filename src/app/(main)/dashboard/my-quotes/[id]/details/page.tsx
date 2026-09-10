"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuote } from "../layout";
import { authService } from "@/lib/authService";
import { profileService } from "@/lib/profileService";
import { quoteService } from "@/lib/quoteService";
import { projectService } from "@/lib/projectService";
import { mediaService } from "@/lib/mediaService";
import { packagesService } from "@/lib/packagesService";
import { downloadFile, isImageUrl, getSafeUrl } from "@/lib/utils";
import { capitalizeCurrencyInText } from "@/lib/currencyUtils";
import AuthPromptModal from "@/components/common/AuthPromptModal";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import { io, Socket } from "socket.io-client";

// Helper components
const LoadingDots = ({ text = "Sending" }) => (
  <span className="inline-flex items-center">
    {text}
    <span style={{ transform: "translateY(-1px)" }} className="inline-flex items-center ml-0.5">
      <span style={{ animation: "blink 1.4s infinite both" }} className="inline-block">.</span>
      <span style={{ animation: "blink 1.4s infinite both", animationDelay: "0.2s" }} className="inline-block">.</span>
      <span style={{ animation: "blink 1.4s infinite both", animationDelay: "0.4s" }} className="inline-block">.</span>
    </span>
    <style>{`@keyframes blink { 0% { opacity: .2; } 20% { opacity: 1; } to { opacity: .2; } }`}</style>
  </span>
);

const categoryMap: Record<string, string> = {
  // Short auto-generated codes (from initials)
  PAM: "Paid Ads Marketing",
  GDB: "Graphic Design & Branding",
  GD: "Graphic Design & Branding",
  WD: "Websites Development",
  WDE: "Websites Development",
  WM: "Website Maintenance",
  SMM: "Social Media Marketing",
  SEO: "SEO",
  BUN: "Bundles",
  // Full codes with underscores
  PAID_ADS: "Paid Ads Marketing",
  PAID_ADS_MARKETING: "Paid Ads Marketing",
  PAIDADS: "Paid Ads Marketing",
  "PAID ADS MARKETING": "Paid Ads Marketing",
  "PAID ADS": "Paid Ads Marketing",
  GRAPHIC_DESIGN: "Graphic Design & Branding",
  GRAPHIC_DESIGN_BRANDING: "Graphic Design & Branding",
  "GRAPHIC DESIGN & BRANDING": "Graphic Design & Branding",
  "GRAPHIC DESIGN": "Graphic Design & Branding",
  WEBSITES_DEVELOPMENT: "Websites Development",
  WEBSITE_DEVELOPMENT: "Websites Development",
  "WEBSITES DEVELOPMENT": "Websites Development",
  "WEBSITE MAINTENANCE": "Website Maintenance",
  WEBSITE_MAINTENANCE: "Website Maintenance",
  SOCIAL_MEDIA_MARKETING: "Social Media Marketing",
  "SOCIAL MEDIA MARKETING": "Social Media Marketing",
  BUNDLES: "Bundles",
  BUNDLE: "Bundles",
  ANALYSIS: "Analysis",
};

const formatCategoryName = (cat: any, title?: string): string => {
  if (!cat && !title) return "";
  let raw = "";
  if (cat && typeof cat === "object") {
    raw = cat.name || cat.title || cat.categorycode || cat.code || "";
  } else if (cat) {
    raw = String(cat).trim();
  }

  // If raw is an ObjectId or empty, fallback to title matching
  if (!raw || raw.match(/^[0-9a-fA-F]{24}$/)) {
    if (title) {
      const norm = title.toLowerCase();
      if (norm.includes("ads") || norm.includes("shopping") || norm.includes("audit")) return "Paid Ads Marketing";
      if (norm.includes("graphic") || norm.includes("brand") || norm.includes("logo")) return "Graphic Design & Branding";
      if (norm.includes("development") || norm.includes("website dev")) return "Websites Development";
      if (norm.includes("maintenance")) return "Website Maintenance";
      if (norm.includes("seo") || norm.includes("search engine")) return "SEO";
      if (norm.includes("social media") || norm.includes("smm")) return "Social Media Marketing";
    }
    return "";
  }

  const upper = raw.toUpperCase().trim();
  const stripped = upper.replace(/-\d+$/, "").trim();

  if (categoryMap[upper]) return categoryMap[upper];
  if (categoryMap[stripped]) return categoryMap[stripped];

  if (upper.includes("_")) {
    const spaced = upper.replace(/_/g, " ");
    if (categoryMap[spaced]) return categoryMap[spaced];
    return spaced
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return raw;
};

const PackageCard = ({
  packageId,
  title,
  price,
  imageUrl,
  category,
  description,
  link,
}: any) => {
  const safeImg = imageUrl ? getSafeUrl(imageUrl) : null;
  const isSvg = safeImg ? safeImg.toLowerCase().includes(".svg") : false;

  const displayPrice =
    typeof price === "number"
      ? `$${price.toLocaleString("en-US")}`
      : price
        ? String(price).startsWith("$") || String(price).startsWith("€")
          ? String(price)
          : `$ ${price}`
        : "";

  const resolvedCat = formatCategoryName(category, title);

  return (
    <a
      href={link || `/dashboard/new-project/packages/${packageId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group w-full sm:w-[260px] md:w-[280px] shrink-0 no-underline text-left"
    >
      <div className="h-36 sm:h-40 bg-gray-100 relative overflow-hidden flex items-center justify-center">
        {safeImg ? (
          <img
            src={safeImg}
            alt={title}
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${isSvg ? "object-contain p-2.5" : "object-cover"
              }`}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.startsWith("http:") && !target.src.includes("localhost") && !target.src.includes("127.0.0.1")) {
                target.src = target.src.replace("http:", "https:");
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

      <div className="p-4 flex flex-col flex-1 bg-white">
        {resolvedCat && (
          <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider w-fit mb-2">
            {resolvedCat}
          </span>
        )}
        <h4 className="font-bold text-gray-800 text-sm leading-snug mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
            {description}
          </p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-100">
          <span className="font-bold text-gray-800 text-xs sm:text-sm">
            {displayPrice}
          </span>
        </div>
      </div>
    </a>
  );
};

const renderFileThumbnail = (safeUrl: string, fileName: string, isSvg = false) => {
  const clean = (fileName || safeUrl || "").toLowerCase();
  const ext = (clean.split(".").pop() || "FILE").toUpperCase();
  const isImage =
    isImageUrl(safeUrl) ||
    ["PNG", "JPG", "JPEG", "WEBP", "GIF", "BMP", "SVG", "ICO"].includes(ext) ||
    isImageUrl(fileName);
  const isPdf = ext === "PDF" || clean.includes(".pdf");
  const isWord = ["DOC", "DOCX"].includes(ext) || clean.includes(".doc");
  const isExcel = ["XLS", "XLSX", "CSV"].includes(ext) || clean.includes("sheet") || clean.includes("excel");
  const isPpt = ["PPT", "PPTX"].includes(ext);
  const isArchive = ["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(ext);

  if (isImage && safeUrl) {
    return (
      <img
        src={safeUrl}
        alt={fileName}
        className={
          isSvg
            ? "w-full h-full object-contain p-2.5 group-hover:scale-105 transition-transform duration-300"
            : "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        }
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src.startsWith("http:") && !target.src.includes("localhost") && !target.src.includes("127.0.0.1")) {
            target.src = target.src.replace("http:", "https:");
          }
        }}
      />
    );
  }

  if (isPdf) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <span className="text-red-600 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
          PDF
        </span>
      </div>
    );
  }

  if (isWord) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <span className="text-blue-600 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
          {ext === "DOCX" ? "DOCX" : "DOC"}
        </span>
      </div>
    );
  }

  if (isExcel) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <span className="text-emerald-600 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
          {ext}
        </span>
      </div>
    );
  }

  if (isPpt) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <span className="text-amber-600 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
          {ext}
        </span>
      </div>
    );
  }

  if (isArchive) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <span className="text-purple-600 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
          {ext}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <span className="text-gray-600 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
        {ext.slice(0, 4)}
      </span>
    </div>
  );
};

const toIdString = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed && trimmed !== "[object Object]" ? trimmed : "";
  }
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") return value.toHexString();
    if (value._id) return toIdString(value._id);
    if (typeof value.toString === "function") {
      const str = value.toString();
      if (str && str !== "[object Object]") return str;
    }
    if (typeof value.id === "string") return toIdString(value.id);
  }
  return "";
};

const projectIdFromResponse = (res: any, quoteId: string): string => {
  const payload = res?.data?.data || res?.data || res;
  const candidates = [
    payload?._id,
    payload?.id,
    payload?.projectId,
    payload?.project?._id,
    payload?.project?.id,
  ];
  for (const c of candidates) {
    const id = toIdString(c);
    if (id && id !== quoteId) return id;
  }
  return "";
};

const extractProjectId = (quoteObj: any, msgObj?: any, contentObj?: any): string => {
  const quoteId = toIdString(quoteObj?._id || quoteObj?.id || quoteObj?.quoteId);
  const candidates = [
    contentObj?.projectId,
    msgObj?.content?.projectId,
    msgObj?.projectId,
    quoteObj?.projectId,
    quoteObj?.project?._id,
    quoteObj?.project?.id,
    quoteObj?.project,
  ];
  if (Array.isArray(quoteObj?.messages)) {
    for (const msg of quoteObj.messages) {
      candidates.push(msg?.content?.projectId, msg?.projectId);
    }
  }
  for (const c of candidates) {
    const id = toIdString(c);
    if (id && id !== quoteId) return id;
  }
  return "";
};

export default function QuoteDetailsPage() {
  const { quote, setQuote, refreshQuote } = useQuote();
  const router = useRouter();

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const acceptingRef = useRef(false);
  const [hasAcceptedLocally, setHasAcceptedLocally] = useState(false);
  const [isOpeningProject, setIsOpeningProject] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; status: "uploading" | "done" | "error"; url?: string; file?: File }>
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quote?.projectTitle) {
      setEditedTitle(quote.projectTitle);
    }
  }, [quote?.projectTitle]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || !quote?._id) return;
    setIsSavingTitle(true);
    try {
      const res = await quoteService.updateQuote(quote._id, {
        projectTitle: editedTitle.trim(),
      });
      if (res?.isSuccessful || res?.statusCode === 200 || res?.data) {
        toast.success("Quote title updated");
        if (res.data) setQuote(res.data);
        else refreshQuote(true);
        setIsEditingTitle(false);
      } else {
        toast.error(res?.message || "Failed to update title");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update title");
    } finally {
      setIsSavingTitle(false);
    }
  };

  useEffect(() => {
    const hydrateUser = async () => {
      const existing = authService.getUser();
      if (existing) {
        setUser(existing);
        return;
      }
      if (!authService.isAuthenticated()) return;
      try {
        const profileRes = await profileService.getMyProfile();
        const profile = profileRes?.data;
        if (profile && typeof profile === "object") {
          authService.updateInternalUser(profile);
          setUser(profile);
        }
      } catch (e) {
        console.warn("Could not hydrate logged-in user:", e);
      }
    };

    hydrateUser();
    const onLogin = () => setUser(authService.getUser());
    window.addEventListener("auth:login", onLogin);
    return () => window.removeEventListener("auth:login", onLogin);
  }, []);

  const requireAuth = () => {
    if (!authService.isAuthenticated()) {
      setShowAuthModal(true);
      return null;
    }
    const current = user || authService.getUser() || {};
    if (!user && authService.getUser()) setUser(authService.getUser());
    return current;
  };

  const isLoggedIn = Boolean(user) || authService.isAuthenticated();

  // Real-time socket connection
  useEffect(() => {
    let activeSocket: Socket | null = null;
    let isCancelled = false;

    const qId = quote?._id ? quote._id.toString() : (quote?.id ? quote.id.toString() : "");
    if (!qId) return;

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
        sock.emit("joinProject", qId);
        sock.emit("joinProject", { projectId: qId });
        sock.emit("joinQuote", qId);
      });

      const handleMessageUpdate = (data: any) => {
        const incomingId = data?.projectId || data?.quoteId || data?.project?._id || data?.quote?._id;
        if (!incomingId || String(incomingId) === String(qId)) {
          refreshQuote(true);
        }
      };

      sock.on("quoteMessage", handleMessageUpdate);
      sock.on("quote_message", handleMessageUpdate);
      sock.on("quoteUpdated", handleMessageUpdate);
      sock.on("projectMessage", handleMessageUpdate);
      sock.on("newMessage", handleMessageUpdate);
      sock.on("notification", (notif: any) => {
        const pId = notif?.data?.quoteId || notif?.data?.projectId || notif?.quoteId || notif?.projectId;
        if (!pId || String(pId) === String(qId)) {
          refreshQuote(true);
        }
      });
    };

    connectSocket();

    return () => {
      isCancelled = true;
      if (activeSocket) {
        try {
          activeSocket.emit("leaveProject", qId);
          activeSocket.disconnect();
        } catch { }
      }
    };
  }, [quote?._id, quote?.id, refreshQuote]);

  if (!quote) return null;

  // Format Helpers
  const currency = (quote.currency || "USD").toUpperCase();
  const formatCurrency = (amt: any, customCurrency?: string) => {
    const num = Number(amt || 0);
    const curr = (customCurrency || quote.currency || "USD").toUpperCase();
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: curr,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return curr === "EUR" ? `€${num.toFixed(2)}` : `$${num.toFixed(2)}`;
    }
  };

  const formatDateTime = (date: string | Date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatQuoteDate = (date: string | Date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const day = d.getDate();
    const time = d
      .toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .toUpperCase();
    return `${month} ${day}, ${time}`;
  };

  const formatMessageTime = (date: string | Date) => {
    return formatQuoteDate(date);
  };

  const getStatusBadgeClass = (status: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "PENDING":
      case "REQUESTED":
      case "SUBMITTED":
      case "REVIEW":
      case "UNDER_REVIEW":
      case "IN_REVIEW":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "APPROVED":
      case "ACCEPTED":
      case "COMPLETED":
        return "bg-[#E1FCEF] text-[#14804A] border-[#E1FCEF]";
      case "DECLINED":
      case "REJECTED":
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      case "SENT":
      case "OFFER_SENT":
      case "PROPOSAL_SENT":
        return "bg-[#DBEAFE] text-[#1D4ED8] border-[#DBEAFE]";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const formatDuration = (val: any) => {
    if (!val) return "-";
    const str = String(val).trim();
    if (
      str.toLowerCase().includes("day") ||
      str.toLowerCase().includes("week") ||
      str.toLowerCase().includes("month") ||
      str.toLowerCase().includes("hr") ||
      str.toLowerCase().includes("hour")
    ) {
      return str;
    }
    return `${str} Days`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    e.target.value = "";

    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      status: "uploading" as const,
      file,
      url: "",
    }));

    setAttachments((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const res: any = await mediaService.uploadImage({
          file: item.file,
          folder: `quotes/${quote?._id}/messages`,
        });
        const url = res.data?.secure_url || res.data?.url || res.secure_url || "";
        setAttachments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: "done", url } : a)));
      } catch (error) {
        console.error("Upload failed for file:", item.name, error);
        setAttachments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: "error" } : a)));
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendMessage = async () => {
    const currentUser = requireAuth();
    if (!currentUser) return;
    if (attachments.some((a) => a.status === "uploading")) return;

    const uploadedUrls = attachments.filter((a) => a.status === "done" && a.url).map((a) => a.url);

    if ((messageText.trim() || uploadedUrls.length > 0) && quote) {
      setIsSending(true);
      try {
        const res = await quoteService.updateQuote(quote._id, {
          action: "message",
          userComments: messageText.trim(),
          attachedFilesUrl: uploadedUrls.length > 0 ? uploadedUrls : undefined,
          username: currentUser?.fullName || user?.fullName,
          userAvatar: currentUser?.avatar || user?.avatar,
        });
        if (res.isSuccessful || res.statusCode === 200) {
          setMessageText("");
          setAttachments([]);
          if (res.data) {
            setQuote(res.data);
          } else {
            refreshQuote(true);
          }
        }
      } catch (e) {
        console.error("Failed to send message:", e);
        toast.error("Failed to send message");
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleAcceptQuote = async () => {
    const currentUser = requireAuth();
    if (!currentUser) return;
    if (acceptingRef.current || isAccepting || hasAcceptedLocally) return;
    if (quote) {
      acceptingRef.current = true;
      setIsAccepting(true);
      setHasAcceptedLocally(true);
      try {
        const res = await quoteService.updateQuote(quote._id, {
          action: "accept",
          username: currentUser?.fullName || user?.fullName,
          userAvatar: currentUser?.avatar || user?.avatar,
        });
        if (res.isSuccessful || res.statusCode === 200) {
          toast.success("Proposal accepted successfully!");
          const updatedQuoteData = res.data || quote;
          if (res.data) setQuote(res.data);
          else refreshQuote(true);

          try {
            const createdProjectId = await resolveCreatedProjectId(updatedQuoteData);
            if (createdProjectId) {
              router.push(`/dashboard/my-projects/${createdProjectId}/details`);
              return;
            }
          } catch (navErr) {
            console.warn("Could not immediately navigate to project:", navErr);
          }
        } else {
          setHasAcceptedLocally(false);
          toast.error(res?.message || "Failed to accept proposal");
        }
      } catch (e) {
        setHasAcceptedLocally(false);
        console.error("Failed to accept quote:", e);
        toast.error("Failed to accept proposal");
      } finally {
        acceptingRef.current = false;
        setIsAccepting(false);
      }
    }
  };

  const resolveCreatedProjectId = async (quoteObj: any, msg?: any, content?: any): Promise<string> => {
    const quoteId = toIdString(quoteObj?._id || quote?._id);
    let projectId = extractProjectId(quoteObj || quote, msg, content);
    if (projectId) return projectId;

    if (quoteId) {
      try {
        const latest = await quoteService.getQuoteById(quoteId);
        const latestQuote = latest?.data?.data || latest?.data;
        if (latestQuote) {
          setQuote(latestQuote);
          projectId = extractProjectId(latestQuote, msg, content);
          if (projectId) return projectId;
        }
      } catch (e) {
        console.error("Failed to refresh quote for project redirect:", e);
      }

      try {
        const allRes = await projectService.getAllProjects(100, 1);
        const projectsList = allRes?.data?.projects || allRes?.data?.data || allRes?.data || [];
        const matched = Array.isArray(projectsList)
          ? projectsList.find((p: any) => toIdString(p.quoteId) === quoteId || toIdString(p.quote) === quoteId)
          : null;
        if (matched?._id || matched?.id) {
          return toIdString(matched._id || matched.id);
        }
      } catch (e) {
        console.error("Failed to resolve project by quote id from projects list:", e);
      }

      try {
        const projectRes = await projectService.getProjectById(quoteId);
        projectId = projectIdFromResponse(projectRes, quoteId);
        if (projectId) return projectId;
      } catch (e) {
        console.error("Failed to resolve project by quote id:", e);
      }
    }
    return "";
  };

  const goToCreatedProject = async (msg?: any, content?: any) => {
    if (isOpeningProject) return;
    setIsOpeningProject(true);
    try {
      const projectId = await resolveCreatedProjectId(quote, msg, content);
      if (projectId) {
        router.push(`/dashboard/my-projects/${projectId}/details`);
        return;
      }
      toast.error("Project is not ready yet. Please try again.");
    } finally {
      setIsOpeningProject(false);
    }
  };

  const handleDeclineQuote = async () => {
    const currentUser = requireAuth();
    if (!currentUser) return;
    if (!quote) return;

    setIsDeclining(true);
    try {
      const res = await quoteService.updateQuote(quote._id, {
        action: "deny",
        username: currentUser?.fullName || user?.fullName,
        userAvatar: currentUser?.avatar || user?.avatar,
      });

      if (res.isSuccessful || res.statusCode === 200) {
        toast.success("Proposal declined");
        if (res.data) setQuote(res.data);
        else refreshQuote(true);
      } else {
        toast.error(res.message || "Failed to decline proposal");
      }
    } catch (e: any) {
      console.error("Failed to decline proposal:", e);
      toast.error(e?.message || "Failed to decline proposal");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleRequestModification = async () => {
    const currentUser = requireAuth();
    if (!currentUser) return;

    if (!messageText.trim() || !quote) {
      if (messageInputRef.current) {
        messageInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        const textarea = messageInputRef.current.querySelector("textarea");
        if (textarea) textarea.focus();
      }
      return;
    }

    setIsSending(true);
    try {
      const res = await quoteService.updateQuote(quote._id, {
        action: "request_modification",
        userComments: messageText.trim(),
        username: currentUser?.fullName || user?.fullName,
        userAvatar: currentUser?.avatar || user?.avatar,
      });
      if (res.isSuccessful || res.statusCode === 200) {
        setMessageText("");
        if (res.data) setQuote(res.data);
        else refreshQuote(true);
        toast.success("Modification request sent");
      }
    } catch (e) {
      console.error("Failed to send modification request:", e);
      toast.error("Failed to send modification request");
    } finally {
      setIsSending(false);
    }
  };

  // Manager resolution
  const manager = quote.assignedManager || (quote.assignedManagers && quote.assignedManagers[0]);
  const managerName = manager?.fullName;
  const managerInitial = managerName ? managerName.charAt(0).toUpperCase() : "M";

  // Client resolution
  const clientName = user?.fullName || quote.user?.fullName || quote.clientName || quote.userName || "Client";
  const clientAvatar = user?.avatar || quote.user?.avatar || quote.clientAvatar;
  const clientInitials = clientName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SS";

  const quoteNumber = quote.quoteNumber || (quote._id ? `INV-2026-${quote._id.slice(-3).toUpperCase()}` : "INV-2026-015");
  const quoteStatus = (quote.status || "PENDING").toUpperCase();
  const submittedTimestamp = formatQuoteDate(quote.createdAt || quote.dateSubmitted || new Date());

  // Find initial request message
  const requestMsg = (quote.messages || quote.conversations || []).find(
    (m: any) => m.type === "quote_request" || m.type === "initial_request" || m.role === "client"
  );

  const rawAttached =
    (Array.isArray(quote.attachedFilesUrl) && quote.attachedFilesUrl.length > 0 && quote.attachedFilesUrl) ||
    (Array.isArray(quote.attachedFiles) && quote.attachedFiles.length > 0 && quote.attachedFiles) ||
    (Array.isArray(requestMsg?.content?.attachedFiles) && requestMsg.content.attachedFiles.length > 0 && requestMsg.content.attachedFiles) ||
    (Array.isArray(requestMsg?.content?.attachedFilesUrl) && requestMsg.content.attachedFilesUrl.length > 0 && requestMsg.content.attachedFilesUrl) ||
    (Array.isArray(quote.messages?.[0]?.content?.attachedFiles) && quote.messages[0].content.attachedFiles.length > 0 && quote.messages[0].content.attachedFiles) ||
    (Array.isArray(quote.files) && quote.files.length > 0 && quote.files) ||
    (Array.isArray(quote.attachments) && quote.attachments.length > 0 && quote.attachments) ||
    [];

  const quoteAttachedFiles: any[] = Array.isArray(rawAttached) ? rawAttached : [];

  const userInitial = (user?.fullName || clientName || "S").charAt(0).toUpperCase();
  const nowFormatted = formatDateTime(new Date());

  // Messages list excluding the initial quote request if it's already shown in the top card
  const allMessages = (quote.messages && quote.messages.length > 0)
    ? quote.messages.filter((m: any, idx: number) => !(idx === 0 && (m.type === "quote_request" || m.type === "initial_request")))
    : (quote.conversations && quote.conversations.length > 0)
      ? quote.conversations.filter((m: any, idx: number) => !(idx === 0 && (m.type === "quote_request" || m.type === "initial_request")))
      : [];

  return (
    <div className="w-full font-sans">
      {/* Top Header Title & Description */}
      <div className="mb-10">
        <div className="flex flex-col gap-3 mb-8 md:mb-12">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 group">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-[24px] md:text-[30px] font-bold text-gray-800 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    disabled={isSavingTitle}
                    className="px-3 py-1 bg-[#4343F0] text-white text-xs font-bold rounded cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTitle(false);
                      setEditedTitle(quote.projectTitle || "");
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-[28px] md:text-[32px] font-bold text-gray-800 leading-tight">
                    {quote.projectTitle || "Custom Quote"}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedTitle(quote.projectTitle || "");
                      setIsEditingTitle(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded mt-1 cursor-pointer"
                    title="Edit quote title"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                  </button>
                </>
              )}
            </div>
            {quote.projectDescription && (
              <p className="text-gray-500 text-sm md:text-base leading-relaxed mt-2 max-w-4xl whitespace-pre-wrap">
                {quote.projectDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Card: Quote Request Summary Card (col-span-2) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden w-full">
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                    <div className="flex items-center gap-4">
                      {clientAvatar ? (
                        <img src={clientAvatar} alt={clientName} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-sm bg-gray-800">
                          {clientInitials}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-gray-800 text-base sm:text-lg">{clientName}</h4>
                        <span className="text-xs text-gray-400 font-medium">Quote #{quoteNumber}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`w-fit px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border uppercase ${getStatusBadgeClass(quoteStatus)}`}>
                        {quoteStatus}
                      </span>
                      <span className="text-[10px] sm:text-sm text-gray-500 font-bold uppercase tracking-wide whitespace-nowrap">
                        {submittedTimestamp}
                      </span>
                    </div>
                  </div>

                  <div className="pl-0 md:pl-[64px] mb-2 space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Project Title
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-gray-800">
                        {quote.projectTitle || "Custom Quote"}
                      </h3>
                    </div>

                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Project Description
                      </span>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
                        {quote.projectDescription || "No description provided."}
                      </p>
                    </div>

                    {quoteAttachedFiles.length > 0 && (
                      <div className="pt-4">
                        <h5 className="text-sm font-bold text-gray-700 mb-3">Attached Files</h5>
                        <div className="border-t border-gray-200 mb-4"></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
                          {quoteAttachedFiles.map((fileItem: any, idx: number) => {
                            const url = typeof fileItem === "string" ? fileItem : (fileItem.url || fileItem.path || fileItem.secure_url || "");
                            const rawName = typeof fileItem === "string" ? fileItem.split("/").pop() || `File-${idx + 1}` : (fileItem.filename || fileItem.name || fileItem.fileName || url.split("/").pop() || `File-${idx + 1}`);
                            const fileName = decodeURIComponent(rawName.split("?")[0]);
                            const safeUrl = getSafeUrl(url);
                            const isSvg = url.toLowerCase().includes(".svg");

                            return (
                              <a
                                key={idx}
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block border border-gray-300 rounded-lg w-full h-44 bg-white hover:shadow-md transition-all text-center no-underline overflow-hidden flex flex-col"
                              >
                                <div className="flex-grow flex items-center justify-center bg-gray-50 relative overflow-hidden">
                                  {renderFileThumbnail(safeUrl, fileName, isSvg)}
                                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                                    <div className="bg-white/95 p-2.5 rounded-full shadow-md flex items-center justify-center">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center justify-center h-10 min-h-[40px]">
                                  <span className="text-[10px] font-medium text-gray-600 truncate px-2" title={fileName}>
                                    {fileName}
                                  </span>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Project Manager Card (col-span-1) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-8">
                <div className="text-center">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md overflow-hidden bg-gray-100 border border-gray-200">
                    {manager?.avatar ? (
                      <img src={manager.avatar} alt={managerName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-3xl font-bold">
                        {manager ? managerInitial : ""}
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-gray-800 mb-1">
                    {manager ? managerName : "Not assigned yet"}
                  </h4>
                  <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider text-[10px]">
                    Project Manager
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Center Timeline / Divider */}
          <div className="flex flex-col gap-6 w-full">
            <div className="relative py-6 flex items-center justify-center w-full my-2">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="px-4 text-xs sm:text-sm font-medium text-gray-500 text-center whitespace-normal sm:whitespace-nowrap">
                Quote Request Submitted
              </span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Messages feed */}
            <div className="flex flex-col gap-6 w-full">
            {allMessages.map((msg: any, i: number) => {
              const msgId = msg.id || msg._id || `msg-${i}`;
              const isLast = i === allMessages.length - 1;
              const msgDate = msg.timestamp || msg.createdAt || msg.sentAt;

              // System Notification
              if (msg.type === "system_notification" || msg.isSystemMessage) {
                const title = msg.content?.systemText || msg.systemText || msg.message || "System Notification";
                const text = msg.content?.text || msg.text || "";

                if (
                  title.toLowerCase().includes("offer") ||
                  title.toLowerCase().includes("proposal") ||
                  text.toLowerCase().includes("sent you a new offer") ||
                  text.toLowerCase().includes("prepared a custom proposal")
                ) {
                  return null;
                }

                // Standalone Project Created notification banner
                if (
                  title.toLowerCase().includes("project created") ||
                  text.toLowerCase().includes("converted into an active project") ||
                  text.toLowerCase().includes("active project")
                ) {
                  return (
                    <div key={msgId} className="text-center my-8 py-2 w-full" ref={isLast ? messagesEndRef : null}>
                      <h2 className="text-2xl sm:text-[28px] md:text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">
                        Project created
                      </h2>
                      <p className="text-xs sm:text-sm font-medium text-gray-500 mb-5 max-w-lg mx-auto leading-relaxed">
                        Great news! Your quote has been converted into an active project.
                      </p>
                      <button
                        type="button"
                        onClick={() => goToCreatedProject(msg, msg.content)}
                        disabled={isOpeningProject}
                        className="inline-flex items-center justify-center gap-1.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-bold py-2.5 px-6 rounded-[6px] shadow-sm transition-all active:scale-95 cursor-pointer mx-auto disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isOpeningProject ? (
                          <LoadingDots text="Opening" />
                        ) : (
                          <>
                            View Project
                            <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={msgId} className="text-center py-6 px-4 bg-white/70 rounded-xl border border-gray-200" ref={isLast ? messagesEndRef : null}>
                    <h3 className="text-lg font-bold text-gray-700 mb-1">{capitalizeCurrencyInText(title)}</h3>
                    <p className="text-sm font-medium text-gray-500">{capitalizeCurrencyInText(text)}</p>
                  </div>
                );
              }

              // Quote Proposal / Offer Message
              if (msg.type === "quote_proposal") {
                const content = msg.content || {};
                const propItems =
                  content.lineItems && content.lineItems.length > 0
                    ? content.lineItems
                    : content.deliverableItems && content.deliverableItems.length > 0
                      ? content.deliverableItems
                      : [];
                const senderName = msg.username || msg.senderName || managerName;
                const proposalDesc = content.projectDescription || content.text || msg.message || "";
                const proposalCurrency = (content.currency || quote.currency || "USD").toUpperCase();
                const calculatedDurationDays = propItems.reduce((sum: number, it: any) => {
                  const dur = String(it.duration || "").toLowerCase();
                  const match = dur.match(/(\d+(\.\d+)?)/);
                  const val = match ? parseFloat(match[0]) : 0;
                  if (dur.includes("week")) return sum + val * 7;
                  if (dur.includes("month")) return sum + val * 30;
                  return sum + val;
                }, 0);
                const totalDuration =
                  calculatedDurationDays > 0
                    ? `${calculatedDurationDays} Day${calculatedDurationDays > 1 ? "s" : ""}`
                    : content.totalDuration || quote.totalDuration || "-";
                const calculatedTotalCost = propItems.reduce((sum: number, it: any) => sum + (Number(it.amount ?? it.cost) || 0), 0);
                const totalCost = content.totalCost ?? (calculatedTotalCost > 0 ? calculatedTotalCost : (quote.totalCost ?? 0));

                // Check subsequent messages to track actions on this proposal
                const subsequentMessages = allMessages.slice(i + 1);
                const hasLaterProposal = subsequentMessages.some((m: any) => m.type === "quote_proposal");

                // Messages between this proposal and the next proposal (or end of feed)
                const messagesUntilNextProposal: any[] = [];
                for (const nextMsg of subsequentMessages) {
                  if (nextMsg.type === "quote_proposal") break;
                  messagesUntilNextProposal.push(nextMsg);
                }

                const wasDeclinedAfterThis = messagesUntilNextProposal.some(
                  (m: any) =>
                    m.type === "quote_action" &&
                    (m.content?.action === "denied" || m.content?.action === "declined" || m.action === "denied" || m.action === "declined")
                );

                const wasAcceptedAfterThis = messagesUntilNextProposal.some(
                  (m: any) =>
                    m.type === "quote_action" &&
                    (m.content?.action === "accepted" || m.action === "accepted")
                );

                const isAccepted =
                  hasAcceptedLocally ||
                  content.status === "accepted" ||
                  wasAcceptedAfterThis ||
                  (!hasLaterProposal && quote.status?.toLowerCase() === "approved");

                const isDeclined =
                  content.status === "declined" ||
                  content.status === "rejected" ||
                  wasDeclinedAfterThis ||
                  (!hasLaterProposal &&
                    quote.status?.toLowerCase() === "rejected" &&
                    !content.isNewProposal &&
                    (!content.actionsAvailable || content.actionsAvailable.length === 0));

                const isSuperseded =
                  !isDeclined && !isAccepted && (hasLaterProposal || content.status === "superseded");

                const canAct = !hasLaterProposal && !isAccepted && !isDeclined;

                return (
                  <div key={msgId} ref={isLast ? messagesEndRef : null} className="w-full">
                    {/* Header above offer card */}
                    <div className="w-full text-center py-8 sm:py-12 px-4 my-6">
                      <h3 className="text-3xl sm:text-4xl font-extrabold text-[#444444] mb-3 tracking-tight">
                        You Received an Offer
                      </h3>
                      <p className="text-base sm:text-lg font-medium text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        We’ve prepared a custom proposal for your project.
                      </p>
                    </div>

                    {/* Proposal Card */}
                    <div className="flex flex-col gap-4">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="p-4 sm:p-6 md:p-8">
                          {/* Card Header: SUBMITTED - Date & Status Badge */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-tight">
                                Submitted - {formatQuoteDate(msgDate)}
                              </span>
                              {isSuperseded ? (
                                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border border-gray-300 text-gray-500 bg-gray-50">
                                  Superseded
                                </span>
                              ) : isDeclined ? (
                                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border border-red-300 text-red-600 bg-red-50">
                                  Declined
                                </span>
                              ) : isAccepted ? (
                                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border border-emerald-300 text-emerald-600 bg-emerald-50">
                                  Accepted
                                </span>
                              ) : canAct ? (
                                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border border-blue-400 text-blue-600 bg-blue-50">
                                  Offer Sent
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="border-t border-gray-200 mb-6 sm:mb-8"></div>

                          {/* Card Title Row: Title on Left, From on Right */}
                          <div className="pb-4 sm:pb-6 flex flex-col sm:flex-row justify-between items-start gap-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-600">Project Proposal</h2>
                            {senderName && (
                              <span className="text-[10px] sm:text-xs text-gray-400 font-medium">
                                From: {senderName}
                              </span>
                            )}
                          </div>

                          {/* Proposal Description */}
                          {proposalDesc && (
                            <div className="mb-10 text-sm text-gray-500 leading-relaxed font-medium whitespace-pre-wrap">
                              {proposalDesc}
                            </div>
                          )}

                          {/* Line Items Table */}
                          {propItems.length > 0 && (
                            <div className="border border-gray-400 rounded-lg overflow-x-auto mb-6">
                              <table className="w-full min-w-[500px] sm:min-w-0">
                                <thead>
                                  <tr className="border-b border-gray-400">
                                    <th className="px-3 sm:px-6 py-4 text-left text-xs sm:text-sm font-bold text-gray-600 bg-white w-1/2">
                                      Item
                                    </th>
                                    <th className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm font-bold text-gray-600 bg-white">
                                      Duration
                                    </th>
                                    <th className="px-3 sm:px-6 py-4 text-right text-xs sm:text-sm font-bold text-gray-600 bg-white">
                                      Amount
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {propItems.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-gray-400 last:border-0">
                                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-500 align-top">
                                        <div className="font-medium text-gray-700 mb-1">
                                          {item.description || item.name || item.title}
                                        </div>
                                        {item.details && (
                                          <div className="text-[11px] text-gray-400 font-normal">
                                            {item.details}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 font-medium text-center align-top whitespace-nowrap">
                                        {formatDuration(item.duration)}
                                      </td>
                                      <td className="px-3 sm:px-6 py-4 sm:py-6 text-xs sm:text-sm text-gray-600 text-right font-bold align-top">
                                        {formatCurrency(item.amount ?? item.cost ?? 0, proposalCurrency)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Total Duration & Cost */}
                          <div className="flex flex-row justify-end gap-6 sm:gap-16 text-xs sm:text-sm mb-6">
                            <div className="text-center">
                              <div className="text-gray-500 font-bold mb-1 sm:mb-2 flex items-center justify-center gap-1">
                                Total Duration
                              </div>
                              <div className="font-medium text-gray-600">{formatDuration(totalDuration)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500 font-bold mb-1 sm:mb-2">Total Cost</div>
                              <div className="font-medium text-gray-600">
                                {formatCurrency(totalCost, proposalCurrency)}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons (Accept, Request Modifications, Decline) */}
                          {canAct && (
                            <div className="flex flex-col sm:flex-row gap-4 justify-between w-full pt-6 mt-6 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={handleAcceptQuote}
                                disabled={isAccepting || isDeclining || hasAcceptedLocally}
                                className="flex-1 bg-[#327334] hover:bg-[#285c29] text-white text-sm font-bold py-3.5 px-8 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                              >
                                {isAccepting ? <LoadingDots text="Accepting" /> : "Accept Proposal"}
                              </button>
                              <button
                                type="button"
                                onClick={handleRequestModification}
                                disabled={isAccepting || isDeclining || hasAcceptedLocally}
                                className="flex-1 bg-[#1C446F] hover:bg-[#153455] text-white text-sm font-bold py-3.5 px-8 rounded-md shadow-sm transition-all cursor-pointer text-center"
                              >
                                Request Modifications
                              </button>
                              <button
                                type="button"
                                onClick={handleDeclineQuote}
                                disabled={isAccepting || isDeclining || hasAcceptedLocally}
                                className="flex-1 bg-[#7D1A1A] hover:bg-[#651515] text-white text-sm font-bold py-3.5 px-8 rounded-md shadow-sm transition-all disabled:opacity-50 cursor-pointer text-center"
                              >
                                {isDeclining ? <LoadingDots text="Declining" /> : "Decline Proposal"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fallback Quote Declined section only if no quote_action message exists in the feed */}
                    {isDeclined && !allMessages.some((m: any) => (m.type === "quote_action" || m.type === "action") && (m.content?.action === "denied" || m.content?.action === "declined" || m.action === "denied" || m.action === "declined")) && (
                      <div className="text-center my-12 py-2 w-full">
                        <h2 className="text-2xl sm:text-[28px] md:text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">
                          Quote declined
                        </h2>
                        <p className="text-xs sm:text-sm font-normal text-gray-500 max-w-lg mx-auto leading-relaxed">
                          The offered quote has been declined.
                        </p>
                      </div>
                    )}

                    {/* Fallback Project Created section only if no accept message exists in the feed */}
                    {isAccepted && !allMessages.some((m: any) => (m.type === "quote_action" && m.content?.action === "accepted") || (m.type === "system_notification" && (m.content?.systemText?.toLowerCase().includes("project created") || m.text?.toLowerCase().includes("project created")))) && (
                      <div className="text-center my-12 py-2 w-full">
                        <h2 className="text-2xl sm:text-[28px] md:text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">
                          Project created
                        </h2>
                        <p className="text-xs sm:text-sm font-normal text-gray-500 mb-6 max-w-lg mx-auto leading-relaxed">
                          Great news! Your quote has been converted into an active project.
                        </p>
                        <button
                          type="button"
                          onClick={() => goToCreatedProject(msg, content)}
                          disabled={isOpeningProject}
                          className="inline-flex items-center justify-center gap-1.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-bold py-2.5 px-6 rounded-[6px] shadow-sm transition-all active:scale-95 cursor-pointer mx-auto disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isOpeningProject ? (
                            <LoadingDots text="Opening" />
                          ) : (
                            <>
                              View Project
                              <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              // Quote Action (Chronological Decline or Acceptance Event)
              if (msg.type === "quote_action" || msg.type === "action") {
                const action = msg.content?.action || msg.action;
                if (action === "denied" || action === "declined") {
                  return (
                    <div key={msgId} ref={isLast ? messagesEndRef : null} className="text-center my-10 py-2 w-full">
                      <h2 className="text-2xl sm:text-[28px] md:text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">
                        Quote declined
                      </h2>
                      <p className="text-xs sm:text-sm font-normal text-gray-500 max-w-lg mx-auto leading-relaxed">
                        The offered quote has been declined.
                      </p>
                    </div>
                  );
                }

                if (action === "accepted") {
                  return (
                    <div key={msgId} ref={isLast ? messagesEndRef : null} className="text-center my-10 py-2 w-full">
                      <h2 className="text-2xl sm:text-[28px] md:text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">
                        Project created
                      </h2>
                      <p className="text-xs sm:text-sm font-normal text-gray-500 mb-6 max-w-lg mx-auto leading-relaxed">
                        Great news! Your quote has been converted into an active project.
                      </p>
                      <button
                        type="button"
                        onClick={() => goToCreatedProject(msg, msg.content)}
                        disabled={isOpeningProject}
                        className="inline-flex items-center justify-center gap-1.5 bg-[#4343F0] hover:bg-[#3232b7] text-white text-xs sm:text-sm font-bold py-2.5 px-6 rounded-[6px] shadow-sm transition-all active:scale-95 cursor-pointer mx-auto disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isOpeningProject ? (
                          <LoadingDots text="Opening" />
                        ) : (
                          <>
                            View Project
                            <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  );
                }

                return null;
              }

              // Regular User / Staff Message
              const isMe = msg.userId === user?._id || msg.senderId === user?._id || msg.role === "client" || msg.senderRole === "client" || msg.sender === "client";
              const senderName = isMe ? (user?.fullName || "You") : (msg.username || msg.senderName || managerName);
              const senderAvatar = isMe ? user?.avatar : (msg.userAvatar || msg.senderAvatar || manager?.avatar);
              const senderInitial = (senderName || "U").charAt(0).toUpperCase();
              const msgText = msg.content?.text || msg.content?.projectDescription || msg.text || msg.message || "";
              const rawAttachments = msg.content?.attachedFiles || msg.attachments || msg.attachedFiles || msg.content?.attachedFilesUrl || msg.attachedFilesUrl || [];
              const attachmentList = (Array.isArray(rawAttachments) ? rawAttachments : []).map((file: any) =>
                typeof file === "string"
                  ? { url: file, filename: file.split("/").pop()?.split("?")[0] || "File" }
                  : { url: file.url, filename: file.filename || file.name || (file.url ? file.url.split("/").pop()?.split("?")[0] : "File") }
              ).filter((f: any) => Boolean(f.url));

              return (
                <div key={msgId} ref={isLast ? messagesEndRef : null} className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {senderAvatar ? (
                        <img src={senderAvatar} alt={senderName} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#18233A] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          {senderInitial}
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{senderName}</h4>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide">
                      {formatMessageTime(msgDate)}
                    </span>
                  </div>

                  {msgText && (
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {msgText}
                    </p>
                  )}

                  {/* Attachments if any */}
                  {attachmentList.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Attached Files</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                        {attachmentList.map((file: any, j: number) => {
                          const url = file.url;
                          const filename = file.filename || "file";
                          const safeUrl = getSafeUrl(url);
                          const isSvg = url.toLowerCase().includes(".svg");

                          return (
                            <a
                              key={j}
                              href={safeUrl}
                              onClick={(e) => downloadFile(e as any, safeUrl, filename)}
                              download={filename}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block border border-gray-300 rounded-lg w-full h-44 bg-white hover:shadow-md transition-all text-center no-underline overflow-hidden flex flex-col"
                            >
                              <div className="flex-grow flex items-center justify-center bg-gray-50 relative overflow-hidden">
                                {renderFileThumbnail(safeUrl, filename, isSvg)}
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                                  <div className="bg-white/95 p-2.5 rounded-full shadow-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center justify-center h-10 min-h-[40px]">
                                <span className="text-[10px] font-medium text-gray-600 truncate px-2" title={filename}>{filename}</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommended Solutions if any */}
                  {((msg.recommendedSolutions && msg.recommendedSolutions.length > 0) ||
                    (msg.content?.recommendedSolutions && msg.content.recommendedSolutions.length > 0)) && (
                      <div className="mt-5 pt-4 border-t border-gray-100">
                        <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                          Recommended Solutions
                        </h5>
                        <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto pb-2 gap-4 scrollbar-hide">
                          {(msg.recommendedSolutions || msg.content?.recommendedSolutions).map((sol: any, j: number) => (
                            <PackageCard
                              key={(sol.packageId || sol._id || j) + "-" + j}
                              packageId={sol.packageId || sol._id || sol.id}
                              title={sol.title || sol.name}
                              price={sol.price || sol.amount}
                              imageUrl={sol.imageUrl || sol.mediumUrl || sol.thumbnailUrl}
                              category={sol.category || sol.categorycode}
                              description={sol.description}
                              link={sol.link || `/dashboard/new-project/packages/${sol.packageId || sol._id || sol.id}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>

        {/* New Message / Reply Box */}
        <div ref={messageInputRef} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          {/* Box Top Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img src={user.avatar} alt="You" className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-base shadow-sm ring-2 ring-white">
                  {userInitial}
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-800 text-base">{user?.fullName || clientName}</h3>
                <p className="text-xs text-gray-500">New Message</p>
              </div>
            </div>
            <span className="text-xs text-gray-400 font-medium">{nowFormatted}</span>
          </div>

          {/* Textarea */}
          <div className="p-6 pb-2">
            <textarea
              className="w-full min-h-[120px] text-gray-700 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-400 bg-transparent"
              placeholder={isLoggedIn ? "Type a message..." : "Please log in or register to message our team..."}
              value={messageText}
              onChange={(e) => {
                if (!requireAuth()) return;
                setMessageText(e.target.value);
              }}
              onClick={() => {
                requireAuth();
              }}
            />
          </div>

          {/* Attachments Preview Grid */}
          {attachments.length > 0 && (
            <div className="px-6 pb-3 pt-1 flex flex-wrap gap-3">
              {attachments.map((att) => {
                const displayUrl = getSafeUrl(att.url || (att.file ? URL.createObjectURL(att.file) : ""));
                return (
                  <div
                    key={att.id}
                    className="w-24 h-24 sm:w-28 sm:h-28 border border-gray-200 rounded-xl p-2 flex flex-col items-center justify-between bg-white relative group shadow-sm hover:border-gray-300 transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow cursor-pointer hover:bg-red-600"
                      title="Remove file"
                    >
                      ×
                    </button>
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
                      {renderFileThumbnail(displayUrl, att.name)}
                    </div>
                    <div className="w-full text-center mt-1">
                      <p className="text-[11px] font-medium text-gray-700 truncate w-full" title={att.name}>
                        {att.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium capitalize">
                        {att.status === "done" ? "Ready" : att.status === "uploading" ? "Uploading..." : "Failed"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                fileInputRef.current?.click();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors px-4 py-2.5 rounded-md border-2 border-blue-600 hover:bg-blue-50 shadow-sm cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              Attach Files
              {attachments.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-[#4343F0] text-white text-[11px] font-bold rounded-full ml-1">
                  {attachments.length}
                </span>
              )}
            </button>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setMessageText("");
                  setAttachments([]);
                }}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#800020] hover:bg-[#600018] text-white font-bold text-sm rounded-md transition-colors shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (!requireAuth()) {
                    e.preventDefault();
                    return;
                  }
                  handleSendMessage();
                }}
                disabled={
                  isLoggedIn &&
                  (isSending ||
                    (!messageText.trim() && attachments.length === 0) ||
                    attachments.some((a) => a.status === "uploading"))
                }
                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-[8px] text-sm font-bold transition-all ${
                  isLoggedIn &&
                  (isSending ||
                    (!messageText.trim() && attachments.length === 0) ||
                    attachments.some((a) => a.status === "uploading"))
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                    : "bg-[#4343F0] hover:bg-[#3333D0] text-white cursor-pointer active:scale-95"
                }`}
              >
                {isSending ? <LoadingDots text="Sending" /> : "Send Message"}
              </button>
            </div>
          </div>
        </div>

        {/* Support Newsletter Section */}
        <SupportNewsletter noPadding />
      </div>
    </div>

    {/* Auth Prompt Modal */}
    <AuthPromptModal
      isOpen={showAuthModal}
      onClose={() => setShowAuthModal(false)}
      title="Join the Conversation"
      description="Please log in or register to message our team and collaborate on this quote."
      redirectUrl={quote?._id ? `/dashboard/my-quotes/${quote._id}/details` : undefined}
    />
  </div>
);
}
