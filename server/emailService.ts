// Referenced from connection:conn_resend_01KBVF5WVPAY4D2KC0ESJT2VAN
import { Resend } from "resend";

function getAppBaseUrl(): string {
  // Production domain - never use replit.app in emails
  return process.env.APP_BASE_URL || "https://www.zecoho.com";
}

function getEmailHeader(): string {
  return `
    <div style="background: linear-gradient(135deg, #FF7A00 0%, #e56700 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: 0.5px;">ZECOHO</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Zero Commission Hotel Booking</p>
    </div>
  `;
}

async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "ZECOHO <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable not set");
  }

  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail,
  };
}
export async function sendInvoiceEmail(
  to: string,
  ownerName: string,
  invoiceNumber: string,
  planName: string,
  totalAmount: string,
  pdfBuffer: Buffer,
  whatsappLink?: string,
): Promise<boolean> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "billing@zecoho.com",
      to,
      subject: `Invoice ${invoiceNumber} — ZECOHO Subscription`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #E67E22; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">ZECOHO TECHNOLOGIES PRIVATE LIMITED</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0;">Tax Invoice</p>
          </div>
          <div style="background: #fff; border: 1px solid #e0e0e0; border-top: none; padding: 28px; border-radius: 0 0 8px 8px;">
            <p style="color: #333;">Dear <strong>${ownerName}</strong>,</p>
            <p style="color: #555;">Thank you for subscribing to ZECOHO. Please find your GST invoice attached.</p>
            <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #888; font-size: 13px; padding: 6px 0;">Invoice Number</td>
                  <td style="font-weight: bold; color: #333; font-size: 13px;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #888; font-size: 13px; padding: 6px 0;">Plan</td>
                  <td style="color: #333; font-size: 13px;">${planName}</td>
                </tr>
                <tr>
                  <td style="color: #888; font-size: 13px; padding: 6px 0;">Amount Paid</td>
                  <td style="font-weight: bold; color: #E67E22; font-size: 16px;">₹${Number(totalAmount).toLocaleString("en-IN")}</td>
                </tr>
              </table>
            </div>
            <p style="color: #555; font-size: 13px;">The invoice PDF is attached to this email. You can also download it from your <a href="https://zecoho.com/owner/subscription" style="color: #E67E22;">subscription page</a>.</p>
            ${whatsappLink ? `<p style="color: #555; font-size: 13px;">Share via <a href="${whatsappLink}" style="color: #25D366;">WhatsApp</a></p>` : ""}
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #aaa; font-size: 11px; text-align: center;">
              ZECOHO TECHNOLOGIES PRIVATE LIMITED | GSTIN: 09AACCZ8890L1ZC<br>
              UG-24, Ansal Plaza, Vaishali, Vasundhara, Ghaziabad - 201012
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });
    return true;
  } catch (error) {
    console.error("Invoice email error:", error);
    return false;
  }
}
export async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: "Login" | "Password Reset" = "Login",
): Promise<boolean> {
  try {
    console.log("Attempting to send OTP email to:", email, "for:", purpose);
    const { client, fromEmail } = await getResendClient();
    console.log("Resend client obtained, using from email:", fromEmail);

    const isPasswordReset = purpose === "Password Reset";
    const subject = isPasswordReset
      ? "Reset Your ZECOHO Password"
      : "Your ZECOHO Login Code";
    const heading = isPasswordReset ? "Password Reset Code" : "Your Login Code";
    const description = isPasswordReset
      ? "Enter this code to reset your ZECOHO password. This code expires in 10 minutes."
      : "Enter this code to sign in to your ZECOHO account. This code expires in 10 minutes.";

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">${heading}</h2>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                ${description}
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1f2937;">${otp}</span>
              </div>
              
              <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
                If you didn't request this code, you can safely ignore this email. Someone may have typed your email by mistake.
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Connect directly with property owners
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error(
        "Resend API error sending OTP email:",
        JSON.stringify(error, null, 2),
      );
      return false;
    }

    console.log("OTP email sent successfully:", data?.id);
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send OTP email - Exception:",
      error?.message || error,
    );
    console.error("Full error details:", JSON.stringify(error, null, 2));
    return false;
  }
}

// KYC Email Notifications

export async function sendKycSubmittedEmail(
  email: string,
  firstName: string,
): Promise<boolean> {
  try {
    console.log("Sending KYC submitted notification to:", email);
    const { client, fromEmail } = await getResendClient();

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: "KYC Application Received - ZECOHO",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Application Received!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || "Property Owner"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                We've received your KYC application and property listing request. Our team is now reviewing your documents and information.
              </p>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">What happens next?</p>
                <ul style="color: #047857; margin: 12px 0 0 0; padding-left: 20px; line-height: 1.6;">
                  <li>Our team will review your documents (1-3 business days)</li>
                  <li>You'll receive an email once your application is approved</li>
                  <li>Your property will go live after approval</li>
                </ul>
              </div>
              
              <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
                You can check your application status anytime by logging into your owner dashboard.
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Connect directly with property owners
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send KYC submitted email:", error);
      return false;
    }

    console.log("KYC submitted email sent successfully:", data?.id);
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send KYC submitted email:",
      error?.message || error,
    );
    return false;
  }
}

export async function sendKycApprovedEmail(
  email: string,
  firstName: string,
  propertyName?: string,
): Promise<boolean> {
  try {
    console.log("Sending KYC approved notification to:", email);
    const { client, fromEmail } = await getResendClient();

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: "Congratulations! Your KYC is Approved - ZECOHO",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">You're Approved!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || "Property Owner"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Great news! Your KYC verification has been approved${propertyName ? ` and your property "${propertyName}" is now live on ZECOHO` : " and you can now list your properties on ZECOHO"}.
              </p>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">You can now:</p>
                <ul style="color: #047857; margin: 12px 0 0 0; padding-left: 20px; line-height: 1.6;">
                  <li>Receive direct bookings with ZERO commission</li>
                  <li>Manage your property through the owner dashboard</li>
                  <li>Communicate directly with guests</li>
                  <li>Track earnings and reviews</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/dashboard" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  Go to Owner Dashboard
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Connect directly with property owners
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send KYC approved email:", error);
      return false;
    }

    console.log("KYC approved email sent successfully:", data?.id);
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send KYC approved email:",
      error?.message || error,
    );
    return false;
  }
}

