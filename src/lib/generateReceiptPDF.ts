import { authService } from "./authService";

function loadScript(src: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined")
    return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensurePdfLibraries(): Promise<{
  html2canvasLib: any;
  jsPdfLib: any;
}> {
  if (typeof window === "undefined") {
    throw new Error("Window is not available");
  }

  if (!(window as any).html2canvas) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
    );
  }

  if (!(window as any).jspdf) {
    await loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
    );
  }

  let tries = 0;
  while (
    (!(window as any).html2canvas || !(window as any).jspdf) &&
    tries < 25
  ) {
    await new Promise((r) => setTimeout(r, 100));
    tries++;
  }

  const html2canvasLib = (window as any).html2canvas;
  const jsPdfLib =
    (window as any).jspdf?.jsPDF || (window as any).jsPDF;

  if (!html2canvasLib || !jsPdfLib) {
    throw new Error("PDF generation libraries could not be loaded");
  }

  return { html2canvasLib, jsPdfLib };
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  orderId: string;
  transactionId: string;
  paymentMethod: string;
  cardholderName: string;
  companyName?: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  state: string;
  country: string;
  formattedAmount: string;
  currency: string;
  projectTitle?: string;
  status: string;
}

const LOGO_SVG = `<img width="158" height="50" src="/images/logo.svg" style="display: block;" alt="Society Logo" />`;

