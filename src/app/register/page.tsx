"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import StatusPopup from "@/components/common/StatusPopup";
import FacebookIcon from "@/components/icons/facebook";
import GoogleIcon from "@/components/icons/google";
import CloseIcon from "@/components/icons/close";

// Internal Components from chunk logic
const Stepper = ({ current, onStepClick }: { current: number; onStepClick: (step: number) => void }) => {
  return (
    <div className="flex items-center mb-4 sm:mb-8">
      <div className="flex flex-col items-center gap-1 pt-0 cursor-pointer" onClick={() => onStepClick(1)}>
        <div className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-[10px] sm:text-sm font-medium
            ${current === 1 ? "bg-primary-200 text-white" : "border border-[#C4C4C4] text-[#555]"}
          `}>1</div>
        <span className={`text-[10px] sm:text-xs ${current === 1 ? "text-black opacity-100" : "opacity-60"}`}>Account</span>
      </div>
      <div className="w-8 sm:w-24 h-[2px] bg-[#D9D9D9] mb-4"></div>
      <div className="flex flex-col items-center gap-1 pt-0 cursor-pointer" onClick={() => current > 1 && onStepClick(2)}>
        <div className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-[10px] sm:text-sm font-medium
            ${current === 2 ? "bg-primary-200 text-white" : "border border-[#C4C4C4] text-[#555]"}
          `}>2</div>
        <span className={`text-[10px] sm:text-xs ${current === 2 ? "text-black opacity-100" : "opacity-60"}`}>Company</span>
      </div>
    </div>
  );
};

const SocialButton = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="w-full sm:w-[292px] h-[42px] border-2 border-[#BDBDBD] rounded-[8px] flex items-center overflow-hidden hover:bg-[#F7F7F7] transition active:scale-[0.98]">
    <div className="w-[42px] h-full flex items-center justify-center">{icon}</div>
    <div className="w-px h-full bg-[#BDBDBD]"></div>
    <span className="flex-1 text-center text-[#3A3A3A] text-[15px] font-medium">{label}</span>
  </button>
);

const GoogleIconLocal = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.6 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.5c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.3-4.7 3.3-8.2z" />
    <path fill="#34A853" d="M12 24c3 0 5.5-1 7.3-2.8l-3.6-2.8c-1 1-2.3 1.6-3.7 1.6-2.9 0-5.4-1.9-6.3-4.6H1v2.9C2.8 21 6.1 24 12 24z" />
    <path fill="#FBBC05" d="M5.7 14.4C5.5 13.8 5.5 13.1 5.5 12.4s.1-1.4.3-2l-3-2.3C1.9 9.3 1 10.8 1 12.4s.9 3 2 4.3l2.7-2.3z" />
    <path fill="#EA4335" d="M12 5c1.6 0 3.1.6 4.3 1.7l3.2-3.2C17.5 1.2 14.9 0 12 0 6.1 0 2.8 3 1 7.6l2.7 2.3C6.6 6.9 9.1 5 12 5z" />
  </svg>
);

const FacebookIconLocal = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33.891 33.891" className={className} fill="currentColor">
    <path d="M30.26,2.25H3.631A3.631,3.631,0,0,0,0,5.881V32.51a3.631,3.631,0,0,0,3.631,3.631H14.014V24.619H9.248V19.2h4.766V15.062c0-4.7,2.8-7.3,7.086-7.3a28.873,28.873,0,0,1,4.2.366v4.615H22.935a2.712,2.712,0,0,0-3.058,2.93V19.2h5.2l-.832,5.423H19.877V36.141H30.26a3.631,3.631,0,0,0,3.631-3.631V5.881A3.631,3.631,0,0,0,30.26,2.25Z" transform="translate(0 -2.25)" />
  </svg>
);

