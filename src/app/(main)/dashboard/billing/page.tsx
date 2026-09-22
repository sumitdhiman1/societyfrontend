"use client";

import React, { useState, useEffect } from "react";
import { paymentService } from "@/lib/paymentService";
import { authService } from "@/lib/authService";
import { profileService } from "@/lib/profileService";
import { countryService, Country } from "@/lib/countryService";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardElement,
} from "@stripe/react-stripe-js";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";
import SupportNewsletter from "@/components/dashboard/SupportNewsletter";
import CountrySearchSelect from "@/components/common/CountrySearchSelect";
import LoadingDots from "@/components/common/LoadingDots";

// Stripe initialization
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
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

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  placeholder = "",
}: any) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className="text-sm font-bold text-gray-700">{label}</label>
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className="bg-white w-full rounded-[4px] px-4 py-3 text-sm transition-all border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4545F0] focus:ring-1 focus:ring-[#4545F0]"
    />
  </div>
);

// Sub-component for Adding a New Card
function AddCardForm({
  clientSecret,
  countries,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  countries: Country[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState("");
  const [useSeparateBilling, setUseSeparateBilling] = useState(false);
  const [billingStreet, setBillingStreet] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingZip, setBillingZip] = useState("");
  const [billingCountry, setBillingCountry] = useState("");
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [makePrimary, setMakePrimary] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError("");

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    try {
      const billingDetails: any = {
        name: cardholderName.trim() || undefined,
      };

      if (useSeparateBilling) {
        billingDetails.address = {
          line1: billingStreet.trim() || undefined,
          city: billingCity.trim() || undefined,
          state: billingState.trim() || undefined,
          postal_code: billingZip.trim() || undefined,
          country: billingCountry.trim() || undefined,
        };
      }

      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: billingDetails,
          },
        }
      );

      if (setupError) {
        setError(setupError.message || "An error occurred while saving the card.");
        setIsProcessing(false);
      } else if (setupIntent && setupIntent.status === "succeeded") {
        if (makePrimary && setupIntent.payment_method) {
          try {
            await paymentService.setDefaultMethod(setupIntent.payment_method as string);
          } catch (err) {
            console.error("Failed to set default method:", err);
          }
        }

        if (useSeparateBilling && saveToProfile) {
          try {
            await profileService.updateProfile({
              useSeparateBillingAddress: true,
              billingStreetAddress: billingStreet.trim(),
              billingCity: billingCity.trim(),
              billingState: billingState.trim(),
              billingZipCode: billingZip.trim(),
              billingCountry: billingCountry.trim(),
            });
          } catch (profileErr) {
            console.error("Failed to update profile billing address:", profileErr);
          }
        }

        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-h-[80vh] overflow-y-auto pr-1">
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-700 mb-2">
          Cardholder name
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          className="w-full bg-[#EEEEEE] border-none rounded-[4px] px-3 py-2.5 text-sm placeholder-gray-400 focus:ring-1 focus:ring-gray-300 outline-none mb-6"
        />

        <label className="block text-xs font-bold text-gray-700 mb-2">
          Card details
        </label>
        <div className="w-full bg-[#EEEEEE] border-none rounded-[4px] px-3 py-3.5 mb-6">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "14px",
                  color: "#424770",
                  fontFamily: "Inter, sans-serif",
                  "::placeholder": { color: "#aab7c4" },
                  iconColor: "#aab7c4",
                },
                invalid: { color: "#9e2146", iconColor: "#9e2146" },
              },
              hidePostalCode: true,
              disableLink: true,
            }}
          />
        </div>

        {/* Separate Card Billing Details Section */}
        <div className="mb-6 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="useSeparateBilling"
              checked={useSeparateBilling}
              onChange={(e) => setUseSeparateBilling(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-300 focus:ring-primary-300 cursor-pointer"
            />
            <label htmlFor="useSeparateBilling" className="text-xs font-bold text-gray-700 cursor-pointer">
              Enter separate billing info for this card
            </label>
          </div>

          {useSeparateBilling && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-[6px] border border-gray-200 animate-in fade-in duration-200">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600">Country</label>
                <CountrySearchSelect
                  value={billingCountry}
                  onChange={(val) => setBillingCountry(val)}
                  countries={countries}
                  placeholder="Select billing country..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600">Street Address</label>
                <input
                  type="text"
                  value={billingStreet}
                  onChange={(e) => setBillingStreet(e.target.value)}
                  placeholder="123 Main Street, Apt 4"
                  className="w-full bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-xs focus:outline-none focus:border-primary-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600">City</label>
                  <input
                    type="text"
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    placeholder="City"
                    className="w-full bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-xs focus:outline-none focus:border-primary-300"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-600">State / Province</label>
                  <input
                    type="text"
                    value={billingState}
                    onChange={(e) => setBillingState(e.target.value)}
                    placeholder="State"
                    className="w-full bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-xs focus:outline-none focus:border-primary-300"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600">ZIP / Postal Code</label>
                <input
                  type="text"
                  value={billingZip}
                  onChange={(e) => setBillingZip(e.target.value)}
                  placeholder="ZIP / Postal Code"
                  className="w-full bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-xs focus:outline-none focus:border-primary-300"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="saveToProfile"
                  checked={saveToProfile}
                  onChange={(e) => setSaveToProfile(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary-300 focus:ring-primary-300 cursor-pointer"
                />
                <label htmlFor="saveToProfile" className="text-[11px] text-gray-600 cursor-pointer">
                  Save as default card billing details
                </label>
              </div>
            </div>
          )}
        </div>

        {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
      </div>

      <div className="flex items-center gap-2 mb-8">
        <input
          type="checkbox"
          id="makePrimary"
          checked={makePrimary}
          onChange={(e) => setMakePrimary(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-300 focus:ring-primary-300 cursor-pointer"
        />
        <label htmlFor="makePrimary" className="text-xs font-bold text-gray-600 cursor-pointer">
          Make primary
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-6 py-2 rounded-[4px] border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-6 py-2 rounded-[4px] bg-primary-300 text-white text-xs font-bold hover:bg-primary-350 transition-colors flex items-center justify-center min-w-[100px] disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
          ) : (
            "Save Card"
          )}
        </button>
      </div>
    </form>
  );
}

// Main Billing Details Page
export default function BillingPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [countriesList, setCountriesList] = useState<Country[]>([]);

  // Card deletion & priority state
  const [cardToDelete, setCardToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Billing address state
  const [billingForm, setBillingForm] = useState({
    useSeparateBillingAddress: false,
    billingCompanyName: "",
    billingCountry: "",
    billingState: "",
    billingCity: "",
    billingZipCode: "",
    billingStreetAddress: "",
  });
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [billingSaveSuccess, setBillingSaveSuccess] = useState(false);
  const [billingSaveError, setBillingSaveError] = useState<string | null>(null);

  const fetchData = async () => {
    const userData = authService.getUser();
    setUser(userData);

    // Fetch full profile from API
    try {
      const profileRes = await profileService.getMyProfile(true);
      if (profileRes?.data) {
        const u = profileRes.data;
        setUser(u);
        setBillingForm({
          useSeparateBillingAddress: Boolean(u.useSeparateBillingAddress),
          billingCompanyName: u.billingCompanyName || "",
          billingCountry: u.billingCountry || "",
          billingState: u.billingState || "",
          billingCity: u.billingCity || "",
          billingZipCode: u.billingZipCode || "",
          billingStreetAddress: u.billingStreetAddress || "",
        });
      }
    } catch (e) {
      console.error("Failed to fetch profile in billing page:", e);
    }

    if (!userData?.isEmailVerified) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    try {
      const cardsRes = await paymentService.getSavedPaymentMethods();
      if (cardsRes?.isSuccessful && cardsRes.data) {
        setCards(cardsRes.data);
      }
    } catch (error: any) {
      console.error("Failed to load billing data:", error);
      setFetchError(error.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    countryService.getCountries().then((list) => {
      setCountriesList(list || []);
    });
  }, []);

  const handleAddCardClick = async () => {
    setShowAddModal(true);
    setClientSecret(null);
    try {
      const res = await paymentService.createSetupIntent();
      if (res?.data?.clientSecret) {
        setClientSecret(res.data.clientSecret);
      }
    } catch (error) {
      console.error("Failed to create setup intent", error);
    }
  };

  const handleConfirmDeleteCard = async () => {
    if (!cardToDelete?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await paymentService.removePaymentMethod(cardToDelete.id);
      if (res?.isSuccessful || res?.data?.success) {
        setCardToDelete(null);
        setActionSuccessMessage("Card removed successfully.");
        setTimeout(() => setActionSuccessMessage(null), 4000);
        await fetchData();
      } else {
        setDeleteError(res?.message || "Failed to remove card. Please try again.");
      }
    } catch (err: any) {
      console.error("Failed to remove card:", err);
      setDeleteError(err.message || "Failed to remove card. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    setSettingDefaultId(cardId);
    try {
      const res = await paymentService.setDefaultMethod(cardId);
      if (res?.isSuccessful || res?.data?.success) {
        setActionSuccessMessage("Primary payment method updated.");
        setTimeout(() => setActionSuccessMessage(null), 4000);
        await fetchData();
      }
    } catch (err: any) {
      console.error("Failed to update default card:", err);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleSaveBillingDetails = async () => {
    setIsSavingBilling(true);
    setBillingSaveError(null);
    try {
      const payload = {
        useSeparateBillingAddress: billingForm.useSeparateBillingAddress,
        billingCompanyName: billingForm.billingCompanyName,
        billingCountry: billingForm.billingCountry,
        billingState: billingForm.billingState,
        billingCity: billingForm.billingCity,
        billingZipCode: billingForm.billingZipCode,
        billingStreetAddress: billingForm.billingStreetAddress,
      };

      const res = await profileService.updateProfile(payload);
      if (res?.isSuccessful || res?.success) {
        authService.updateInternalUser(payload);
        setBillingSaveSuccess(true);
        setTimeout(() => setBillingSaveSuccess(false), 3500);
      } else {
        setBillingSaveError(res?.message || "Failed to save billing details.");
      }
    } catch (err: any) {
      console.error("Failed to save billing details:", err);
      setBillingSaveError(err.message || "Failed to save billing details.");
    } finally {
      setIsSavingBilling(false);
    }
  };

  const isVerified = user?.isEmailVerified;

  return (
    <div className="bg-[#f3f4f6] min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Billing Details
        </h1>

        {actionSuccessMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-[6px] flex items-center gap-2 animate-in fade-in duration-300">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {actionSuccessMessage}
          </div>
        )}

        {/* 1. Cards Section */}
        <section className="mb-14">
          <SectionHeader title="Cards" />

          <div className="flex flex-wrap gap-8">
            {!isVerified ? (
              <div className="w-[340px] h-[200px] bg-white border border-gray-200 rounded-[6px] p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-amber-600 mb-1">Locked Feature</h3>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                  VERIFY EMAIL TO UNLOCK
                </p>
              </div>
            ) : isLoading ? (
              <div className="w-[340px] h-[200px] flex items-center justify-center bg-white rounded-[6px] border border-gray-200">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-300"></div>
              </div>
            ) : (
              <>
                {cards.map((card, index) => {
                  const isPrimary = card.isPrimary || index === 0;
                  return (
                    <div
                      key={card.id}
                      className="w-[340px] h-[200px] bg-white border border-gray-300 rounded-[6px] p-6 relative flex flex-col justify-between shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex justify-between items-start">
                        <div className="uppercase font-extrabold text-gray-500 tracking-wider text-xs">
                          {card.brand || "CARD"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setCardToDelete(card);
                            }}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove card"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      <div className="text-2xl tracking-widest text-gray-800 font-medium mt-4">
                        **** **** **** {card.last4}
                      </div>

                      <div className="flex justify-between items-end mt-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                            Priority
                          </span>
                          {isPrimary ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 inline-block w-fit">
                              Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={settingDefaultId === card.id}
                              onClick={() => handleSetDefault(card.id)}
                              className="text-[11px] font-bold text-gray-500 hover:text-primary-300 transition-colors cursor-pointer text-left underline disabled:opacity-50"
                            >
                              {settingDefaultId === card.id ? "Updating..." : "Set as Primary"}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                            Expires
                          </span>
                          <span className="text-sm font-bold text-gray-800">
                            {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleAddCardClick}
                  className="w-[340px] h-[200px] bg-white border border-dashed border-gray-400 rounded-[6px] flex flex-col items-center justify-center gap-4 text-gray-500 hover:bg-gray-50 hover:border-primary-300 transition-colors group shadow-sm cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full border border-gray-400 flex items-center justify-center group-hover:border-primary-300 group-hover:text-primary-300">
                    <PlusIcon />
                  </div>
                  <span className="font-bold text-gray-700 group-hover:text-primary-300">
                    Add new card
                  </span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* 2. Billing Details Section */}
        <section className="mb-8">
          <SectionHeader title="Billing Details" />
          <div className="border border-gray-300 rounded-[4px] p-8 md:p-10 bg-white shadow-sm">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Left Content Area */}
              <div className="flex-1">
                {/* Switch Toggle Container Box */}
                <div className="flex items-center gap-3 mb-8 bg-gray-50 p-4 rounded-[10px] border border-gray-200">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={billingForm.useSeparateBillingAddress}
                      onChange={(e) =>
                        setBillingForm((prev) => ({
                          ...prev,
                          useSeparateBillingAddress: e.target.checked,
                        }))
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-300"></div>
                  </label>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-gray-700">
                      Use separate billing address
                    </h4>
                    <p className="text-[11px] text-gray-400 font-medium">
                      Enable this if your billing information for cards and receipts differs from your business details.
                    </p>
                  </div>
                </div>

                {/* Expanded Billing Form Fields */}
                {billingForm.useSeparateBillingAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-6 animate-in fade-in duration-300">
                    <InputField
                      label="Billing Company Name"
                      value={billingForm.billingCompanyName}
                      onChange={(e: any) =>
                        setBillingForm((prev) => ({ ...prev, billingCompanyName: e.target.value }))
                      }
                      placeholder="e.g. Acme Corp Ltd"
                    />

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold text-gray-700">Billing Country</label>
                      <CountrySearchSelect
                        value={billingForm.billingCountry}
                        onChange={(val) =>
                          setBillingForm((prev) => ({ ...prev, billingCountry: val }))
                        }
                        countries={countriesList}
                        placeholder="Select country..."
                      />
                    </div>

                    <InputField
                      label="Billing State / Province"
                      value={billingForm.billingState}
                      onChange={(e: any) =>
                        setBillingForm((prev) => ({ ...prev, billingState: e.target.value }))
                      }
                      placeholder="e.g. California / Harju"
                    />

                    <InputField
                      label="Billing City"
                      value={billingForm.billingCity}
                      onChange={(e: any) =>
                        setBillingForm((prev) => ({ ...prev, billingCity: e.target.value }))
                      }
                      placeholder="e.g. San Francisco / Tallinn"
                    />

                    <InputField
                      label="Billing ZIP / Postal Code"
                      value={billingForm.billingZipCode}
                      onChange={(e: any) =>
                        setBillingForm((prev) => ({ ...prev, billingZipCode: e.target.value }))
                      }
                      placeholder="e.g. 94103 / 10115"
                    />

                    <InputField
                      label="Billing Street Address"
                      value={billingForm.billingStreetAddress}
                      onChange={(e: any) =>
                        setBillingForm((prev) => ({ ...prev, billingStreetAddress: e.target.value }))
                      }
                      placeholder="e.g. 100 Main St, Suite 200"
                    />
                  </div>
                )}

                {billingSaveError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded">
                    {billingSaveError}
                  </div>
                )}
              </div>

              {/* Info Sidebar (Right) */}
              <div className="w-full lg:w-[320px]">
                <InfoBox
                  title="Card & Receipt Billing"
                  text="This separate billing address is used for card payments and receipts. Your primary business details in Account Details are always used on legal project invoices."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Save Billing Details Button */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSaveBillingDetails}
            disabled={isSavingBilling}
            className={`bg-[#4343f0] hover:bg-[#162a5c] text-white text-xs font-bold px-12 py-3.5 rounded-[4px] transition-all shadow-md cursor-pointer ${
              isSavingBilling ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isSavingBilling ? <LoadingDots text="Saving" /> : "Save Billing Details"}
          </button>
          {billingSaveSuccess && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 animate-in fade-in slide-in-from-left-2 duration-300">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Billing details saved!
            </span>
          )}
        </div>

        <div className="mt-16">
          <SupportNewsletter noPadding />
        </div>
      </main>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] w-full max-w-[540px] p-6 sm:p-8 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Add New Card
            </h3>

            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <AddCardForm
                  clientSecret={clientSecret}
                  countries={countriesList}
                  onSuccess={() => {
                    setShowAddModal(false);
                    fetchData();
                  }}
                  onCancel={() => setShowAddModal(false)}
                />
              </Elements>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-primary-300 rounded-full animate-spin" />
                <span className="text-sm font-bold text-gray-500">
                  Initializing secure session...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remove Card Confirmation Modal */}
      {cardToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] w-full max-w-[440px] p-6 sm:p-8 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Remove Saved Card
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to remove your <span className="font-semibold uppercase text-gray-800">{cardToDelete.brand}</span> card ending in <span className="font-semibold text-gray-800">•••• {cardToDelete.last4}</span>? This card will no longer be available for future payments.
            </p>

            {deleteError && (
              <div className="p-3 mb-4 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setCardToDelete(null);
                  setDeleteError(null);
                }}
                className="px-5 py-2.5 rounded-[4px] border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteCard}
                className="px-6 py-2.5 rounded-[4px] bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors flex items-center justify-center min-w-[110px] disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
                ) : (
                  "Remove Card"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
