// Referenced from connection:conn_resend_01KBVF5WVPAY4D2KC0ESJT2VAN
import { Resend } from 'resend';

function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || 'https://zecoho.replit.app';
}

async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'ZECOHO <onboarding@resend.dev>';
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable not set');
  }
  
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail
  };
}

export async function sendOtpEmail(email: string, otp: string, purpose: 'Login' | 'Password Reset' = 'Login'): Promise<boolean> {
  try {
    console.log('Attempting to send OTP email to:', email, 'for:', purpose);
    const { client, fromEmail } = await getResendClient();
    console.log('Resend client obtained, using from email:', fromEmail);
    
    const isPasswordReset = purpose === 'Password Reset';
    const subject = isPasswordReset ? 'Reset Your ZECOHO Password' : 'Your ZECOHO Login Code';
    const heading = isPasswordReset ? 'Password Reset Code' : 'Your Login Code';
    const description = isPasswordReset 
      ? 'Enter this code to reset your ZECOHO password. This code expires in 10 minutes.'
      : 'Enter this code to sign in to your ZECOHO account. This code expires in 10 minutes.';
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
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
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
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
      console.error('Resend API error sending OTP email:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('OTP email sent successfully:', data?.id);
    return true;
  } catch (error: any) {
    console.error('Failed to send OTP email - Exception:', error?.message || error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return false;
  }
}

// KYC Email Notifications

export async function sendKycSubmittedEmail(email: string, firstName: string): Promise<boolean> {
  try {
    console.log('Sending KYC submitted notification to:', email);
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
      to: [email],
      subject: 'KYC Application Received - ZECOHO',
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
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Application Received!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || 'Property Owner'},
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
      console.error('Failed to send KYC submitted email:', error);
      return false;
    }

    console.log('KYC submitted email sent successfully:', data?.id);
    return true;
  } catch (error: any) {
    console.error('Failed to send KYC submitted email:', error?.message || error);
    return false;
  }
}

export async function sendKycApprovedEmail(email: string, firstName: string, propertyName?: string): Promise<boolean> {
  try {
    console.log('Sending KYC approved notification to:', email);
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
      to: [email],
      subject: 'Congratulations! Your KYC is Approved - ZECOHO',
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
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">You're Approved!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || 'Property Owner'},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                Great news! Your KYC verification has been approved${propertyName ? ` and your property "${propertyName}" is now live on ZECOHO` : ' and you can now list your properties on ZECOHO'}.
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
      console.error('Failed to send KYC approved email:', error);
      return false;
    }

    console.log('KYC approved email sent successfully:', data?.id);
    return true;
  } catch (error: any) {
    console.error('Failed to send KYC approved email:', error?.message || error);
    return false;
  }
}

export async function sendKycRejectedEmail(email: string, firstName: string, rejectionReasons?: string[]): Promise<boolean> {
  try {
    console.log('Sending KYC rejected notification to:', email);
    const { client, fromEmail } = await getResendClient();
    
    const reasonsList = rejectionReasons && rejectionReasons.length > 0 
      ? `<ul style="color: #dc2626; margin: 12px 0 0 0; padding-left: 20px; line-height: 1.6;">${rejectionReasons.map(r => `<li>${r}</li>`).join('')}</ul>`
      : '<p style="color: #dc2626; margin: 12px 0 0 0;">Please check your dashboard for details.</p>';
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
      to: [email],
      subject: 'Action Required: KYC Application Update - ZECOHO',
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
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Action Required</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || 'Property Owner'},
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
      console.error('Failed to send KYC rejected email:', error);
      return false;
    }

    console.log('KYC rejected email sent successfully:', data?.id);
    return true;
  } catch (error: any) {
    console.error('Failed to send KYC rejected email:', error?.message || error);
    return false;
  }
}

// Account Change Notifications

export async function sendPasswordChangedEmail(email: string, firstName: string): Promise<boolean> {
  try {
    console.log('Sending password changed notification to:', email);
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
      to: [email],
      subject: 'Password Changed - ZECOHO Account',
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
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Password Changed</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || 'there'},
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
      console.error('Failed to send password changed email:', error);
      return false;
    }

    console.log('Password changed email sent successfully:', data?.id);
    return true;
  } catch (error: any) {
    console.error('Failed to send password changed email:', error?.message || error);
    return false;
  }
}

