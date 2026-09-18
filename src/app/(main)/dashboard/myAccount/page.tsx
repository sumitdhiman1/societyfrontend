"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { profileService } from "@/lib/profileService";
import { mediaService } from "@/lib/mediaService";
import { countryService, Country } from "@/lib/countryService";
import { useCurrency } from "@/context/CurrencyContext";
import { useTimezone } from "@/context/TimezoneContext";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import LoadingDots from "@/components/common/LoadingDots";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import CountrySearchSelect from "@/components/common/CountrySearchSelect";
import TimezoneSearchSelect from "@/components/common/TimezoneSearchSelect";


const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  readOnly = false,
  actionText = "",
  onActionClick,
  placeholder = "",
}: any) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className="text-sm font-bold text-gray-700">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`w-full rounded-[4px] px-4 py-3 text-sm transition-all ${readOnly
          ? "bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed"
          : "bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4545F0] focus:ring-1 focus:ring-[#4545F0]"
          }`}
      />
      {actionText && (
        <button
          type="button"
          onClick={onActionClick}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary-300 hover:text-primary-200"
        >
          {actionText}
        </button>
      )}
    </div>
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="mb-8">
    <h2 className="text-[22px] font-medium text-primary-100 mb-4">{title}</h2>
    <div className="h-[2px] bg-primary-300 w-[100px]" />
  </div>
);

const InfoBox = ({ title, text }: { title?: string; text: string }) => (
  <div className="pl-0 lg:pl-8 border-l-0 lg:border-l border-gray-200 h-full">
    {title && <h4 className="font-bold text-sm text-gray-800 mb-4">{title}</h4>}
    <p className="text-xs text-gray-500 leading-relaxed max-w-[250px]">{text}</p>
  </div>
);