const InputField = ({ label, required, type = "text", value, onChange, placeholder }: any) => (
  <div className="flex flex-col gap-1 w-full">
    {label && (
      <label className="text-sm text-gray-700 font-semibold text-left">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full border border-gray-300 bg-white rounded-md px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all"
    />
  </div>
);

const SubmitButton = ({ label, type = "button", disabled, onClick, className = "" }: any) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`w-full h-[48px] mt-6 rounded-[8px] text-white text-[15px] font-bold transition-all active:scale-[0.98] ${disabled ? "bg-gray-300 cursor-not-allowed" : "bg-primary-300 hover:bg-primary-500 shadow-md hover:shadow-lg"
      } ${className}`}
  >
    {label}
  </button>
);

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusPopup, setStatusPopup] = useState({ isOpen: false, type: "success" as "success" | "error", title: "", message: "" });

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        email,
        password,
        fullName: `${firstName} ${lastName}`,
        language: "en",
        redirectUrl: "/",
        companyName: companyName || undefined,
        phoneNumber: phoneNumber || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        registrationNumber: registrationNumber || undefined,
        country: country || undefined,
        city: city || undefined,
        streetAddress: streetAddress || undefined,
      };
      const res = await authService.register(payload);
      if (res.isSuccessful) {
        if (res.data?.access_token) {
          authService.setSession(res.data);
          window.dispatchEvent(new Event("auth:login"));
        }
        setStep(3);
      } else {
        setStatusPopup({ isOpen: true, type: "error", title: "Registration Failed", message: res.message || "Something went wrong. Please try again." });
      }
    } catch (err: any) {
      setStatusPopup({ isOpen: true, type: "error", title: "Error", message: err?.message || "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (platform: string) => {
    if (platform === "Google") authService.loginWithGoogle();
    else alert(`${platform} login not implemented yet`);
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      <StatusPopup
        isOpen={statusPopup.isOpen}
        onClose={() => setStatusPopup(p => ({ ...p, isOpen: false }))}
        type={statusPopup.type}
        title={statusPopup.title}
        message={statusPopup.message}
      />

      {/* Left Panel */}
      <div className="hidden lg:block w-[40%] h-screen sticky top-0 overflow-hidden shrink-0">
        <img src="images/worldpic.jpg" className="w-full h-full object-cover opacity-80" alt="Panel" />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex justify-center items-start px-6 md:px-12 lg:px-16 xl:px-24 pt-10 pb-24">
        <div className="w-full max-w-xl lg:max-w-2xl">
          <div className="flex flex-row justify-between items-start gap-4 mt-6">
            <div className="flex flex-col">
              {step === 3 ? (
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a40] tracking-tight">Verify Email</h1>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a40] tracking-tight">Register</h1>
                  <p className="text-gray-400 font-bold text-sm sm:text-[15px] uppercase tracking-wider mt-1">
                    {step === 1 ? "Account details" : "Company details"}
                  </p>
                </>
              )}
            </div>
            <div className="shrink-0 pt-1">
              {step !== 3 && <Stepper current={step} onStepClick={(s) => s < step && setStep(s)} />}
            </div>
          </div>

          {step !== 3 && (
            <div className="text-sm mb-10 mt-2">
              <span className="opacity-60 text-gray-400 font-bold uppercase tracking-wider text-[11px]">Already a member?</span>
              <a href="/login" className="font-extrabold text-[#1a1a40] ml-3 hover:underline transition-all tracking-tight">Log in now</a>
            </div>
          )}

          <div className="w-full h-px bg-gray-100 mb-10"></div>

          {step === 1 && (
            <>
              <p className="mb-4 text-[#1a1a40] font-bold text-lg tracking-tight">Choose one below</p>
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <SocialButton icon={<GoogleIconLocal />} label="Sign in with Google" onClick={() => handleSocialLogin("Google")} />
                <SocialButton icon={<FacebookIconLocal className="w-5 h-5 text-primary-300" />} label="Sign in with Facebook" onClick={() => handleSocialLogin("Facebook")} />
              </div>

              <p className="mb-6 text-[#1a1a40] font-bold text-lg tracking-tight">Or continue with your email</p>
              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="First name" required value={firstName} onChange={(e: any) => setFirstName(e.target.value)} />
                  <InputField label="Last name" required value={lastName} onChange={(e: any) => setLastName(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Email address" required type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                  <InputField label="Set a password" required type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
                </div>
                <SubmitButton label="Continue" type="submit" />
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6">
                <p className="text-gray-700 font-medium mb-2">Information</p>
                <div className="w-full h-px bg-gray-200"></div>
              </div>
              <form className="space-y-5" onSubmit={handleRegister}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Company name" value={companyName} onChange={(e: any) => setCompanyName(e.target.value)} />
                  <InputField label="Registration number" value={registrationNumber} onChange={(e: any) => setRegistrationNumber(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Phone number" value={phoneNumber} onChange={(e: any) => setPhoneNumber(e.target.value)} />
                  <InputField label="Country" value={country} onChange={(e: any) => setCountry(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="State" value={state} onChange={(e: any) => setState(e.target.value)} />
                  <InputField label="City" value={city} onChange={(e: any) => setCity(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Zip/Postal Code" value={zipCode} onChange={(e: any) => setZipCode(e.target.value)} />
                  <InputField label="Street Address" value={streetAddress} onChange={(e: any) => setStreetAddress(e.target.value)} />
                </div>
                {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{errorMsg}</div>}
                <div className="flex gap-4 pt-3">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 h-[48px] rounded-[8px] border-2 border-[#BDBDBD] text-[#3A3A3A] font-bold hover:bg-gray-50 transition-all active:scale-[0.98]">
                    Back
                  </button>
                  <SubmitButton label={loading ? "Creating account..." : "Create my account"} type="submit" disabled={loading} className="flex-[2] !mt-0" />
                </div>
              </form>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-primary-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-300/30">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5l-4-4 1.41-1.41L11 12.67l5.59-5.59L18 8.5l-7 7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                We have sent a verification email to <span className="font-semibold text-gray-800">{email}</span>.
                <br /><br />
                Please check your inbox (and spam folder) and click the link to activate your account.
              </p>
              <div className="flex justify-center gap-4">
                <a href="/" className="px-6 py-2.5 bg-primary-300 hover:bg-primary-500 text-white rounded-md font-medium transition-colors">Go to Homepage</a>
              </div>
              <p className="mt-8 text-sm text-gray-500">
                Didn't receive the email? <button className="text-[#5356ff] hover:underline font-medium" onClick={() => alert("Resend functionality to be implemented")}>Click here to resend</button>
              </p>
              <div className="mt-10 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-pulse">
                <p className="text-blue-700 text-sm font-medium">Redirecting to homepage in 5 seconds...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