export async function sendPropertyStatusEmail(
  email: string, 
  firstName: string, 
  propertyName: string, 
  status: 'paused' | 'resumed' | 'deactivated'
): Promise<boolean> {
  try {
    console.log(`Sending property ${status} notification to:`, email);
    const { client, fromEmail } = await getResendClient();
    
    const statusConfig = {
      paused: {
        subject: `Property Paused - ${propertyName}`,
        heading: 'Property Temporarily Paused',
        message: `Your property "${propertyName}" has been paused and is no longer visible to travelers. You can resume it anytime from your owner dashboard.`,
        color: '#f59e0b',
        bgColor: '#fffbeb',
        icon: '&#9208;'
      },
      resumed: {
        subject: `Property Resumed - ${propertyName}`,
        heading: 'Property is Back Online!',
        message: `Great news! Your property "${propertyName}" is now live again and visible to travelers searching for accommodations.`,
        color: '#10b981',
        bgColor: '#ecfdf5',
        icon: '&#10003;'
      },
      deactivated: {
        subject: `Property Deactivated - ${propertyName}`,
        heading: 'Property Deactivated',
        message: `Your property "${propertyName}" has been deactivated. All existing bookings will be honored, but no new bookings can be made. Contact support if you wish to reactivate.`,
        color: '#dc2626',
        bgColor: '#fef2f2',
        icon: '&#10060;'
      }
    };
    
    const config = statusConfig[status];
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
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
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: ${config.bgColor}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: ${config.color};">${config.icon}</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">${config.heading}</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || 'Property Owner'},
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
    console.error(`Failed to send property ${status} email:`, error?.message || error);
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
  isOwner: boolean = false
): Promise<boolean> {
  try {
    console.log('Sending booking confirmation to:', email);
    const { client, fromEmail } = await getResendClient();
    
    const subject = isOwner 
      ? `New Booking Received - ${propertyName}` 
      : `Booking Confirmed - ${propertyName}`;
    const heading = isOwner ? 'New Booking!' : 'Booking Confirmed!';
    const message = isOwner
      ? `You have received a new booking for "${propertyName}". Please review the details below.`
      : `Your booking at "${propertyName}" has been confirmed. Get ready for your stay!`;
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
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
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">${heading}</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || 'there'},
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
                <a href="${getAppBaseUrl()}/${isOwner ? 'owner/bookings' : 'my-bookings'}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
                  ${isOwner ? 'View Booking Requests' : 'View Booking'}
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
      console.error('Failed to send booking confirmation email:', error);
      return false;
    }

    console.log('Booking confirmation email sent successfully:', data?.id);
    return true;
  } catch (error: any) {
    console.error('Failed to send booking confirmation email:', error?.message || error);
    return false;
  }
}

export async function sendPropertyLiveEmail(email: string, firstName: string, propertyName: string): Promise<boolean> {
  try {
    console.log('Sending property live notification to:', email);
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
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
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#127968;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Your Property is Live!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${firstName || 'Property Owner'},
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
      console.error('Failed to send property live email:', error);
      return false;
    }

    console.log('Property live email sent successfully:', data?.id);
    return true;
  } catch (error: any) {
    console.error('Failed to send property live email:', error?.message || error);
    return false;
  }
}

export async function sendBookingRequestToOwnerEmail(
  ownerEmail: string,
  ownerFirstName: string,
  propertyName: string,
  guestName: string,
  guestEmail: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  totalPrice: string
): Promise<boolean> {
  try {
    console.log('Sending booking request notification to owner:', ownerEmail);
    const { client, fromEmail } = await getResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
      to: [ownerEmail],
      subject: `New Booking Request - ${propertyName}`,
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
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#128197;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">New Booking Request!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${ownerFirstName || 'Property Owner'},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                You have received a new booking request for <strong>"${propertyName}"</strong>. Please review the details below.
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Guest Information:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Name:</strong> ${guestName}</p>
                <p style="color: #6b7280; margin: 0;"><strong>Email:</strong> ${guestEmail}</p>
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #047857; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${checkIn}</p>
                <p style="color: #047857; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${checkOut}</p>
                <p style="color: #047857; margin: 0 0 8px 0;"><strong>Number of Guests:</strong> ${guests}</p>
                <p style="color: #065f46; margin: 0; font-weight: 600; font-size: 18px;">Total Amount: Rs. ${totalPrice}</p>
              </div>
              
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5; font-size: 14px;">
                A message has also been sent to your chat inbox. Please respond to the guest promptly.
              </p>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/owner/bookings" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
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
      console.error('Failed to send booking request email to owner:', error);
      return false;
    }

    console.log('Booking request email sent to owner successfully:', data?.id);
    return true;
  } catch (error: any) {
    console.error('Failed to send booking request email to owner:', error?.message || error);
    return false;
  }
}

// ========================
// STATE-DRIVEN BOOKING EMAILS
// ========================

interface BookingEmailData {
  bookingCode: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: string;
  guestName?: string;
  guestEmail?: string;
}

