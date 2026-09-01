"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { profileService } from "@/lib/profileService";
import { mediaService } from "@/lib/mediaService";
import { useCurrency } from "@/context/CurrencyContext";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import LoadingDots from "@/components/common/LoadingDots";

// Timezone list from production dist
const TIMEZONES = [
  { value: "Dateline Standard Time", label: "(UTC-12:00) International Date Line West" },
  { value: "UTC-11", label: "(UTC-11:00) Coordinated Universal Time-11" },
  { value: "Aleutian Standard Time", label: "(UTC-10:00) Aleutian Islands" },
  { value: "Hawaiian Standard Time", label: "(UTC-10:00) Hawaii" },
  { value: "Marquesas Standard Time", label: "(UTC-09:30) Marquesas Islands" },
  { value: "Alaskan Standard Time", label: "(UTC-09:00) Alaska" },
  { value: "UTC-09", label: "(UTC-09:00) Coordinated Universal Time-09" },
  { value: "Pacific Standard Time (Mexico)", label: "(UTC-08:00) Baja California" },
  { value: "UTC-08", label: "(UTC-08:00) Coordinated Universal Time-08" },
  { value: "Pacific Standard Time", label: "(UTC-08:00) Pacific Time (US & Canada)" },
  { value: "US Mountain Standard Time", label: "(UTC-07:00) Arizona" },
  { value: "Mountain Standard Time (Mexico)", label: "(UTC-07:00) Chihuahua, La Paz, Mazatlan" },
  { value: "Mountain Standard Time", label: "(UTC-07:00) Mountain Time (US & Canada)" },
  { value: "Central America Standard Time", label: "(UTC-06:00) Central America" },
  { value: "Central Standard Time", label: "(UTC-06:00) Central Time (US & Canada)" },
  { value: "Central Standard Time (Mexico)", label: "(UTC-06:00) Guadalajara, Mexico City, Monterrey" },
  { value: "Canada Central Standard Time", label: "(UTC-06:00) Saskatchewan" },
  { value: "SA Pacific Standard Time", label: "(UTC-05:00) Bogota, Lima, Quito, Rio Branco" },
  { value: "Eastern Standard Time (Mexico)", label: "(UTC-05:00) Chetumal" },
  { value: "Eastern Standard Time", label: "(UTC-05:00) Eastern Time (US & Canada)" },
  { value: "US Eastern Standard Time", label: "(UTC-05:00) Indiana (East)" },
  { value: "Venezuela Standard Time", label: "(UTC-04:30) Caracas" },
  { value: "Paraguay Standard Time", label: "(UTC-04:00) Asuncion" },
  { value: "Atlantic Standard Time", label: "(UTC-04:00) Atlantic Time (Canada)" },
  { value: "Central Brazilian Standard Time", label: "(UTC-04:00) Cuiaba" },
  { value: "SA Western Standard Time", label: "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan" },
  { value: "Newfoundland Standard Time", label: "(UTC-03:30) Newfoundland" },
  { value: "Tocantins Standard Time", label: "(UTC-03:00) Araguaina" },
  { value: "E. South America Standard Time", label: "(UTC-03:00) Brasilia" },
  { value: "SA Eastern Standard Time", label: "(UTC-03:00) Cayenne, Fortaleza" },
  { value: "Argentina Standard Time", label: "(UTC-03:00) City of Buenos Aires" },
  { value: "Greenland Standard Time", label: "(UTC-03:00) Greenland" },
  { value: "Montevideo Standard Time", label: "(UTC-03:00) Montevideo" },
  { value: "Magallanes Standard Time", label: "(UTC-03:00) Punta Arenas" },
  { value: "Saint Pierre Standard Time", label: "(UTC-03:00) Saint Pierre and Miquelon" },
  { value: "Bahia Standard Time", label: "(UTC-03:00) Salvador" },
  { value: "UTC-02", label: "(UTC-02:00) Coordinated Universal Time-02" },
  { value: "Mid-Atlantic Standard Time", label: "(UTC-02:00) Mid-Atlantic - Old" },
  { value: "Azores Standard Time", label: "(UTC-01:00) Azores" },
  { value: "Cape Verde Standard Time", label: "(UTC-01:00) Cabo Verde Is." },
  { value: "UTC", label: "(UTC) Coordinated Universal Time" },
  { value: "GMT Standard Time", label: "(UTC+00:00) Dublin, Edinburgh, Lisbon, London" },
  { value: "Greenwich Standard Time", label: "(UTC+00:00) Monrovia, Reykjavik" },
  { value: "Sao Tome Standard Time", label: "(UTC+00:00) Sao Tome" },
  { value: "Morocco Standard Time", label: "(UTC+01:00) Casablanca" },
  { value: "W. Europe Standard Time", label: "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna" },
  { value: "Central Europe Standard Time", label: "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague" },
  { value: "Romance Standard Time", label: "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris" },
  { value: "Central European Standard Time", label: "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb" },
  { value: "W. Central Africa Standard Time", label: "(UTC+01:00) West Central Africa" },
  { value: "Jordan Standard Time", label: "(UTC+02:00) Amman" },
  { value: "GTB Standard Time", label: "(UTC+02:00) Athens, Bucharest" },
  { value: "Middle East Standard Time", label: "(UTC+02:00) Beirut" },
  { value: "Egypt Standard Time", label: "(UTC+02:00) Cairo" },
  { value: "E. Europe Standard Time", label: "(UTC+02:00) Chisinau" },
  { value: "Syria Standard Time", label: "(UTC+02:00) Damascus" },
  { value: "West Bank Standard Time", label: "(UTC+02:00) Gaza, Hebron" },
  { value: "South Africa Standard Time", label: "(UTC+02:00) Harare, Pretoria" },
  { value: "FLE Standard Time", label: "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius" },
  { value: "Israel Standard Time", label: "(UTC+02:00) Jerusalem" },
  { value: "Kaliningrad Standard Time", label: "(UTC+02:00) Kaliningrad" },
  { value: "Sudan Standard Time", label: "(UTC+02:00) Khartoum" },
  { value: "Libya Standard Time", label: "(UTC+02:00) Tripoli" },
  { value: "Namibia Standard Time", label: "(UTC+02:00) Windhoek" },
  { value: "Arabic Standard Time", label: "(UTC+03:00) Baghdad" },
  { value: "Turkey Standard Time", label: "(UTC+03:00) Istanbul" },
  { value: "Arab Standard Time", label: "(UTC+03:00) Kuwait, Riyadh" },
  { value: "Belarus Standard Time", label: "(UTC+03:00) Minsk" },
  { value: "Russian Standard Time", label: "(UTC+03:00) Moscow, St. Petersburg" },
  { value: "E. Africa Standard Time", label: "(UTC+03:00) Nairobi" },
  { value: "Iran Standard Time", label: "(UTC+03:30) Tehran" },
  { value: "Arabian Standard Time", label: "(UTC+04:00) Abu Dhabi, Muscat" },
  { value: "Astrakhan Standard Time", label: "(UTC+04:00) Astrakhan, Ulyanovsk" },
  { value: "Azerbaijan Standard Time", label: "(UTC+04:00) Baku" },
  { value: "Russia Time Zone 3", label: "(UTC+04:00) Izhevsk, Samara" },
  { value: "Mauritius Standard Time", label: "(UTC+04:00) Port Louis" },
  { value: "Saratov Standard Time", label: "(UTC+04:00) Saratov" },
  { value: "Georgian Standard Time", label: "(UTC+04:00) Tbilisi" },
  { value: "Volgograd Standard Time", label: "(UTC+04:00) Volgograd" },
  { value: "Caucasus Standard Time", label: "(UTC+04:00) Yerevan" },
  { value: "Afghanistan Standard Time", label: "(UTC+04:30) Kabul" },
  { value: "West Asia Standard Time", label: "(UTC+05:00) Ashgabat, Tashkent" },
  { value: "Ekaterinburg Standard Time", label: "(UTC+05:00) Ekaterinburg" },
  { value: "Pakistan Standard Time", label: "(UTC+05:00) Islamabad, Karachi" },
  { value: "Qyzylorda Standard Time", label: "(UTC+05:00) Qyzylorda" },
  { value: "India Standard Time", label: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi" },
  { value: "Sri Lanka Standard Time", label: "(UTC+05:30) Sri Jayawardenepura" },
  { value: "Nepal Standard Time", label: "(UTC+05:45) Kathmandu" },
  { value: "Central Asia Standard Time", label: "(UTC+06:00) Astana" },
  { value: "Bangladesh Standard Time", label: "(UTC+06:00) Dhaka" },
  { value: "Omsk Standard Time", label: "(UTC+06:00) Omsk" },
  { value: "Myanmar Standard Time", label: "(UTC+06:30) Yangon (Rangoon)" },
  { value: "SE Asia Standard Time", label: "(UTC+07:00) Bangkok, Hanoi, Jakarta" },
  { value: "Altai Standard Time", label: "(UTC+07:00) Barnaul, Gorno-Altaysk" },
  { value: "W. Mongolia Standard Time", label: "(UTC+07:00) Hovd" },
  { value: "Krasnoyarsk Standard Time", label: "(UTC+07:00) Krasnoyarsk" },
  { value: "Novosibirsk Standard Time", label: "(UTC+07:00) Novosibirsk" },
  { value: "Tomsk Standard Time", label: "(UTC+07:00) Tomsk" },
  { value: "China Standard Time", label: "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi" },
  { value: "North Asia East Standard Time", label: "(UTC+08:00) Irkutsk" },
  { value: "Singapore Standard Time", label: "(UTC+08:00) Kuala Lumpur, Singapore" },
  { value: "W. Australia Standard Time", label: "(UTC+08:00) Perth" },
  { value: "Taipei Standard Time", label: "(UTC+08:00) Taipei" },
  { value: "Ulaanbaatar Standard Time", label: "(UTC+08:00) Ulaanbaatar" },
  { value: "Aus Central W. Standard Time", label: "(UTC+08:45) Eucla" },
  { value: "Transbaikal Standard Time", label: "(UTC+09:00) Chita" },
  { value: "Tokyo Standard Time", label: "(UTC+09:00) Osaka, Sapporo, Tokyo" },
  { value: "North Korea Standard Time", label: "(UTC+09:00) Pyongyang" },
  { value: "Korea Standard Time", label: "(UTC+09:00) Seoul" },
  { value: "Yakutsk Standard Time", label: "(UTC+09:00) Yakutsk" },
  { value: "Cen. Australia Standard Time", label: "(UTC+09:30) Adelaide" },
  { value: "AUS Central Standard Time", label: "(UTC+09:30) Darwin" },
  { value: "E. Australia Standard Time", label: "(UTC+10:00) Brisbane" },
  { value: "AUS Eastern Standard Time", label: "(UTC+10:00) Canberra, Melbourne, Sydney" },
  { value: "West Pacific Standard Time", label: "(UTC+10:00) Guam, Port Moresby" },
  { value: "Tasmania Standard Time", label: "(UTC+10:00) Hobart" },
  { value: "Vladivostok Standard Time", label: "(UTC+10:00) Vladivostok" },
  { value: "Lord Howe Standard Time", label: "(UTC+10:30) Lord Howe Island" },
  { value: "Bougainville Standard Time", label: "(UTC+11:00) Bougainville Island" },
  { value: "Russia Time Zone 10", label: "(UTC+11:00) Chokurdakh" },
  { value: "Magadan Standard Time", label: "(UTC+11:00) Magadan" },
  { value: "Norfolk Standard Time", label: "(UTC+11:00) Norfolk Island" },
  { value: "Sakhalin Standard Time", label: "(UTC+11:00) Sakhalin" },
  { value: "Central Pacific Standard Time", label: "(UTC+11:00) Solomon Is., New Caledonia" },
  { value: "Russia Time Zone 11", label: "(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky" },
  { value: "New Zealand Standard Time", label: "(UTC+12:00) Auckland, Wellington" },
  { value: "UTC+12", label: "(UTC+12:00) Coordinated Universal Time+12" },
  { value: "Fiji Standard Time", label: "(UTC+12:00) Fiji" },
  { value: "Kamchatka Standard Time", label: "(UTC+12:00) Petropavlovsk-Kamchatsky - Old" },
  { value: "Chatham Islands Standard Time", label: "(UTC+12:45) Chatham Islands" },
  { value: "UTC+13", label: "(UTC+13:00) Coordinated Universal Time+13" },
  { value: "Tonga Standard Time", label: "(UTC+13:00) Nuku'alofa" },
  { value: "Samoa Standard Time", label: "(UTC+13:00) Samoa" },
  { value: "Line Islands Standard Time", label: "(UTC+14:00) Kiritimati Island" }
];

const InputField = ({ label, value, onChange, type = "text", className = "", readOnly = false, actionText = "", onActionClick }: any) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className="text-sm font-bold text-gray-700">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full rounded-[4px] px-4 py-3 text-sm transition-all ${
          readOnly 
            ? "bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed" 
            : "bg-white border border-gray-300 text-gray-700 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
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
    <h2 className="text-[22px] font-medium text-primary-100 mb-3">{title}</h2>
    <div className="h-[3px] bg-primary-300 w-24 rounded-full" />
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
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  // Password visibility
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const { currency, setCurrency } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await profileService.getMyProfile();
        if (res?.data) {
          setUser(res.data);
          
          // Sync local user data
          const localUser = authService.getUser();
          if (localUser && (localUser.avatar !== res.data.avatar || localUser.fullName !== res.data.fullName)) {
            authService.updateInternalUser({
              avatar: res.data.avatar,
              fullName: res.data.fullName
            });
            router.refresh();
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
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
        folder: `profile/avatar/${userId}`
      });

      if (res.isSuccessful && res.data?.url) {
        const updatedUser = { ...user, avatar: res.data.url };
        setUser(updatedUser);
        authService.updateInternalUser({
          avatar: res.data.url,
          fullName: user.fullName
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
        phoneNumber: user.phoneNumber,
        companyName: user.companyName,
        registrationNumber: user.registrationNumber,
        country: user.country,
        state: user.state,
        city: user.city,
        zipCode: user.zipCode,
        streetAddress: user.streetAddress,
        language: user.language || "en",
        timeZone: user.timeZone,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        avatar: user.avatar,
        currency: currency,
        useSeparateBillingAddress: user.useSeparateBillingAddress || false,
        billingCompanyName: user.billingCompanyName || "",
        billingRegistrationNumber: user.billingRegistrationNumber || "",
        billingPhoneNumber: user.billingPhoneNumber || "",
        billingCountry: user.billingCountry || "",
        billingState: user.billingState || "",
        billingCity: user.billingCity || "",
        billingZipCode: user.billingZipCode || "",
        billingStreetAddress: user.billingStreetAddress || "",
      };
      
      const res = await profileService.updateProfile(payload);
      if (res.isSuccessful) {
        authService.updateInternalUser({
          avatar: user.avatar,
          fullName: user.fullName
        });
        alert("Profile updated successfully!");
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Failed to update profile.");
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
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Account Details
        </h1>

        {/* Login & Profile Settings */}
        <section className="mb-8">
          <SectionHeader title="Login & Profile Settings" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 w-full flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField 
                    label="Email address" 
                    value={user?.email || ""} 
                    readOnly={true} 
                  />
                  <InputField 
                    label="Password" 
                    value="••••••••" 
                    type="password" 
                    actionText="Change" 
                    onActionClick={() => {
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordError("");
                      setShowPasswordModal(true);
                    }}
                    readOnly={true} 
                  />
                </div>

                <div className="pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-2 block">Preferred Currency</label>
                    <p className="text-[11px] text-gray-400 mb-4 font-medium opacity-80">
                      Choose how you would like to see prices and make payments across the platform.
                    </p>
                    <div className="flex bg-gray-100 rounded-lg p-1 w-fit border border-gray-200">
                      <button 
                        onClick={() => setCurrency("usd")}
                        className={`px-8 py-2.5 text-xs font-bold rounded-md uppercase transition-all duration-200 ${currency === "usd" ? "bg-[#0D1939] text-white shadow-md" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
                      >
                        USD ($)
                      </button>
                      <button 
                        onClick={() => setCurrency("eur")}
                        className={`px-8 py-2.5 text-xs font-bold rounded-md uppercase transition-all duration-200 ${currency === "eur" ? "bg-[#0D1939] text-white shadow-md" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}`}
                      >
                        EUR (€)
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">Time Zone</label>
                    <p className="text-[11px] text-gray-400 mb-2 font-medium opacity-80">
                      Select your local time zone for accurate project timelines and communication.
                    </p>
                    <div className="relative">
                      <select 
                        className="w-full bg-white border border-gray-300 rounded-[4px] px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 appearance-none cursor-pointer"
                        value={user?.timeZone || ""}
                        onChange={(e) => updateField("timeZone", e.target.value)}
                      >
                        <option value="" disabled>Select Timezone</option>
                        {TIMEZONES.map(tz => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                          <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="md:w-[200px] flex justify-center md:justify-end border-l-0 md:border-l border-gray-200 pl-0 md:pl-8 pt-4 md:pt-0">
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 relative">
                    <img 
                      src={user?.avatar && user.avatar !== "" ? user.avatar : "/images/Avatar.png"} 
                      alt="User Avatar" 
                      className={`w-full h-full object-cover ${isUploading ? "opacity-50" : ""}`}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-100"></div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-500 shadow-sm"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Owner Details */}
        <section className="mb-8">
          <SectionHeader title="Account Owner Details" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10">
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <InputField 
                    label="First Name" 
                    value={(user?.fullName || "").split(" ")[0] || ""} 
                    onChange={(e: any) => updateName("first", e.target.value)} 
                  />
                  <InputField 
                    label="Last Name" 
                    value={(user?.fullName || "").split(" ").slice(1).join(" ") || ""} 
                    onChange={(e: any) => updateName("last", e.target.value)} 
                  />
                  <InputField 
                    label="Phone Number" 
                    value={user?.phoneNumber || ""} 
                    onChange={(e: any) => updateField("phoneNumber", e.target.value)} 
                  />
                </div>
              </div>

              <div className="w-full lg:w-[320px]">
                <InfoBox title="Info" text="The information saved here identifies the legal owner of the SWSCRM account and all client services." />
              </div>
            </div>
          </div>
        </section>

        {/* Business Details */}
        <section className="mb-8">
          <SectionHeader title="Business Details" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10">
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                  <InputField label="Company Name" value={user?.companyName || ""} onChange={(e: any) => updateField("companyName", e.target.value)} />
                  <InputField label="Registration Number" value={user?.registrationNumber || ""} onChange={(e: any) => updateField("registrationNumber", e.target.value)} />
                  <InputField label="Phone Number" value={user?.phoneNumber || ""} onChange={(e: any) => updateField("phoneNumber", e.target.value)} />
                  <InputField label="Country" value={user?.country || ""} onChange={(e: any) => updateField("country", e.target.value)} />
                  <InputField label="State" value={user?.state || ""} onChange={(e: any) => updateField("state", e.target.value)} />
                  <InputField label="City" value={user?.city || ""} onChange={(e: any) => updateField("city", e.target.value)} />
                  <InputField label="ZIP / Postal Code" value={user?.zipCode || ""} onChange={(e: any) => updateField("zipCode", e.target.value)} />
                  <InputField label="Street Address" value={user?.streetAddress || ""} onChange={(e: any) => updateField("streetAddress", e.target.value)} />
                </div>
              </div>

              <div className="w-full lg:w-[320px]">
                <InfoBox title="Info" text="The information saved here identifies the details of the business associated with this SWSCRM account and all client services" />
              </div>
            </div>
          </div>
        </section>

        {/* Billing Details */}
        <section className="mb-12">
          <SectionHeader title="Billing Details" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10">
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-10">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={user?.useSeparateBillingAddress || false}
                      onChange={(e) => updateField("useSeparateBillingAddress", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-300"></div>
                  </label>
                  <span className="text-sm font-bold text-gray-700">Use separate billing address</span>
                </div>

                {user?.useSeparateBillingAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                    <InputField label="Billing Company Name" value={user?.billingCompanyName || ""} onChange={(e: any) => updateField("billingCompanyName", e.target.value)} />
                    <InputField label="Billing Registration Number" value={user?.billingRegistrationNumber || ""} onChange={(e: any) => updateField("billingRegistrationNumber", e.target.value)} />
                    <InputField label="Billing Phone Number" value={user?.billingPhoneNumber || ""} onChange={(e: any) => updateField("billingPhoneNumber", e.target.value)} />
                    <InputField label="Billing Country" value={user?.billingCountry || ""} onChange={(e: any) => updateField("billingCountry", e.target.value)} />
                    <InputField label="Billing State" value={user?.billingState || ""} onChange={(e: any) => updateField("billingState", e.target.value)} />
                    <InputField label="Billing City" value={user?.billingCity || ""} onChange={(e: any) => updateField("billingCity", e.target.value)} />
                    <InputField label="Billing ZIP / Postal Code" value={user?.billingZipCode || ""} onChange={(e: any) => updateField("billingZipCode", e.target.value)} />
                    <InputField label="Billing Street Address" value={user?.billingStreetAddress || ""} onChange={(e: any) => updateField("billingStreetAddress", e.target.value)} />
                  </div>
                )}
                
                <button 
                  onClick={handleSaveProfile}
                  disabled={isUpdating || isUploading}
                  className={`bg-[#0D1939] hover:bg-[#1a2850] text-white text-xs font-bold px-10 py-3.5 rounded-[4px] transition-colors ${isUpdating || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isUpdating ? <LoadingDots text="Updating" /> : "Save Profile Changes"}
                </button>
              </div>

              <div className="w-full lg:w-[320px]">
                <InfoBox 
                  title="Billing Information" 
                  text="This address will be used for all invoices and payment receipts generated by the system. If disabled, your business details will be used instead." 
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Old Password</label>
                <div className="relative">
                  <input
                    type={showOldPass ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-[4px] px-4 py-3 pr-12 text-sm text-gray-700 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                    placeholder="Enter old password"
                  />
                  <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showOldPass ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-[4px] px-4 py-3 pr-12 text-sm text-gray-700 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                    placeholder="Enter new password"
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showNewPass ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-[4px] px-4 py-3 pr-12 text-sm text-gray-700 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                    placeholder="Confirm new password"
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showConfirmPass ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600 font-medium">{passwordError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowPasswordModal(false);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError("");
                }}
                className="flex-1 px-4 py-2 bg-[#800020] text-white rounded-[4px] hover:bg-[#600018] font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleChangePassword}
                className="flex-1 px-4 py-2 bg-[#0D1939] text-white rounded-[4px] hover:bg-[#1a2850] font-bold text-sm transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
