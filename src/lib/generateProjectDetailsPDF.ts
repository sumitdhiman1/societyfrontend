import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { authService } from "./authService";

export interface ProjectPDFData {
  title?: string;
  projectNumber?: string;
  clientEmail?: string;
  clientName?: string;
  status?: string;
  submittedDate?: string;
  deadlineDate?: string;
  description?: string;
  deliverables?: Array<{
    name: string;
    duration: string;
    amount: number;
  }>;
  duration?: string;
  totalPrice?: number;
  currency?: string;
  [key: string]: any;
}

function extractProjectDetails(data: any) {
  const currentUser = authService.getUser();
  const clientEmail =
    data.client?.email ||
    data.clientEmail ||
    data.email ||
    data.user?.email ||
    currentUser?.email ||
    "saurav.mth5911@gmail.com";

  let rawProjectNumber =
    data.projectNumber ||
    data.quoteNumber ||
    (data._id ? `2026-${data._id.slice(-3).toUpperCase()}` : "2026-163");
  rawProjectNumber = String(rawProjectNumber).replace(/^INV-/i, "");
  const projectNumber = rawProjectNumber.startsWith("#") ? rawProjectNumber : `#${rawProjectNumber}`;

  const title = data.title || "Free website analysis - com";
  const status = (data.status || "Active").charAt(0).toUpperCase() + (data.status || "Active").slice(1).toLowerCase();

  const submittedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Sep 5, 2026";

  const deadlineDate = data.deadline
    ? new Date(data.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : data.createdAt
    ? new Date(new Date(data.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Sep 10, 2026";

  const duration = data.timelineInDays
    ? `${data.timelineInDays} Days`
    : data.duration || (data.requirements?.estimatedTimeline || "5 Days");

  const totalPrice = Number(data.amountPaid ?? data.price ?? data.totalCost ?? 0);
  const currency = (data.currency || "USD").toUpperCase();

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalPrice);

  let description = data.description || "";
  if (!description) {
    if (data.website) {
      description = `Analysis for ${data.website}.`;
    } else if (title.includes(" - ")) {
      description = `Analysis for www.${title.split(" - ").pop()?.trim() || "com"}.`;
    } else {
      description = "Analysis for www.com.";
    }
  }

  const deliverables =
    Array.isArray(data.deliverableItems) && data.deliverableItems.length > 0
      ? data.deliverableItems.map((d: any) => ({
          name: d.item || d.name || d.description || title,
          duration: d.duration || duration,
          amount: Number(d.amount ?? d.cost ?? totalPrice),
        }))
      : Array.isArray(data.lineItems) && data.lineItems.length > 0
      ? data.lineItems.map((d: any) => ({
          name: d.description || d.name || title,
          duration: d.duration || duration,
          amount: Number(d.amount ?? totalPrice),
        }))
      : [
          {
            name: title.startsWith("Free website analysis") ? "Free website analysis" : title,
            duration: duration,
            amount: totalPrice,
          },
        ];

  return {
    rawProjectNumber,
    projectNumber,
    title,
    clientEmail,
    status,
    submittedDate,
    deadlineDate,
    duration,
    totalPrice,
    currency,
    formattedPrice,
    description,
    deliverables,
  };
}

function getProjectDetailsHTML(d: ReturnType<typeof extractProjectDetails>) {
  return `
    <div style="width: 100%; max-width: 794px; margin: 0 auto; box-sizing: border-box; background-color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; padding: 24px 32px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            <span style="font-size: 26px; font-weight: 900; color: #162456; letter-spacing: -0.5px;">SOCIETY</span>
          </div>
          <div style="font-size: 9px; font-weight: 800; color: #3E4E80; letter-spacing: 2px; text-transform: uppercase;">
            WEB SOLUTIONS
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 900; color: #162456; margin-bottom: 4px; letter-spacing: -0.2px;">PROJECT DETAILS</div>
          <div style="font-size: 11px; font-weight: 700; color: #1E293B; margin-bottom: 2px;">Society Web Solutions</div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">1645 Palm Beach Lakes Blvd</div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">West Palm Beach, FL, US</div>
          <div style="font-size: 11px; font-weight: 700; color: #2B30C9;">contact@societywebsolutions.com</div>
        </div>
      </div>

      <!-- Divider -->
      <div style="height: 1px; background-color: #E2E8F0; width: 100%; margin-bottom: 24px;"></div>

      <!-- Client & Project Summary Card -->
      <div style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 24px; background-color: #FFFFFF; display: flex; justify-content: space-between; margin-bottom: 28px;">
        <div style="flex: 1;">
          <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">CLIENT</div>
          <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 4px; word-break: break-all;">${d.clientEmail}</div>
          <div style="font-size: 12px; color: #64748B;">Status: <span style="font-weight: 800; color: #0F172A;">${d.status}</span></div>
        </div>
        <div style="width: 230px;">
          <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">PROJECT SUMMARY</div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #64748B;">Project ID:</span>
            <span style="font-weight: 800; color: #0F172A;">${d.projectNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #64748B;">Submitted:</span>
            <span style="font-weight: 800; color: #0F172A;">${d.submittedDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #64748B;">Est. Deadline:</span>
            <span style="font-weight: 800; color: #15803D;">${d.deadlineDate}</span>
          </div>
        </div>
      </div>

      <!-- Project Title Section -->
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #1E2B7B; margin: 0 0 8px 0; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0;">Project Title: ${d.title}</h2>
        <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.5;">${d.description}</p>
      </div>

      <!-- Deliverables Table -->
      <div style="border: 1px solid #2B30C9; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #2B30C9; color: #FFFFFF;">
              <th style="padding: 10px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: left;">DELIVERABLES & WORK SCOPE</th>
              <th style="padding: 10px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: center;">DURATION</th>
              <th style="padding: 10px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; text-align: right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${d.deliverables
              .map(
                (item: { name: string; duration: string; amount: number }, idx: number) => `
              <tr style="background-color: #FFFFFF; border-top: ${idx > 0 ? "1px solid #F1F5F9" : "none"};">
                <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #0F172A; text-align: left;">${item.name}</td>
                <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; color: #475569; text-align: center;">${item.duration}</td>
                <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #0F172A; text-align: right;">${new Intl.NumberFormat("en-US", { style: "currency", currency: d.currency, minimumFractionDigits: 2 }).format(item.amount)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- Summary Box (Bottom-Right) -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 36px;">
        <div style="width: 260px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Top Row -->
          <div style="background-color: #0D1939; color: #FFFFFF; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.9;">ESTIMATED TIMELINE</span>
            <span style="font-size: 12px; font-weight: 800;">${d.duration}</span>
          </div>
          <!-- Bottom Row -->
          <div style="background-color: #2B30C9; color: #FFFFFF; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">INVESTMENT TOTAL</span>
            <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">${d.formattedPrice}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center;">
        <div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">This document serves as a record of project details and agreed deliverables.</div>
        <div style="font-size: 11px; color: #64748B; margin-bottom: 16px;">For inquiries, please reach out to <span style="font-weight: 700; color: #1E293B;">contact@societywebsolutions.com</span></div>
        <div style="font-size: 9px; font-weight: 800; color: #94A3B8; letter-spacing: 3px; text-transform: uppercase;">S O C I E T Y &nbsp; W E B &nbsp; S O L U T I O N S</div>
      </div>
    </div>
  `;
}

export async function downloadProjectDetailsPDF(data: any): Promise<void> {
  if (typeof window === "undefined") return;

  const d = extractProjectDetails(data);
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.backgroundColor = "#ffffff";
  container.innerHTML = getProjectDetailsHTML(d);

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    const filename = `Project_Details_${d.rawProjectNumber.replace(/[^a-zA-Z0-9-_]/g, "") || "document"}.pdf`;
    pdf.save(filename);
  } catch (err) {
    console.error("Failed to generate project PDF:", err);
  } finally {
    document.body.removeChild(container);
  }
}

export function printProjectDetails(data: any): void {
  if (typeof window === "undefined") return;

  const d = extractProjectDetails(data);
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Project Details - ${d.projectNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
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
        ${getProjectDetailsHTML(d)}
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
