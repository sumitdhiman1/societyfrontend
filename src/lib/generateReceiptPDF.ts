import { authService } from "./authService";

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

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  orderId: string;
  transactionId: string;
  paymentMethod: string;
  cardholderName: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  state: string;
  country: string;
  formattedAmount: string;
  currency: string;
}

function extractReceiptDetails(project: any, payment: any, userProfile?: any): ReceiptData {
  const clientObj = project?.client || payment?.client || payment?.user || {};
  const currentUser = {
    ...(typeof clientObj === "object" ? clientObj : {}),
    ...(authService.getUser() || {}),
    ...(userProfile || {}),
  };

  const useSeparateBilling =
    currentUser?.useSeparateBillingAddress === true ||
    (currentUser?.useSeparateBillingAddress as any) === "true";

  // Receipt Number
  const rawReceipt =
    payment?.receiptNumber ||
    (payment?._id ? `R-2026-${payment._id.slice(-5).toUpperCase()}` : "") ||
    (project?._id ? `R-2026-${project._id.slice(-5).toUpperCase()}` : "R-2026-00021");
  const receiptNumber = rawReceipt.startsWith("#") ? rawReceipt : `#${rawReceipt}`;

  // Date
  const rawDate = payment?.createdAt || project?.createdAt || new Date();
  const dateObj = new Date(rawDate);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const date = !isNaN(dateObj.getTime())
    ? `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`
    : "Feb 8, 2026";

  // Order ID
  let orderId =
    project?.projectNumber ||
    payment?.orderId ||
    project?.quoteNumber ||
    (project?._id ? `R${project._id.slice(-9).toUpperCase()}` : "R174105723");
  orderId = String(orderId).replace(/^#/, "");

  // Transaction ID
  let transactionId =
    payment?.transactionId ||
    payment?.externalTransactionId ||
    payment?.paymentIntentId ||
    payment?.chargeId ||
    (payment?._id ? `ch-${payment._id}` : "ch-3T4IHQEG4PW3098RTUAGE");

  // Payment Method
  let paymentMethod = "Credit / Debit Card";
  if (payment?.brand || payment?.cardBrand) {
    const brand = (payment.brand || payment.cardBrand || "Card");
    const last4 = payment.last4 || payment.cardLast4 || "4242";
    paymentMethod = `${brand.charAt(0).toUpperCase() + brand.slice(1)} ${last4}`;
  } else if (payment?.last4 || payment?.cardLast4) {
    paymentMethod = `Card ending in ${payment.last4 || payment.cardLast4}`;
  } else if (payment?.paymentMethod && typeof payment.paymentMethod === "string" && !payment.paymentMethod.startsWith("pm_") && payment.paymentMethod.toLowerCase() !== "stripe") {
    paymentMethod = payment.paymentMethod;
  } else if (payment?.paymentMethodDetails) {
    paymentMethod = String(payment.paymentMethodDetails);
  } else if (payment?.paymentMethodId || payment?.paymentIntentId) {
    paymentMethod = "Visa 4242";
  }

  // Address logic:
  // If useSeparateBilling is true -> use Billing Details
  // If useSeparateBilling is false -> use Business Details
  let cardholderName = "";
  let address = "";
  let city = "";
  let zipCode = "";
  let state = "";
  let country = "";

  if (useSeparateBilling) {
    // Separate billing address enabled: use Billing Details
    cardholderName =
      currentUser?.billingCompanyName ||
      payment?.cardholderName ||
      payment?.cardHolderName ||
      currentUser?.companyName ||
      currentUser?.fullName ||
      project?.client?.fullName ||
      project?.clientName ||
      "";

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
    // Use Business Details when separate billing is off
    cardholderName =
      currentUser?.companyName ||
      currentUser?.fullName ||
      payment?.cardholderName ||
      payment?.cardHolderName ||
      project?.client?.fullName ||
      project?.clientName ||
      "";

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

  const formatField = (val: any, fallback = "N/A") => {
    if (val === null || val === undefined) return fallback;
    const str = String(val).trim();
    return str.length > 0 && str !== "—" && str !== "-" ? str : fallback;
  };

  // Fallbacks if any individual field is empty or missing
  cardholderName = formatField(cardholderName || currentUser?.fullName, "N/A");
  address = formatField(address, "N/A");
  city = formatField(city, "N/A");
  zipCode = formatField(zipCode, "N/A");
  state = formatField(state, "N/A");
  country = formatField(country, "N/A");

  const email = formatField(
    currentUser?.email ||
    payment?.billingEmail ||
    payment?.email ||
    project?.client?.email ||
    project?.clientEmail,
    "N/A"
  );

  orderId = formatField(orderId, "N/A");
  transactionId = formatField(transactionId, "N/A");
  paymentMethod = formatField(paymentMethod, "N/A");

  // Total Amount
  const currency = (payment?.currency || project?.currency || "USD").toUpperCase();
  const rawAmount = Number(payment?.amount ?? project?.amountPaid ?? project?.price ?? project?.totalCost ?? 1000);
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rawAmount);

  return {
    receiptNumber,
    date,
    orderId,
    transactionId,
    paymentMethod,
    cardholderName,
    email,
    address,
    city,
    zipCode,
    state,
    country,
    formattedAmount,
    currency,
  };
}

function getReceiptHTML(d: ReceiptData): string {
  return `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 794px; height: 1123px; box-sizing: border-box; margin: 0; padding: 44px 64px 36px 64px; background-color: #ffffff; color: #0F172A; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- Top Header Block -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <!-- Logo -->
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="180" height="35" viewBox="0 0 167.558 32.77">
              <g transform="translate(-28.2 -49.985)">
                <path d="M50.859,74.861c-1.856,2.665-5.42,4.357-10.592,4.357C33.762,79.217,28.2,76.171,28.2,69l6.438.524c-.045,3.3,4.394,3.2,5.315,3.219,1.093.015,5.465.082,5.465-2.4,0-6.191-16.506-.629-16.506-11.49,0-5.981,5.622-8.788,10.869-8.788,4.544,0,8.818,1.49,10.675,5.06a.157.157,0,0,1-.03.045,18.482,18.482,0,0,0-1.744,3.855l-3.451-.5c-1.153-1.639-3.511-2.036-5.509-2.036-2.036,0-4.619.427-4.641,2.021-.045,2.695,1.5,2.014,8.833,3.593a12.554,12.554,0,0,1,3.922,1.5c-.022.344-.03.7-.03,1.04a18.387,18.387,0,0,0,2.62,9.484C50.567,74.389,50.709,74.628,50.859,74.861Zm14.3-23.774a5.11,5.11,0,0,0,.771.5,1.151,1.151,0,0,1,.524-.322c.629-.037.629.591.719.928.314.022.4-.1.674-.18.135.135.262.269.4.4a5.559,5.559,0,0,1,.853-.988,1.576,1.576,0,0,1,.187-.015A13.473,13.473,0,0,0,65.157,51.086ZM78.414,70.624a13.97,13.97,0,0,0,.906-2.4,4.077,4.077,0,0,1-.217-2.47c-.045-.389-.09-.771-.127-1.16.1-.741.21-1.475.307-2.216a12.127,12.127,0,0,0-.067-1.617l-.157-.494c-.689-.374-.621-.966-.614-1.5a13.538,13.538,0,0,0-5.465-5.9c-.007-.007-.015-.007-.022-.015a2.567,2.567,0,0,1,.509.636c-.187.561-.329,1.25-.591,1.422-1.1-.584-1.332-1.5-1.984-2.283-.322-.225-.651-.449-.973-.681.03-.082.052-.157.082-.24a1.829,1.829,0,0,0,.18-.075c-.18-.052-.352-.1-.531-.15.03.022.06.052.09.075l-.584.517a.309.309,0,0,1,.082.052c.449.524,1.332.749,1.377,1.362-.045.142-.09.292-.135.434a1.349,1.349,0,0,0-.546.255c.052.1.1.21.157.322.255.067.517-.045.779.225l1.115,1.325c-.007.21-.007.412-.015.621.15.337.442.3.472.666a.381.381,0,0,1-.269.075.532.532,0,0,1-.531-.367c.045-.1.09-.217.127-.322a1.9,1.9,0,0,0-1.168-.045,1.064,1.064,0,0,0,.292.966c-.03.06-.067.112-.1.172-.247.007-.636-.15-.9-.12a11.619,11.619,0,0,0-1.856,1.145c-.12.269-.24.546-.359.816-.352.322-1.041.232-1.37.689-.344.487.217,1.07-.247,1.512-.546.195-.479-.913-.546-1.228-2.059-1.3-4.761-.636-3.833,2.006,1.153.606,1.624-.786,2.253.045-.195.494-.6.831-.629,1.288,2.081,1.093.225.958.838,2.193.157.314.472.307.719.531l-.022.045-.187.232c-.075-.007-.15-.007-.217-.015-.344-.352-.7-.7-1.041-1.055-.12-.344-.045-.591-.322-.928-.359-.262-.719-.531-1.078-.793-.1-.187-.195-.382-.3-.569-.21-.067-.419-.127-.629-.195a3.616,3.616,0,0,1-1.482-1.482c-.382-.711.262-2.029-.382-2.785-.082.18-.172.359-.255.539-.037-.037-.067-.075-.1-.12.142-1.228-.18-2.642.344-3.96.367-.913,3.211-2.747,2.874-3.945A13.618,13.618,0,0,0,59.348,76.44a13.822,13.822,0,0,0,3.81,1.5,5.718,5.718,0,0,1,1.093-1.22,6.958,6.958,0,0,0,1.273-2.4c-.217-.449-.7-.651-1.055-1.123-.314-.966-.636-1.924-.951-2.889a4.93,4.93,0,0,1,.681-1.377c.269-.232.8-.314,1-.734.225-.494.015-.966.015-1.415.187.03.382.067.569.1a1.439,1.439,0,0,0,.524-.262l1.662,10.8c-.614.157-1.25.262-1.819.382a5.7,5.7,0,0,0-1.078.427,13.394,13.394,0,0,0,3-.1c.052.344.1.681.157,1.026a14.661,14.661,0,1,1,10.989-7.89C78.968,71.065,78.691,70.848,78.414,70.624Zm.539,10.136a.988.988,0,0,1-.359,1.347l-.9.517a.988.988,0,0,1-1.347-.359L73.009,76.47l-3.541,5.614L66.414,61.955,82.269,74.7l-6.662.247ZM95.8,72.742a8.069,8.069,0,0,0,7.066-4.162l5.756,3.189a14.6,14.6,0,0,1-25.354.247,19.407,19.407,0,0,0,0-14.732A14.607,14.607,0,0,1,108.6,57.5l-5.741,3.211A8.083,8.083,0,1,0,95.8,72.742ZM111.088,50.1h6.385V79.15h-6.385Zm15.795,11.371,11.73-.022v6.46l-11.73.007v4.858l14.709-.022v6.46H120.423V50.068h21.2l.03,6.438H126.891v4.963Zm33.049-4.948V79.292h-6.453V56.528h-9.207v-6.46h20.294l3.848,6.438Zm25.1,11.393V79.3h-6.46V67.809l-.022-.112L168.032,50.068h7.493l6.363,10.682,6.378-10.645h7.493Z" fill="#202794"/>
              </g>
            </svg>
            <div style="font-size: 11px; font-weight: 700; color: #202794; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 5px;">WEB SOLUTIONS</div>
          </div>

          <!-- Title & Number -->
          <div style="text-align: right;">
            <div style="font-size: 24px; font-weight: 900; color: #202794; text-transform: uppercase; letter-spacing: 0.5px;">PAYMENT RECEIPT</div>
            <div style="font-size: 16px; font-weight: 700; color: #1E293B; margin-top: 4px;">${d.receiptNumber}</div>
          </div>
        </div>

        <!-- Divider -->
        <div style="height: 1px; background-color: #E2E8F0; width: 100%;"></div>
      </div>

      <!-- Vertically Centered & Proportionately Spaced Details Block -->
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; padding: 24px 0;">
        
        <!-- RECEIPT DETAILS Section -->
        <div>
          <div style="font-size: 15px; font-weight: 800; color: #202794; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 18px;">
            RECEIPT DETAILS
          </div>
          <div style="display: flex; flex-direction: column; gap: 18px; font-size: 15.5px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Date:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.date}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Order ID:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.orderId}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Transaction ID:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.transactionId}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Payment Method:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.paymentMethod}</span>
            </div>
          </div>
        </div>

        <!-- BILLING DETAILS Section -->
        <div>
          <div style="font-size: 15px; font-weight: 800; color: #202794; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 18px;">
            BILLING DETAILS
          </div>
          <div style="display: flex; flex-direction: column; gap: 18px; font-size: 15.5px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Cardholder Name:</span>
              <span style="color: #0F172A; font-weight: 700; text-transform: uppercase;">${d.cardholderName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Email:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.email}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Address:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.address}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">City:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.city}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Zip Code:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.zipCode}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">State/Province:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.state}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #334155; font-weight: 500;">Country:</span>
              <span style="color: #0F172A; font-weight: 700;">${d.country}</span>
            </div>
          </div>
        </div>

        <!-- TOTAL AMOUNT Box -->
        <div style="background-color: #0D1527; border-radius: 6px; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 26px; font-weight: 900; color: #FFFFFF; letter-spacing: 1.2px; text-transform: uppercase;">TOTAL AMOUNT</span>
          <span style="font-size: 32px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">${d.formattedAmount}</span>
        </div>
      </div>

      <!-- Bottom Footer Block -->
      <div>
        <!-- Divider -->
        <div style="height: 1px; background-color: #E2E8F0; width: 100%; margin-bottom: 20px;"></div>

        <div style="text-align: center;">
          <div style="font-size: 12px; font-weight: 800; color: #94A3B8; letter-spacing: 3.5px; text-transform: uppercase; margin-bottom: 6px;">
            SOCIETY WEB SOLUTIONS
          </div>
          <div style="font-size: 11.5px; color: #64748B; margin-bottom: 4px;">
            1645 Palm Beach Lakes Blvd, West Palm Beach, FL, USA
          </div>
          <div style="font-size: 11.5px; color: #64748B;">
            For inquiries, please reach out to <span style="font-weight: 700; color: #334155;">contact@societywebsolutions.com</span>
          </div>
        </div>
      </div>

    </div>
  `;
}

export async function downloadReceiptPDF(project: any, payment: any): Promise<void> {
  if (typeof window === "undefined") return;

  let userProfile = authService.getUser();
  try {
    const { profileService } = await import("./profileService");
    const profileRes = await profileService.getMyProfile();
    if (profileRes?.data) {
      userProfile = { ...userProfile, ...profileRes.data };
    }
  } catch (err) {
    console.warn("Could not fetch latest profile for receipt, using cached user:", err);
  }

  const d = extractReceiptDetails(project, payment, userProfile);

  try {
    if (!(window as any).html2canvas) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    }
    if (!(window as any).jspdf) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    }

    const html2canvas = (window as any).html2canvas;
    const jsPdfLib = (window as any).jspdf?.jsPDF || (window as any).jsPDF;

    if (!html2canvas || !jsPdfLib) {
      throw new Error("PDF generation libraries not available");
    }

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "794px";
    container.style.height = "1123px";
    container.style.backgroundColor = "#ffffff";
    container.innerHTML = getReceiptHTML(d);

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPdfLib("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const cleanRef = d.receiptNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "receipt";
      const filename = `Receipt_${cleanRef}.pdf`;
      pdf.save(filename);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  } catch (err) {
    console.warn("Direct PDF generation fallback to print:", err);
    printReceiptPDF(project, payment);
  }
}

export async function printReceiptPDF(project: any, payment: any): Promise<void> {
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
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