export async function sendKycRejectedEmail(
  email: string,
  firstName: string,
  rejectionReasons?: string[],
): Promise<boolean> {
  try {
    console.log("Sending KYC rejected notification to:", email);
    const { client, fromEmail } = await getResendClient();

    const reasonsList =
      rejectionReasons && rejectionReasons.length > 0
        ? `<ul style="color: #dc2626; margin: 12px 0 0 0; padding-left: 20px; line-height: 1.6;">${rejectionReasons.map((r) => `<li>${r}</li>`).join("")}</ul>`
        : '<p style="color: #dc2626; margin: 12px 0 0 0;">Please check your dashboard for details.</p>';

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: "Action Required: KYC Application Update - ZECOHO",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Action Required</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || "Property Owner"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                We've reviewed your KYC application and unfortunately, we need some additional information or corrections before we can approve it.
              </p>
              
              <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #dc2626;">
                <p style="color: #991b1b; margin: 0; font-weight: 500;">Issues found:</p>
                ${reasonsList}
              </div>
              
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Don't worry - you can easily fix these issues and resubmit your application.
              </p>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/kyc" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  Update Your Application
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Need help? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send KYC rejected email:", error);
      return false;
    }

    console.log("KYC rejected email sent successfully:", data?.id);
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send KYC rejected email:",
      error?.message || error,
    );
    return false;
  }
}

// Account Change Notifications

export async function sendPasswordChangedEmail(
  email: string,
  firstName: string,
): Promise<boolean> {
  try {
    console.log("Sending password changed notification to:", email);
    const { client, fromEmail } = await getResendClient();

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: "Password Changed - ZECOHO Account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Password Changed</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Your ZECOHO account password was successfully changed. If you made this change, no further action is needed.
              </p>
              
              <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #dc2626;">
                <p style="color: #991b1b; margin: 0; font-weight: 500;">Didn't make this change?</p>
                <p style="color: #dc2626; margin: 8px 0 0 0; font-size: 14px;">
                  If you didn't change your password, your account may be compromised. Please reset your password immediately and contact our support team.
                </p>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Need help? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send password changed email:", error);
      return false;
    }

    console.log("Password changed email sent successfully:", data?.id);
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send password changed email:",
      error?.message || error,
    );
    return false;
  }
}

export async function sendPropertyStatusEmail(
  email: string,
  firstName: string,
  propertyName: string,
  status: "paused" | "resumed" | "deactivated" | "deleted" | "reactivated",
): Promise<boolean> {
  try {
    console.log(`Sending property ${status} notification to:`, email);
    const { client, fromEmail } = await getResendClient();

    const statusConfig = {
      paused: {
        subject: `Property Paused - ${propertyName}`,
        heading: "Property Temporarily Paused",
        message: `Your property "${propertyName}" has been paused and is no longer visible to travelers. You can resume it anytime from your owner dashboard.`,
        color: "#f59e0b",
        bgColor: "#fffbeb",
        icon: "&#9208;",
      },
      resumed: {
        subject: `Property Resumed - ${propertyName}`,
        heading: "Property is Back Online!",
        message: `Great news! Your property "${propertyName}" is now live again and visible to travelers searching for accommodations.`,
        color: "#10b981",
        bgColor: "#ecfdf5",
        icon: "&#10003;",
      },
      deactivated: {
        subject: `Property Deactivated - ${propertyName}`,
        heading: "Property Deactivated",
        message: `Your property "${propertyName}" has been deactivated. All existing bookings will be honored, but no new bookings can be made. Contact support if you wish to reactivate.`,
        color: "#dc2626",
        bgColor: "#fef2f2",
        icon: "&#10060;",
      },
      deleted: {
        subject: `Property Deleted - ${propertyName}`,
        heading: "Property Permanently Deleted",
        message: `Your property "${propertyName}" has been permanently deleted from ZECOHO per your request. All property data has been removed. If this was done in error, please contact support immediately.`,
        color: "#dc2626",
        bgColor: "#fef2f2",
        icon: "&#128465;",
      },
      reactivated: {
        subject: `Property Reactivated - ${propertyName}`,
        heading: "Property Reactivated Successfully!",
        message: `Great news! Your property "${propertyName}" has been reactivated and is now live on ZECOHO. Travelers can find and book your property again.`,
        color: "#10b981",
        bgColor: "#ecfdf5",
        icon: "&#10003;",
      },
    };

    const config = statusConfig[status];

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: config.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: ${config.bgColor}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: ${config.color};">${config.icon}</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">${config.heading}</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || "Property Owner"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                ${config.message}
              </p>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/dashboard" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  View Owner Dashboard
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Enjoy ZERO commission on all bookings!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error(`Failed to send property ${status} email:`, error);
      return false;
    }

    console.log(`Property ${status} email sent successfully:`, data?.id);
    return true;
  } catch (error: any) {
    console.error(
      `Failed to send property ${status} email:`,
      error?.message || error,
    );
    return false;
  }
}

export async function sendPropertyRejectedEmail(
  email: string,
  firstName: string,
  propertyName: string,
  rejectionNotes: string,
): Promise<boolean> {
  try {
    console.log(`Sending property rejection email to:`, email);
    const { client, fromEmail } = await getResendClient();

    const reasonBlock = rejectionNotes
      ? `
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 0 0 24px 0; border-radius: 4px;">
          <p style="color: #991b1b; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">Reason</p>
          <p style="color: #7f1d1d; font-size: 14px; line-height: 1.5; margin: 0;">${rejectionNotes}</p>
        </div>
      `
      : "";

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: "Your property listing needs attention | ZECOHO",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}

            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #fef2f2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: #dc2626;">&#9888;</span>
                </div>
              </div>

              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Your property listing needs attention</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || "Property Owner"},
              </p>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Your property <strong>${propertyName}</strong> was not approved.
              </p>

              ${reasonBlock}

              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Please review the feedback above and resubmit from your dashboard.
              </p>

              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/properties" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  Manage Property
                </a>
              </div>
            </div>

            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Enjoy ZERO commission on all bookings!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send property rejection email:", error);
      return false;
    }

    console.log("Property rejection email sent successfully:", data?.id);
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send property rejection email:",
      error?.message || error,
    );
    return false;
  }
}

