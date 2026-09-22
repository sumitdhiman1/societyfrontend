import { authService } from "./authService";
import { countryService } from "./countryService";
import { getVatRateForCountry } from "./vatHelper";

function loadScript(src: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensurePdfLibraries(): Promise<{ html2canvasLib: any; jsPdfLib: any }> {
  let html2canvasLib = (window as any).html2canvas;
  let jsPdfLib = (window as any).jspdf?.jsPDF || (window as any).jsPDF;

  if (!html2canvasLib) {
    try {
      const mod = await import("html2canvas");
      html2canvasLib = mod.default || mod;
    } catch {
      // Fallback to CDN
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      html2canvasLib = (window as any).html2canvas;
    }
  }

  if (!jsPdfLib) {
    try {
      const mod = await import("jspdf");
      jsPdfLib = mod.jsPDF || mod.default;
    } catch {
      // Fallback to CDN
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      jsPdfLib = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
    }
  }

  let tries = 0;
  while ((!html2canvasLib || !jsPdfLib) && tries < 20) {
    await new Promise((r) => setTimeout(r, 100));
    html2canvasLib = html2canvasLib || (window as any).html2canvas;
    jsPdfLib = jsPdfLib || (window as any).jspdf?.jsPDF || (window as any).jsPDF;
    tries++;
  }

  if (!html2canvasLib || !jsPdfLib) {
    throw new Error("PDF generation libraries could not be loaded");
  }

  return { html2canvasLib, jsPdfLib };
}

export interface InvoiceDeliverableItem {
  description: string;
  details?: string;
  duration?: string;
  amount: number;
}

export interface InvoicePDFData {
  invoiceNumber: string;
  rawInvoiceNumber: string;
  projectNumber?: string;
  date: string;
  status: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  clientCountry?: string;
  title: string;
  description?: string;
  duration?: string;
  deliverableItems: InvoiceDeliverableItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid?: number;
  pendingBalance?: number;
  currency: string;
  paymentMethod?: string;
  isMarketing?: boolean;
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function getStatusBadgeStyle(status: string): { bg: string; text: string; border: string } {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "succeeded" || s === "completed") {
    return { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" };
  }
  if (s === "partially_paid" || s === "partial" || s === "part") {
    return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" };
  }
  if (s === "pending" || s === "processing" || s === "issued") {
    return { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" };
  }
  return { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
}

export function extractInvoicePDFData(data: any): InvoicePDFData {
  const project = data.project || data;
  const quote = data.quote || (typeof project.quoteId === "object" ? project.quoteId : null) || project.quote || {};
  const specs = project.calculatorSpecs || quote?.requirements || project.requirements || {};
  const currentUser = authService.getUser() || {};
  const clientObj = project?.client || quote?.client || currentUser;

  // Invoice / Project Number
  const rawNum =
    data.invoiceNumber ||
    data.invoiceId ||
    project.invoiceNumber ||
    project.invoiceId ||
    (Array.isArray(data.invoices) && data.invoices[0]?.invoiceNumber ? data.invoices[0].invoiceNumber : "") ||
    (Array.isArray(project.invoices) && project.invoices[0]?.invoiceNumber ? project.invoices[0].invoiceNumber : "") ||
    (Array.isArray(data.payments) && data.payments[0]?.invoiceNumber ? data.payments[0].invoiceNumber : "") ||
    (Array.isArray(project.payments) && project.payments[0]?.invoiceNumber ? project.payments[0].invoiceNumber : "") ||
    (Array.isArray(data.paymentLedger) && data.paymentLedger[0]?.invoiceNumber ? data.paymentLedger[0].invoiceNumber : "") ||
    (Array.isArray(project.paymentLedger) && project.paymentLedger[0]?.invoiceNumber ? project.paymentLedger[0].invoiceNumber : "") ||
    (project._id ? `INV-2026-${String(project._id).slice(-4).toUpperCase()}` : "INV-2026-001");
  const cleanNum = String(rawNum).replace(/^Project\s*#?/i, "").replace(/^#/, "");
  const invoiceNumber = cleanNum.toUpperCase().startsWith("INV-") ? cleanNum : `INV-${cleanNum}`;
  const projectNumber = `Project #${cleanNum.replace(/^INV-/i, "")}`;

  // Date
  const rawDate = data.date || data.paymentDate || project.createdAt || quote.createdAt || new Date();
  const dateObj = new Date(rawDate);
  const date = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Status
  const status = (data.paymentStatus || project.paymentStatus || project.status || "PAID").toUpperCase();

  // Client Details
  const clientName =
    data.clientName ||
    clientObj.fullName ||
    (clientObj.firstName ? `${clientObj.firstName} ${clientObj.lastName || ""}`.trim() : "") ||
    specs.businessInfo?.name ||
    currentUser.fullName ||
    "Valued Client";

  const clientEmail =
    data.clientEmail ||
    clientObj.email ||
    project.clientEmail ||
    currentUser.email ||
    "contact@societywebsolutions.com";

  const clientAddress =
    data.clientAddress ||
    clientObj.billingStreetAddress ||
    clientObj.streetAddress ||
    clientObj.address ||
    "";

  const clientCity =
    data.clientCity ||
    clientObj.billingCity ||
    clientObj.city ||
    "";

  const clientState =
    data.clientState ||
    clientObj.billingState ||
    clientObj.state ||
    "";

  const clientZip =
    data.clientZip ||
    clientObj.billingZipCode ||
    clientObj.zipCode ||
    "";

  const clientCountry =
    data.clientCountry ||
    clientObj.billingCountry ||
    clientObj.country ||
    "US";

  const categoryKey = (
    data.categoryKey ||
    project.categoryKey ||
    specs.categoryKey ||
    ""
  ).toLowerCase();

  const isMarketing =
    categoryKey === "marketing" ||
    /market|campaign/i.test(data.title || "") ||
    /market|campaign/i.test(project.title || "") ||
    /market|campaign/i.test(data.categoryName || "") ||
    /market|campaign/i.test(project.categoryName || "") ||
    /market|campaign/i.test(specs.categoryName || "");

  // Title
  const title =
    data.title ||
    project.title ||
    specs.categoryName ||
    (isMarketing ? "A Marketing Campaign" : "Website Development Project");

  const description =
    data.description ||
    project.description ||
    "Custom web solutions and development deliverables based on calculator selections.";

  const duration =
    data.duration ||
    data.timeline ||
    specs.estimatedTimeline ||
    (project.timelineInDays ? `${project.timelineInDays} Days` : "") ||
    project.timeline ||
    "30 Days";

  // Currency
  const currency = (data.currency || project.currency || quote.currency || "USD").toUpperCase();

  // Deliverables
  let deliverableItems: InvoiceDeliverableItem[] = [];
  if (Array.isArray(data.deliverableItems) && data.deliverableItems.length > 0) {
    deliverableItems = data.deliverableItems.map((item: any) => ({
      description: item.description || item.title || item.name || "Deliverable",
      details: item.details || "",
      duration: item.duration ? String(item.duration) : undefined,
      amount: Number(item.amount ?? 0),
    }));
  } else if (Array.isArray(project.deliverableItems) && project.deliverableItems.length > 0) {
    deliverableItems = project.deliverableItems.map((item: any) => ({
      description: item.description || item.title || item.name || "Deliverable",
      details: item.details || "",
      duration: item.duration ? String(item.duration) : undefined,
      amount: Number(item.amount ?? 0),
    }));
  } else {
    deliverableItems = [
      {
        description: title,
        details: "Based on calculator specifications",
        duration: duration,
        amount: Number(data.subtotal || project.subtotal || project.price || project.totalCost || 0),
      },
    ];
  }

  // Financial calculations
  const isEstoniaClient = (c?: string) => {
    if (!c) return false;
    const upper = c.trim().toUpperCase();
    return upper === "EE" || upper === "EST" || upper === "ESTONIA";
  };

  const explicitVatRate = Number(
    data.vatRate ??
      project.vatRate ??
      data.vatPercentage ??
      project.vatPercentage ??
      (data.taxPercentage != null ? data.taxPercentage : (project.taxPercentage != null ? project.taxPercentage : 0))
  ) || 0;

  let loggedUserCountry = "";
  try {
    const user = authService.getUser();
    loggedUserCountry = user?.country || user?.clientCountry || user?.billingCountry || "";
  } catch {}

  const countryStr = String(
    data.clientCountry ||
      project.clientCountry ||
      project.country ||
      project.client?.country ||
      project.client?.clientCountry ||
      loggedUserCountry ||
      ""
  );
  // VAT applies for explicit vatRate or Estonian clients (24%)
  const vatRate = explicitVatRate > 0 ? explicitVatRate : getVatRateForCountry(countryStr);

  const subtotal = Number(
    data.subtotal ??
    project.subtotal ??
    deliverableItems.reduce((sum: number, it: any) => sum + (it.amount || 0), 0)
  );

  const vatAmount = Number(
    data.vatAmount ??
    project.vatAmount ??
    (vatRate > 0 ? Math.round(((subtotal * vatRate) / 100) * 100) / 100 : 0)
  );

  const totalAmount = Number(
    data.totalAmount ??
    data.totalPrice ??
    project.totalCost ??
    project.price ??
    (subtotal + vatAmount)
  );

  const amountPaid = Number(
    data.amountPaid ??
    project.amountPaid ??
    (status === "PAID" ? totalAmount : 0)
  );

  const pendingBalance = Math.max(0, totalAmount - amountPaid);

  return {
    invoiceNumber,
    rawInvoiceNumber: cleanNum,
    projectNumber,
    date,
    status,
    clientName,
    clientEmail,
    clientAddress,
    clientCity,
    clientState,
    clientZip,
    clientCountry,
    title,
    description,
    duration,
    deliverableItems,
    subtotal,
    vatRate,
    vatAmount,
    totalAmount,
    amountPaid,
    pendingBalance,
    currency,
    paymentMethod: data.paymentMethod || "Credit / Debit Card",
    isMarketing,
  };
}

export function getInvoiceHTML(d: InvoicePDFData): string {
  const badge = getStatusBadgeStyle(d.status);
  const vatPercentageLabel = d.vatRate > 0 ? `${d.vatRate}%` : "0%";

  return `
    <div class="invoice-container" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 794px; min-height: 1123px; box-sizing: border-box; margin: 0; padding: 48px 56px 40px 56px; background-color: #ffffff; color: #0F172A; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- Top Header Block -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
          <!-- Logo & Brand -->
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="160" height="32" viewBox="0 0 167.558 32.77">
              <g transform="translate(-28.2 -49.985)">
                <path d="M50.859,74.861c-1.856,2.665-5.42,4.357-10.592,4.357C33.762,79.217,28.2,76.171,28.2,69l6.438.524c-.045,3.3,4.394,3.2,5.315,3.219,1.093.015,5.465.082,5.465-2.4,0-6.191-16.506-.629-16.506-11.49,0-5.981,5.622-8.788,10.869-8.788,4.544,0,8.818,1.49,10.675,5.06a.157.157,0,0,1-.03.045,18.482,18.482,0,0,0-1.744,3.855l-3.451-.5c-1.153-1.639-3.511-2.036-5.509-2.036-2.036,0-4.619.427-4.641,2.021-.045,2.695,1.5,2.014,8.833,3.593a12.554,12.554,0,0,1,3.922,1.5c-.022.344-.03.7-.03,1.04a18.387,18.387,0,0,0,2.62,9.484C50.567,74.389,50.709,74.628,50.859,74.861Zm14.3-23.774a5.11,5.11,0,0,0,.771.5,1.151,1.151,0,0,1,.524-.322c.629-.037.629.591.719.928.314.022.4-.1.674-.18.135.135.262.269.4.4a5.559,5.559,0,0,1,.853-.988,1.576,1.576,0,0,1,.187-.015A13.473,13.473,0,0,0,65.157,51.086ZM78.414,70.624a13.97,13.97,0,0,0,.906-2.4,4.077,4.077,0,0,1-.217-2.47c-.045-.389-.09-.771-.127-1.16.1-.741.21-1.475.307-2.216a12.127,12.127,0,0,0-.067-1.617l-.157-.494c-.689-.374-.621-.966-.614-1.5a13.538,13.538,0,0,0-5.465-5.9c-.007-.007-.015-.007-.022-.015a2.567,2.567,0,0,1,.509.636c-.187.561-.329,1.25-.591,1.422-1.1-.584-1.332-1.5-1.984-2.283-.322-.225-.651-.449-.973-.681.03-.082.052-.157.082-.24a1.829,1.829,0,0,0,.18-.075c-.18-.052-.352-.1-.531-.15.03.022.06.052.09.075l-.584.517a.309.309,0,0,1,.082.052c.449.524,1.332.749,1.377,1.362-.045.142-.09.292-.135.434a1.349,1.349,0,0,0-.546.255c.052.1.1.21.157.322.255.067.517-.045.779.225l1.115,1.325c-.007.21-.007.412-.015.621.15.337.442.3.472.666a.381.381,0,0,1-.269.075.532.532,0,0,1-.531-.367c.045-.1.09-.217.127-.322a1.9,1.9,0,0,0-1.168-.045,1.064,1.064,0,0,0,.292.966c-.03.06-.067.112-.1.172-.247.007-.636-.15-.9-.12a11.619,11.619,0,0,0-1.856,1.145c-.12.269-.24.546-.359.816-.352.322-1.041.232-1.37.689-.344.487.217,1.07-.247,1.512-.546.195-.479-.913-.546-1.228-2.059-1.3-4.761-.636-3.833,2.006,1.153.606,1.624-.786,2.253.045-.195.494-.6.831-.629,1.288,2.081,1.093.225.958.838,2.193.157.314.472.307.719.531l-.022.045-.187.232c-.075-.007-.15-.007-.217-.015-.344-.352-.7-.7-1.041-1.055-.12-.344-.045-.591-.322-.928-.359-.262-.719-.531-1.078-.793-.1-.187-.195-.382-.3-.569-.21-.067-.419-.127-.629-.195a3.616,3.616,0,0,1-1.482-1.482c-.382-.711.262-2.029-.382-2.785-.082.18-.172.359-.255.539-.037-.037-.067-.075-.1-.12.142-1.228-.18-2.642.344-3.96.367-.913,3.211-2.747,2.874-3.945A13.618,13.618,0,0,0,59.348,76.44a13.822,13.822,0,0,0,3.81,1.5,5.718,5.718,0,0,1,1.093-1.22,6.958,6.958,0,0,0,1.273-2.4c-.217-.449-.7-.651-1.055-1.123-.314-.966-.636-1.924-.951-2.889a4.93,4.93,0,0,1,.681-1.377c.269-.232.8-.314,1-.734.225-.494.015-.966.015-1.415.187.03.382.067.569.1a1.439,1.439,0,0,0,.524-.262l1.662,10.8c-.614.157-1.25.262-1.819.382a5.7,5.7,0,0,0-1.078.427,13.394,13.394,0,0,0,3-.1c.052.344.1.681.157,1.026a14.661,14.661,0,1,1,10.989-7.89C78.968,71.065,78.691,70.848,78.414,70.624Zm.539,10.136a.988.988,0,0,1-.359,1.347l-.9.517a.988.988,0,0,1-1.347-.359L73.009,76.47l-3.541,5.614L66.414,61.955,82.269,74.7l-6.662.247ZM95.8,72.742a8.069,8.069,0,0,0,7.066-4.162l5.756,3.189a14.6,14.6,0,0,1-25.354.247,19.407,19.407,0,0,0,0-14.732A14.607,14.607,0,0,1,108.6,57.5l-5.741,3.211A8.083,8.083,0,1,0,95.8,72.742ZM111.088,50.1h6.385V79.15h-6.385Zm15.795,11.371,11.73-.022v6.46l-11.73.007v4.858l14.709-.022v6.46H120.423V50.068h21.2l.03,6.438H126.891v4.963Zm33.049-4.948V79.292h-6.453V56.528h-9.207v-6.46h20.294l3.848,6.438Zm25.1,11.393V79.3h-6.46V67.809l-.022-.112L168.032,50.068h7.493l6.363,10.682,6.378-10.645h7.493Z" fill="#202794"/>
              </g>
            </svg>
            <div style="font-size: 10px; font-weight: 700; color: #4343F0; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">
              WEB SOLUTIONS & DIGITAL MARKETING
            </div>
          </div>

          <!-- Document Title & Meta -->
          <div style="text-align: right;">
            <div style="font-size: 26px; font-weight: 900; color: #202794; text-transform: uppercase; letter-spacing: 0.5px;">
              INVOICE
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #334155; margin-top: 2px;">
              ${d.invoiceNumber}
            </div>
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 6px;">
              <span style="font-size: 11px; color: #64748B; font-weight: 500;">Date: ${d.date}</span>
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 9999px; background-color: ${badge.bg}; color: ${badge.text}; border: 1px solid ${badge.border};">
                ${d.status}
              </span>
            </div>
          </div>
        </div>

        <div style="height: 1px; background-color: #E2E8F0; width: 100%; margin-bottom: 24px;"></div>

        <!-- Info Grid: Bill To & Project Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px;">
          <!-- Bill To -->
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 22px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #4343F0; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
              BILLED TO
            </div>
            <div style="font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.35; margin-bottom: 4px;">
              ${d.clientName}
            </div>
            <div style="font-size: 12px; color: #475569; line-height: 1.4; margin-bottom: 3px;">
              ${d.clientEmail}
            </div>
            ${d.clientAddress ? `<div style="font-size: 12px; color: #64748B; line-height: 1.4; margin-bottom: 3px;">${d.clientAddress}${d.clientCity ? `, ${d.clientCity}` : ""}${d.clientState ? ` ${d.clientState}` : ""}${d.clientZip ? ` ${d.clientZip}` : ""}</div>` : ""}
            ${d.clientCountry ? `<div style="font-size: 12px; color: #64748B; line-height: 1.4;">${d.clientCountry}</div>` : ""}
          </div>

          <!-- Project & Payment Info -->
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 22px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #4343F0; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
              PROJECT DETAILS
            </div>
            <div style="font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1.35; margin-bottom: 4px;">
              ${d.title}
            </div>
            <div style="font-size: 12px; color: #475569; line-height: 1.4; margin-bottom: 3px;">
              ${d.projectNumber}
            </div>
            <div style="font-size: 12px; color: #64748B; line-height: 1.4; margin-bottom: 3px;">
              Timeline: <span style="font-weight: 600; color: #334155;">${d.duration || "As specified"}</span>
            </div>
            ${d.paymentMethod ? `<div style="font-size: 12px; color: #64748B; line-height: 1.4;">Method: <span style="font-weight: 600; color: #334155;">${d.paymentMethod}</span></div>` : ""}
          </div>
        </div>

        <!-- Deliverables Table -->
        <div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
            <thead>
              <tr style="background-color: #F1F5F9; border-bottom: 1px solid #CBD5E1;">
                <th style="padding: 10px 16px; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px;">Item / Service Deliverable</th>
                <th style="padding: 10px 16px; font-weight: 700; color: #334155; text-align: center; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px; width: 110px;">Duration</th>
                <th style="padding: 10px 16px; font-weight: 700; color: #334155; text-align: right; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px; width: 130px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${d.deliverableItems
                .map(
                  (item, idx) => `
                <tr style="border-bottom: 1px solid #F1F5F9; background-color: ${idx % 2 === 1 ? "#FAFAFA" : "#FFFFFF"};">
                  <td style="padding: 12px 16px; vertical-align: top;">
                    <div style="font-weight: 700; color: #0F172A; font-size: 12.5px;">${item.description}</div>
                    ${item.details ? `<div style="color: #64748B; font-size: 10.5px; margin-top: 2px;">${item.details}</div>` : ""}
                  </td>
                  <td style="padding: 12px 16px; text-align: center; color: #475569; font-weight: 500; font-size: 11.5px; vertical-align: top;">
                    ${item.duration || d.duration || "—"}
                  </td>
                  <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #0F172A; font-size: 12.5px; vertical-align: top;">
                    ${formatCurrency(item.amount, d.currency)}
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <!-- Totals Breakdown (Right-Aligned) -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
          <div style="width: 320px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 8px;">
              <span style="color: #64748B; font-weight: 600;">Subtotal:</span>
              <span style="color: #0F172A; font-weight: 700;">${formatCurrency(d.subtotal, d.currency)}</span>
            </div>
            ${
              d.vatRate > 0 && d.vatAmount > 0
                ? `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 10px;">
              <span style="color: #64748B; font-weight: 600;">VAT / Tax (${vatPercentageLabel}):</span>
              <span style="color: #0F172A; font-weight: 700;">${formatCurrency(d.vatAmount, d.currency)}</span>
            </div>
            `
                : ""
            }
            <div style="height: 1px; background-color: #CBD5E1; margin: 8px 0 10px 0;"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 800; color: #0F172A;">
              <span>Total Cost:</span>
              <span style="font-size: 16px; color: #202794;">${formatCurrency(d.totalAmount, d.currency)}${d.isMarketing ? " /month" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Footer Block -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748B;">
        <div>
          <span style="font-weight: 700; color: #202794;">Society Web Solutions</span> — Official Invoice
        </div>
        <div>
          Questions? Contact <span style="color: #4343F0; font-weight: 600;">contact@societywebsolutions.com</span>
        </div>
      </div>

    </div>
  `;
}

/**
 * Directly downloads the invoice as a PDF file with NO previews or print windows.
 */
export async function downloadInvoicePDF(data: any): Promise<void> {
  if (typeof window === "undefined") return;

  const d = extractInvoicePDFData(data);
  const { html2canvasLib, jsPdfLib } = await ensurePdfLibraries();

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-99999";
  container.innerHTML = getInvoiceHTML(d);

  document.body.appendChild(container);

  try {
    // Brief layout settle
    await new Promise((r) => setTimeout(r, 120));

    const canvas = await html2canvasLib(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      windowWidth: 794,
      scrollY: 0,
      scrollX: 0,
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("Failed to render canvas for invoice PDF");
    }

    const pdf = new jsPdfLib("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageImgData = canvas.toDataURL("image/png");

    if (imgHeight <= pageHeight + 40 || imgHeight <= pageHeight * 1.12) {
      const fitH = Math.min(imgHeight, pageHeight);
      pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, fitH, undefined, "FAST");
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(pageImgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 50) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(pageImgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
    }

    const cleanRef = d.rawInvoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "invoice";
    const filename = `Invoice_${cleanRef}.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Dedicated helper to download invoice for calculator project with full deliverable specs
 */
export async function downloadCalculatorInvoicePDF(data: any): Promise<void> {
  return downloadInvoicePDF(data);
}

/**
 * Backward-compatible helper for any legacy callers
 */
export async function generateInvoicePDF(invoiceData: any): Promise<void> {
  return downloadInvoicePDF(invoiceData);
}
