import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { db } from "./db";
import { invoices, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { storage } from "./storage";

const COMPANY = {
  name: "ZECOHO TECHNOLOGIES PRIVATE LIMITED",
  gstin: "09AACCZ8890L1ZC",
  pan: "AACCZ8890L",
  address: "UG-24, Ansal Plaza, Vaishali, Vasundhara",
  city: "Ghaziabad",
  state: "Uttar Pradesh",
  stateCode: "09",
  pin: "201012",
  email: "billing@zecoho.com",
  website: "www.zecoho.com",
  bank: {
    name: "ZECOHO TECHNOLOGIES PRIVATE LIMITED",
    bank: "Yes Bank",
    account: "047061900005650",
    ifsc: "YESB0000470",
    branch: "Vaishali, Ghaziabad",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) {
    return `${String(year).slice(-2)}${String(year + 1).slice(-2)}`;
  }
  return `${String(year - 1).slice(-2)}${String(year).slice(-2)}`;
}

async function getNextSequence(financialYear: string): Promise<number> {
  const result = await db
    .select({ maxSeq: sql<number>`COALESCE(MAX(sequence_number), 0)` })
    .from(invoices)
    .where(eq(invoices.financialYear, financialYear));
  return (result[0]?.maxSeq ?? 0) + 1;
}

function amountToWords(amount: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function inWords(n: number): string {
    if (n === 0) return "";
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + inWords(n % 100000) : "")
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + inWords(n % 10000000) : "")
    );
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = "Rupees " + inWords(rupees);
  if (paise > 0) words += " and " + inWords(paise) + " Paise";
  return words + " Only";
}

// ── Create Invoice Record ──────────────────────────────────────────────────

export interface CreateInvoiceParams {
  subscriptionId: string;
  ownerId: string;
  planName: string;
  planDuration: string;
  totalAmountPaid: number; // GST-inclusive
  transactionId?: string;
  ownerGstin?: string;
  createdBy?: string;
}

export async function createInvoice(params: CreateInvoiceParams) {
  const owner = await storage.getUser(params.ownerId);
  if (!owner) throw new Error("Owner not found");

  // Determine owner state for CGST+SGST vs IGST
  const kycApp = await storage.getUserKycApplication(params.ownerId);
  const ownerState = (kycApp as any)?.state || "";
  const isUP =
    ownerState.toLowerCase().includes("uttar pradesh") ||
    (params.ownerGstin?.startsWith("09") ?? false);

  // Reverse GST calculation (price is GST-inclusive)
  const total = params.totalAmountPaid;
  const base = total / 1.18;
  const gst = total - base;

  let cgstRate = "0",
    cgstAmount = "0";
  let sgstRate = "0",
    sgstAmount = "0";
  let igstRate = "0",
    igstAmount = "0";

  if (isUP) {
    cgstRate = "9";
    cgstAmount = (gst / 2).toFixed(2);
    sgstRate = "9";
    sgstAmount = (gst / 2).toFixed(2);
  } else {
    igstRate = "18";
    igstAmount = gst.toFixed(2);
  }

  const fy = getFinancialYear();
  const seq = await getNextSequence(fy);
  const invoiceNumber = `ZECH/${fy}/${String(seq).padStart(4, "0")}`;
  const ownerName =
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Property Owner";

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      financialYear: fy,
      sequenceNumber: seq,
      subscriptionId: params.subscriptionId,
      transactionId: params.transactionId || null,
      ownerId: params.ownerId,
      ownerName,
      ownerEmail: owner.email || null,
      ownerPhone: owner.phone || null,
      ownerAddress: owner.kycAddress || null,
      ownerGstin: params.ownerGstin || (kycApp as any)?.gstNumber || null,
      ownerState: ownerState || (kycApp as any)?.state || null,
      planName: params.planName,
      planDuration: params.planDuration,
      sacCode: "998599",
      baseAmount: base.toFixed(2),
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalAmount: total.toFixed(2),
      status: "generated",
      invoiceDate: new Date(),
      createdBy: params.createdBy || null,
    })
    .returning();

  return invoice;
}

// ── Generate PDF ───────────────────────────────────────────────────────────