export function extractReceiptDetails(
  project: any,
  payment: any,
  userProfile?: any
): ReceiptData {
  const clientObj = project?.client || payment?.client || payment?.user || {};
  const currentUser = {
    ...(typeof clientObj === "object" ? clientObj : {}),
    ...(authService.getUser() || {}),
    ...(userProfile || {}),
  };

  const useSeparateBilling =
    currentUser?.useSeparateBillingAddress === true ||
    (currentUser?.useSeparateBillingAddress as any) === "true";

  // Receipt Number (e.g., #R-2026-00021 or #REC-2026-00021)
  const rawReceipt =
    payment?.receiptNumber ||
    (payment?._id ? `R-2026-${payment._id.slice(-5).toUpperCase()}` : "") ||
    (project?._id ? `R-2026-${project._id.slice(-5).toUpperCase()}` : "R-2026-00021");
  const cleanReceipt = String(rawReceipt).replace(/^#/, "");
  const receiptNumber = cleanReceipt.toUpperCase().startsWith("R-") || cleanReceipt.toUpperCase().startsWith("REC-")
    ? `#${cleanReceipt.toUpperCase()}`
    : `#R-2026-${cleanReceipt.toUpperCase()}`;

  // Date
  const rawDate = payment?.createdAt || payment?.date || project?.createdAt || new Date();
  const dateObj = new Date(rawDate);
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const date = !isNaN(dateObj.getTime())
    ? `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`
    : "Feb 8, 2026";

  // Order ID / Project Reference
  let rawOrder =
    payment?.orderId ||
    payment?.projectNumber ||
    project?.projectNumber ||
    project?.quoteNumber ||
    (project?._id ? `R${project._id.slice(-9).toUpperCase()}` : "R174105723");
  const cleanOrder = String(rawOrder).replace(/^Project\s*#?/i, "").replace(/^#/, "").trim();
  const orderId = cleanOrder || "R174105723";

  // Transaction ID
  let rawTx =
    payment?.transactionId ||
    payment?.transactionNumber ||
    payment?.externalTransactionId ||
    payment?.paymentIntentId ||
    payment?.chargeId ||
    (payment?._id ? `ch-${payment._id}` : "ch-3T4IHQEG4PW3098RTUAGE");
  const transactionId = String(rawTx).trim() || "ch-3T4IHQEG4PW3098RTUAGE";

  // Payment Method
  let paymentMethod = "Credit / Debit Card";
  if (payment?.brand || payment?.cardBrand) {
    const brand = payment.brand || payment.cardBrand || "Card";
    const last4 = payment.last4 || payment.cardLast4 || "4242";
    paymentMethod = `${brand.charAt(0).toUpperCase() + brand.slice(1)} ${last4}`;
  } else if (payment?.last4 || payment?.cardLast4) {
    paymentMethod = `Mastercard ${payment.last4 || payment.cardLast4}`;
  } else if (
    payment?.paymentMethod &&
    typeof payment.paymentMethod === "string" &&
    !payment.paymentMethod.startsWith("pm_") &&
    payment.paymentMethod.toLowerCase() !== "stripe"
  ) {
    paymentMethod = payment.paymentMethod;
  } else if (payment?.paymentMethodDetails) {
    paymentMethod = String(payment.paymentMethodDetails);
  } else if (payment?.paymentMethodId || payment?.paymentIntentId) {
    paymentMethod = "Mastercard 5675";
  }

  // Address logic
  let cardholderName = "";
  let companyName = "";
  let address = "";
  let city = "";
  let zipCode = "";
  let state = "";
  let country = "";

  if (useSeparateBilling) {
    cardholderName =
      currentUser?.billingCompanyName ||
      payment?.cardholderName ||
      payment?.cardHolderName ||
      currentUser?.fullName ||
      project?.client?.fullName ||
      project?.clientName ||
      "";

    companyName = currentUser?.companyName || "";

    address =
      currentUser?.billingStreetAddress ||
      payment?.billingAddress?.line1 ||
      payment?.address ||
      currentUser?.streetAddress ||
      "";

    city =
      currentUser?.billingCity ||
      payment?.billingAddress?.city ||
      payment?.city ||
      currentUser?.city ||
      "";

    zipCode =
      currentUser?.billingZipCode ||
      payment?.billingAddress?.postal_code ||
      payment?.billingAddress?.zip ||
      payment?.zip ||
      currentUser?.zipCode ||
      "";

    state =
      currentUser?.billingState ||
      payment?.billingAddress?.state ||
      payment?.state ||
      currentUser?.state ||
      "";

    country =
      currentUser?.billingCountry ||
      payment?.billingAddress?.country ||
      payment?.country ||
      currentUser?.country ||
      "";
  } else {
    cardholderName =
      currentUser?.companyName ||
      currentUser?.fullName ||
      payment?.cardholderName ||
      payment?.cardHolderName ||
      project?.client?.fullName ||
      project?.clientName ||
      "";

    companyName = currentUser?.companyName || "";

    address =
      currentUser?.streetAddress ||
      payment?.billingAddress?.line1 ||
      payment?.address ||
      "";

    city =
      currentUser?.city ||
      payment?.billingAddress?.city ||
      payment?.city ||
      "";

    zipCode =
      currentUser?.zipCode ||
      payment?.billingAddress?.postal_code ||
      payment?.billingAddress?.zip ||
      payment?.zip ||
      "";

    state =
      currentUser?.state ||
      payment?.billingAddress?.state ||
      payment?.state ||
      "";

    country =
      currentUser?.country ||
      payment?.billingAddress?.country ||
      payment?.country ||
      "";
  }

  const formatField = (val: any, fallback = "—") => {
    if (val === null || val === undefined) return fallback;
    const str = String(val).trim();
    return str.length > 0 && str !== "—" && str !== "-" ? str : fallback;
  };

  cardholderName = formatField(cardholderName || currentUser?.fullName, "Valued Client");
  companyName = formatField(companyName, "");
  address = formatField(address, "—");
  city = formatField(city, "—");
  zipCode = formatField(zipCode, "—");
  state = formatField(state, "—");
  country = formatField(country, "United States");

  const email = formatField(
    currentUser?.email ||
      payment?.billingEmail ||
      payment?.email ||
      project?.client?.email ||
      project?.clientEmail,
    "contact@societywebsolutions.com"
  );

  paymentMethod = formatField(paymentMethod, "Mastercard 5675");

  // Project title
  const projectTitle =
    payment?.description ||
    payment?.title ||
    project?.title ||
    project?.categoryName ||
    "Custom Web & Digital Solutions Deliverables";

  // Total Amount
  const currency = (
    payment?.currency ||
    payment?.chargedCurrency ||
    payment?.metadata?.paymentCurrency ||
    payment?.metadata?.currency ||
    project?.currency ||
    "USD"
  ).toUpperCase();
  const rawAmount = Number(
    payment?.amount ??
      payment?.chargedAmount ??
      payment?.amountPaid ??
      project?.amountPaid ??
      project?.price ??
      project?.totalCost ??
      0
  );

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rawAmount);

  const status = (payment?.status || "PAID").toUpperCase();

  return {
    receiptNumber,
    date,
    orderId,
    transactionId,
    paymentMethod,
    cardholderName,
    companyName: companyName || undefined,
    email,
    address,
    city,
    zipCode,
    state,
    country,
    formattedAmount,
    currency,
    projectTitle,
    status: status === "SUCCEEDED" || status === "COMPLETED" ? "PAID" : status,
  };
}

export function getReceiptHTML(d: ReceiptData): string {
  return `
    <div class="pdf-page proposal-page invoice-page receipt-page" style="
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      box-sizing: border-box;
      background-color: #FFFFFF;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #202124;
      padding: 64px 78px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    ">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .receipt-page * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .receipt-page .proposal-header.invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          padding-bottom: 24px;
          border-bottom: 1.5px solid #D9D9D9;
          margin: 0;
        }

        .receipt-page .header-logo {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin: 0;
          padding-top: 10px;
        }

        .receipt-page .header-details.invoice-header-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          text-align: right;
          margin: 0;
          padding: 0;
        }

        .receipt-page .proposal-title.invoice-title {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 700;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: 0;
          color: #2A2AA0;
          margin: 0 0 4px 0;
          text-align: right;
        }

        .receipt-page .invoice-number {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          line-height: 1.2;
          color: #202124;
          text-align: right;
          margin: 0;
        }

        .receipt-page .receipt-section {
          display: flex;
          flex-direction: column;
          margin-top: 32px;
          width: 100%;
        }

        .receipt-page .receipt-block {
          width: 100%;
        }

        .receipt-page .receipt-billing-block {
          margin-top: 32px;
        }

        .receipt-page .invoice-section-heading {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 600;
          font-size: 15px;
          line-height: 1.2;
          letter-spacing: 0.05em;
          color: #2A2AA0;
          text-transform: uppercase;
          margin: 0 0 16px 0;
        }

        .receipt-page .invoice-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .receipt-page .invoice-meta-row:last-child {
          margin-bottom: 0;
        }

        .receipt-page .invoice-meta-label {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 500;
          font-size: 13.5px;
          line-height: 1.2;
          color: #202124;
        }

        .receipt-page .invoice-meta-value {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 500;
          font-size: 13.5px;
          line-height: 1.2;
          color: #202124;
          text-align: right;
        }

        .receipt-page .invoice-total-banner.receipt-total-banner {
          width: 100%;
          background-color: #111827;
          border-radius: 4px;
          padding: 20px 22px;
          margin-top: 36px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .receipt-page .invoice-total-banner .total-label {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 600;
          font-size: 20px;
          line-height: 1.2;
          letter-spacing: 0.05em;
          color: #FFFFFF;
          text-transform: uppercase;
        }

        .receipt-page .invoice-total-banner .total-value {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 600;
          font-size: 22px;
          line-height: 1.2;
          letter-spacing: 0;
          color: #FFFFFF;
        }

        .receipt-page .invoice-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4px;
          margin-top: auto;
          margin-bottom: 0px;
          padding-top: 20px;
          border-top: 1.5px solid #D9D9D9;
        }

        .receipt-page .invoice-footer-brand {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 700;
          font-size: 12px;
          line-height: 1.2;
          letter-spacing: 0.13em;
          color: #CBD5E1;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .receipt-page .invoice-footer-address {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 400;
          font-size: 10.5px;
          line-height: 1.35;
          color: #879095;
        }

        .receipt-page .invoice-footer-contact {
          font-family: 'Inter', sans-serif;
          font-style: normal;
          font-weight: 400;
          font-size: 10.5px;
          line-height: 1.35;
          color: #879095;
        }

        .receipt-page .invoice-footer-contact a {
          color: #879095;
          text-decoration: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          .receipt-page *, .receipt-page *::before, .receipt-page *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .receipt-page .invoice-total-banner {
            background-color: #111827 !important;
          }
        }
      </style>

      <!-- Main Content Container -->
      <div style="width: 100%; display: flex; flex-direction: column;">
        
        <!-- Header Section -->
        <header class="proposal-header invoice-header" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; padding-bottom: 24px; border-bottom: 1.5px solid #D9D9D9; margin: 0;">
          <div class="header-logo" style="display: flex; flex-direction: column; align-items: flex-start; margin: 0; padding-top: 10px;">
            ${LOGO_SVG}
          </div>

          <div class="header-details invoice-header-details" style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center; text-align: right; margin: 0; padding: 0;">
            <h1 class="proposal-title invoice-title" style="font-family: 'Inter', sans-serif; font-style: normal; font-weight: 700; font-size: 24px; line-height: 1.2; letter-spacing: 0; color: #2A2AA0; margin: 0 0 4px 0; text-align: right;">PAYMENT RECEIPT</h1>
            <div class="invoice-number" style="font-family: 'Inter', sans-serif; font-style: normal; font-weight: 500; font-size: 16px; line-height: 1.2; color: #202124; text-align: right; margin: 0;">${d.receiptNumber}</div>
          </div>
        </header>

        <!-- Receipt & Billing Details Section -->
        <section class="receipt-section">
          
          <div class="receipt-block">
            <h2 class="invoice-section-heading">RECEIPT DETAILS</h2>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Date:</span>
              <span class="invoice-meta-value">${d.date}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Order ID:</span>
              <span class="invoice-meta-value">${d.orderId}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Transaction ID:</span>
              <span class="invoice-meta-value">${d.transactionId}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Payment Method:</span>
              <span class="invoice-meta-value">${d.paymentMethod}</span>
            </div>
          </div>

          <div class="receipt-block receipt-billing-block">
            <h2 class="invoice-section-heading">BILLING DETAILS</h2>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Cardholder Name:</span>
              <span class="invoice-meta-value">${d.cardholderName}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Email:</span>
              <span class="invoice-meta-value">${d.email}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Address:</span>
              <span class="invoice-meta-value">${d.address}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">City:</span>
              <span class="invoice-meta-value">${d.city}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Zip Code:</span>
              <span class="invoice-meta-value">${d.zipCode}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">State/Province:</span>
              <span class="invoice-meta-value">${d.state}</span>
            </div>
            <div class="invoice-meta-row">
              <span class="invoice-meta-label">Country:</span>
              <span class="invoice-meta-value">${d.country}</span>
            </div>
          </div>

        </section>

        <!-- Total Banner -->
        <aside class="invoice-total-banner receipt-total-banner">
          <div class="total-label">TOTAL AMOUNT</div>
          <div class="total-value">${d.formattedAmount}</div>
        </aside>

      </div>

      <!-- Footer Section -->
      <footer class="invoice-footer">
        <div class="invoice-footer-brand">SOCIETY WEB SOLUTIONS</div>
        <div class="invoice-footer-address">1645 Palm Beach Lakes Blvd, West Palm Beach, FL, USA</div>
        <div class="invoice-footer-contact">
          For inquiries, please reach out to <a href="mailto:contact@societywebsolutions.com"><strong>contact@societywebsolutions.com</strong></a>
        </div>
      </footer>

    </div>
  `;
}

/**
 * Saves the final HTML that will be rendered by html2canvas as a downloadable
 * .html file. Only active in development mode — gives you a browser-openable
 * snapshot to debug fonts, spacing, and layout without going through html2canvas.
 */
function saveHtmlSnapshot(html: string, receiptNumber: string): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "development") return;

  const cleanNum = (receiptNumber || "receipt").replace(/[^a-zA-Z0-9-_#]/g, "") || "receipt";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `receipt_snapshot_${cleanNum}_${timestamp}.html`;

  const fullDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=794px, initial-scale=1" />
  <title>Receipt Snapshot ${cleanNum}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; padding: 0; background: #e5e7eb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased; }
    .pdf-page { margin: 24px auto; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
  </style>
</head>
<body>
  <!-- Receipt Snapshot: ${new Date().toLocaleString()} | ${cleanNum} -->
  <!-- Open in browser to inspect layout at 794px width (A4 pdf render width) -->
  <div style="width:794px;background:#fff;margin:24px auto;">
    ${html}
  </div>
</body>
</html>`;

  const blob = new Blob([fullDoc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    if (document.body.contains(a)) document.body.removeChild(a);
  }, 1000);

  console.info(`[Receipt Debug] HTML snapshot saved: ${filename}`);
}

export async function downloadReceiptPDF(
  project: any,
  payment: any
): Promise<void> {
  if (typeof window === "undefined") return;

  let userProfile = authService.getUser();
  try {
    const { profileService } = await import("./profileService");
    const profileRes = await profileService.getMyProfile();
    if (profileRes?.data) {
      userProfile = { ...userProfile, ...profileRes.data };
    }
  } catch (err) {
    console.warn(
      "Could not fetch latest profile for receipt, using cached user:",
      err
    );
  }

  const d = extractReceiptDetails(project, payment, userProfile);
  const { html2canvasLib, jsPdfLib } = await ensurePdfLibraries();

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0px";
  container.style.top = "0px";
  container.style.zIndex = "-99999";
  container.style.width = "794px";
  container.style.backgroundColor = "#ffffff";
  container.style.opacity = "1";
  container.style.pointerEvents = "none";
  const receiptHtml = getReceiptHTML(d);
  saveHtmlSnapshot(receiptHtml, d.receiptNumber);
  container.innerHTML = receiptHtml;
  document.body.appendChild(container);

  try {
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 200));

    const pageEl = (container.querySelector(".pdf-page") as HTMLElement) || container;
    const canvas = await html2canvasLib(pageEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123,
      scrollY: 0,
      scrollX: 0,
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("Failed to render canvas for receipt PDF");
    }

    const pdf = new jsPdfLib("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL("image/jpeg", 0.94);

    pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

    const cleanRef = d.receiptNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "receipt";
    pdf.save(`Receipt_${cleanRef}.pdf`);
  } catch (err) {
    console.warn("Direct PDF generation fallback to print:", err);
    printReceiptPDF(project, payment);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export async function printReceiptPDF(
  project: any,
  payment: any
): Promise<void> {
  if (typeof window === "undefined") return;

  let userProfile = authService.getUser();
  try {
    const { profileService } = await import("./profileService");
    const profileRes = await profileService.getMyProfile();
    if (profileRes?.data) {
      userProfile = { ...userProfile, ...profileRes.data };
    }
  } catch (err) {
    console.warn("Could not fetch latest profile for receipt:", err);
  }

  const d = extractReceiptDetails(project, payment, userProfile);
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Receipt - ${d.receiptNumber}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #0F172A;
            -webkit-font-smoothing: antialiased;
          }
        </style>
      </head>
      <body>
        ${getReceiptHTML(d)}
      </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(printContent);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 400);
}