export async function sendAdminDeactivationRequestEmail(
  adminEmails: string[],
  ownerName: string,
  propertyName: string,
  requestType: "deactivate" | "delete",
  reason: string,
): Promise<boolean> {
  try {
    if (adminEmails.length === 0) {
      console.log(
        "No admin emails provided for deactivation request notification",
      );
      return false;
    }

    console.log(
      `Sending deactivation request notification to admins:`,
      adminEmails,
    );
    const { client, fromEmail } = await getResendClient();

    const isDelete = requestType === "delete";
    const actionType = isDelete ? "Deletion" : "Deactivation";

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: adminEmails,
      subject: `Action Required: Property ${actionType} Request - ${propertyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO Admin</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Property ${actionType} Request</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: ${isDelete ? "#fef2f2" : "#fffbeb"}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: ${isDelete ? "#dc2626" : "#f59e0b"};">${isDelete ? "&#128465;" : "&#9888;"}</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">New ${actionType} Request</h2>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                  <strong>Property:</strong> ${propertyName}
                </p>
                <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                  <strong>Owner:</strong> ${ownerName}
                </p>
                <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                  <strong>Request Type:</strong> <span style="color: ${isDelete ? "#dc2626" : "#f59e0b"}; font-weight: 600;">${actionType}</span>
                </p>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  <strong>Reason:</strong> ${reason}
                </p>
              </div>
              
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5; text-align: center;">
                Please review this request in the admin portal and take appropriate action.
              </p>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/admin/properties" style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  Review Request
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO Admin Portal<br>
                This is an automated notification for property management
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send admin deactivation request email:", error);
      return false;
    }

    console.log(
      "Admin deactivation request email sent successfully:",
      data?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send admin deactivation request email:",
      error?.message || error,
    );
    return false;
  }
}

export async function sendBookingConfirmationEmail(
  email: string,
  firstName: string,
  propertyName: string,
  checkIn: string,
  checkOut: string,
  totalPrice: string,
  isOwner: boolean = false,
): Promise<boolean> {
  try {
    console.log("Sending booking confirmation to:", email);
    const { client, fromEmail } = await getResendClient();

    const subject = isOwner
      ? `New Booking Received - ${propertyName}`
      : `Booking Confirmed - ${propertyName}`;
    const heading = isOwner ? "New Booking!" : "Booking Confirmed!";
    const message = isOwner
      ? `You have received a new booking for "${propertyName}". Please review the details below.`
      : `Your booking at "${propertyName}" has been confirmed. Get ready for your stay!`;

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">${heading}</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                ${message}
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${checkIn}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${checkOut}</p>
                <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 18px;">Total: Rs. ${totalPrice}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/${isOwner ? "owner/bookings" : "my-bookings"}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  ${isOwner ? "View Booking Requests" : "View Booking"}
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Questions? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send booking confirmation email:", error);
      return false;
    }

    console.log("Booking confirmation email sent successfully:", data?.id);
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send booking confirmation email:",
      error?.message || error,
    );
    return false;
  }
}

export async function sendPropertyLiveEmail(
  email: string,
  firstName: string,
  propertyName: string,
): Promise<boolean> {
  try {
    console.log("Sending property live notification to:", email);
    const { client, fromEmail } = await getResendClient();

    const { data, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [email],
      subject: `Your Property is Now Live! - ${propertyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#127968;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Your Property is Live!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || "Property Owner"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Great news! <strong>"${propertyName}"</strong> is now live on ZECOHO and visible to travelers searching for accommodations.
              </p>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">What's next?</p>
                <ul style="color: #047857; margin: 12px 0 0 0; padding-left: 20px; line-height: 1.6;">
                  <li>Check your owner dashboard regularly for booking inquiries</li>
                  <li>Respond to messages quickly for better visibility</li>
                  <li>Keep your calendar and pricing up to date</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/dashboard" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  View Your Dashboard
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Enjoy ZERO commission on all bookings!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send property live email:", error);
      return false;
    }

    console.log("Property live email sent successfully:", data?.id);
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send property live email:",
      error?.message || error,
    );
    return false;
  }
}

