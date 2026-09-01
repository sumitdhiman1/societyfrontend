"use client";

import React, { useState, useEffect } from "react";
import { paymentService } from "@/lib/paymentService";
import { invoiceService } from "@/lib/invoiceService";
import { authService } from "@/lib/authService";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardElement,
} from "@stripe/react-stripe-js";
import DashboardSubNav from "@/components/dashboard/DashboardSubNav";

// Stripe initialization
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// SVGs extracted from production dist
const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" stroke="#999" strokeWidth="2" />
    <path d="M12 7V13" stroke="#999" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 17V17.01" stroke="#999" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// Sub-component for Adding a New Card
function AddCardForm({ clientSecret, onSuccess, onCancel }: { 
  clientSecret: string; 
  onSuccess: () => void; 
  onCancel: () => void; 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState("");
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
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName || undefined,
            },
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
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
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
        <div className="w-full bg-[#EEEEEE] border-none rounded-[4px] px-3 py-3.5">
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
        {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
      </div>

      <div className="flex items-center gap-2 mb-8">
        <input
          type="checkbox"
          id="makePrimary"
          checked={makePrimary}
          onChange={(e) => setMakePrimary(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-300 focus:ring-primary-300"
        />
        <label htmlFor="makePrimary" className="text-xs font-bold text-gray-600">
          Make primary
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-6 py-2 rounded-[4px] border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="px-6 py-2 rounded-[4px] bg-primary-300 text-white text-xs font-bold hover:bg-primary-350 transition-colors flex items-center justify-center min-w-[100px] disabled:opacity-50"
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const fetchData = async () => {
    const userData = authService.getUser();
    setUser(userData);
    
    if (!userData?.isEmailVerified) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    try {
      const [cardsRes, invoicesRes] = await Promise.all([
        paymentService.getSavedPaymentMethods(),
        invoiceService.getInvoices({ limit: 5 })
      ]);

      if (cardsRes?.isSuccessful && cardsRes.data) {
        setCards(cardsRes.data);
      }
      if (invoicesRes?.isSuccessful && invoicesRes.data) {
        setInvoices(invoicesRes.data);
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

  const isVerified = user?.isEmailVerified;

  return (
    <div className="bg-[#F4F5FA] min-h-screen flex flex-col font-sans">
      <DashboardSubNav />
      <main className="flex-grow w-full max-w-[1536px] mx-auto px-4 md:px-8 lg:pl-[54px] lg:pr-[62px] pt-8 md:pt-12 pb-12">
        <h1 className="text-[28px] md:text-[32px] font-medium text-primary-100 mb-8 md:mb-12">
          Billing Details
        </h1>

        {/* Cards Section */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-primary-200 mb-8 pb-2 border-b border-gray-200 w-[80px]">
            Cards
          </h2>

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
                {cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="w-[340px] h-[200px] bg-white border border-gray-300 rounded-[6px] p-6 relative flex flex-col justify-between shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="uppercase font-extrabold text-gray-400 tracking-wider">
                        {card.brand}
                      </div>
                      <div className="text-gray-400 cursor-pointer hover:text-gray-600">
                        <InfoIcon />
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
                        <span className="text-sm font-bold text-gray-800">
                          {index === 0 ? "Primary" : "Standard"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                          Expires
                        </span>
                        <span className="text-sm font-bold text-gray-800">
                          {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddCardClick}
                  className="w-[340px] h-[200px] bg-white border border-dashed border-gray-400 rounded-[6px] flex flex-col items-center justify-center gap-4 text-gray-500 hover:bg-gray-50 hover:border-primary-300 transition-colors group shadow-sm"
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

        {/* Invoices Section */}
        <section>
          <h2 className="text-xl font-bold text-primary-200 mb-8 pb-2 border-b border-gray-200 w-[100px]">
            Invoices
          </h2>

          <div className="bg-white border border-gray-300 rounded-[4px] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-gray-200">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!isVerified || invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm italic font-medium">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">
                        #{inv.invoiceNumber || inv._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-gray-800">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: inv.currency || "USD" }).format(inv.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          inv.status === "PAID" 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => invoiceService.downloadInvoicePDF(inv._id)}
                          className="text-primary-300 hover:text-primary-400 text-xs font-bold underline underline-offset-2"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Add Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] w-full max-w-[500px] p-8 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-800 mb-8">
              Adding new card
            </h3>
            
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <AddCardForm
                  clientSecret={clientSecret}
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
    </div>
  );
}