// CREATED STATE: Email to Guest - "Reservation Requested"
export async function sendBookingCreatedGuestEmail(
  guestEmail: string,
  guestFirstName: string,
  data: BookingEmailData
): Promise<boolean> {
  try {
    console.log('[BOOKING:CREATED] Sending reservation requested email to guest:', guestEmail);
    const { client, fromEmail } = await getResendClient();
    
    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
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
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#9203;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Reservation Requested!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || 'there'},
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
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests} | <strong>Rooms:</strong> ${data.rooms}</p>
                <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 18px;">Total: Rs. ${data.totalPrice}</p>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">What's Next?</p>
                <p style="color: #a16207; margin: 8px 0 0 0; font-size: 14px;">
                  The property owner will review your request and respond within 24-48 hours. You'll receive an email when they respond.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/my-bookings" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
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
      console.error('[BOOKING:CREATED] Failed to send guest email:', error);
      return false;
    }

    console.log('[BOOKING:CREATED] Guest email sent successfully:', emailData?.id);
    return true;
  } catch (error: any) {
    console.error('[BOOKING:CREATED] Exception sending guest email:', error?.message || error);
    return false;
  }
}

// OWNER_ACCEPTED STATE: Email to Guest - "Hotel Accepted, Please Confirm"
export async function sendBookingOwnerAcceptedEmail(
  guestEmail: string,
  guestFirstName: string,
  data: BookingEmailData,
  ownerMessage?: string
): Promise<boolean> {
  try {
    console.log('[BOOKING:OWNER_ACCEPTED] Sending acceptance email to guest:', guestEmail);
    const { client, fromEmail } = await getResendClient();
    
    const messageSection = ownerMessage 
      ? `<div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #10b981;">
           <p style="color: #065f46; margin: 0; font-weight: 500;">Message from Property:</p>
           <p style="color: #047857; margin: 8px 0 0 0; font-size: 14px; font-style: italic;">"${ownerMessage}"</p>
         </div>`
      : '';
    
    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
      to: [guestEmail],
      subject: `Action Required: ${data.propertyName} Accepted Your Request! (${data.bookingCode})`,
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
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#127881;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Great News! Your Request is Accepted</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || 'there'},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                The property <strong>"${data.propertyName}"</strong> has accepted your booking request! Please confirm your reservation to complete the booking.
              </p>
              
              ${messageSection}
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="color: #1f2937; margin: 0 0 4px 0; font-weight: 600;">Booking Reference</p>
                <p style="color: #10b981; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">${data.bookingCode}</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${data.checkIn}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests} | <strong>Rooms:</strong> ${data.rooms}</p>
                <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 18px;">Total: Rs. ${data.totalPrice}</p>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; margin: 0; font-weight: 500;">Action Required</p>
                <p style="color: #a16207; margin: 8px 0 0 0; font-size: 14px;">
                  Please confirm your booking to secure your reservation. If you don't confirm within 24 hours, the booking may expire.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/my-bookings" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Confirm Your Booking
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
      console.error('[BOOKING:OWNER_ACCEPTED] Failed to send guest email:', error);
      return false;
    }

    console.log('[BOOKING:OWNER_ACCEPTED] Guest email sent successfully:', emailData?.id);
    return true;
  } catch (error: any) {
    console.error('[BOOKING:OWNER_ACCEPTED] Exception sending guest email:', error?.message || error);
    return false;
  }
}

// CUSTOMER_CONFIRMED STATE: Email to Guest - "Booking Confirmed"
export async function sendBookingConfirmedGuestEmail(
  guestEmail: string,
  guestFirstName: string,
  data: BookingEmailData
): Promise<boolean> {
  try {
    console.log('[BOOKING:CUSTOMER_CONFIRMED] Sending confirmation email to guest:', guestEmail);
    const { client, fromEmail } = await getResendClient();
    
    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
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
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Booking Confirmed!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || 'there'},
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
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests} | <strong>Rooms:</strong> ${data.rooms}</p>
                <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 18px;">Total: Rs. ${data.totalPrice}</p>
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">What's Next?</p>
                <ul style="color: #047857; margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                  <li>Save your confirmation code</li>
                  <li>Contact the property if you have special requests</li>
                  <li>Arrive on your check-in date ready to enjoy!</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/my-bookings" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
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
      console.error('[BOOKING:CUSTOMER_CONFIRMED] Failed to send guest email:', error);
      return false;
    }

    console.log('[BOOKING:CUSTOMER_CONFIRMED] Guest email sent successfully:', emailData?.id);
    return true;
  } catch (error: any) {
    console.error('[BOOKING:CUSTOMER_CONFIRMED] Exception sending guest email:', error?.message || error);
    return false;
  }
}