export async function sendBookingRequestToOwnerEmail(
  ownerEmail: string,
  ownerFirstName: string,
  data: {
    propertyName: string;
    guestName: string;
    guestEmail: string;
    bookingCode: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
    totalPrice: string;
    bookingCreatedAt?: string;
    // Property details
    roomTypeName?: string;
    maxOccupancy?: number;
    roomBasePrice?: string;
    roomOriginalPrice?: string;
    mealOptionName?: string;
    mealOptionPrice?: string;
    paymentType?: string;
  },
): Promise<boolean> {
  try {
    console.log("Sending booking request notification to owner:", ownerEmail);
    const { client, fromEmail } = await getResendClient();

    // Build property details section
    let propertyDetailsHtml = "";

    // Room type with pricing and max occupancy
    if (data.roomTypeName) {
      let roomLine = `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Room Type:</strong> ${data.roomTypeName}`;
      if (data.maxOccupancy) {
        roomLine += ` (Max ${data.maxOccupancy} guests)`;
      }
      if (data.roomBasePrice) {
        const basePrice = Number(data.roomBasePrice).toLocaleString("en-IN");
        const hasDiscount =
          data.roomOriginalPrice &&
          parseFloat(data.roomOriginalPrice) > parseFloat(data.roomBasePrice);
        if (hasDiscount) {
          const originalPrice = Number(data.roomOriginalPrice).toLocaleString(
            "en-IN",
          );
          const discountPercent = Math.round(
            (1 -
              parseFloat(data.roomBasePrice) /
                parseFloat(data.roomOriginalPrice!)) *
              100,
          );
          roomLine += ` — <span style="text-decoration: line-through; color: #9ca3af;">₹${originalPrice}</span> <strong style="color: #10b981;">₹${basePrice}/night</strong> <span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${discountPercent}% OFF</span>`;
        } else {
          roomLine += ` — ₹${basePrice}/night`;
        }
      }
      roomLine += "</p>";
      propertyDetailsHtml += roomLine;
    }

    // Meal option
    if (data.mealOptionName) {
      if (data.mealOptionPrice && parseFloat(data.mealOptionPrice) > 0) {
        const mealPrice = Number(data.mealOptionPrice).toLocaleString("en-IN");
        propertyDetailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Meal Plan:</strong> ${data.mealOptionName} — ₹${mealPrice}/person/night</p>`;
      } else {
        propertyDetailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Meal Plan:</strong> ${data.mealOptionName}</p>`;
      }
    }

    // Rooms booked
    if (data.rooms) {
      propertyDetailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Rooms Booked:</strong> ${data.rooms}</p>`;
    }

    // Payment type
    if (data.paymentType) {
      const paymentLabel =
        data.paymentType === "pay_at_hotel"
          ? "Pay at Hotel"
          : data.paymentType === "advance"
            ? "Advance Payment"
            : data.paymentType === "token"
              ? "Token Payment"
              : data.paymentType;
      propertyDetailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Payment Mode:</strong> ${paymentLabel}</p>`;
    }

    const { data: responseData, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [ownerEmail],
      subject: `New Booking Request - ${data.propertyName} (${data.bookingCode})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Property Owner Portal</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#128197;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">New Booking Request!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${ownerFirstName || "Property Owner"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                You have received a new booking request for <strong>"${data.propertyName}"</strong>. Please review the details below.
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 4px 0; font-weight: 600;">Booking Reference</p>
                <p style="color: #10b981; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${data.bookingCode}</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Guest Information:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Name:</strong> ${data.guestName}</p>
                <p style="color: #6b7280; margin: 0;"><strong>Email:</strong> ${data.guestEmail}</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${data.checkIn}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests}</p>
                ${data.bookingCreatedAt ? `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Booked On:</strong> ${data.bookingCreatedAt}</p>` : ""}
                <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 18px;">Total: Rs. ${data.totalPrice}</p>
              </div>
              
              ${
                propertyDetailsHtml
                  ? `
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #065f46; margin: 0 0 12px 0; font-weight: 600;">Room & Booking Details:</p>
                ${propertyDetailsHtml}
              </div>
              `
                  : ""
              }
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">Action Required</p>
                <p style="color: #a16207; margin: 8px 0 0 0; font-size: 14px;">
                  Please review and respond to this booking request promptly. The guest is waiting for your confirmation.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/bookings?bookingRef=${data.bookingCode}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  View Booking Requests
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Enjoy ZERO commission on all bookings!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send booking request email to owner:", error);
      return false;
    }

    console.log(
      "Booking request email sent to owner successfully:",
      responseData?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      "Failed to send booking request email to owner:",
      error?.message || error,
    );
    return false;
  }
}

// ========================
// STATE-DRIVEN BOOKING EMAILS
// ========================

interface BookingEmailData {
  bookingCode: string;
  propertyName: string;
  propertyId?: string;
  checkIn: string;
  checkOut?: string;
  checkInTime?: string;
  checkOutTime?: string;
  ownerName?: string;
  guests: number;
  rooms: number;
  totalPrice: string;
  guestName?: string;
  guestEmail?: string;
  bookingCreatedAt?: string;
  // Booking status
  bookingStatus?: string; // 'pending', 'owner_accepted', 'confirmed', 'cancelled', 'rejected', 'no_show', 'completed'
  // Extended property details
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyPincode?: string;
  propertyContactNumber?: string;
  latitude?: string;
  longitude?: string;
  // Room details
  roomTypeName?: string;
  roomTypeDescription?: string;
  maxOccupancy?: number;
  // Pricing details for strikethrough display
  roomBasePrice?: string; // Selling/discounted price per night
  roomOriginalPrice?: string; // Strike-off price per night (optional)
  // Payment type
  paymentType?: string; // 'pay_at_hotel' | 'advance' | 'token'
  // Meal option details (per-person pricing)
  mealOptionName?: string;
  mealOptionPrice?: string; // Price per person per night
}

// Helper function to generate property details section for emails
function generatePropertyDetailsSection(
  data: BookingEmailData,
  options?: { showStatus?: boolean },
): string {
  let detailsHtml = "";

  // Room type with pricing and max occupancy
  if (data.roomTypeName) {
    let roomLine = `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Room Type:</strong> ${data.roomTypeName}`;

    // Add max occupancy if available
    if (data.maxOccupancy) {
      roomLine += ` (Max ${data.maxOccupancy} guests)`;
    }

    // Add pricing info if available
    if (data.roomBasePrice) {
      const basePrice = Number(data.roomBasePrice).toLocaleString("en-IN");
      const hasDiscount =
        data.roomOriginalPrice &&
        parseFloat(data.roomOriginalPrice) > parseFloat(data.roomBasePrice);

      if (hasDiscount) {
        const originalPrice = Number(data.roomOriginalPrice).toLocaleString(
          "en-IN",
        );
        const discountPercent = Math.round(
          (1 -
            parseFloat(data.roomBasePrice) /
              parseFloat(data.roomOriginalPrice!)) *
            100,
        );
        roomLine += ` — <span style="text-decoration: line-through; color: #9ca3af;">₹${originalPrice}</span> <strong style="color: #10b981;">₹${basePrice}/night</strong> <span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${discountPercent}% OFF</span>`;
      } else {
        roomLine += ` — ₹${basePrice}/night`;
      }
    }
    roomLine += "</p>";
    detailsHtml += roomLine;
  }

  // Meal option with per-person pricing
  if (data.mealOptionName) {
    if (data.mealOptionPrice && parseFloat(data.mealOptionPrice) > 0) {
      const mealPrice = Number(data.mealOptionPrice).toLocaleString("en-IN");
      detailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Meal Plan:</strong> ${data.mealOptionName} — ₹${mealPrice}/person/night</p>`;
    } else {
      detailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Meal Plan:</strong> ${data.mealOptionName}</p>`;
    }
  }

  // Number of rooms
  if (data.rooms) {
    detailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Rooms Booked:</strong> ${data.rooms}</p>`;
  }

  // Full address with city, state, pincode
  const addressParts = [];
  if (data.propertyAddress) addressParts.push(data.propertyAddress);
  if (data.propertyCity) addressParts.push(data.propertyCity);
  if (data.propertyState) addressParts.push(data.propertyState);
  if (data.propertyPincode) addressParts.push(data.propertyPincode);

  if (addressParts.length > 0) {
    detailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Address:</strong> ${addressParts.join(", ")}</p>`;
  }

  // Property contact number
  if (data.propertyContactNumber) {
    detailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Contact:</strong> <a href="tel:${data.propertyContactNumber}" style="color: #10b981; text-decoration: none;">${data.propertyContactNumber}</a></p>`;
  }

  // Map link if coordinates available
  if (data.latitude && data.longitude) {
    const mapUrl = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;
    detailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Directions:</strong> <a href="${mapUrl}" style="color: #10b981; text-decoration: underline;">View on Google Maps</a></p>`;
  }

  // Payment type
  if (data.paymentType) {
    const paymentLabel =
      data.paymentType === "pay_at_hotel"
        ? "Pay at Hotel"
        : data.paymentType === "advance"
          ? "Advance Payment"
          : data.paymentType === "token"
            ? "Token Payment"
            : data.paymentType;
    detailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Payment Mode:</strong> ${paymentLabel}</p>`;
  }

  // Booking status if requested
  if (options?.showStatus && data.bookingStatus) {
    const statusLabels: Record<string, { label: string; color: string }> = {
      pending: { label: "Pending", color: "#f59e0b" },
      owner_accepted: { label: "Awaiting Confirmation", color: "#3b82f6" },
      confirmed: { label: "Confirmed", color: "#10b981" },
      cancelled: { label: "Cancelled", color: "#dc2626" },
      rejected: { label: "Rejected", color: "#dc2626" },
      no_show: { label: "No Show", color: "#6b7280" },
      completed: { label: "Completed", color: "#10b981" },
    };
    const status = statusLabels[data.bookingStatus] || {
      label: data.bookingStatus,
      color: "#6b7280",
    };
    detailsHtml += `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Status:</strong> <span style="color: ${status.color}; font-weight: 600;">${status.label}</span></p>`;
  }

  return detailsHtml;
}

// CREATED STATE: Email to Guest - "Reservation Requested"
export async function sendBookingCreatedGuestEmail(
  guestEmail: string,
  guestFirstName: string,
  data: BookingEmailData,
): Promise<boolean> {
  try {
    console.log(
      "[BOOKING:CREATED] Sending reservation requested email to guest:",
      guestEmail,
    );
    const { client, fromEmail } = await getResendClient();

    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [guestEmail],
      subject: `Reservation Requested - ${data.propertyName} (${data.bookingCode})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#9203;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Reservation Requested!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Your reservation request for <strong>"${data.propertyName}"</strong> has been submitted successfully. The property owner will review your request shortly.
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 4px 0; font-weight: 600;">Booking Reference</p>
                <p style="color: #10b981; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${data.bookingCode}</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${data.checkIn}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests}</p>
                ${data.bookingCreatedAt ? `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Booked On:</strong> ${data.bookingCreatedAt}</p>` : ""}
                ${generatePropertyDetailsSection(data, { showStatus: false })}
                <p style="color: #1f2937; margin: 16px 0 0 0; font-weight: 600; font-size: 18px; padding-top: 12px; border-top: 1px solid #e5e7eb;">Total: Rs. ${data.totalPrice}</p>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">What's Next?</p>
                <p style="color: #a16207; margin: 8px 0 0 0; font-size: 14px;">
                  The property owner typically responds within 15–30 minutes.
                </p>
                <p style="color: #a16207; margin: 4px 0 0 0; font-size: 13px;">
                  You'll be notified instantly once the owner responds.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/my-bookings?bookingRef=${data.bookingCode}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  Track Your Booking
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Questions? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("[BOOKING:CREATED] Failed to send guest email:", error);
      return false;
    }

    console.log(
      "[BOOKING:CREATED] Guest email sent successfully:",
      emailData?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      "[BOOKING:CREATED] Exception sending guest email:",
      error?.message || error,
    );
    return false;
  }
}

// OWNER_ACCEPTED STATE: Email to Guest - "Hotel Accepted, Please Confirm"
export async function sendBookingOwnerAcceptedEmail(
  guestEmail: string,
  guestFirstName: string,
  data: BookingEmailData,
  ownerMessage?: string,
): Promise<boolean> {
  try {
    console.log(
      "[BOOKING:OWNER_ACCEPTED] Sending acceptance email to guest:",
      guestEmail,
    );
    const { client, fromEmail } = await getResendClient();

    const messageSection = ownerMessage
      ? `<div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #10b981;">
           <p style="color: #065f46; margin: 0; font-weight: 500;">Message from Property:</p>
           <p style="color: #047857; margin: 8px 0 0 0; font-size: 14px; font-style: italic;">"${ownerMessage}"</p>
         </div>`
      : "";

    const checkInLine = data.checkInTime
      ? `${data.checkIn} at ${data.checkInTime}`
      : data.checkIn;
    const checkOutLine = data.checkOut
      ? data.checkOutTime
        ? `${data.checkOut} at ${data.checkOutTime}`
        : data.checkOut
      : "";
    const acceptedByLine = data.ownerName
      ? `Great news! ${data.ownerName} has accepted your booking request.`
      : "Great news! The property owner has accepted your booking request.";

    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [guestEmail],
      subject: "Booking Confirmed! | ZECOHO",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}

            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: #10b981;">&#10003;</span>
                </div>
              </div>

              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Your booking is confirmed!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                ${acceptedByLine}
              </p>

              ${messageSection}

              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${checkInLine}</p>
                ${checkOutLine ? `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${checkOutLine}</p>` : ""}
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests}</p>
                <p style="color: #6b7280; margin: 0 0 0 0;"><strong>Booking reference:</strong> #${data.bookingCode}</p>
              </div>

              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-size: 14px; line-height: 1.5;">
                  Pay directly at the hotel at check-in. No advance payment required.
                </p>
              </div>

              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/my-bookings" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View your booking
                </a>
              </div>
            </div>

            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Questions? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error(
        "[BOOKING:OWNER_ACCEPTED] Failed to send guest email:",
        error,
      );
      return false;
    }

    console.log(
      "[BOOKING:OWNER_ACCEPTED] Guest email sent successfully:",
      emailData?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      "[BOOKING:OWNER_ACCEPTED] Exception sending guest email:",
      error?.message || error,
    );
    return false;
  }
}

// CUSTOMER_CONFIRMED STATE: Email to Guest - "Booking Confirmed"
export async function sendBookingConfirmedGuestEmail(
  guestEmail: string,
  guestFirstName: string,
  data: BookingEmailData,
): Promise<boolean> {
  try {
    console.log(
      "[BOOKING:CUSTOMER_CONFIRMED] Sending confirmation email to guest:",
      guestEmail,
    );
    const { client, fromEmail } = await getResendClient();

    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [guestEmail],
      subject: `Booking Confirmed! - ${data.propertyName} (${data.bookingCode})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Booking Confirmed!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Your booking at <strong>"${data.propertyName}"</strong> is now confirmed. We're excited for your upcoming stay!
              </p>
              
              <div style="background: #dcfce7; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
                <p style="color: #065f46; margin: 0 0 4px 0; font-weight: 600;">Your Confirmation Code</p>
                <p style="color: #047857; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">${data.bookingCode}</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${data.checkIn}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests}</p>
                ${data.bookingCreatedAt ? `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Booked On:</strong> ${data.bookingCreatedAt}</p>` : ""}
                ${generatePropertyDetailsSection(data, { showStatus: false })}
                <p style="color: #1f2937; margin: 16px 0 0 0; font-weight: 600; font-size: 18px; padding-top: 12px; border-top: 1px solid #e5e7eb;">Total: Rs. ${data.totalPrice}</p>
              </div>
              
              <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">What's Next?</p>
                <ul style="color: #047857; margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                  <li>Save your confirmation code</li>
                  <li>Contact the property if you have special requests</li>
                  <li>Arrive on your check-in date ready to enjoy!</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/my-bookings?bookingRef=${data.bookingCode}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  View Your Booking
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Questions? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error(
        "[BOOKING:CUSTOMER_CONFIRMED] Failed to send guest email:",
        error,
      );
      return false;
    }

    console.log(
      "[BOOKING:CUSTOMER_CONFIRMED] Guest email sent successfully:",
      emailData?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      "[BOOKING:CUSTOMER_CONFIRMED] Exception sending guest email:",
      error?.message || error,
    );
    return false;
  }
}

