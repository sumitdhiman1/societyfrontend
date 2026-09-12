import { authService } from "@/lib/authService";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dispatch, RefObject, SetStateAction } from "react";

interface Props {
  profileRef: RefObject<HTMLDivElement | null>;
  avatar: string;
  profileDropdownOpen: boolean;
  setProfileDropdownOpen: Dispatch<SetStateAction<boolean>>;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
}

export const Profile = ({
  profileRef,
  avatar,
  profileDropdownOpen,
  setProfileDropdownOpen,
  setIsAuthenticated,
}: Props) => {
  const router = useRouter();

  return (
    <div className="relative flex items-center justify-center shrink-0" ref={profileRef}>
      <button
        className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-white flex items-center justify-center transition-transform hover:scale-105 shadow-sm shrink-0"
        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
      >
        <Image
          src={avatar || "/images/loggedoutaccount.svg"}
          alt="User"
          width={50}
          height={50}
          className="w-full h-full object-cover"
        />
      </button>
      {profileDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100 font-sans">
          {/* Group 1: Account, Payment History, Renewals */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/myAccount");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            My Account
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/payment-history");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Payment History
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/renewals");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Renewals
          </button>

          <div className="border-t border-gray-100 my-1.5" />

          {/* Group 2: Projects */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/my-projects");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            My Projects
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/new-project");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            New Project
          </button>

          <div className="border-t border-gray-100 my-1.5" />

          {/* Group 3: Quotes & Analyses */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/my-quotes");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            My Quotes
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/my-analyses");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            My Analyses
          </button>

          <div className="border-t border-gray-100 my-1.5" />

          {/* Group 4: Support */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/help-support");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Help & Support
          </button>

          <div className="border-t border-gray-200 my-2" />

          <button
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent focus loss and other events
              authService.logout();
              setIsAuthenticated(false);
              window.location.replace("/");
            }}
            className="block w-full text-left px-5 py-2.5 text-[15px] font-medium text-[#e11d48] hover:bg-gray-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
};