// CUSTOMER_CONFIRMED STATE: Email to Owner - "Booking Confirmed by Guest"
export async function sendBookingConfirmedOwnerEmail(
  ownerEmail: string,
  ownerFirstName: string,
  data: BookingEmailData
): Promise<boolean> {
  try {
    console.log('[BOOKING:CUSTOMER_CONFIRMED] Sending confirmation email to owner:', ownerEmail);
    const { client, fromEmail } = await getResendClient();
    
    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
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
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">Booking Confirmed by Guest!</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${ownerFirstName || 'Property Owner'},
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
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Name:</strong> ${data.guestName || 'Guest'}</p>
                <p style="color: #6b7280; margin: 0;"><strong>Email:</strong> ${data.guestEmail || 'N/A'}</p>
              </div>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Booking Details:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-in:</strong> ${data.checkIn}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Check-out:</strong> ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Guests:</strong> ${data.guests} | <strong>Rooms:</strong> ${data.rooms}</p>
                <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 18px;">Total: Rs. ${data.totalPrice}</p>
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
      console.error('[BOOKING:CUSTOMER_CONFIRMED] Failed to send owner email:', error);
      return false;
    }

    console.log('[BOOKING:CUSTOMER_CONFIRMED] Owner email sent successfully:', emailData?.id);
    return true;
  } catch (error: any) {
    console.error('[BOOKING:CUSTOMER_CONFIRMED] Exception sending owner email:', error?.message || error);
    return false;
  }
}

// DECLINED/EXPIRED STATE: Email to Guest - "Booking Not Confirmed"
export async function sendBookingDeclinedEmail(
  guestEmail: string,
  guestFirstName: string,
  data: BookingEmailData,
  reason: 'rejected' | 'expired' | 'cancelled',
  ownerMessage?: string
): Promise<boolean> {
  try {
    console.log(`[BOOKING:${reason.toUpperCase()}] Sending declined email to guest:`, guestEmail);
    const { client, fromEmail } = await getResendClient();
    
    const reasonConfig = {
      rejected: {
        subject: `Booking Request Declined - ${data.propertyName}`,
        heading: 'Booking Request Declined',
        message: 'Unfortunately, the property owner was unable to accept your booking request.',
        icon: '&#10060;',
        bgColor: '#fef2f2',
        iconColor: '#dc2626'
      },
      expired: {
        subject: `Booking Request Expired - ${data.propertyName}`,
        heading: 'Booking Request Expired',
        message: 'Your booking request expired because the property did not respond in time.',
        icon: '&#9203;',
        bgColor: '#fef3c7',
        iconColor: '#f59e0b'
      },
      cancelled: {
        subject: `Booking Cancelled - ${data.propertyName}`,
        heading: 'Booking Cancelled',
        message: 'Your booking has been cancelled as requested.',
        icon: '&#10060;',
        bgColor: '#f3f4f6',
        iconColor: '#6b7280'
      }
    };
    
    const config = reasonConfig[reason];
    
    const messageSection = ownerMessage 
      ? `<div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #dc2626;">
           <p style="color: #991b1b; margin: 0; font-weight: 500;">Message from Property:</p>
           <p style="color: #dc2626; margin: 8px 0 0 0; font-size: 14px; font-style: italic;">"${ownerMessage}"</p>
         </div>`
      : '';
    
    const { error, data: emailData } = await client.emails.send({
      from: fromEmail || 'ZECOHO <noreply@zecoho.com>',
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
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZECOHO</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your Journey, Our Passion</p>
            </div>
            
            <div style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: ${config.bgColor}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: ${config.iconColor};">${config.icon}</span>
                </div>
              </div>
              
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; text-align: center;">${config.heading}</h2>
              <p style="color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">
                Hi ${guestFirstName || 'there'},
              </p>
              <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                ${config.message}
              </p>
              
              ${messageSection}
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #1f2937; margin: 0 0 12px 0; font-weight: 600;">Original Request:</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Property:</strong> ${data.propertyName}</p>
                <p style="color: #6b7280; margin: 0 0 8px 0;"><strong>Dates:</strong> ${data.checkIn} - ${data.checkOut}</p>
                <p style="color: #6b7280; margin: 0;"><strong>Reference:</strong> ${data.bookingCode}</p>
              </div>
              
              <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <p style="color: #065f46; margin: 0; font-weight: 500;">Don't worry!</p>
                <p style="color: #047857; margin: 8px 0 0 0; font-size: 14px;">
                  There are plenty of other great properties on ZECOHO. Browse our listings to find your perfect stay.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${getAppBaseUrl()}/my-bookings" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
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
      console.error(`[BOOKING:${reason.toUpperCase()}] Failed to send guest email:`, error);
      return false;
    }

    console.log(`[BOOKING:${reason.toUpperCase()}] Guest email sent successfully:`, emailData?.id);
    return true;
  } catch (error: any) {
    console.error(`[BOOKING:${reason.toUpperCase()}] Exception sending guest email:`, error?.message || error);
    return false;
  }
}
