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
    <div className="relative" ref={profileRef}>
      <button
        className="hover:scale-110 transition-transform"
        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
      >
        <div className="w-10 mt-1 h-10 rounded-full overflow-hidden border-2 border-[#1a2847] bg-white">
          <Image
            src={avatar || "/images/Avatar.png"}
            alt="User"
            width={50}
            height={50}
            className="w-full h-full object-cover"
          />
        </div>
      </button>
      {profileDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 z-50">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/myAccount");
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            My Account
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/my-projects");
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            My Projects
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/new-project");
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            New Project
          </button>

          <div className="border-t border-gray-200 my-2" />

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/my-analyses");
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            My Analyses
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/my-quotes");
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            My Quotes
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/payment-history");
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            My Payments
          </button>

          <div className="border-t border-gray-200 my-2" />

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/help-support");
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Help & Support
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setProfileDropdownOpen(false);
              router.push("/dashboard/referrals");
            }}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Refer a Friend (Get Free Credits!)
          </button>

          <div className="border-t border-gray-200 my-2" />

          <button
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent focus loss and other events
              authService.logout();
              setIsAuthenticated(false);
              window.location.replace("/");
            }}
            className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 transition-colors font-medium"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
};