// CUSTOMER_CONFIRMED STATE: Email to Owner - "Booking Confirmed by Guest"
export async function sendBookingConfirmedOwnerEmail(
  ownerEmail: string,
  ownerFirstName: string,
  data: BookingEmailData,
): Promise<boolean> {
  try {
    console.log(
      "[BOOKING:CUSTOMER_CONFIRMED] Sending confirmation email to owner:",
      ownerEmail,
    );
    const { client, fromEmail } = await getResendClient();

    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [ownerEmail],
      subject: `Guest Confirmed! - ${data.propertyName} (${data.bookingCode})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Booking Confirmed by Guest!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${ownerFirstName || "Property Owner"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Great news! The guest has confirmed their booking at <strong>"${data.propertyName}"</strong>. The reservation is now complete.
              </p>
              
              <div style="background: #dcfce7; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">
                <p style="color: #065f46; margin: 0 0 4px 0; font-weight: 600;">Booking Reference</p>
                <p style="color: #047857; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">${data.bookingCode}</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Guest Information:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Name:</strong> ${data.guestName || "Guest"}</p>
                <p style="color: #6b7280; margin: 0;"><strong>Email:</strong> ${data.guestEmail || "N/A"}</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${data.checkIn}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests}</p>
                ${data.bookingCreatedAt ? `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Booked On:</strong> ${data.bookingCreatedAt}</p>` : ""}
                <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 18px;">Total: Rs. ${data.totalPrice}</p>
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #065f46; margin: 0 0 12px 0; font-weight: 600;">Room & Booking Details:</p>
                ${generatePropertyDetailsSection(data, { showStatus: true })}
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/bookings" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  View All Bookings
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Enjoy ZERO commission on all bookings!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error(
        "[BOOKING:CUSTOMER_CONFIRMED] Failed to send owner email:",
        error,
      );
      return false;
    }

    console.log(
      "[BOOKING:CUSTOMER_CONFIRMED] Owner email sent successfully:",
      emailData?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      "[BOOKING:CUSTOMER_CONFIRMED] Exception sending owner email:",
      error?.message || error,
    );
    return false;
  }
}

// DECLINED/EXPIRED STATE: Email to Guest - "Booking Not Confirmed"
export async function sendBookingDeclinedEmail(
  guestEmail: string,
  guestFirstName: string,
  data: BookingEmailData,
  reason: "rejected" | "expired" | "cancelled",
  ownerMessage?: string,
): Promise<boolean> {
  try {
    console.log(
      `[BOOKING:${reason.toUpperCase()}] Sending declined email to guest:`,
      guestEmail,
    );
    const { client, fromEmail } = await getResendClient();

    const reasonConfig = {
      rejected: {
        subject: `Booking Request Declined - ${data.propertyName}`,
        heading: "Booking Request Declined",
        message:
          "Unfortunately, the property owner was unable to accept your booking request.",
        icon: "&#10060;",
        bgColor: "#fef2f2",
        iconColor: "#dc2626",
      },
      expired: {
        subject: `Booking Request Expired - ${data.propertyName}`,
        heading: "Booking Request Expired",
        message:
          "Your booking request expired because the property did not respond in time.",
        icon: "&#9203;",
        bgColor: "#fef3c7",
        iconColor: "#f59e0b",
      },
      cancelled: {
        subject: `Booking Cancelled - ${data.propertyName}`,
        heading: "Booking Cancelled",
        message: "Your booking has been cancelled as requested.",
        icon: "&#10060;",
        bgColor: "#f3f4f6",
        iconColor: "#6b7280",
      },
    };

    const config = reasonConfig[reason];

    const messageSection = ownerMessage
      ? `<div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #dc2626;">
           <p style="color: #991b1b; margin: 0; font-weight: 500;">Message from Property:</p>
           <p style="color: #dc2626; margin: 8px 0 0 0; font-size: 14px; font-style: italic;">"${ownerMessage}"</p>
         </div>`
      : "";

    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [guestEmail],
      subject: config.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: ${config.bgColor}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: ${config.iconColor};">${config.icon}</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">${config.heading}</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                ${config.message}
              </p>
              
              ${messageSection}
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Original Request:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Dates:</strong> ${data.checkIn} - ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Reference:</strong> ${data.bookingCode}</p>
                <p style="color: #1f2937; margin: 0; font-weight: 600;">Amount: Rs. ${data.totalPrice}</p>
              </div>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #374151; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                ${generatePropertyDetailsSection(data, { showStatus: true })}
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">Don't worry!</p>
                <p style="color: #047857; margin: 8px 0 0 0; font-size: 14px;">
                  There are plenty of other great properties on ZECOHO. Browse our listings to find your perfect stay.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/my-bookings?bookingRef=${data.bookingCode}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  View My Bookings
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Questions? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error(
        `[BOOKING:${reason.toUpperCase()}] Failed to send guest email:`,
        error,
      );
      return false;
    }

    console.log(
      `[BOOKING:${reason.toUpperCase()}] Guest email sent successfully:`,
      emailData?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      `[BOOKING:${reason.toUpperCase()}] Exception sending guest email:`,
      error?.message || error,
    );
    return false;
  }
}

// NO-SHOW STATE: Email to Guest/Owner - "Booking Marked as No-Show"
export async function sendBookingNoShowEmail(
  recipientEmail: string,
  recipientFirstName: string,
  data: BookingEmailData & { guestName?: string },
  recipientType: "guest" | "owner",
): Promise<boolean> {
  try {
    console.log(
      `[BOOKING:NO_SHOW] Sending no-show email to ${recipientType}:`,
      recipientEmail,
    );
    const { client, fromEmail } = await getResendClient();

    const isGuest = recipientType === "guest";
    const subject = isGuest
      ? `Booking Marked as No-Show - ${data.propertyName}`
      : `Guest No-Show Recorded - ${data.propertyName}`;

    const heading = isGuest
      ? "Booking Closed - No Show"
      : "Guest No-Show Recorded";
    const mainMessage = isGuest
      ? "Your booking has been marked as a no-show because you did not check in on the scheduled date."
      : `The guest (${data.guestName || "Guest"}) did not check in for their booking. The booking has been marked as a no-show.`;

    // Set booking status for the helper function
    const emailData = { ...data, bookingStatus: "no_show" };

    const { error, data: responseData } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [recipientEmail],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #fef2f2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: #dc2626;">&#128683;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">${heading}</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${recipientFirstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                ${mainMessage}
              </p>
              
              <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #dc2626;">
                <p style="color: #991b1b; margin: 0; font-weight: 500;">Status: No-Show</p>
                <p style="color: #dc2626; margin: 8px 0 0 0; font-size: 14px;">
                  Guest did not check in on the scheduled date. This booking is now closed.
                </p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Reference:</strong> ${data.bookingCode}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in Date:</strong> ${data.checkIn}</p>
                ${data.checkOut ? `<p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out Date:</strong> ${data.checkOut}</p>` : ""}
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Total Amount:</strong> Rs. ${data.totalPrice}</p>
                ${data.bookingCreatedAt ? `<p style="color: #6b7280; margin: 0;"><strong>Booked On:</strong> ${data.bookingCreatedAt}</p>` : ""}
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #065f46; margin: 0 0 12px 0; font-weight: 600;">Property & Room Details:</p>
                ${generatePropertyDetailsSection(emailData, { showStatus: true })}
              </div>
              
              ${
                isGuest
                  ? `
              <div style="background: #fffbeb; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">About Refunds</p>
                <p style="color: #b45309; margin: 8px 0 0 0; font-size: 14px;">
                  Refund policies vary by property. Please contact the property directly to discuss any refund options.
                </p>
              </div>
              `
                  : `
              <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #166534; margin: 0; font-weight: 500;">Next Steps</p>
                <p style="color: #15803d; margin: 8px 0 0 0; font-size: 14px;">
                  The room inventory remains as consumed. If the guest contacts you regarding refunds, please handle according to your cancellation policy.
                </p>
              </div>
              `
              }
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/${isGuest ? "my-bookings" : "owner/bookings"}?bookingRef=${data.bookingCode}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  View Booking Details
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Questions? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error(
        `[BOOKING:NO_SHOW] Failed to send ${recipientType} email:`,
        error,
      );
      return false;
    }

    console.log(
      `[BOOKING:NO_SHOW] ${recipientType} email sent successfully:`,
      responseData?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      `[BOOKING:NO_SHOW] Exception sending ${recipientType} email:`,
      error?.message || error,
    );
    return false;
  }
}

// CANCELLED BY GUEST: Email to Owner - "Guest Cancelled Booking"
export async function sendBookingCancelledOwnerEmail(
  ownerEmail: string,
  ownerFirstName: string,
  data: BookingEmailData & { guestName: string; cancellationReason: string },
): Promise<boolean> {
  try {
    console.log(
      "[BOOKING:CANCELLED] Sending cancellation email to owner:",
      ownerEmail,
    );
    const { client, fromEmail } = await getResendClient();

    // Set booking status for the helper function
    const emailData = { ...data, bookingStatus: "cancelled" };

    const { error, data: responseData } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [ownerEmail],
      subject: `Booking Cancelled by Guest - ${data.propertyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Property Owner Portal</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #fef2f2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: #dc2626;">&#10060;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Booking Cancelled</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${ownerFirstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                A guest has cancelled their booking at your property. The room inventory has been automatically released.
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Cancelled Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Reference:</strong> ${data.bookingCode}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guest:</strong> ${data.guestName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Dates:</strong> ${data.checkIn} - ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests}</p>
                <p style="color: #6b7280; margin: 0;"><strong>Amount:</strong> ₹${Number(data.totalPrice).toLocaleString("en-IN")}</p>
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #065f46; margin: 0 0 12px 0; font-weight: 600;">Room & Booking Details:</p>
                ${generatePropertyDetailsSection(emailData, { showStatus: true })}
              </div>
              
              <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #dc2626;">
                <p style="color: #991b1b; margin: 0; font-weight: 500;">Cancellation Reason:</p>
                <p style="color: #dc2626; margin: 8px 0 0 0; font-size: 14px; font-style: italic;">"${data.cancellationReason}"</p>
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">Room Inventory Updated</p>
                <p style="color: #047857; margin: 8px 0 0 0; font-size: 14px;">
                  The rooms for these dates are now available for new bookings.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/bookings?bookingRef=${data.bookingCode}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  View Booking Details
                </a>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Questions? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("[BOOKING:CANCELLED] Failed to send owner email:", error);
      return false;
    }

    console.log(
      "[BOOKING:CANCELLED] Owner email sent successfully:",
      responseData?.id,
    );
    return true;
  } catch (error: any) {
    console.error(
      "[BOOKING:CANCELLED] Exception sending owner email:",
      error?.message || error,
    );
    return false;
  }
}