export async function generateInvoicePDF(invoiceId: string): Promise<Buffer> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  if (!invoice) throw new Error("Invoice not found");
  return buildPDF(invoice);
}

async function buildPDF(inv: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
      autoFirstPage: true,
      bufferPages: true,
      layout: "portrait",
    });
    const buffers: Buffer[] = [];
    doc.on("data", (c: Buffer) => buffers.push(c));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const L = 50;
    const R = pageW - 50;
    const W = R - L;
    const orange = "#E67E22";
    const dark = "#1a1a1a";
    const gray = "#555555";
    const lightGray = "#888888";
    const tableBg = "#f7f7f7";
    const Rs = "Rs.";

    // ── HEADER ────────────────────────────────────────────
    doc.rect(L, 45, W, 80).fillColor(orange).fill();
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(COMPANY.name, L + 12, 54, { width: W - 130 });
    doc
      .font("Helvetica")
      .fontSize(8)
      .text("Zero Commission Hotel Booking Platform", L + 12, 73)
      .text(`GSTIN: ${COMPANY.gstin}   PAN: ${COMPANY.pan}`, L + 12, 84)
      .text(`${COMPANY.address}, ${COMPANY.city} - ${COMPANY.pin}`, L + 12, 95)
      .text(`${COMPANY.state}  |  ${COMPANY.website}`, L + 12, 106);

    // ── TAX INVOICE LABEL ─────────────────────────────────
    doc.rect(L, 133, W, 22).fillColor("#2c2c2c").fill();
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("TAX INVOICE", L, 139, { align: "center", width: W });

    // ── INVOICE META ROW ─────────────────)��────────────────
    const metaY = 163;
    const col = W / 4;
    const metaItems = [
      ["Invoice No.", inv.invoiceNumber],
      [
        "Date",
        new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      ],
      ["SAC Code", inv.sacCode || "998599"],
      ["Ref / Txn ID", inv.transactionId || "—"],
    ];
    metaItems.forEach(([label, value], i) => {
      const x = L + i * col;
      doc
        .rect(x, metaY, col, 36)
        .strokeColor("#cccccc")
        .lineWidth(0.6)
        .stroke();
      doc
        .fillColor(lightGray)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(label, x + 6, metaY + 5, { width: col - 10 });
      doc
        .fillColor(dark)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(String(value), x + 6, metaY + 17, { width: col - 10 });
    });

    // ── BILL TO ───────────────────────────────────────────
    const btY = 210;
    doc.rect(L, btY, W, 14).fillColor("#eeeeee").fill();
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("BILLED TO", L + 8, btY + 3);
    doc
      .rect(L, btY + 14, W, 0.5)
      .fillColor("#cccccc")
      .fill();

    let btRow = btY + 22;
    const btLine = (label: string, val: string) => {
      if (!val) return;
      doc
        .fillColor(lightGray)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(`${label}:`, L + 8, btRow, { width: 70 });
      doc
        .fillColor(dark)
        .font("Helvetica")
        .fontSize(8)
        .text(val, L + 80, btRow, { width: W - 90 });
      btRow += 14;
    };
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(inv.ownerName, L + 8, btRow);
    btRow += 12;
    if (inv.ownerEmail) btLine("Email", inv.ownerEmail);
    if (inv.ownerPhone) btLine("Phone", inv.ownerPhone);
    if (inv.ownerAddress) btLine("Address", inv.ownerAddress);
    if (inv.ownerGstin) btLine("GSTIN", inv.ownerGstin);
    if (inv.ownerState) btLine("State", inv.ownerState);

    // ── ITEMS TABLE ───────────────────────────────────────
    const tY = Math.max(btRow + 16, 315);
    // Header row
    doc.rect(L, tY, W, 20).fillColor("#2c2c2c").fill();
    doc.fillColor("white").font("Helvetica-Bold").fontSize(8);
    const cols = { desc: L + 8, sac: L + 240, period: L + 300, amt: L + 380 };
    doc.text("Description of Service", cols.desc, tY + 6);
    doc.text("SAC", cols.sac, tY + 6);
    doc.text("Period", cols.period, tY + 6);
    doc.text("Amount (Rs.)", cols.amt, tY + 6, { width: 105, align: "right" });

    // Item row
    const rY = tY + 20;
    const rH = 40;
    doc.rect(L, rY, W, rH).fillColor(tableBg).fill();
    doc.rect(L, rY, W, rH).strokeColor("#dddddd").lineWidth(0.5).stroke();
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(inv.planName, cols.desc, rY + 8, { width: 220 });
    doc
      .fillColor(gray)
      .font("Helvetica")
      .fontSize(8)
      .text("Subscription Service — ZECOHO Platform", cols.desc, rY + 22, {
        width: 220,
      });
    doc
      .fillColor(dark)
      .fontSize(9)
      .text(inv.sacCode || "998599", cols.sac, rY + 15);
    doc.text(inv.planDuration, cols.period, rY + 15);
    doc
      .font("Helvetica-Bold")
      .text(
        `Rs. ${Number(inv.baseAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        cols.amt,
        rY + 15,
        { width: 105, align: "right" },
      );

    // ── TAX SUMMARY ───────────────────────────────────────
    const sumX = L + 270;
    const sumW = W - 270;
    let sumY = rY + rH + 16;

    const sumRow = (
      label: string,
      amount: string,
      bold = false,
      bg = false,
    ) => {
      if (bg)
        doc
          .rect(sumX, sumY - 2, sumW, 20)
          .fillColor(orange)
          .fill();
      doc
        .fillColor(bg ? "white" : bold ? dark : gray)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(bg ? 10 : 9)
        .text(label, sumX + 6, sumY + 2)
        .text(amount, sumX + 6, sumY + 2, { align: "right", width: sumW - 12 });
      sumY += 20;
    };

    doc
      .rect(sumX, sumY - 2, sumW, 0.5)
      .fillColor("#cccccc")
      .fill();
    sumY += 6;
    sumRow(
      "Taxable Amount:",
      `Rs. ${Number(inv.baseAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    );
    if (Number(inv.cgstAmount) > 0) {
      sumRow(
        `CGST @ ${inv.cgstRate}%:`,
        `Rs. ${Number(inv.cgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      );
      sumRow(
        `SGST @ ${inv.sgstRate}%:`,
        `Rs. ${Number(inv.sgstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      );
    } else {
      sumRow(
        `IGST @ ${inv.igstRate}%:`,
        `Rs. ${Number(inv.igstAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      );
    }
    doc
      .rect(sumX, sumY - 2, sumW, 0.5)
      .fillColor("#cccccc")
      .fill();
    sumY += 4;
    sumRow(
      "TOTAL AMOUNT:",
      `Rs. ${Number(inv.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      true,
      true,
    );

    // ── AMOUNT IN WORDS ───────────────────────────────────
    const wY = sumY + 12;
    doc.rect(L, wY, W, 28).fillColor(tableBg).fill();
    doc.rect(L, wY, W, 28).strokeColor("#dddddd").lineWidth(0.5).stroke();
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("Amount in Words:", L + 8, wY + 5);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(gray)
      .text(amountToWords(Number(inv.totalAmount)), L + 8, wY + 16, {
        width: W - 16,
      });

    // ── BANK + UPI + SIGNATURE ────────────────────────────
    const bankY = wY + 36;
    const halfW = W / 2 - 8;

    // Bank details (left)
    doc
      .rect(L, bankY, halfW, 80)
      .strokeColor("#dddddd")
      .lineWidth(0.5)
      .stroke();
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("Bank Details", L + 8, bankY + 6);
    doc
      .rect(L + 8, bankY + 16, halfW - 16, 0.4)
      .fillColor("#eeeeee")
      .fill();
    doc.fillColor(gray).font("Helvetica").fontSize(8);
    doc.text(`Name:    ${COMPANY.bank.name}`, L + 8, bankY + 22);
    doc.text(`Bank:      ${COMPANY.bank.bank}`, L + 8, bankY + 34);
    doc.text(`A/C:        ${COMPANY.bank.account}`, L + 8, bankY + 46);
    doc.text(`IFSC:       ${COMPANY.bank.ifsc}`, L + 8, bankY + 58);

    // UPI QR placeholder + UPI ID (right side)
    const upiX = L + halfW + 16;
    doc
      .rect(upiX, bankY, halfW, 80)
      .strokeColor("#dddddd")
      .lineWidth(0.5)
      .stroke();
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("UPI Payment", upiX + 8, bankY + 6);
    doc
      .rect(upiX + 8, bankY + 16, halfW - 16, 0.4)
      .fillColor("#eeeeee")
      .fill();
    // Real UPI QR Code
    try {
      const upiString = `upi://pay?pa=yespay.mabs0470619ikit5650@yesbankltd&pn=ZECOHO%20TECHNOLOGIES&am=${Number(inv.totalAmount).toFixed(2)}&cu=INR`;
      const qrDataUrl = await QRCode.toDataURL(upiString, {
        width: 52,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(qrBase64, "base64");
      doc.image(qrBuffer, upiX + 8, bankY + 20, { width: 52, height: 52 });
    } catch (qrError) {
      doc
        .rect(upiX + 8, bankY + 20, 52, 52)
        .strokeColor("#cccccc")
        .lineWidth(0.8)
        .stroke();
      doc
        .fillColor(lightGray)
        .font("Helvetica")
        .fontSize(6)
        .text("SCAN TO PAY", upiX + 10, bankY + 41, {
          width: 48,
          align: "center",
        });
    }
    // UPI ID text
    doc
      .fillColor(gray)
      .font("Helvetica")
      .fontSize(8)
      .text("UPI ID:", upiX + 68, bankY + 22)
      .text("yespay.mabs0470619ikit5650", upiX + 68, bankY + 33)
      .text("@yesbankltd", upiX + 68, bankY + 44)
      .text("(verify before payment)", upiX + 68, bankY + 55, {
        width: halfW - 80,
      });

    // Signature (far right)
    const sigX = L + W - 160;
    const sigY = bankY + 85;
    doc
      .rect(sigX, sigY, 160, 55)
      .strokeColor("#dddddd")
      .lineWidth(0.5)
      .stroke();
    doc
      .fillColor(dark)
      .font("Helvetica-Bold")
      .fontSize(7)
      .text("For ZECOHO TECHNOLOGIES PRIVATE LIMITED", sigX + 6, sigY + 6, {
        width: 148,
      });
    // Signature stamp area
    doc
      .rect(sigX + 6, sigY + 16, 148, 28)
      .fillColor("#fafafa")
      .fill();
    doc
      .rect(sigX + 6, sigY + 16, 148, 28)
      .strokeColor("#eeeeee")
      .lineWidth(0.5)
      .stroke();
    doc
      .fillColor(orange)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("ZECOHO", sigX + 6, sigY + 22, { width: 148, align: "center" });
    doc
      .fillColor(lightGray)
      .font("Helvetica")
      .fontSize(6)
      .text("Digitally Authorised", sigX + 6, sigY + 33, {
        width: 148,
        align: "center",
      });
    doc
      .rect(sigX + 6, sigY + 46, 148, 0.5)
      .fillColor("#cccccc")
      .fill();
    doc
      .fillColor(lightGray)
      .font("Helvetica")
      .fontSize(7)
      .text("Authorised Signatory", sigX + 6, sigY + 50, {
        width: 148,
        align: "center",
      });

    // ── FOOTER ────────────────────────────────────────────
    // Fixed footer position — keeps invoice on single page
    const contentBottom = sigY + 60;
    const fY = doc.page.height - 48;

    // Safety check — if content would overflow, compress spacing
    if (fY > doc.page.height - 20) {
      console.warn("[INVOICE] Content may overflow single page");
    }
    doc
      .rect(L, fY - 6, W, 0.5)
      .fillColor("#cccccc")
      .fill();
    doc
      .fillColor(lightGray)
      .font("Helvetica")
      .fontSize(7)
      .text(
        "This is a computer-generated invoice and does not require a physical signature.",
        L,
        fY,
        { align: "center", width: W },
      );
    doc.text(
      `${COMPANY.website}  |  ${COMPANY.email}  |  GSTIN: ${COMPANY.gstin}  |  Subject to ${COMPANY.city} Jurisdiction`,
      L,
      fY + 11,
      { align: "center", width: W },
    );

    // ── END — single page only ────────────────────────────
    doc.end();
  });
}
