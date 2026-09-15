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

const LOGO_SVG = `
<svg width="158" height="50" viewBox="0 0 328 104" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M302.37 36.0782V59.0177H289.949V35.8689L289.904 35.6389L269.662 0.11843H284.08L296.321 21.6477L308.589 0.19537H323L302.37 36.0782ZM254.089 13.1244V59.0177H241.667V13.1363H223.953V0.11843H262.993L270.396 13.0903L254.089 13.1244ZM190.505 23.0913L213.078 23.0439V36.0684L190.505 36.088V45.8855L218.806 45.8438V58.8688H178.082V0.11843H218.862L218.912 13.0867H190.505V23.0919V23.0913ZM160.115 0.172894H172.398V58.7203H160.115V0.172894ZM130.702 45.8139C133.477 45.8145 136.201 45.0374 138.592 43.5634C140.983 42.0895 142.954 39.9722 144.3 37.4313L155.368 43.8642C152.953 48.393 149.438 52.1724 145.179 54.8195C140.92 57.4665 136.069 58.8872 131.117 58.9373C126.165 58.9875 121.289 57.6655 116.982 55.1052C112.675 52.5449 109.091 48.8374 106.592 44.3584C110.319 34.8523 110.319 24.1904 106.592 14.6843C109.087 10.2125 112.664 6.50959 116.962 3.94966C121.26 1.38973 126.127 0.0634676 131.071 0.104885C136.015 0.146302 140.861 1.55393 145.119 4.18555C149.378 6.81716 152.898 10.5795 155.323 15.0925L144.274 21.5644C142.937 19.0605 140.992 16.9711 138.636 15.5074C136.28 14.0438 133.597 13.2578 130.858 13.229C128.119 13.2002 125.421 13.9296 123.037 15.3434C120.654 16.7573 118.669 18.8054 117.284 21.2807C115.898 23.7559 115.162 26.5705 115.148 29.4397C115.134 32.309 115.844 35.1311 117.206 37.6208C118.568 40.1104 120.533 42.1791 122.903 43.6178C125.273 45.0565 127.963 45.8141 130.702 45.8139ZM98.2957 61.9676C98.5473 62.4245 98.6155 62.9672 98.4854 63.4768C98.3552 63.9863 98.0373 64.4209 97.6015 64.685L95.8762 65.729C95.6603 65.8596 95.422 65.9443 95.1749 65.9783C94.9277 66.0124 94.6766 65.9951 94.4359 65.9274C94.1951 65.8597 93.9695 65.743 93.7718 65.584C93.5742 65.4249 93.4083 65.2266 93.2839 65.0003L86.8545 53.3268L80.0359 64.6402L74.1562 24.074L104.653 49.7417L91.838 50.242L98.2957 61.9676ZM97.2588 41.5461C97.9812 39.993 98.5622 38.3721 98.9941 36.7047C98.1704 35.418 98.4238 33.1922 98.5794 31.7263C98.4958 30.9489 98.4128 30.1715 98.3302 29.394L98.9265 24.9317C99.0186 23.9483 98.8559 22.7906 98.7968 21.6732C98.7018 21.3391 98.6005 21.0068 98.493 20.6764C97.1694 19.9173 97.2976 18.7276 97.3192 17.6607C95.0443 12.674 91.3784 8.52782 86.806 5.7701C86.7935 5.76256 86.7808 5.75502 86.7681 5.74793C87.1568 6.1215 87.4891 6.55467 87.7538 7.03265C87.3899 8.16214 87.1172 9.54945 86.612 9.90126C84.4904 8.72304 84.0507 6.88405 82.7956 5.29505L80.9188 3.92961C80.9705 3.76939 81.0222 3.60929 81.0737 3.44927L81.4257 3.30505C81.0867 3.19523 80.7464 3.09385 80.4052 2.99941L80.5808 3.15027L79.4586 4.19346C79.5133 4.22665 79.5681 4.25979 79.6229 4.29288C80.4886 5.34317 82.1924 5.80677 82.2704 7.04352C82.183 7.33518 82.0955 7.62684 82.0078 7.9185C81.6266 8.04704 81.2934 8.11567 80.9584 8.43142L81.2617 9.07424C81.7477 9.21334 82.2519 8.9878 82.7658 9.52531L84.9077 12.1995C84.8981 12.6146 84.8885 13.0298 84.8789 13.4451C85.167 14.1214 85.7299 14.0443 85.7792 14.7938C85.5238 14.9329 85.5631 14.9412 85.2607 14.9394C84.7055 14.9585 84.4424 14.634 84.2401 14.2068C84.3235 13.9894 84.4068 13.7719 84.4899 13.5543C83.8473 13.2736 82.795 13.2546 82.2433 13.4575C82.1935 14.2466 82.2163 14.785 82.8116 15.409L82.6219 15.7534C82.1445 15.7706 81.3989 15.4479 80.8937 15.511C80.5429 15.5547 77.6111 17.4853 77.3186 17.8255L76.6291 19.4751C75.9544 20.1255 74.6284 19.9442 73.9992 20.8689C73.3298 21.8528 74.4216 23.0299 73.5274 23.9133C72.4791 24.3018 72.608 22.068 72.479 21.4414C68.5152 18.8358 63.3155 20.1632 65.1077 25.4774C67.3226 26.7034 68.2261 23.8888 69.4375 25.5717C69.0699 26.5711 68.2813 27.2515 68.2261 28.1684C72.2263 30.3718 68.6521 30.1025 69.843 32.5918C70.1473 33.228 70.7493 33.209 71.2269 33.659C71.211 33.6877 71.1952 33.7164 71.1795 33.7451L70.8127 34.2128L70.3891 34.1861L68.3851 32.0555C68.1598 31.3578 68.3022 30.8613 67.7695 30.1901L65.6932 28.5887L65.1216 27.4389L63.9118 27.0509C62.7233 26.5717 61.5079 24.9333 61.0652 24.0651C60.3356 22.6343 61.5719 19.9844 60.3242 18.4496C60.162 18.8107 59.9996 19.1717 59.8372 19.5328L59.6381 19.2974C59.9067 16.8301 59.2941 13.9704 60.3074 11.3202C61.0139 9.47267 66.4903 5.78368 65.8419 3.36419C59.5903 5.42041 54.3061 9.86557 51.0399 15.816C43.8103 28.9431 48.1005 45.7287 60.6234 53.3076C62.9096 54.6943 65.3831 55.7103 67.9599 56.3209C68.3919 55.3675 69.5926 54.3872 70.0694 53.8574C71.1215 52.6885 72.1013 50.4618 72.514 49.0214C72.0983 48.1223 71.1693 47.7033 70.4761 46.7547C69.8648 44.8156 69.2534 42.8763 68.6418 40.9368C68.7579 40.4124 69.5736 38.5079 69.9479 38.1676C70.461 37.7008 71.4927 37.5308 71.8603 36.684C72.2936 35.686 71.8863 34.7363 71.896 33.8351L72.9894 34.0375C73.3581 33.9377 73.7019 33.7558 73.9975 33.5042C75.0616 40.7623 76.1258 48.0208 77.1903 55.2798C76.0025 55.5948 74.7875 55.8095 73.6845 56.0451C73.0879 56.1726 72.3721 56.55 71.6179 56.9016C73.5459 57.0618 75.485 56.9978 77.3996 56.7106C77.4994 57.3994 77.5993 58.0883 77.6991 58.7773C71.4536 59.722 65.0864 58.432 59.6275 55.1161C46.1514 46.9605 41.5344 28.8977 49.3145 14.7719C57.0945 0.646137 74.326 -4.1939 87.8016 3.96174C100.829 11.8461 105.577 28.9894 98.8487 42.8848L97.2588 41.5461ZM71.7494 2.17013C72.2128 2.55066 72.707 2.88825 73.2263 3.17908C73.552 2.90497 73.8447 2.57248 74.2409 2.53039C75.4552 2.44922 75.4571 3.72218 75.6214 4.39924C76.2307 4.44736 76.3929 4.19829 76.9175 4.03521C77.1713 4.30374 77.4251 4.57217 77.679 4.8405C78.2373 3.83759 78.6662 3.63739 79.3229 2.85005L79.6893 2.8128C77.0897 2.17359 74.4118 1.95684 71.7494 2.17013ZM44.2363 50.0789C40.6709 55.4427 33.816 58.8656 23.864 58.8656C11.3435 58.8656 0.655273 52.7197 0.655273 38.2709L13.0407 39.327C12.9487 45.977 21.4974 45.7883 23.2659 45.8139C25.3632 45.8441 33.7791 45.9819 33.7791 40.9864C33.7791 28.5079 2.02199 39.7251 2.02199 17.8314C2.02199 5.77765 12.8304 0.119488 22.9332 0.119488C31.6812 0.119488 39.9008 3.11467 43.4685 10.3137C43.4514 10.3454 43.4347 10.3775 43.4176 10.4094C42.0186 12.8563 40.8939 15.4641 40.0659 18.1812L33.4283 17.1754C31.2179 13.8793 26.6716 13.0773 22.8338 13.0773C18.9177 13.0773 13.9545 13.9437 13.9048 17.1505C13.8204 22.5893 16.8059 21.2029 30.8988 24.3918C33.6522 25.0292 35.9393 25.865 38.4442 27.4194C38.4074 28.1152 38.3885 28.8157 38.3876 29.5211C38.3777 36.2544 40.118 42.8635 43.4219 48.6393C43.6842 49.1255 43.9557 49.6054 44.2363 50.0789Z" fill="#2A2AA0"/>
</svg>
`;

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

  // Receipt Number
  const rawReceipt =
    payment?.receiptNumber ||
    (payment?._id ? `REC-2026-${payment._id.slice(-5).toUpperCase()}` : "") ||
    (project?._id ? `REC-2026-${project._id.slice(-5).toUpperCase()}` : "REC-2026-00021");
  const cleanReceipt = String(rawReceipt).replace(/^#/, "");
  const receiptNumber = cleanReceipt.toUpperCase().startsWith("REC-") || cleanReceipt.toUpperCase().startsWith("R-")
    ? `#${cleanReceipt.toUpperCase()}`
    : `#REC-${cleanReceipt.toUpperCase()}`;

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

  // Order ID / Project Number (Format: SOC-YYYY-XXXX)
  let rawOrder =
    project?.projectNumber ||
    payment?.orderId ||
    project?.quoteNumber ||
    (project?._id ? `SOC-2026-${project._id.slice(-4).toUpperCase()}` : "SOC-2026-001");
  const cleanOrder = String(rawOrder).replace(/^Project\s*#?/i, "").replace(/^#/, "");
  const orderId = cleanOrder.toUpperCase().startsWith("SOC-")
    ? cleanOrder.toUpperCase()
    : `SOC-2026-${cleanOrder}`;

  // Transaction ID
  let transactionId =
    payment?.transactionId ||
    payment?.transactionNumber ||
    payment?.externalTransactionId ||
    payment?.paymentIntentId ||
    payment?.chargeId ||
    (payment?._id ? `ch-${payment._id}` : "ch-3T4IHQEG4PW3098RTUAGE");

  // Payment Method
  let paymentMethod = "Credit / Debit Card";
  if (payment?.brand || payment?.cardBrand) {
    const brand = payment.brand || payment.cardBrand || "Card";
    const last4 = payment.last4 || payment.cardLast4 || "4242";
    paymentMethod = `${brand.charAt(0).toUpperCase() + brand.slice(1)} •••• ${last4}`;
  } else if (payment?.last4 || payment?.cardLast4) {
    paymentMethod = `Card ending in ${payment.last4 || payment.cardLast4}`;
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
    paymentMethod = "Visa •••• 4242";
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

  const formatField = (val: any, fallback = "N/A") => {
    if (val === null || val === undefined) return fallback;
    const str = String(val).trim();
    return str.length > 0 && str !== "—" && str !== "-" ? str : fallback;
  };

  cardholderName = formatField(cardholderName || currentUser?.fullName, "Valued Client");
  companyName = formatField(companyName, "");
  address = formatField(address, "");
  city = formatField(city, "");
  zipCode = formatField(zipCode, "");
  state = formatField(state, "");
  country = formatField(country, "United States");

  const email = formatField(
    currentUser?.email ||
      payment?.billingEmail ||
      payment?.email ||
      project?.client?.email ||
      project?.clientEmail,
    "contact@societywebsolutions.com"
  );

  transactionId = formatField(transactionId, "ch-SUCCESS");
  paymentMethod = formatField(paymentMethod, "Credit / Debit Card");

  // Project title
  const projectTitle =
    payment?.description ||
    payment?.title ||
    project?.title ||
    project?.categoryName ||
    "Custom Web & Digital Solutions Deliverables";

  // Total Amount
  const currency = (payment?.currency || project?.currency || "USD").toUpperCase();
  const rawAmount = Number(
    payment?.amount ??
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
  const addrParts = [
    d.address,
    [d.city, d.state].filter(Boolean).join(", "),
    d.zipCode,
  ].filter(Boolean);
  const contactLine1 = addrParts.join(", ");
  const contactCountry = d.country || "United States";

  return `
    <div class="pdf-page receipt-page" style="
      width: 794px;
      height: 1123px;
      min-height: 1123px;
      max-height: 1123px;
      box-sizing: border-box;
      background-color: #FFFFFF;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #202124;
      padding: 56px 64px 44px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    ">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
          border-bottom: 1.5px solid #D9D9D9;
        }

        .header-logo {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-top: 10px;
        }

        .receipt-header-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
          white-space: nowrap;
        }

        .receipt-title {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 22px;
          line-height: 1;
          letter-spacing: -0.01em;
          color: #2A2AA0;
          margin: 0 0 5px 0;
          text-transform: uppercase;
        }

        .company-name {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 13.5px;
          line-height: 1.3;
          color: #1E293B;
          margin-bottom: 3px;
        }

        .company-address {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 12px;
          line-height: 1.45;
          color: #64748B;
          margin-bottom: 2px;
        }

        .company-email {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 12px;
          line-height: 1.45;
          color: #2A2AA0;
        }

        .receipt-info-section {
          box-sizing: border-box;
          width: 100%;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 18px 22px;
          margin: 22px 0 24px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .receipt-bill-to {
          display: flex;
          flex-direction: column;
          width: calc(52% - 15px);
        }

        .info-group-contact {
          margin-top: 14px;
        }

        .receipt-section-heading {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.08em;
          color: #2A2AA0;
          text-transform: uppercase;
          margin: 0 0 8px 0;
        }

        .bill-to-name {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 14.5px;
          line-height: 1.3;
          color: #0F172A;
          margin-bottom: 3px;
        }

        .bill-to-company {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 12px;
          line-height: 1.35;
          color: #475569;
          margin-bottom: 3px;
        }

        .contact-address-line-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .contact-address-line {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 12px;
          line-height: 1.4;
          color: #64748B;
        }

        .receipt-meta-details {
          display: flex;
          flex-direction: column;
          width: calc(44% - 15px);
        }

        .receipt-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .receipt-meta-row:last-child {
          margin-bottom: 0;
        }

        .receipt-meta-label {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 12px;
          line-height: 1.35;
          color: #64748B;
        }

        .receipt-meta-value {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 12px;
          line-height: 1.35;
          color: #0F172A;
          text-align: right;
        }

        .status-paid {
          font-weight: 700;
          color: #15803D;
        }

        .receipt-table-wrapper {
          width: 100%;
          border: none;
          border-radius: 0px;
          overflow: hidden;
          background-color: #FFFFFF;
          margin-bottom: 24px;
        }

        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          text-align: left;
        }

        .receipt-table-wrapper thead th:first-child {
          border-top-left-radius: 6px;
          border-bottom-left-radius: 6px;
          padding-left: 18px;
        }

        .receipt-table-wrapper thead th:last-child {
          border-top-right-radius: 6px;
          border-bottom-right-radius: 6px;
          padding-right: 18px;
        }

        .receipt-table thead tr {
          background-color: #2A2AA0;
        }

        .receipt-table th {
          background-color: #2A2AA0 !important;
          color: #FFFFFF !important;
          padding: 14px 14px;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 11px;
          line-height: 1.2;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .receipt-table td {
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 12px;
          line-height: 1.4;
          color: #202124;
          padding: 14px 14px;
          border-bottom: 1px solid #E2E8F0;
        }

        .receipt-table th:first-child,
        .receipt-table td:first-child {
          padding-left: 18px;
        }

        .receipt-table th:last-child,
        .receipt-table td:last-child {
          padding-right: 18px;
        }

        .receipt-table .col-desc {
          text-align: left;
          width: 52%;
        }

        .item-title {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          color: #0F172A;
          font-size: 13px;
        }

        .item-details {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #64748B;
          font-weight: 400;
          line-height: 1.4;
          margin-top: 3px;
        }

        .receipt-table .col-method {
          text-align: center;
          width: 24%;
        }

        .receipt-table td.col-method {
          color: #475569;
          font-size: 11.5px;
        }

        .receipt-table .col-amount {
          text-align: right;
          width: 24%;
        }

        .receipt-table td.col-amount {
          font-weight: 700;
          color: #0F172A;
          font-size: 13px;
        }

        .receipt-footer {
          width: 100%;
          margin-top: auto;
          padding-top: 18px;
          border-top: 1.5px solid #D9D9D9;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 3px;
        }

        .receipt-footer-brand {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.14em;
          color: #CBD5E1;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .receipt-footer-address {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 10px;
          line-height: 1.4;
          color: #879095;
        }

        .receipt-footer-contact {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 10px;
          line-height: 1.4;
          color: #879095;
        }
      </style>

      <!-- Main Content Block -->
      <div style="width: 100%; display: flex; flex-direction: column; flex: 1;">
        
        <!-- Header -->
        <header class="receipt-header">
          <div class="header-logo">
            ${LOGO_SVG}
          </div>

          <div class="receipt-header-details">
            <div class="receipt-title">PAYMENT RECEIPT</div>
            <div class="company-name">Society Web Solutions</div>
            <div class="company-address">1645 Palm Beach Lakes Blvd</div>
            <div class="company-address">West Palm Beach, FL, US</div>
            <div class="company-email">contact@societywebsolutions.com</div>
          </div>
        </header>

        <!-- Bill To & Receipt Details Info Box -->
        <section class="receipt-info-section">
          <div class="receipt-bill-to">
            <div class="info-group">
              <h2 class="receipt-section-heading">BILLED TO</h2>
              <div class="bill-to-name">${d.cardholderName}</div>
              ${d.companyName ? `<div class="bill-to-company">${d.companyName}</div>` : ""}
            </div>

            <div class="info-group info-group-contact">
              <h2 class="receipt-section-heading">CONTACT INFO</h2>
              <div class="contact-address-line-wrap">
                ${contactLine1 ? `<div class="contact-address-line">${contactLine1}</div>` : ""}
                ${contactCountry ? `<div class="contact-address-line address-line-country">${contactCountry}</div>` : ""}
                ${d.email ? `<div class="contact-address-line">${d.email}</div>` : ""}
              </div>
            </div>
          </div>

          <div class="receipt-meta-details">
            <h2 class="receipt-section-heading">RECEIPT DETAILS</h2>
            <div class="receipt-meta-row">
              <span class="receipt-meta-label">Receipt No:</span>
              <span class="receipt-meta-value">${d.receiptNumber}</span>
            </div>
            <div class="receipt-meta-row">
              <span class="receipt-meta-label">Date:</span>
              <span class="receipt-meta-value">${d.date}</span>
            </div>
            <div class="receipt-meta-row">
              <span class="receipt-meta-label">Project No:</span>
              <span class="receipt-meta-value">${d.orderId}</span>
            </div>
            <div class="receipt-meta-row">
              <span class="receipt-meta-label">Transaction ID:</span>
              <span class="receipt-meta-value" style="font-family: monospace; font-size: 11px;">${d.transactionId}</span>
            </div>
            <div class="receipt-meta-row">
              <span class="receipt-meta-label">Payment Method:</span>
              <span class="receipt-meta-value">${d.paymentMethod}</span>
            </div>
            <div class="receipt-meta-row">
              <span class="receipt-meta-label">Status:</span>
              <span class="receipt-meta-value status-paid">${d.status}</span>
            </div>
          </div>
        </section>

        <!-- Payment Item Table -->
        <section class="receipt-table-section">
          <div class="receipt-table-wrapper">
            <table class="receipt-table">
              <thead>
                <tr style="background-color: #2A2AA0;">
                  <th class="col-desc" style="background-color: #2A2AA0; color: #FFFFFF !important; padding: 14px 14px 14px 18px;">PAYMENT ITEM / SERVICE SCOPE</th>
                  <th class="col-method" style="background-color: #2A2AA0; color: #FFFFFF !important; padding: 14px 14px; text-align: center;">PAYMENT METHOD</th>
                  <th class="col-amount" style="background-color: #2A2AA0; color: #FFFFFF !important; padding: 14px 18px 14px 14px; text-align: right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="col-desc">
                    <div class="item-title">${d.projectTitle || "Custom Web Solutions Deliverable"}</div>
                    <div class="item-details">Transaction: ${d.transactionId} • ${d.date}</div>
                  </td>
                  <td class="col-method">${d.paymentMethod}</td>
                  <td class="col-amount">${d.formattedAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Receipt Summary Card (Matching Proposal & Invoice Dark Navy Theme) -->
        <div style="display: flex; justify-content: flex-end; margin-top: 12px; margin-bottom: 24px; width: 100%;">
          <div style="width: 380px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06); border: 1px solid #1E293B; background-color: #0B1220;">
            <div style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px;">
              <span style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">PAYMENT STATUS</span>
              <span style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13.5px; color: #4ADE80; white-space: nowrap; text-transform: uppercase;">SUCCESSFUL (${d.status})</span>
            </div>
            <div style="background-color: #0B1220; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 44px; border-top: 1px solid #1E293B;">
              <span style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; color: #8E9AA8; text-transform: uppercase;">PAYMENT DATE</span>
              <span style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13.5px; color: #FFFFFF; white-space: nowrap;">${d.date}</span>
            </div>

            <!-- Total Amount Row -->
            <div style="background-color: #2A2AA0; display: flex; justify-content: space-between; align-items: center; padding: 0 24px; height: 62px; border-top: 1px solid #3E3EE8;">
              <span style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; color: #FFFFFF; text-transform: uppercase; white-space: nowrap;">TOTAL PAID</span>
              <span style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 21px; color: #FFFFFF; white-space: nowrap; margin-left: 16px;">${d.formattedAmount}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Pinned Footer -->
      <footer class="receipt-footer">
        <div class="receipt-footer-brand">SOCIETY WEB SOLUTIONS</div>
        <div class="receipt-footer-address">1645 Palm Beach Lakes Blvd, West Palm Beach, FL, USA</div>
        <div class="receipt-footer-contact">
          For inquiries, please reach out to <a href="mailto:contact@societywebsolutions.com" style="color: #879095; text-decoration: none; font-weight: 600;">contact@societywebsolutions.com</a>
        </div>
      </footer>

    </div>
  `;
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
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;width:794px;height:1123px;background:#ffffff;z-index:-99999;opacity:1;pointer-events:none;";
  container.innerHTML = getReceiptHTML(d);
  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvasLib(container, {
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