export async function sendReviewRequestEmail(
  guestEmail: string,
  guestFirstName: string,
  data: {
    propertyId: string;
    propertyName: string;
    bookingId: string;
    bookingCode: string;
    checkIn: string;
    checkOut: string;
  },
): Promise<boolean> {
  try {
    console.log(
      "[REVIEW:REQUEST] Sending review request email to:",
      guestEmail,
    );
    const { client, fromEmail } = await getResendClient();

    const reviewUrl = `${getAppBaseUrl()}/property/${data.propertyId}/review?bookingId=${data.bookingId}`;

    const { data: emailData, error } = await client.emails.send({
      from: fromEmail || "ZECOHO <noreply@zecoho.com>",
      to: [guestEmail],
      subject: `How was your stay at ${data.propertyName}? Leave a review`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            ${getEmailHeader()}
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#11088;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Thank You for Staying!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || "there"},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                We hope you had a wonderful stay at <strong>"${data.propertyName}"</strong>. Your feedback helps other travelers and supports our property partners.
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Your Stay Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Reference:</strong> ${data.bookingCode}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0;"><strong>Dates:</strong> ${data.checkIn} - ${data.checkOut}</p>
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">Share Your Experience</p>
                <p style="color: #047857; margin: 8px 0 0 0; font-size: 14px;">
                  Rate your stay and help future guests make informed decisions. Your review matters!
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${reviewUrl}" style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Rate Your Stay
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0 0; text-align: center; line-height: 1.5;">
                Can't click the button? Copy and paste this link:<br>
                <a href="${reviewUrl}" style="color: #10b981; word-break: break-all;">${reviewUrl}</a>
              </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ZECOHO - Zero Commission Hotel Booking<br>
                Questions? Contact support@zecoho.com
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("[REVIEW:REQUEST] Failed to send email:", error);
      return false;
    }

    console.log("[REVIEW:REQUEST] Email sent successfully:", emailData?.id);
    return true;
  } catch (error: any) {
    console.error(
      "[REVIEW:REQUEST] Exception sending email:",
      error?.message || error,
    );
    return false;
  }
}

// ── Waitlist Confirmation Email ──────────────────────────────────────────────
export async function sendWaitlistConfirmationEmail(
  name: string,
  to: string,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const baseUrl = getAppBaseUrl();

    const { data: emailData, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject: "You're on the ZECOHO waitlist! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9fafb;">
          <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            ${getEmailHeader()}
            <div style="padding:32px;">
              <h2 style="color:#111827;margin:0 0 8px 0;font-size:22px;font-weight:700;">You're on the list, ${name}!</h2>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
                Thank you for joining the ZECOHO early access waitlist. We're working hard to bring you a zero-commission hotel booking experience — and you'll be among the first to know when we launch.
              </p>

              <div style="background:#fff7ed;border-radius:8px;padding:20px;margin-bottom:24px;border-left:4px solid #FF7A00;">
                <p style="color:#92400e;margin:0 0 8px 0;font-weight:600;">What to expect from ZECOHO</p>
                <ul style="color:#b45309;margin:0;padding-left:20px;font-size:14px;line-height:1.8;">
                  <li>Zero commission on every booking</li>
                  <li>Direct contact with property owners</li>
                  <li>Verified hotels and homestays across India</li>
                  <li>No hidden fees, ever</li>
                </ul>
              </div>

              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
                We'll send you a personal invite as soon as we're live. In the meantime, keep an eye on your inbox — we may reach out with exclusive early-bird offers.
              </p>

              <div style="text-align:center;margin-bottom:24px;">
                <a href="${baseUrl}" style="display:inline-block;background:#FF7A00;color:white;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
                  Visit ZECOHO
                </a>
              </div>

              <p style="color:#9ca3af;font-size:13px;margin:0;text-align:center;">
                You registered with: <strong>${to}</strong>
              </p>
            </div>
            <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                ZECOHO — Zero Commission Hotel Booking<br>
                Questions? Contact <a href="mailto:support@zecoho.com" style="color:#FF7A00;">support@zecoho.com</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("[WAITLIST] Failed to send confirmation email:", error);
      return false;
    }

    console.log("[WAITLIST] Confirmation email sent successfully:", emailData?.id);
    return true;
  } catch (error: any) {
    console.error("[WAITLIST] Exception sending confirmation email:", error?.message || error);
    return false;
  }
}
