import webpush from 'web-push';
import { storage } from '../storage';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEQoTPsYLZBe-sHxwi_pQzUhpZy-cYxXOvBMYgTbZ5dAWVx_D6DwNtMYN3nnuN0AJHyJWnGDyVbXEKHl4xA3Huc';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@zecoho.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: any;
  };
  actions?: { action: string; title: string }[];
  requireInteraction?: boolean;
  urgency?: 'high' | 'normal' | 'low';
}

export async function sendPushNotification(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PRIVATE_KEY) {
    console.log('[Push] VAPID private key not configured, skipping push notification');
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  try {
    const subscriptions = await storage.getPushSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      console.log(`[Push] No subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || 'zecoho-notification',
      data: payload.data || { url: '/' },
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      urgency: payload.urgency || 'normal',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadString,
          {
            urgency: payload.urgency || 'normal',
            TTL: payload.urgency === 'high' ? 30 : 86400,
          }
        );
        console.log(`[Push] Sent notification to user ${userId}`);
        sent++;
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] Subscription expired, removing: ${sub.endpoint.substring(0, 50)}...`);
          await storage.deletePushSubscription(sub.endpoint);
        } else {
          console.error(`[Push] Error sending notification:`, error.message);
        }
        failed++;
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('[Push] Error sending push notification:', error);
  }

  return { sent, failed };
}

export async function sendUrgentBookingPush(
  userId: string,
  bookingId: string,
  bookingCode: string,
  guestName: string,
  propertyName: string,
  checkIn: string,
  roomType: string,
) {
  const result = await sendPushNotification(userId, {
    title: 'New Booking — Immediate Action Required',
    body: `Booking: ${bookingCode}\nGuest: ${guestName}\nCheck-in: ${checkIn}\nRoom: ${roomType}`,
    tag: `urgent-booking-${bookingId}`,
    data: {
      url: `/owner/bookings?highlight=${bookingId}`,
      bookingId,
      bookingCode,
      type: 'urgent_booking',
    },
    actions: [
      { action: 'accept_booking', title: 'Accept' },
      { action: 'reject_booking', title: 'Reject' },
    ],
    requireInteraction: true,
    urgency: 'high',
  });

  try {
    await storage.createNotificationLog({
      userId,
      bookingId,
      channel: 'web_push',
      status: result.sent > 0 ? 'sent' : 'failed',
      title: 'New Booking — Immediate Action Required',
      body: `Booking: ${bookingCode} | Guest: ${guestName} | Check-in: ${checkIn}`,
      error: result.failed > 0 ? `${result.failed} delivery failures` : null,
      sentAt: new Date(),
    });
  } catch (logError) {
    console.error('[Push] Failed to create notification log:', logError);
  }

  return result;
}

export async function sendBookingPush(
  userId: string, 
  type: 'new_booking' | 'booking_confirmed' | 'booking_cancelled' | 'booking_rejected' | 'customer_confirmed',
  propertyName: string,
  bookingId: string
) {
  const configs = {
    new_booking: {
      title: 'New Booking Request',
      body: `You have a new booking request for ${propertyName}`,
      url: `/owner/bookings?highlight=${bookingId}`,
    },
    booking_confirmed: {
      title: 'Booking Confirmed',
      body: `Your booking at ${propertyName} has been confirmed`,
      url: `/bookings?highlight=${bookingId}`,
    },
    booking_cancelled: {
      title: 'Booking Cancelled',
      body: `A booking at ${propertyName} has been cancelled`,
      url: `/owner/bookings?highlight=${bookingId}`,
    },
    booking_rejected: {
      title: 'Booking Not Available',
      body: `Your booking request at ${propertyName} could not be accommodated`,
      url: `/bookings?highlight=${bookingId}`,
    },
    customer_confirmed: {
      title: 'Booking Confirmed by Guest',
      body: `A guest has confirmed their booking at ${propertyName}`,
      url: `/owner/bookings?highlight=${bookingId}`,
    },
  };

  const config = configs[type];
  await sendPushNotification(userId, {
    title: config.title,
    body: config.body,
    tag: `booking-${bookingId}`,
    data: { url: config.url, bookingId },
    requireInteraction: type === 'new_booking',
  });
}

export async function sendMessagePush(
  userId: string,
  senderName: string,
  conversationId: string,
  messagePreview: string
) {
  await sendPushNotification(userId, {
    title: `New message from ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.substring(0, 97) + '...' : messagePreview,
    tag: `message-${conversationId}`,
    data: { url: `/messages/${conversationId}`, conversationId },
  });
}

export async function sendReviewPush(
  ownerId: string,
  guestName: string,
  propertyName: string,
  rating: number,
  reviewId: string
) {
  await sendPushNotification(ownerId, {
    title: 'New Review Received',
    body: `${guestName} left a ${rating}-star review for ${propertyName}`,
    tag: `review-${reviewId}`,
    data: { url: `/owner/reviews`, reviewId },
  });
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