export default function MyAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [countriesList, setCountriesList] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Email change state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSendingEmailLink, setIsSendingEmailLink] = useState(false);
  const [isCancellingEmail, setIsCancellingEmail] = useState(false);

  const handleOpenEmailModal = () => {
    setNewEmail("");
    setEmailError("");
    setShowEmailModal(true);
  };

  const handleSendEmailLink = async () => {
    if (!newEmail || !newEmail.trim()) {
      setEmailError("Please enter a new email address.");
      return;
    }

    const trimmed = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (trimmed === (user?.email || "").toLowerCase()) {
      setEmailError("New email cannot be the same as your current email.");
      return;
    }

    setIsSendingEmailLink(true);
    setEmailError("");
    try {
      const res = await profileService.requestEmailChange(trimmed);
      if (res.isSuccessful || res.success) {
        setUser((prev: any) => ({ ...prev, pendingEmail: trimmed }));
        setShowEmailModal(false);
        setNewEmail("");
        const fresh = await profileService.getMyProfile(true);
        if (fresh?.data) {
          setUser(fresh.data);
        }
      } else {
        setEmailError(res.message || "Failed to send email change confirmation link.");
      }
    } catch (err: any) {
      setEmailError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send email change confirmation link."
      );
    } finally {
      setIsSendingEmailLink(false);
    }
  };

  const handleCancelEmailChange = async () => {
    setIsCancellingEmail(true);
    try {
      const res = await profileService.cancelEmailChange();
      if (res.isSuccessful || res.success) {
        setUser((prev: any) => ({ ...prev, pendingEmail: null }));
        const fresh = await profileService.getMyProfile(true);
        if (fresh?.data) {
          setUser(fresh.data);
        }
      }
    } catch (err: any) {
      console.error("Failed to cancel email change:", err);
    } finally {
      setIsCancellingEmail(false);
    }
  };

  const { currency, setCurrency } = useCurrency();
  const { setTimeZone } = useTimezone();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await profileService.getMyProfile();
        if (res?.data) {
          setUser(res.data);

          // Sync local user data
          const localUser = authService.getUser();
          if (
            localUser &&
            (localUser.avatar !== res.data.avatar ||
              localUser.fullName !== res.data.fullName ||
              localUser.timeZone !== res.data.timeZone)
          ) {
            authService.updateInternalUser({
              avatar: res.data.avatar,
              fullName: res.data.fullName,
              timeZone: res.data.timeZone || res.data.timezone,
            });
            if (res.data.timeZone || res.data.timezone) {
              setTimeZone(res.data.timeZone || res.data.timezone);
              localStorage.setItem("app-timezone", res.data.timeZone || res.data.timezone);
            }
            router.refresh();
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCountries = async () => {
      try {
        const list = await countryService.getAllCountries();
        if (list && list.length > 0) {
          setCountriesList(list);
        }
      } catch (err) {
        console.error("Failed to load countries in MyAccountPage:", err);
      }
    };

    fetchProfile();
    fetchCountries();
  }, [router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const file = files[0];
    const localUser = authService.getUser();
    const userId = user._id || user.id || localUser?.id || localUser?._id;

    if (!userId) {
      alert("Unable to identify user session. Please login again.");
      return;
    }

    try {
      setIsUploading(true);
      const res = await mediaService.uploadImage({
        file,
        folder: `profile/avatar/${userId}`,
      });

      if (res.isSuccessful && res.data?.url) {
        const updatedUser = { ...user, avatar: res.data.url };
        setUser(updatedUser);
        authService.updateInternalUser({
          avatar: res.data.url,
          fullName: user.fullName,
        });
        router.refresh();
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Avatar upload failed:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateField = (field: string, value: any) => {
    if (user) setUser({ ...user, [field]: value });
  };

  const updateName = (type: "first" | "last", value: string) => {
    if (!user) return;
    const parts = (user.fullName || "").split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    let newFullName = "";
    if (type === "first") {
      newFullName = `${value} ${lastName}`.trim();
    } else {
      newFullName = `${firstName} ${value}`.trim();
    }
    setUser({ ...user, fullName: newFullName });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const payload = {
        fullName: user.fullName,
        phoneNumber: user.ownerPhoneNumber || user.phoneNumber || "",
        ownerPhoneNumber: user.ownerPhoneNumber || user.phoneNumber || "",
        businessPhoneNumber: user.businessPhoneNumber || user.phoneNumber || "",
        companyName: user.companyName || "",
        registrationNumber: user.registrationNumber || "",
        vatNumber: user.vatNumber || user.taxId || "",
        taxId: user.taxId || user.vatNumber || "",
        country: user.country || "",
        state: user.state || "",
        city: user.city || "",
        zipCode: user.zipCode || "",
        streetAddress: user.streetAddress || "",
        language: user.language || "en",
        timeZone: user.timeZone || "",
        isTwoFactorEnabled: user.isTwoFactorEnabled || false,
        avatar: user.avatar || "",
        currency: currency,
        useSeparateBillingAddress: user.useSeparateBillingAddress || false,
        billingCompanyName: user.billingCompanyName || "",
        billingRegistrationNumber: user.billingRegistrationNumber || "",
        billingPhoneNumber: user.billingPhoneNumber || "",
        billingVatNumber: user.billingVatNumber || user.billingTaxId || "",
        billingTaxId: user.billingTaxId || user.billingVatNumber || "",
        billingCountry: user.billingCountry || "",
        billingState: user.billingState || "",
        billingCity: user.billingCity || "",
        billingZipCode: user.billingZipCode || "",
        billingStreetAddress: user.billingStreetAddress || "",
      };

      const res = await profileService.updateProfile(payload);
      if (res.isSuccessful) {
        authService.updateInternalUser(payload);
        if (payload.timeZone) {
          setTimeZone(payload.timeZone);
          localStorage.setItem("app-timezone", payload.timeZone);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    try {
      const token = authService.getAccessToken();
      if (!token) {
        setPasswordError("Session expired. Please login again.");
        return;
      }

      const res = await authService.changePassword(token, oldPassword, newPassword);
      if (res.isSuccessful || res.statusCode === 200) {
        alert("Password changed successfully!");
        setShowPasswordModal(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(res.message || "Failed to change password");
      }
    } catch (error: any) {
      console.error("Password change error:", error);
      setPasswordError(error?.message || "An error occurred. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        {/* Page Title */}
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Account Details
        </h1>

        {/* 1. Login & Profile Settings */}
        <section className="mb-8">
          <SectionHeader title="Login & Profile Settings" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Form Grid (Left) */}
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Email Address */}
                <InputField
                  label="Email Address"
                  value={user?.email || ""}
                  readOnly={true}
                  actionText={user?.pendingEmail ? "" : "Change"}
                  onActionClick={handleOpenEmailModal}
                />

                {/* If pending email, spacer column on md, else Password */}
                {user?.pendingEmail ? (
                  <div className="hidden md:block" />
                ) : (
                  <InputField
                    label="Password"
                    value="••••••••"
                    type="password"
                    readOnly={true}
                    actionText="Change"
                    onActionClick={() => {
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordError("");
                      setShowPasswordModal(true);
                    }}
                  />
                )}

                {/* Pending Email Alert Banner (matching Screenshot 2) */}
                {user?.pendingEmail && (
                  <div className="col-span-1 md:col-span-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-[6px] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 text-[#78350F]">
                      <svg className="w-4 h-4 text-[#92400E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="9" strokeWidth="2" stroke="currentColor" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
                      </svg>
                      <span className="text-xs sm:text-[13px] text-[#78350F]">
                        Pending Email Change to <strong className="font-bold text-[#78350F]">{user.pendingEmail}</strong>. Please check your new email inbox to confirm.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEmailChange}
                      disabled={isCancellingEmail}
                      className="text-xs sm:text-[13px] font-bold text-[#78350F] hover:text-[#92400E] hover:underline cursor-pointer shrink-0 transition-colors self-end sm:self-center"
                    >
                      {isCancellingEmail ? "Cancelling..." : "Cancel Request"}
                    </button>
                  </div>
                )}

                {/* If pending email, Password is placed on next row */}
                {user?.pendingEmail && (
                  <InputField
                    label="Password"
                    value="••••••••"
                    type="password"
                    readOnly={true}
                    actionText="Change"
                    onActionClick={() => {
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordError("");
                      setShowPasswordModal(true);
                    }}
                  />
                )}

                {/* Preferred Currency */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Preferred Currency</label>
                  <div className="flex bg-gray-100 rounded-lg p-1 w-fit border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setCurrency("usd")}
                      className={`px-8 py-2.5 text-xs font-bold rounded-md uppercase transition-all duration-200 ${currency === "usd"
                        ? "bg-[#4343f0] text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("eur")}
                      className={`px-8 py-2.5 text-xs font-bold rounded-md uppercase transition-all ${currency === "eur"
                        ? "bg-[#4545F0] text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/5"
                        }`}
                    >
                      EUR (€)
                    </button>
                  </div>
                </div>

                {/* Time Zone */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-700">Time Zone</label>
                  <TimezoneSearchSelect
                    value={user?.timeZone || user?.timezone || ""}
                    onChange={(val) => updateField("timeZone", val)}
                    placeholder="Select timezone..."
                  />
                </div>
              </div>

              {/* Avatar Column (Right) */}
              <div className="md:w-[200px] flex justify-center md:justify-end border-l-0 md:border-l border-gray-200 pl-0 md:pl-8 pt-4 md:pt-0">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload profile picture"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 relative">
                    <img
                      src={user?.avatar || "/images/loggedoutaccount.svg"}
                      alt="User Avatar"
                      className={`w-full h-full object-cover rounded-full ${isUploading ? "opacity-40" : ""
                        }`}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-full">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#4545F0]"></div>
                      </div>
                    )}
                  </div>
                  {/* Plus badge */}
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-500"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Account Owner Details */}
        <section className="mb-8">
          <SectionHeader title="Account Owner Details" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10">
            <div className="flex flex-col lg:flex-row gap-10 items-stretch">
              {/* Form Grid (Left) */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* First Name */}
                <InputField
                  label="First Name"
                  value={(user?.fullName || "").split(" ")[0] || ""}
                  onChange={(e: any) => updateName("first", e.target.value)}
                />

                {/* Last Name */}
                <InputField
                  label="Last Name"
                  value={(user?.fullName || "").split(" ").slice(1).join(" ") || ""}
                  onChange={(e: any) => updateName("last", e.target.value)}
                />

                {/* Email Address */}
                <InputField
                  label="Email Address"
                  value={user?.email || ""}
                  readOnly={true}
                />

                {/* Phone Number */}
                <InputField
                  label="Phone Number"
                  value={user?.ownerPhoneNumber || user?.phoneNumber || ""}
                  onChange={(e: any) => {
                    updateField("ownerPhoneNumber", e.target.value);
                    updateField("phoneNumber", e.target.value);
                  }}
                />

                {/* Password (with Change action) */}
                <InputField
                  label="Password"
                  value="••••••••"
                  type="password"
                  readOnly={true}
                  actionText="Change"
                  onActionClick={() => {
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                    setShowPasswordModal(true);
                  }}
                />

                {/* Empty second column for row 3 */}
                <div className="hidden md:block" />
              </div>

              {/* Info Sidebar (Right) */}
              <div className="bw-full lg:w-[320px]">
                <InfoBox
                  title="Info"
                  text="The information saved here identifies the legal owner of the SWSCRM account and all client services."
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Business Details */}
        <section className="mb-8">
          <SectionHeader title="Business Details" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Form Grid (Left) */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Row 1: Company Name | Registration Number */}
                <InputField
                  label="Company Name"
                  value={user?.companyName || ""}
                  onChange={(e: any) => updateField("companyName", e.target.value)}
                />
                <InputField
                  label="Registration Number"
                  value={user?.registrationNumber || ""}
                  onChange={(e: any) => updateField("registrationNumber", e.target.value)}
                />

                {/* Row 2: VAT Number / Tax ID | Phone Number */}
                <InputField
                  label="VAT Number / Tax ID"
                  value={user?.vatNumber || user?.taxId || ""}
                  onChange={(e: any) => {
                    updateField("vatNumber", e.target.value);
                    updateField("taxId", e.target.value);
                  }}
                />
                <InputField
                  label="Phone Number"
                  value={user?.businessPhoneNumber || user?.phoneNumber || ""}
                  onChange={(e: any) => updateField("businessPhoneNumber", e.target.value)}
                />

                {/* Row 3: Country | State / Province */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Country</label>
                  <CountrySearchSelect
                    value={user?.country || ""}
                    onChange={(val) => updateField("country", val)}
                    countries={countriesList}
                    placeholder="Select country..."
                  />
                </div>
                <InputField
                  label="State / Province"
                  value={user?.state || ""}
                  onChange={(e: any) => updateField("state", e.target.value)}
                />

                {/* Row 4: City | ZIP / Postal Code */}
                <InputField
                  label="City"
                  value={user?.city || ""}
                  onChange={(e: any) => updateField("city", e.target.value)}
                />
                <InputField
                  label="ZIP / Postal Code"
                  value={user?.zipCode || ""}
                  onChange={(e: any) => updateField("zipCode", e.target.value)}
                />

                {/* Row 5: Street Address | (empty) */}
                <InputField
                  label="Street Address"
                  value={user?.streetAddress || ""}
                  onChange={(e: any) => updateField("streetAddress", e.target.value)}
                />
                <div className="hidden md:block" />
              </div>

              {/* Info Sidebar (Right) */}
              <div className="w-full lg:w-[320px]">
                <InfoBox
                  title="Info"
                  text="The information saved here identifies the details of the business associated with this SWSCRM account and all client services"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Billing Details */}
        <section className="mb-6">
          <SectionHeader title="Billing Details" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Left Content Area */}
              <div className="flex-1">
                {/* Switch Toggle Container Box */}
                <div className="flex items-center gap-3 mb-8 bg-gray-50 p-4 rounded-[10px] border border-gray-200">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={user?.useSeparateBillingAddress || false}
                      onChange={(e) => updateField("useSeparateBillingAddress", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-300"></div>
                  </label>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-gray-700">
                      Use separate billing address
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                      Enable this if your billing information differs from your business details.
                    </p>
                  </div>
                </div>

                {/* Expanded Billing Form Fields */}
                {user?.useSeparateBillingAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-10 animate-in fade-in duration-300">
                    <InputField
                      label="Billing Company Name"
                      value={user?.billingCompanyName || ""}
                      onChange={(e: any) => updateField("billingCompanyName", e.target.value)}
                    />
                    <InputField
                      label="Billing Registration Number"
                      value={user?.billingRegistrationNumber || ""}
                      onChange={(e: any) => updateField("billingRegistrationNumber", e.target.value)}
                    />

                    <InputField
                      label="Billing VAT Number / Tax ID"
                      value={user?.billingVatNumber || user?.billingTaxId || ""}
                      onChange={(e: any) => {
                        updateField("billingVatNumber", e.target.value);
                        updateField("billingTaxId", e.target.value);
                      }}
                    />
                    <InputField
                      label="Billing Phone Number"
                      value={user?.billingPhoneNumber || ""}
                      onChange={(e: any) => updateField("billingPhoneNumber", e.target.value)}
                    />

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-700">Billing Country</label>
                      <CountrySearchSelect
                        value={user?.billingCountry || ""}
                        onChange={(val) => updateField("billingCountry", val)}
                        countries={countriesList}
                        placeholder="Select country..."
                      />
                    </div>
                    <InputField
                      label="Billing State / Province"
                      value={user?.billingState || ""}
                      onChange={(e: any) => updateField("billingState", e.target.value)}
                    />

                    <InputField
                      label="Billing City"
                      value={user?.billingCity || ""}
                      onChange={(e: any) => updateField("billingCity", e.target.value)}
                    />
                    <InputField
                      label="Billing ZIP / Postal Code"
                      value={user?.billingZipCode || ""}
                      onChange={(e: any) => updateField("billingZipCode", e.target.value)}
                    />

                    <InputField
                      label="Billing Street Address"
                      value={user?.billingStreetAddress || ""}
                      onChange={(e: any) => updateField("billingStreetAddress", e.target.value)}
                    />
                    <div className="hidden md:block" />
                  </div>
                )}
              </div>

              {/* Info Sidebar (Right) */}
              <div className="w-full lg:w-[320px]">
                <InfoBox
                  title="Billing Information"
                  text="This address will be used for all invoices and payment receipts generated by the system. If disabled, your business details will be used instead."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Save Profile Changes Button (Outside & below card) */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isUpdating || isUploading}
            className={`bg-[#4343f0] hover:bg-[#162a5c] text-white text-xs font-bold px-12 py-3.5 rounded-[4px] transition-all shadow-md ${isUpdating || isUploading ? "opacity-60 cursor-not-allowed" : ""
              }`}
          >
            {isUpdating ? <LoadingDots text="Saving" /> : "Save Profile Changes"}
          </button>
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 animate-in fade-in slide-in-from-left-2 duration-300">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Profile saved!
            </span>
          )}
        </div>

        <div className="mt-16">
          <SupportNewsletter noPadding />
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Change Password</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Old Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-[4px] px-3.5 py-2.5 pr-12 text-sm text-gray-700 focus:outline-none focus:border-[#4545F0] focus:ring-1 focus:ring-[#4545F0]"
                    placeholder="Enter old password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showOldPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-[4px] px-3.5 py-2.5 pr-12 text-sm text-gray-700 focus:outline-none focus:border-[#4545F0] focus:ring-1 focus:ring-[#4545F0]"
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-[4px] px-3.5 py-2.5 pr-12 text-sm text-gray-700 focus:outline-none focus:border-[#4545F0] focus:ring-1 focus:ring-[#4545F0]"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-xs text-red-600 font-medium">{passwordError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError("");
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                className="flex-1 px-4 py-2.5 bg-[#4545F0] hover:bg-[#3737D8] text-white rounded-md font-bold text-xs transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Address Modal (matching Screenshot 3) */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full p-7 relative animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* Header with Title and Close X */}
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-[22px] font-bold text-[#0D1527] font-manrope">Change Email Address</h2>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 -mt-1 cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
              A confirmation link will be sent to your new email address. Your account email will not be changed until you click the link.
            </p>

            {/* Current Email */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-800 mb-2">Current Email</label>
              <input
                type="text"
                value={user?.email || ""}
                readOnly
                disabled
                className="w-full bg-[#F9FAFB] border border-gray-200 rounded-md px-3.5 py-2.5 text-sm text-gray-600 font-medium cursor-not-allowed outline-none"
              />
            </div>

            {/* New Email Address */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-800 mb-2">New Email Address</label>
              <input
                type="email"
                placeholder="Enter new email address"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendEmailLink();
                  }
                }}
                className={`w-full bg-white border ${emailError ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-[#4545F0]"
                  } rounded-md px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${emailError ? "focus:ring-red-500" : "focus:ring-[#4545F0]"
                  } transition-all`}
                autoFocus
              />
              {emailError && (
                <p className="text-xs text-red-500 font-medium mt-1.5">{emailError}</p>
              )}
            </div>

            {/* Action Buttons (Maroon Cancel + Blue Send Link) */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="w-full py-2.5 bg-[#800020] hover:bg-[#6b001b] text-white rounded-lg font-bold text-sm transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmailLink}
                disabled={isSendingEmailLink}
                className="w-full py-2.5 bg-[#4545F0] hover:bg-[#3737D8] text-white rounded-lg font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {isSendingEmailLink ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  "Send Link"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
