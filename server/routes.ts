// Referenced from blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { OAuth2Client } from "google-auth-library";
import { storage, generatePropertySlug } from "./storage";
import { db, pool } from "./db";
import { eq, sql, inArray, desc, and, gte, lte } from "drizzle-orm";
import {
  users,
  contactInteractions,
  notifications,
  chatLogs,
  callLogs,
  conversations,
  messages,
  ownerReferrals,
  ownerSubscriptions,
  paymentAccounts,
  subscriptionPayments,
  invoices,
  propertyViews,
  searchHistory,
  adminAuditLogs,
  notificationLogs,
  bookings,
  properties as propertiesTable,
  adminPermissions,
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import subscriptionRoutes from "./subscriptions.ts";
import {
  insertPropertySchema,
  insertRoomSchema,
  insertRoomOptionSchema,
  insertWishlistSchema,
  insertUserPreferencesSchema,
  insertBookingSchema,
  insertMessageSchema,
  insertReviewSchema,
  insertDestinationSchema,
  insertSearchHistorySchema,
  updateKYCSchema,
  becomeOwnerSchema,
  insertKycApplicationSchema,
  type User,
  type Property,
} from "@shared/schema";

type SafeConversationUser = Omit<
  User,
  | "phone"
  | "kycAddress"
  | "governmentIdType"
  | "governmentIdNumber"
  | "kycStatus"
  | "kycVerifiedAt"
>;

function sanitizeConversationUser(user: User): SafeConversationUser {
  const {
    phone,
    kycAddress,
    governmentIdType,
    governmentIdNumber,
    kycStatus,
    kycVerifiedAt,
    ...safe
  } = user;
  return safe;
}
import {
  ObjectStorageService,
  ObjectNotFoundError,
  generateUploadToken,
  verifyUploadToken,
} from "./objectStorage";
import { ObjectPermission, setObjectAclPolicy } from "./objectAcl";
import {
  sendOtpEmail,
  sendKycSubmittedEmail,
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendPropertyLiveEmail,
  sendPasswordChangedEmail,
  sendPropertyStatusEmail,
  sendPropertyRejectedEmail,
  sendBookingConfirmationEmail,
  sendBookingRequestToOwnerEmail,
  sendBookingCreatedGuestEmail,
  sendBookingOwnerAcceptedEmail,
  sendBookingConfirmedGuestEmail,
  sendBookingConfirmedOwnerEmail,
  sendBookingDeclinedEmail,
  sendBookingNoShowEmail,
  sendBookingCancelledOwnerEmail,
  sendReviewRequestEmail,
  sendAdminDeactivationRequestEmail,
  sendWaitlistConfirmationEmail,
} from "./emailService";
import {
  createNotification,
  createBookingNotification,
} from "./services/notificationService";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { WebSocketServer, WebSocket } from "ws";
import { format } from "date-fns";

// WebSocket connections map: userId -> Set of WebSocket connections
const userConnections = new Map<string, Set<WebSocket>>();

// Function to broadcast message to a specific user
export function broadcastToUser(userId: string, data: any) {
  const connections = userConnections.get(userId);
  console.log(
    `Broadcasting to user ${userId}: ${connections ? connections.size : 0} connections found`,
  );
  if (connections) {
    const message = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(`Sending message to user ${userId}`);
        ws.send(message);
      } else {
        console.log(
          `WebSocket for user ${userId} not open (state: ${ws.readyState})`,
        );
      }
    });
  } else {
    console.log(`No WebSocket connections found for user ${userId}`);
  }
}

// Helper function to check if a user has a specific role (single role only from userRole field)
function userHasRole(user: any, role: string): boolean {
  if (!user) return false;
  return user.userRole === role;
}

// Helper: resolve the correct room rate based on guest count
// Resolve single/base nightly rate from room type (no occupancy increment).
// Used as the "base" before adding occupancy increments.
function resolveBasePrice(roomType: any): number {
  if (roomType.singleOccupancyPrice)
    return Number(roomType.singleOccupancyPrice);
  return Number(roomType.basePrice);
}

// Occupancy increment above single rate (0 for single occupancy).
// OTA model: override replaces the base; increment is preserved.
function occupancyIncrement(roomType: any, adultsCount: number): number {
  const adults = Math.max(1, adultsCount || 1);

  // New model: increment = full tier price − single price
  const single = roomType.singleOccupancyPrice
    ? Number(roomType.singleOccupancyPrice)
    : Number(roomType.basePrice);
  if (adults >= 3 && roomType.tripleOccupancyPrice) {
    return Number(roomType.tripleOccupancyPrice) - single;
  }
  if (adults >= 2 && roomType.doubleOccupancyPrice) {
    return Number(roomType.doubleOccupancyPrice) - single;
  }

  // Legacy model: explicit adjustment fields
  const singleOccupancyBase = roomType.singleOccupancyBase || 1;
  const guestsOverBase = adults - singleOccupancyBase;
  if (guestsOverBase >= 2 && roomType.tripleOccupancyAdjustment) {
    return Number(roomType.tripleOccupancyAdjustment);
  }
  if (guestsOverBase >= 1 && roomType.doubleOccupancyAdjustment) {
    return Number(roomType.doubleOccupancyAdjustment);
  }
  return 0;
}

// Resolve nightly price for a given occupancy level.
// overrideEntry: per-date tier-specific overrides; tiers not set fall back to
// base+increment (or fully static if no base override either).
function resolveOccupancyPrice(
  roomType: any,
  adultsCount: number,
  overrideEntry?: { base?: number; double?: number; triple?: number },
): number {
  const adults = Math.max(1, adultsCount || 1);

  if (overrideEntry !== undefined) {
    if (adults >= 3 && overrideEntry.triple !== undefined)
      return overrideEntry.triple;
    if (adults >= 2 && overrideEntry.double !== undefined)
      return overrideEntry.double;
    if (overrideEntry.base !== undefined) {
      return overrideEntry.base + occupancyIncrement(roomType, adults);
    }
    // Override row exists for a different tier only — fall through to static
  }

  // No applicable override — use static room type prices
  const single = roomType.singleOccupancyPrice
    ? Number(roomType.singleOccupancyPrice)
    : Number(roomType.basePrice);
  return single + occupancyIncrement(roomType, adults);
}

// Calculate total room cost night-by-night, applying per-day price overrides.
// overridesMap: date string (YYYY-MM-DD) → per-tier override entry for that night.
function calculateNightlyRoomCost(
  roomType: any,
  adultsPerRoom: number,
  roomsCount: number,
  checkIn: Date,
  checkOut: Date,
  overridesMap: Map<
    string,
    { base?: number; double?: number; triple?: number }
  >,
): number {
  let total = 0;
  const cursor = new Date(checkIn);
  while (cursor < checkOut) {
    const dateKey = cursor.toISOString().split("T")[0];
    const override = overridesMap.get(dateKey);
    const nightPrice = resolveOccupancyPrice(roomType, adultsPerRoom, override);
    total += nightPrice * roomsCount;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

async function shapePropertyResponse(
  property: any,
  requestUserId: string | null,
): Promise<any | null> {
  const callerIsOwner = requestUserId === property.ownerId;
  let callerIsAdmin = false;
  if (requestUserId && !callerIsOwner) {
    const caller = await storage.getUser(requestUserId);
    callerIsAdmin = caller?.userRole === "admin";
  }

  if (!callerIsOwner && !callerIsAdmin) {
    const sub = await storage.checkOwnerSubscriptionStatus(property.ownerId);
    if (!sub.isActive) return null;
  }

  const propertyRoomTypes = await storage.getRoomTypes(property.id);
  let startingRoomPrice: string | null = null;
  let startingRoomOriginalPrice: string | null = null;
  if (propertyRoomTypes.length > 0) {
    const sortedRoomTypes = [...propertyRoomTypes].sort(
      (a, b) => parseFloat(a.basePrice) - parseFloat(b.basePrice),
    );
    const cheapestRoomType = sortedRoomTypes[0];
    startingRoomPrice = cheapestRoomType.basePrice;
    if (
      cheapestRoomType.originalPrice &&
      parseFloat(cheapestRoomType.originalPrice) >
        parseFloat(cheapestRoomType.basePrice)
    ) {
      startingRoomOriginalPrice = cheapestRoomType.originalPrice;
    }
  }

  let hasConfirmedBooking = false;
  if (requestUserId && !callerIsOwner && !callerIsAdmin) {
    const guestBookings = await storage.getBookingsByGuest(requestUserId);
    hasConfirmedBooking = guestBookings.some(
      (b: any) => b.propertyId === property.id && b.status === "confirmed",
    );
  }

  const canSeeContactFields =
    callerIsOwner || callerIsAdmin || hasConfirmedBooking;

  const {
    receptionNumber,
    contactEmail,
    contactPhone,
    whatsappNumber,
    ...publicProperty
  } = property;

  const contactFields = canSeeContactFields
    ? { receptionNumber, contactEmail, contactPhone, whatsappNumber }
    : {};

  if (property.status === "published") {
    const owner = await storage.getUser(property.ownerId);
    const ownerPhone =
      owner?.phone && owner.phone.trim() ? owner.phone.trim() : null;
    const canCall = canSeeContactFields;
    return {
      ...publicProperty,
      ...contactFields,
      startingRoomPrice,
      startingRoomOriginalPrice,
      ownerContact: owner
        ? {
            name:
              owner.firstName && owner.lastName
                ? `${owner.firstName} ${owner.lastName}`
                : owner.firstName || null,
            canCall,
            ...(canCall ? { phone: ownerPhone } : {}),
          }
        : null,
    };
  }

  return {
    ...publicProperty,
    ...contactFields,
    startingRoomPrice,
    startingRoomOriginalPrice,
  };
}

export async function registerRoutes(
  app: Express,
  existingServer?: Server,
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  app.use("/api", subscriptionRoutes);

  // ── Dynamic sitemap.xml ──────────────────────────────────────────────────
  // Replaces the previous static client/public/sitemap.xml.
  // Includes static pages, all 6 city landing pages, and every published
  // property. Blog posts are skipped — no blog table exists in the schema.
  app.post(
    "/api/admin/backfill-slugs",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const caller = await storage.getUser(userId);
        if (caller?.userRole !== "admin") {
          return res.status(403).json({ error: "Admin only" });
        }
        const allProps = await storage.getProperties({
          includeAllStatuses: true,
        });
        let updated = 0;
        for (const prop of allProps) {
          if (!prop.slug) {
            const slug = generatePropertySlug(
              prop.title || "",
              prop.propCity || prop.destination || "",
              prop.propertyCode || prop.id.substring(0, 8),
            );
            await db
              .update(propertiesTable)
              .set({ slug })
              .where(eq(propertiesTable.id, prop.id));
            updated++;
          }
        }
        return res.json({
          success: true,
          updated,
          message: `${updated} properties backfilled`,
        });
      } catch (error) {
        console.error("Backfill slugs error:", error);
        return res.status(500).json({ error: "Backfill failed" });
      }
    },
  );

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const ORIGIN = "https://www.zecoho.com";
      const xmlEscape = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

      type Entry = {
        loc: string;
        lastmod?: string;
        changefreq: string;
        priority: string;
      };
      const entries: Entry[] = [];

      // Home
      entries.push({
        loc: `${ORIGIN}/`,
        changefreq: "daily",
        priority: "1.0",
      });

      // Static high-value pages
      for (const path of [
        "/search",
        "/destinations",
        "/list-property",
        "/about-us",
        "/contact",
      ]) {
        entries.push({
          loc: `${ORIGIN}${path}`,
          changefreq: "weekly",
          priority: "0.8",
        });
      }

      // Blog index (carried over from previous static sitemap; individual posts
      // are not enumerated because no blog table exists in shared/schema.ts)
      entries.push({
        loc: `${ORIGIN}/blog`,
        changefreq: "weekly",
        priority: "0.7",
      });

      // Legal pages (low priority, carried over from previous static sitemap)
      for (const path of ["/terms", "/privacy"]) {
        entries.push({
          loc: `${ORIGIN}${path}`,
          changefreq: "monthly",
          priority: "0.3",
        });
      }

      // City landing pages — primary SEO targets
      for (const slug of [
        "goa",
        "indore",
        "manali",
        "shimla",
        "jaipur",
        "delhi",
      ]) {
        entries.push({
          loc: `${ORIGIN}/hotels/${slug}`,
          changefreq: "daily",
          priority: "0.9",
        });
      }

      // Every published property
      const publishedProperties = await storage.getProperties({
        status: "published",
      });
      for (const p of publishedProperties) {
        const citySlug = (p.propCity || p.destination || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        const loc =
          p.slug && citySlug
            ? `${ORIGIN}/hotels/${citySlug}/${p.slug}`
            : `${ORIGIN}/properties/${p.id}`;
        entries.push({
          loc,
          lastmod: p.updatedAt
            ? new Date(p.updatedAt).toISOString()
            : undefined,
          changefreq: "weekly",
          priority: "0.7",
        });
      }

      const body =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        entries
          .map((e) => {
            const lastmodLine = e.lastmod
              ? `\n    <lastmod>${e.lastmod}</lastmod>`
              : "";
            return (
              `  <url>\n` +
              `    <loc>${xmlEscape(e.loc)}</loc>${lastmodLine}\n` +
              `    <changefreq>${e.changefreq}</changefreq>\n` +
              `    <priority>${e.priority}</priority>\n` +
              `  </url>`
            );
          })
          .join("\n") +
        `\n</urlset>\n`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(body);
    } catch (err) {
      console.error("Error generating sitemap:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Helper: verify a Firebase ID token by checking signature against Google's public certs
  async function verifyFirebaseIdToken(idToken: string): Promise<Record<string, any>> {
    // Prefer the server-scoped FIREBASE_PROJECT_ID env var; fall back to the
    // shared VITE_FIREBASE_PROJECT_ID that is already set in this environment.
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error(
        "Firebase project ID not configured on server. " +
        "Set the FIREBASE_PROJECT_ID environment variable.",
      );
    }

    // Fetch Firebase's X.509 public certs (keyed by kid, cached by Google with Cache-Control)
    const certsUrl =
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
    const certsResponse = await fetch(certsUrl);
    if (!certsResponse.ok) {
      throw new Error("Failed to fetch Firebase public certificates");
    }
    const certs: Record<string, string> = await certsResponse.json();

    const client = new OAuth2Client(projectId);
    const ticket = await client.verifySignedJwtWithCertsAsync(
      idToken,
      certs,
      projectId,
      [`https://securetoken.google.com/${projectId}`],
    );

    const payload = ticket.getPayload();
    if (!payload) throw new Error("Empty token payload");
    if (payload["email_verified"] !== true) {
      throw new Error("Email address is not verified");
    }
    return payload;
  }

  // Google Sign-in endpoint
  app.post("/api/auth/google", async (req: any, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "ID token is required" });
      }

      // Verify the Firebase ID token signature and claims before trusting any data
      let claims: Record<string, any>;
      try {
        claims = await verifyFirebaseIdToken(idToken);
      } catch (verifyErr: any) {
        console.error("Firebase token verification failed:", verifyErr.message);
        return res.status(401).json({ message: "Invalid or expired ID token" });
      }

      const email = claims.email as string | undefined;
      const firstName = (claims.given_name || claims.name?.split(" ")[0] || "") as string;
      const lastName =
        ((claims.family_name || claims.name?.split(" ").slice(1).join(" ")) ?? "") as string;
      const profileImageUrl = (claims.picture as string | null) ?? null;

      if (!email) {
        return res.status(400).json({ message: "Email not found in token" });
      }

      // Get or create user in PostgreSQL
      let user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        user = await storage.createUserFromEmail(email.toLowerCase());
        // Update name and photo if available
        if (firstName || lastName || profileImageUrl) {
          await db
            .update(users)
            .set({
              firstName,
              lastName,
              profileImageUrl,
              emailVerifiedAt: new Date(),
            })
            .where(eq(users.email, email.toLowerCase()));
          user = await storage.getUserByEmail(email.toLowerCase());
        }
      }

      // Create session
      const sessionUser = {
        claims: { sub: user!.id, email: user!.email },
        access_token: `google-session-${user!.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };

      await new Promise<void>((resolve, reject) => {
        req.login(sessionUser, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        message: "Google sign-in successful",
        user: {
          id: user!.id,
          email: user!.email,
          firstName: user!.firstName,
          lastName: user!.lastName,
          userRole: user!.userRole,
          profileImageUrl: user!.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ message: "Google sign-in failed" });
    }
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user consent (Terms & Conditions, Privacy Policy)
  app.post("/api/auth/consent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { termsAccepted, privacyAccepted, consentCommunication } = req.body;

      if (
        typeof termsAccepted !== "boolean" ||
        typeof privacyAccepted !== "boolean"
      ) {
        return res.status(400).json({
          message:
            "Both termsAccepted and privacyAccepted are required as boolean values",
        });
      }

      const now = new Date();
      const updateData: any = {
        termsAccepted,
        privacyAccepted,
        consentCommunication: consentCommunication === true,
        updatedAt: now,
      };

      if (termsAccepted) {
        updateData.termsAcceptedAt = now;
      }
      if (privacyAccepted) {
        updateData.privacyAcceptedAt = now;
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      res.json({
        message: "Consent updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating consent:", error);
      res.status(500).json({ message: "Failed to update consent" });
    }
  });

  // OTP Authentication - Send OTP to email
  app.post("/api/auth/send-otp", async (req: any, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if user exists — if not, tell the frontend so it can prompt account creation
      const existingUser = await storage.getUserByEmail(
        email.toLowerCase().trim(),
      );
      if (!existingUser) {
        return res.status(404).json({
          message: "No account found with this email address.",
          userNotFound: true,
        });
      }

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();

      // Set expiry to 10 minutes from now
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Store OTP in database
      await storage.createOtpCode(email, otp, expiresAt);

      // Send OTP email
      const emailSent = await sendOtpEmail(email, otp);

      if (!emailSent) {
        return res
          .status(500)
          .json({ message: "Failed to send OTP email. Please try again." });
      }

      // Clean up expired codes periodically
      storage.deleteExpiredOtpCodes().catch(console.error);

      res.json({
        message: "OTP sent successfully",
        email: email.toLowerCase(),
        expiresIn: 600, // 10 minutes in seconds
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // OTP Authentication - Verify OTP and create session
  app.post("/api/auth/verify-otp", async (req: any, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      // Get valid OTP code
      const otpCode = await storage.getValidOtpCode(email, otp);

      if (!otpCode) {
        return res.status(400).json({
          message: "Invalid or expired OTP. Please request a new one.",
        });
      }

      // Check attempts
      if (otpCode.attempts && otpCode.attempts >= 5) {
        return res.status(400).json({
          message: "Too many attempts. Please request a new OTP.",
        });
      }

      // Increment attempts before checking
      await storage.incrementOtpAttempts(otpCode.id);

      // Verify the OTP matches
      if (otpCode.code !== otp) {
        return res.status(400).json({
          message: "Incorrect OTP. Please try again.",
        });
      }

      // Mark OTP as verified
      await storage.markOtpVerified(otpCode.id);

      // Get or create user
      let user = await storage.getUserByEmail(email);

      if (!user) {
        // Create new user with email
        user = await storage.createUserFromEmail(email);
      }

      // Create session using Passport's official login method
      const sessionUser = {
        claims: { sub: user.id, email: user.email },
        access_token: `otp-session-${user.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };

      await new Promise<void>((resolve, reject) => {
        req.login(sessionUser, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userRole: user.userRole,
          profileImageUrl: user.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Password-based Registration - Step 1: Register with name, email, password
  // Disabled in development to allow OIDC testing
  app.post("/api/auth/register", async (req: any, res) => {
    if (process.env.NODE_ENV === "development") {
      return res.status(403).json({
        message:
          "Password registration is disabled in development mode. Use OIDC login instead.",
      });
    }
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        termsAccepted,
        privacyAccepted,
        consentCommunication,
      } = req.body;

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          message: "First name, last name, email, and password are required",
        });
      }

      // Validate consent - terms and privacy are required
      if (termsAccepted !== true) {
        return res.status(400).json({
          message:
            "You must accept the Terms & Conditions to create an account",
        });
      }
      if (privacyAccepted !== true) {
        return res.status(400).json({
          message: "You must accept the Privacy Policy to create an account",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength (min 8 chars)
      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters long" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "An account with this email already exists" });
      }

      // Fetch current policy versions for consent tracking
      const currentTerms = await storage.getPublishedPolicy("terms");
      const currentPrivacy = await storage.getPublishedPolicy("privacy");

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user with unverified email and consent (including version numbers)
      const user = await storage.createLocalUser({
        firstName,
        lastName,
        email,
        passwordHash,
        termsAccepted: true,
        privacyAccepted: true,
        consentCommunication: consentCommunication === true,
        termsAcceptedVersion: currentTerms?.version ?? undefined,
        privacyAcceptedVersion: currentPrivacy?.version ?? undefined,
      });

      // Generate and send OTP for email verification
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await storage.createOtpCode(email, otp, expiresAt);

      const emailSent = await sendOtpEmail(email, otp);
      if (!emailSent) {
        return res.status(500).json({
          message:
            "Account created but failed to send verification email. Please try logging in.",
        });
      }

      res.json({
        message: "Registration successful! Please verify your email.",
        email: email.toLowerCase(),
        userId: user.id,
        requiresVerification: true,
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Password-based Registration - Step 2: Verify email with OTP
  app.post("/api/auth/register/verify", async (req: any, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      // Get valid OTP code
      const otpCode = await storage.getValidOtpCode(email, otp);
      if (!otpCode) {
        return res.status(400).json({
          message: "Invalid or expired OTP. Please request a new one.",
        });
      }

      // Check attempts
      if (otpCode.attempts && otpCode.attempts >= 5) {
        return res
          .status(400)
          .json({ message: "Too many attempts. Please request a new OTP." });
      }

      await storage.incrementOtpAttempts(otpCode.id);

      if (otpCode.code !== otp) {
        return res
          .status(400)
          .json({ message: "Incorrect OTP. Please try again." });
      }

      await storage.markOtpVerified(otpCode.id);

      // Get user and mark email as verified
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUserEmailVerified(user.id);

      // Create session for the user
      const sessionUser = {
        claims: { sub: user.id, email: user.email },
        access_token: `local-session-${user.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };

      await new Promise<void>((resolve, reject) => {
        req.login(sessionUser, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      res.json({
        message: "Email verified successfully! Welcome to ZECOHO.",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userRole: user.userRole,
          profileImageUrl: user.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Error verifying registration:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Password-based Login
  // Disabled in development to allow OIDC testing
  app.post("/api/auth/login/password", async (req: any, res) => {
    if (process.env.NODE_ENV === "development") {
      return res.status(403).json({
        message:
          "Password login is disabled in development mode. Use OIDC login instead.",
      });
    }
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          message: "No account found with this email address.",
          userNotFound: true,
        });
      }

      // Check if user has a password (registered with email/password)
      if (!user.passwordHash) {
        return res.status(400).json({
          message:
            "This account was created with a different login method. Please use OTP login.",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if email is verified
      if (!user.emailVerifiedAt) {
        // Send new OTP for verification
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await storage.createOtpCode(email, otp, expiresAt);
        await sendOtpEmail(email, otp);

        return res.status(403).json({
          message:
            "Please verify your email first. A new verification code has been sent.",
          requiresVerification: true,
          email: email.toLowerCase(),
        });
      }

      // Check if user is deactivated
      if (user.isDeactivated) {
        return res.status(403).json({
          message:
            "Your account has been deactivated. Please contact support for assistance.",
          code: "ACCOUNT_DEACTIVATED",
        });
      }

      // Create session
      const sessionUser = {
        claims: { sub: user.id, email: user.email },
        access_token: `local-session-${user.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };

      await new Promise<void>((resolve, reject) => {
        req.login(sessionUser, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userRole: user.userRole,
          profileImageUrl: user.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Error during password login:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Forgot Password - Step 1: Send reset OTP
  app.post("/api/auth/forgot-password", async (req: any, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if user exists with this email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          message: "No account found with this email address.",
          userNotFound: true,
        });
      }

      // Check if user has a password (can only reset password if they registered with email/password)
      if (!user.passwordHash) {
        return res.status(400).json({
          message:
            "This account was created with a different login method. Please use OTP login instead.",
        });
      }

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await storage.createOtpCode(email, otp, expiresAt);

      // Send password reset OTP email
      const emailSent = await sendOtpEmail(email, otp, "Password Reset");

      if (!emailSent) {
        return res.status(500).json({
          message: "Failed to send password reset email. Please try again.",
        });
      }

      // Clean up expired codes periodically
      storage.deleteExpiredOtpCodes().catch(console.error);

      res.json({
        message: "Password reset code sent successfully",
        email: email.toLowerCase(),
        expiresIn: 600,
      });
    } catch (error) {
      console.error("Error sending forgot password OTP:", error);
      res.status(500).json({ message: "Failed to send password reset code" });
    }
  });

  // Forgot Password - Step 2: Verify OTP and reset password
  app.post("/api/auth/reset-password", async (req: any, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res
          .status(400)
          .json({ message: "Email, OTP, and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters long" });
      }

      // Get valid OTP code
      const otpCode = await storage.getValidOtpCode(email, otp);
      if (!otpCode) {
        return res.status(400).json({
          message: "Invalid or expired code. Please request a new one.",
        });
      }

      // Check attempts
      if (otpCode.attempts && otpCode.attempts >= 5) {
        return res
          .status(400)
          .json({ message: "Too many attempts. Please request a new code." });
      }

      await storage.incrementOtpAttempts(otpCode.id);

      if (otpCode.code !== otp) {
        return res
          .status(400)
          .json({ message: "Incorrect code. Please try again." });
      }

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update user's password
      await storage.updateUserPassword(user.id, passwordHash);

      // Mark OTP as verified
      await storage.markOtpVerified(otpCode.id);

      // Send password changed notification email
      if (user.email) {
        sendPasswordChangedEmail(user.email, user.firstName || "").catch(
          console.error,
        );
      }

      res.json({
        message:
          "Password reset successfully! You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Check if current user has a password set (for showing "Set Password" option)
  app.get("/api/auth/has-password", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        hasPassword: !!user.passwordHash,
        email: user.email,
      });
    } catch (error) {
      console.error("Error checking password status:", error);
      res.status(500).json({ message: "Failed to check password status" });
    }
  });

  // Set password for authenticated users who don't have one (OTP-only accounts)
  app.post("/api/auth/set-password", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { password, confirmPassword } = req.body;

      if (!password || !confirmPassword) {
        return res
          .status(400)
          .json({ message: "Password and confirmation are required" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords don't match" });
      }

      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters long" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has a password
      if (user.passwordHash) {
        return res.status(400).json({
          message:
            "You already have a password set. Use 'Change Password' instead.",
        });
      }

      // Hash and set the password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      await storage.updateUserPassword(user.id, passwordHash);

      res.json({
        message:
          "Password set successfully! You can now log in with your email and password.",
      });
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Change password for authenticated users who already have a password
  app.post("/api/auth/change-password", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          message:
            "Current password, new password, and confirmation are required",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New passwords don't match" });
      }

      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "New password must be at least 8 characters long" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has a password
      if (!user.passwordHash) {
        return res.status(400).json({
          message: "You don't have a password set. Use 'Set Password' instead.",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );
      if (!isCurrentPasswordValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Hash and update the new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      await storage.updateUserPassword(user.id, newPasswordHash);

      // Send password changed notification email
      if (user.email) {
        sendPasswordChangedEmail(user.email, user.firstName || "").catch(
          console.error,
        );
      }

      res.json({
        message: "Password changed successfully!",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Admin promotion endpoint - requires an existing admin session
  app.post("/api/admin/promote", isAuthenticated, async (req: any, res) => {
    try {
      // Only existing admins may promote other users
      const { user: callerUser, ok } = await canAdminAccess(req);
      if (!ok || callerUser?.userRole !== "admin") {
        return res.status(403).json({ message: "Forbidden: admin access required" });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const updatedUser = await storage.promoteUserToAdmin(email);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User promoted to admin", user: updatedUser });
    } catch (error) {
      console.error("Error promoting user to admin:", error);
      res.status(500).json({ message: "Failed to promote user to admin" });
    }
  });

  // ── Sub-Admin Permission Management ──────────────────────────────────────

  // Helper: check full admin OR specific sub-admin permission
  async function canAdminAccess(
    req: any,
    permission?: string,
  ): Promise<{ user: any; ok: boolean }> {
    const userId = req.user?.claims?.sub ?? req.user?.id;
    const user = await storage.getUser(userId);
    if (!user) return { user: null, ok: false };
    if (user.userRole === "admin") return { user, ok: true };
    if (!permission) return { user, ok: false };
    const [row] = await db
      .select()
      .from(adminPermissions)
      .where(eq(adminPermissions.userId, userId))
      .limit(1);
    if (!row) return { user, ok: false };
    return { user, ok: (row.permissions as string[]).includes(permission) };
  }

  // GET /api/admin/my-permissions — frontend uses this to know what to show
  app.get(
    "/api/admin/my-permissions",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub ?? req.user?.id;
        const user = await storage.getUser(userId);
        if (!user) return res.status(401).json({ error: "Unauthorized" });
        if (user.userRole === "admin") {
          return res.json({
            isFullAdmin: true,
            permissions: [
              "accounts",
              "subscriptions",
              "reports",
              "properties",
              "bookings",
              "kyc",
              "content",
              "support",
              "coming_soon",
            ],
          });
        }
        const [row] = await db
          .select()
          .from(adminPermissions)
          .where(eq(adminPermissions.userId, userId))
          .limit(1);
        res.json({
          isFullAdmin: false,
          permissions: (row?.permissions as string[]) ?? [],
        });
      } catch (e) {
        res.status(500).json({ error: "Failed" });
      }
    },
  );

  // GET /api/admin/sub-admins — list all sub-admins
  app.get("/api/admin/sub-admins", isAuthenticated, async (req: any, res) => {
    try {
      const { user, ok } = await canAdminAccess(req);
      if (!ok || user?.userRole !== "admin")
        return res.status(403).json({ error: "Full admin required" });
      const rows = await db
        .select({
          id: adminPermissions.id,
          userId: adminPermissions.userId,
          email: adminPermissions.email,
          permissions: adminPermissions.permissions,
          createdAt: adminPermissions.createdAt,
          updatedAt: adminPermissions.updatedAt,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(adminPermissions)
        .leftJoin(users, eq(adminPermissions.userId, users.id))
        .orderBy(desc(adminPermissions.createdAt));
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch sub-admins" });
    }
  });

  // POST /api/admin/sub-admins — grant permissions
  app.post("/api/admin/sub-admins", isAuthenticated, async (req: any, res) => {
    try {
      const { user, ok } = await canAdminAccess(req);
      if (!ok || user?.userRole !== "admin")
        return res.status(403).json({ error: "Full admin required" });
      const { email, permissions } = req.body;
      if (!email || !Array.isArray(permissions))
        return res
          .status(400)
          .json({ error: "email and permissions required" });
      if (!email.endsWith("@zecoho.com"))
        return res.status(400).json({
          error:
            "Only @zecoho.com email addresses can be granted sub-admin access",
        });
      const targetUser = await storage.getUserByEmail(email.toLowerCase());
      if (!targetUser)
        return res.status(404).json({
          error:
            "No account found with that email. The user must sign up first.",
        });
      // Upsert: if row exists, update it
      const [existing] = await db
        .select()
        .from(adminPermissions)
        .where(eq(adminPermissions.userId, targetUser.id))
        .limit(1);
      if (existing) {
        const [updated] = await db
          .update(adminPermissions)
          .set({ permissions, updatedAt: new Date() })
          .where(eq(adminPermissions.id, existing.id))
          .returning();
        return res.json(updated);
      }
      const adminId = req.user?.claims?.sub ?? req.user?.id;
      const [created] = await db
        .insert(adminPermissions)
        .values({
          userId: targetUser.id,
          email: email.toLowerCase(),
          grantedBy: adminId,
          permissions,
        })
        .returning();
      res.json(created);
    } catch (e) {
      console.error("sub-admin grant error:", e);
      res.status(500).json({ error: "Failed to grant access" });
    }
  });

  // PATCH /api/admin/sub-admins/:id — update permissions
  app.patch(
    "/api/admin/sub-admins/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { user, ok } = await canAdminAccess(req);
        if (!ok || user?.userRole !== "admin")
          return res.status(403).json({ error: "Full admin required" });
        const { permissions } = req.body;
        if (!Array.isArray(permissions))
          return res.status(400).json({ error: "permissions array required" });
        const [updated] = await db
          .update(adminPermissions)
          .set({ permissions, updatedAt: new Date() })
          .where(eq(adminPermissions.id, req.params.id))
          .returning();
        if (!updated) return res.status(404).json({ error: "Not found" });
        res.json(updated);
      } catch (e) {
        res.status(500).json({ error: "Failed to update" });
      }
    },
  );

  // DELETE /api/admin/sub-admins/:id — revoke access
  app.delete(
    "/api/admin/sub-admins/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { user, ok } = await canAdminAccess(req);
        if (!ok || user?.userRole !== "admin")
          return res.status(403).json({ error: "Full admin required" });
        await db
          .delete(adminPermissions)
          .where(eq(adminPermissions.id, req.params.id));
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: "Failed to revoke" });
      }
    },
  );

  // ── Admin CSV Exports ─────────────────────────────────────────────────────

  function csvEscape(val: any): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n"))
      return `"${str.replace(/"/g, '""')}"`;
    return str;
  }
  function buildCsv(headers: string[], rows: any[][]): string {
    return [
      headers.join(","),
      ...rows.map((r) => r.map(csvEscape).join(",")),
    ].join("\n");
  }

  // Owners export
  app.get(
    "/api/admin/export/owners",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { ok } = await canAdminAccess(req, "reports");
        if (!ok) return res.status(403).json({ error: "Access denied" });
        const allOwners = await db
          .select()
          .from(users)
          .where(eq(users.userRole, "owner"))
          .orderBy(users.createdAt);
        const headers = [
          "ID",
          "First Name",
          "Last Name",
          "Email",
          "Phone",
          "Alt Phone",
          "KYC Status",
          "Suspended",
          "Created At",
        ];
        const rows = allOwners.map((u) => [
          u.id,
          u.firstName,
          u.lastName,
          u.email,
          u.phone,
          u.alternativePhone,
          u.kycStatus,
          u.suspendedAt ? "Yes" : "No",
          u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "",
        ]);
        const fmt = (req.query.format as string) || "csv";
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="zecoho-owners-${new Date().toISOString().slice(0, 10)}.csv"`,
        );
        res.send(buildCsv(headers, rows));
      } catch (e) {
        res.status(500).json({ error: "Export failed" });
      }
    },
  );

  // Customers export
  app.get(
    "/api/admin/export/customers",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { ok } = await canAdminAccess(req, "reports");
        if (!ok) return res.status(403).json({ error: "Access denied" });
        const guests = await db
          .select()
          .from(users)
          .where(eq(users.userRole, "guest"))
          .orderBy(users.createdAt);
        const headers = [
          "ID",
          "First Name",
          "Last Name",
          "Email",
          "Phone",
          "Deactivated",
          "Created At",
        ];
        const rows = guests.map((u) => [
          u.id,
          u.firstName,
          u.lastName,
          u.email,
          u.phone,
          u.isDeactivated ? "Yes" : "No",
          u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "",
        ]);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="zecoho-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
        );
        res.send(buildCsv(headers, rows));
      } catch (e) {
        res.status(500).json({ error: "Export failed" });
      }
    },
  );

  // Bookings export
  app.get(
    "/api/admin/export/bookings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { ok } = await canAdminAccess(req, "reports");
        if (!ok) return res.status(403).json({ error: "Access denied" });
        const allBookings = await db
          .select({
            id: bookings.id,
            propertyId: bookings.propertyId,
            guestId: bookings.guestId,
            status: bookings.status,
            checkIn: bookings.checkIn,
            checkOut: bookings.checkOut,
            guests: bookings.guests,
            totalPrice: bookings.totalPrice,
            guestName: bookings.guestName,
            guestEmail: bookings.guestEmail,
            guestMobile: bookings.guestMobile,
            createdAt: bookings.createdAt,
          })
          .from(bookings)
          .orderBy(desc(bookings.createdAt));
        const headers = [
          "Booking ID",
          "Property ID",
          "Guest ID",
          "Guest Name",
          "Guest Email",
          "Guest Mobile",
          "Status",
          "Check In",
          "Check Out",
          "Guests",
          "Total Price",
          "Created At",
        ];
        const rows = allBookings.map((b) => [
          b.id,
          b.propertyId,
          b.guestId,
          b.guestName,
          b.guestEmail,
          b.guestMobile,
          b.status,
          b.checkIn ? new Date(b.checkIn).toLocaleDateString("en-IN") : "",
          b.checkOut ? new Date(b.checkOut).toLocaleDateString("en-IN") : "",
          b.guests,
          b.totalPrice,
          b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "",
        ]);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="zecoho-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
        );
        res.send(buildCsv(headers, rows));
      } catch (e) {
        res.status(500).json({ error: "Export failed" });
      }
    },
  );

  // Properties export
  app.get(
    "/api/admin/export/properties",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { ok } = await canAdminAccess(req, "reports");
        if (!ok) return res.status(403).json({ error: "Access denied" });
        const allProps = await db
          .select({
            id: propertiesTable.id,
            title: propertiesTable.title,
            ownerId: propertiesTable.ownerId,
            status: propertiesTable.status,
            city: propertiesTable.propCity,
            state: propertiesTable.propState,
            propertyType: propertiesTable.propertyType,
            pricePerNight: propertiesTable.pricePerNight,
            rating: propertiesTable.rating,
            reviewCount: propertiesTable.reviewCount,
            createdAt: propertiesTable.createdAt,
          })
          .from(propertiesTable)
          .orderBy(desc(propertiesTable.createdAt));
        const headers = [
          "Property ID",
          "Title",
          "Owner ID",
          "Status",
          "City",
          "State",
          "Type",
          "Price/Night",
          "Rating",
          "Reviews",
          "Created At",
        ];
        const rows = allProps.map((p) => [
          p.id,
          p.title,
          p.ownerId,
          p.status,
          p.city,
          p.state,
          p.propertyType,
          p.pricePerNight,
          p.rating,
          p.reviewCount,
          p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "",
        ]);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="zecoho-properties-${new Date().toISOString().slice(0, 10)}.csv"`,
        );
        res.send(buildCsv(headers, rows));
      } catch (e) {
        res.status(500).json({ error: "Export failed" });
      }
    },
  );

  // Subscriptions export
  app.get(
    "/api/admin/export/subscriptions",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { ok } = await canAdminAccess(req, "reports");
        if (!ok) return res.status(403).json({ error: "Access denied" });
        const subs = await db
          .select({
            id: ownerSubscriptions.id,
            ownerId: ownerSubscriptions.ownerId,
            tier: ownerSubscriptions.tier,
            status: ownerSubscriptions.status,
            duration: ownerSubscriptions.duration,
            pricePaid: ownerSubscriptions.pricePaid,
            isWaived: ownerSubscriptions.isWaived,
            startDate: ownerSubscriptions.startDate,
            endDate: ownerSubscriptions.endDate,
            createdAt: ownerSubscriptions.createdAt,
            ownerEmail: users.email,
            ownerFirst: users.firstName,
            ownerLast: users.lastName,
          })
          .from(ownerSubscriptions)
          .leftJoin(users, eq(ownerSubscriptions.ownerId, users.id))
          .orderBy(desc(ownerSubscriptions.createdAt));
        const headers = [
          "Sub ID",
          "Owner ID",
          "Owner Name",
          "Owner Email",
          "Tier",
          "Status",
          "Duration",
          "Price Paid",
          "Waived",
          "Start Date",
          "End Date",
          "Created At",
        ];
        const rows = subs.map((s) => [
          s.id,
          s.ownerId,
          `${s.ownerFirst ?? ""} ${s.ownerLast ?? ""}`.trim(),
          s.ownerEmail,
          s.tier,
          s.status,
          s.duration,
          s.pricePaid,
          s.isWaived ? "Yes" : "No",
          s.startDate ? new Date(s.startDate).toLocaleDateString("en-IN") : "",
          s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN") : "",
          s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "",
        ]);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="zecoho-subscriptions-${new Date().toISOString().slice(0, 10)}.csv"`,
        );
        res.send(buildCsv(headers, rows));
      } catch (e) {
        res.status(500).json({ error: "Export failed" });
      }
    },
  );

  // Test/Development admin login endpoint - only for testing admin features
  app.post("/api/test/admin-login", async (req: any, res) => {
    try {
      // This is a development-only endpoint for testing
      // In production, this should not exist
      const user = await storage.getUser("test-admin-user");

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Test admin user not found or not admin" });
      }

      // Set up a fake session for testing
      req.user = {
        claims: { sub: "test-admin-user" },
        access_token: "test-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      req.session.passport = { user: { claims: { sub: "test-admin-user" } } };

      res.json({
        message: "Test admin session created",
        user: { ...user, testSessionActive: true },
      });
    } catch (error) {
      console.error("Error in test admin login:", error);
      res.status(500).json({ message: "Test admin login failed" });
    }
  });

  // Self-promotion to admin (only works if no admin exists)
  app.post(
    "/api/promote-me-to-admin",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const currentUser = await storage.getUser(userId);

        if (!currentUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if user is already admin
        if (currentUser.userRole === "admin") {
          return res.json({
            message: "You are already an admin",
            user: currentUser,
          });
        }

        // Check if any admin exists in the system
        const allUsers = await db.select().from(users);
        const existingAdmin = allUsers.find((u) => u.userRole === "admin");

        if (existingAdmin) {
          return res.status(403).json({
            message:
              "An admin already exists. Please contact the existing admin for promotion.",
            adminEmail: existingAdmin.email,
          });
        }

        // No admin exists - promote this user to be the first admin
        const updatedUser = await storage.upsertUser({
          ...currentUser,
          userRole: "admin",
        });

        res.json({
          message:
            "Successfully promoted to admin! You are now the first admin of ZECOHO.",
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error promoting to admin:", error);
        res.status(500).json({ message: "Failed to promote to admin" });
      }
    },
  );

  // KYC Application submission - requires authentication
  app.post("/api/kyc/submit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Check if user already has a KYC application
      const existingKyc = await storage.getUserKycApplication(userId);
      if (existingKyc) {
        // If existing application is rejected, update it instead of blocking
        if (existingKyc.status === "rejected") {
          // Validate mandatory documents
          const { propertyOwnershipDocs, identityProofDocs } = req.body;
          const missingDocs: string[] = [];

          if (
            !propertyOwnershipDocs ||
            !Array.isArray(propertyOwnershipDocs) ||
            propertyOwnershipDocs.length === 0
          ) {
            missingDocs.push("Property Ownership Proof");
          }

          if (
            !identityProofDocs ||
            !Array.isArray(identityProofDocs) ||
            identityProofDocs.length === 0
          ) {
            missingDocs.push("Owner Identity Proof");
          }

          if (missingDocs.length > 0) {
            return res.status(400).json({
              message: `Missing required documents: ${missingDocs.join(", ")}`,
            });
          }

          const validatedData = insertKycApplicationSchema.parse(req.body);
          const updatedApplication = await storage.updateKycApplication(
            existingKyc.id,
            validatedData,
          );

          // Send email notification for resubmission (fire-and-forget)
          const user = await storage.getUser(userId);
          if (user?.email) {
            sendKycSubmittedEmail(
              user.email,
              user.firstName || "Property Owner",
            ).catch(console.error);
          }

          return res.json({
            message: "KYC application resubmitted successfully",
            applicationId: updatedApplication?.id,
            status: updatedApplication?.status,
          });
        }

        return res.status(400).json({
          message: "You have already submitted a KYC application",
          status: existingKyc.status,
        });
      }

      // Validate mandatory documents
      const { propertyOwnershipDocs, identityProofDocs } = req.body;
      const missingDocs: string[] = [];

      if (
        !propertyOwnershipDocs ||
        !Array.isArray(propertyOwnershipDocs) ||
        propertyOwnershipDocs.length === 0
      ) {
        missingDocs.push("Property Ownership Proof");
      }

      if (
        !identityProofDocs ||
        !Array.isArray(identityProofDocs) ||
        identityProofDocs.length === 0
      ) {
        missingDocs.push("Owner Identity Proof");
      }

      if (missingDocs.length > 0) {
        return res.status(400).json({
          message: `Missing required documents: ${missingDocs.join(", ")}`,
        });
      }

      const validatedData = insertKycApplicationSchema.parse(req.body);
      const application = await storage.createKycApplication(
        userId,
        validatedData,
      );

      // Send email notification for new submission (fire-and-forget)
      const user = await storage.getUser(userId);
      if (user?.email) {
        sendKycSubmittedEmail(
          user.email,
          user.firstName || "Property Owner",
        ).catch(console.error);
      }

      res.json({
        message: "KYC application submitted successfully",
        applicationId: application.id,
        status: application.status,
      });
    } catch (error) {
      console.error("Error submitting KYC application:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid application data", error: error.message });
      }
      res.status(500).json({ message: "Failed to submit KYC application" });
    }
  });

  // Combined KYC and Property submission - for new owners listing their first property
  app.post(
    "/api/kyc/submit-with-property",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const {
          kyc,
          property,
          existingPropertyId: wizardDraftPropertyId,
          referralCode,
        } = req.body;

        if (!kyc || !property) {
          return res
            .status(400)
            .json({ message: "Both KYC and property data are required" });
        }

        // Check if user already has a KYC application
        const existingKyc = await storage.getUserKycApplication(userId);
        const isResubmission = existingKyc && existingKyc.status === "rejected";
        const isVerified = existingKyc && existingKyc.status === "verified";
        const isPending = existingKyc && existingKyc.status === "pending";

        // Validate property images
        if (
          !property.images ||
          !Array.isArray(property.images) ||
          property.images.length === 0
        ) {
          return res
            .status(400)
            .json({ message: "At least one property image is required" });
        }

        let kycApplication = existingKyc;
        let createdProperty;

        // If user has verified or pending KYC, skip KYC creation and just create the property
        if (isVerified || isPending) {
          try {
            // Create or update property for verified/pending KYC users
            const { amenityIds, ...propertyData } = property;

            const propertyPayload = {
              title: propertyData.title,
              description: propertyData.description,
              propertyType: propertyData.propertyType,
              destination: propertyData.destination,
              address: propertyData.address || null,
              latitude: propertyData.latitude
                ? String(propertyData.latitude)
                : null,
              longitude: propertyData.longitude
                ? String(propertyData.longitude)
                : null,
              geoVerified: propertyData.geoVerified || false,
              geoSource: propertyData.geoSource || null,
              images: propertyData.images || [],
              categorizedImages: propertyData.categorizedImages || null,
              videos: propertyData.videos || [],
              pricePerNight: String(propertyData.pricePerNight),
              singleOccupancyPrice: propertyData.singleOccupancyPrice
                ? String(propertyData.singleOccupancyPrice)
                : null,
              doubleOccupancyPrice: propertyData.doubleOccupancyPrice
                ? String(propertyData.doubleOccupancyPrice)
                : null,
              tripleOccupancyPrice: propertyData.tripleOccupancyPrice
                ? String(propertyData.tripleOccupancyPrice)
                : null,
              maxGuests: propertyData.maxGuests || 2,
              bedrooms: propertyData.bedrooms || 1,
              beds: propertyData.beds || 1,
              bathrooms: propertyData.bathrooms || 1,
              policies: propertyData.policies || null,
              checkInTime: propertyData.checkInTime || null,
              checkOutTime: propertyData.checkOutTime || null,
              localIdAllowed: propertyData.localIdAllowed ?? false,
              foreignGuestsAllowed: propertyData.foreignGuestsAllowed ?? false,
              coupleFriendly: propertyData.coupleFriendly ?? false,
              hourlyBookingAllowed: propertyData.hourlyBookingAllowed ?? false,
              cancellationPolicyType:
                propertyData.cancellationPolicyType || "flexible",
              freeCancellationHours: propertyData.freeCancellationHours ?? 24,
              partialRefundPercent: propertyData.partialRefundPercent ?? 50,
              status: "pending" as const,
            };

            if (wizardDraftPropertyId) {
              // Update existing draft property → promote to pending
              const updatedProp = await storage.updateProperty(
                wizardDraftPropertyId,
                propertyPayload,
              );
              if (!updatedProp) throw new Error("Draft property not found");
              createdProperty = updatedProp;
            } else {
              // Check for an existing draft property (wizard state may have been lost on refresh)
              const ownerProps = await storage.getProperties({
                ownerId: userId,
              });
              const existingDraft = ownerProps.find(
                (p: any) => p.status === "draft",
              );
              if (existingDraft) {
                const updatedProp = await storage.updateProperty(
                  existingDraft.id,
                  propertyPayload,
                );
                if (!updatedProp) throw new Error("Draft property not found");
                createdProperty = updatedProp;
              } else {
                createdProperty = await storage.createProperty({
                  ...propertyPayload,
                  ownerId: userId,
                });
              }
            }

            // Set amenities if provided
            if (amenityIds && amenityIds.length > 0) {
              await storage.setPropertyAmenities(
                createdProperty.id,
                amenityIds,
              );
            }

            // Create room types if provided and not already created via auto-save draft
            const { roomTypes } = req.body;
            if (
              !wizardDraftPropertyId &&
              roomTypes &&
              Array.isArray(roomTypes) &&
              roomTypes.length > 0
            ) {
              for (const rt of roomTypes) {
                // Validate required fields
                const basePrice = parseFloat(rt.basePrice);
                const maxGuests = parseInt(rt.maxGuests);
                const totalRooms = parseInt(rt.totalRooms);

                if (!rt.name || isNaN(basePrice) || basePrice < 100) {
                  throw new Error(
                    `Invalid room type: ${rt.name || "unnamed"} - base price must be at least 100`,
                  );
                }
                if (isNaN(maxGuests) || maxGuests < 1) {
                  throw new Error(
                    `Invalid room type: ${rt.name} - max guests must be at least 1`,
                  );
                }
                if (isNaN(totalRooms) || totalRooms < 1) {
                  throw new Error(
                    `Invalid room type: ${rt.name} - total rooms must be at least 1`,
                  );
                }

                const createdRoomType = await storage.createRoom({
                  propertyId: createdProperty.id,
                  name: rt.name,
                  description: rt.description || null,
                  basePrice: String(basePrice),
                  originalPrice: rt.originalPrice
                    ? String(rt.originalPrice)
                    : null,
                  singleOccupancyPrice: String(basePrice),
                  doubleOccupancyPrice: rt.doubleOccupancyAdjustment
                    ? String(rt.doubleOccupancyAdjustment)
                    : null,
                  tripleOccupancyPrice: rt.tripleOccupancyAdjustment
                    ? String(rt.tripleOccupancyAdjustment)
                    : null,
                  maxGuests: maxGuests,
                  totalRooms: totalRooms,
                  isActive: true,
                  bedType: rt.bedType || null,
                  viewType: rt.viewType || null,
                  bathroomType: rt.bathroomType || null,
                  smokingPolicy: rt.smokingAllowed ? "Smoking" : "Non-smoking",
                  roomSizeSqft: rt.roomSizeSqft
                    ? parseInt(rt.roomSizeSqft)
                    : null,
                  hasAC: rt.hasAC ?? false,
                  hasTV: rt.hasTV ?? false,
                  hasWifi: rt.hasWifi ?? false,
                  hasFridge: rt.hasFridge ?? false,
                  hasKettle: rt.hasKettle ?? false,
                  hasSafe: rt.hasSafe ?? false,
                  hasBalcony: rt.hasBalcony ?? false,
                  hasHeater: rt.hasHeater ?? false,
                  roomAmenityIds: rt.roomAmenityIds ?? [],
                });

                // Create meal options for this room type
                if (rt.mealOptions && Array.isArray(rt.mealOptions)) {
                  for (const mo of rt.mealOptions) {
                    await storage.createRoomOption({
                      roomTypeId: createdRoomType.id,
                      name: mo.name,
                      inclusions: mo.inclusions || null,
                      priceAdjustment: String(mo.priceAdjustment || 0),
                      isActive: true,
                    });
                  }
                }
              }
            }

            const statusMessage = isVerified
              ? "Property submitted successfully! Your property is pending admin review."
              : "Property submitted successfully! Both your KYC and new property are pending admin review.";

            // Notify admins about new property
            try {
              const adminUsers = await storage.getAdminUsers();
              const ownerUser = await storage.getUser(userId);
              for (const admin of adminUsers) {
                await createNotification({
                  userId: admin.id,
                  title: "New Property Listed",
                  body: `${ownerUser?.firstName || "An owner"} has listed "${createdProperty.title}" — pending your review.`,
                  type: "property_pending",
                  entityId: createdProperty.id,
                  entityType: "property",
                });
                broadcastToUser(admin.id, { type: "notification_update" });
              }
            } catch (notifError) {
              console.error("Failed to notify admins:", notifError);
            }

            return res.json({
              message: statusMessage,
              kycApplicationId: existingKyc.id,
              propertyId: createdProperty.id,
              status: "pending",
              kycSkipped: true,
            });
          } catch (innerError) {
            throw innerError;
          }
        }

        // For new users or rejected KYC resubmission - validate KYC documents
        const { propertyOwnershipDocs, identityProofDocs } = kyc;
        const missingDocs: string[] = [];

        if (
          !propertyOwnershipDocs ||
          !Array.isArray(propertyOwnershipDocs) ||
          propertyOwnershipDocs.length === 0
        ) {
          missingDocs.push("Property Ownership Proof");
        }

        if (
          !identityProofDocs ||
          !Array.isArray(identityProofDocs) ||
          identityProofDocs.length === 0
        ) {
          missingDocs.push("Owner Identity Proof");
        }

        if (missingDocs.length > 0) {
          return res.status(400).json({
            message: `Missing required documents: ${missingDocs.join(", ")}`,
          });
        }

        // Parse KYC data
        const kycData = insertKycApplicationSchema.parse(kyc);

        try {
          // Step 1: Create or update KYC application
          if (isResubmission && existingKyc) {
            // Update existing rejected KYC application
            kycApplication = await storage.updateKycApplication(
              existingKyc.id,
              kycData,
            );
          } else {
            // Create new KYC application
            kycApplication = await storage.createKycApplication(
              userId,
              kycData,
            );
          }

          // Step 2: Update user's KYC status to pending
          const currentUser = await storage.getUser(userId);
          if (currentUser) {
            await storage.upsertUser({
              ...currentUser,
              kycStatus: "pending",
            });
          }

          // Step 3: Create or update property with pending status
          const { amenityIds, ...propertyData } = property;

          const propertyPayload2 = {
            title: propertyData.title,
            description: propertyData.description,
            propertyType: propertyData.propertyType,
            destination: propertyData.destination,
            address: propertyData.address || null,
            latitude: propertyData.latitude
              ? String(propertyData.latitude)
              : null,
            longitude: propertyData.longitude
              ? String(propertyData.longitude)
              : null,
            geoVerified: propertyData.geoVerified || false,
            geoSource: propertyData.geoSource || null,
            images: propertyData.images || [],
            categorizedImages: propertyData.categorizedImages || null,
            videos: propertyData.videos || [],
            pricePerNight: String(propertyData.pricePerNight),
            singleOccupancyPrice: propertyData.singleOccupancyPrice
              ? String(propertyData.singleOccupancyPrice)
              : null,
            doubleOccupancyPrice: propertyData.doubleOccupancyPrice
              ? String(propertyData.doubleOccupancyPrice)
              : null,
            tripleOccupancyPrice: propertyData.tripleOccupancyPrice
              ? String(propertyData.tripleOccupancyPrice)
              : null,
            maxGuests: propertyData.maxGuests || 2,
            bedrooms: propertyData.bedrooms || 1,
            beds: propertyData.beds || 1,
            bathrooms: propertyData.bathrooms || 1,
            policies: propertyData.policies || null,
            checkInTime: propertyData.checkInTime || null,
            checkOutTime: propertyData.checkOutTime || null,
            localIdAllowed: propertyData.localIdAllowed ?? false,
            foreignGuestsAllowed: propertyData.foreignGuestsAllowed ?? false,
            coupleFriendly: propertyData.coupleFriendly ?? false,
            hourlyBookingAllowed: propertyData.hourlyBookingAllowed ?? false,
            cancellationPolicyType:
              propertyData.cancellationPolicyType || "flexible",
            freeCancellationHours: propertyData.freeCancellationHours ?? 24,
            partialRefundPercent: propertyData.partialRefundPercent ?? 50,
            status: "pending" as const,
          };

          if (wizardDraftPropertyId) {
            const updatedProp2 = await storage.updateProperty(
              wizardDraftPropertyId,
              propertyPayload2,
            );
            if (!updatedProp2) throw new Error("Draft property not found");
            createdProperty = updatedProp2;
          } else {
            // Check for an existing draft property (wizard state may have been lost on refresh)
            const ownerProps2 = await storage.getProperties({
              ownerId: userId,
            });
            const existingDraft2 = ownerProps2.find(
              (p: any) => p.status === "draft",
            );
            if (existingDraft2) {
              const updatedProp2b = await storage.updateProperty(
                existingDraft2.id,
                propertyPayload2,
              );
              if (!updatedProp2b) throw new Error("Draft property not found");
              createdProperty = updatedProp2b;
            } else {
              createdProperty = await storage.createProperty({
                ...propertyPayload2,
                ownerId: userId,
              });
            }
          }

          // Step 4: Set amenities if provided
          if (amenityIds && amenityIds.length > 0) {
            await storage.setPropertyAmenities(createdProperty.id, amenityIds);
          }

          // Step 5: Create room types if provided and not already created via auto-save draft
          const { roomTypes } = req.body;
          if (
            !wizardDraftPropertyId &&
            roomTypes &&
            Array.isArray(roomTypes) &&
            roomTypes.length > 0
          ) {
            for (const rt of roomTypes) {
              // Validate required fields
              const basePrice = parseFloat(rt.basePrice);
              const maxGuests = parseInt(rt.maxGuests);
              const totalRooms = parseInt(rt.totalRooms);

              if (!rt.name || isNaN(basePrice) || basePrice < 100) {
                throw new Error(
                  `Invalid room type: ${rt.name || "unnamed"} - base price must be at least 100`,
                );
              }
              if (isNaN(maxGuests) || maxGuests < 1) {
                throw new Error(
                  `Invalid room type: ${rt.name} - max guests must be at least 1`,
                );
              }
              if (isNaN(totalRooms) || totalRooms < 1) {
                throw new Error(
                  `Invalid room type: ${rt.name} - total rooms must be at least 1`,
                );
              }

              const createdRoomType = await storage.createRoom({
                propertyId: createdProperty.id,
                name: rt.name,
                description: rt.description || null,
                basePrice: String(basePrice),
                originalPrice: rt.originalPrice
                  ? String(rt.originalPrice)
                  : null,
                singleOccupancyPrice: String(basePrice),
                doubleOccupancyPrice: rt.doubleOccupancyAdjustment
                  ? String(rt.doubleOccupancyAdjustment)
                  : null,
                tripleOccupancyPrice: rt.tripleOccupancyAdjustment
                  ? String(rt.tripleOccupancyAdjustment)
                  : null,
                maxGuests: maxGuests,
                totalRooms: totalRooms,
                isActive: true,
                bedType: rt.bedType || null,
                viewType: rt.viewType || null,
                bathroomType: rt.bathroomType || null,
                smokingPolicy: rt.smokingAllowed ? "Smoking" : "Non-smoking",
                roomSizeSqft: rt.roomSizeSqft
                  ? parseInt(rt.roomSizeSqft)
                  : null,
                hasAC: rt.hasAC ?? false,
                hasTV: rt.hasTV ?? false,
                hasWifi: rt.hasWifi ?? false,
                hasFridge: rt.hasFridge ?? false,
                hasKettle: rt.hasKettle ?? false,
                hasSafe: rt.hasSafe ?? false,
                hasBalcony: rt.hasBalcony ?? false,
                hasHeater: rt.hasHeater ?? false,
                roomAmenityIds: rt.roomAmenityIds ?? [],
              });

              // Create meal options for this room type
              if (rt.mealOptions && Array.isArray(rt.mealOptions)) {
                for (const mo of rt.mealOptions) {
                  await storage.createRoomOption({
                    roomTypeId: createdRoomType.id,
                    name: mo.name,
                    inclusions: mo.inclusions || null,
                    priceAdjustment: String(mo.priceAdjustment || 0),
                    isActive: true,
                  });
                }
              }
            }
          }
        } catch (innerError) {
          // Rollback: If property creation fails after KYC was created, delete the KYC application
          if (kycApplication && !createdProperty && !isResubmission) {
            try {
              await storage.deleteKycApplication(kycApplication.id);
              // Also revert user's KYC status
              const currentUser = await storage.getUser(userId);
              if (currentUser) {
                await storage.upsertUser({
                  ...currentUser,
                  kycStatus: "not_started",
                });
              }
            } catch (rollbackError) {
              console.error("Rollback failed:", rollbackError);
            }
          }
          throw innerError;
        }

        // Send email notification for combined submission (fire-and-forget)
        const user = await storage.getUser(userId);
        if (user?.email) {
          sendKycSubmittedEmail(
            user.email,
            user.firstName || "Property Owner",
          ).catch(console.error);
        }

        // Apply referral code if provided (fire-and-forget, don't fail submission)
        if (referralCode && typeof referralCode === "string") {
          try {
            const { ownerReferrals: ownerReferralsTable } = await import(
              "../shared/schema"
            );
            const [ref] = await db
              .select()
              .from(ownerReferralsTable)
              .where(
                eq(
                  ownerReferralsTable.referralCode,
                  referralCode.trim().toUpperCase(),
                ),
              )
              .limit(1);
            if (ref && !ref.refereeId) {
              await db
                .update(ownerReferralsTable)
                .set({ refereeId: userId, status: "signed_up" })
                .where(eq(ownerReferralsTable.id, ref.id));
            }
          } catch (refErr) {
            console.error("[REFERRAL] Failed to apply referral code:", refErr);
          }
        }

        res.json({
          message:
            "Application submitted successfully! Both KYC and property are pending admin review.",
          kycApplicationId: kycApplication?.id,
          propertyId: createdProperty.id,
          status: "pending",
        });
      } catch (error) {
        console.error("Error submitting combined application:", error);
        if (error instanceof Error && error.name === "ZodError") {
          return res.status(400).json({
            message: "Invalid application data",
            error: error.message,
          });
        }
        res.status(500).json({ message: "Failed to submit application" });
      }
    },
  );

  // Phase 1 Quick Listing - Create draft property without full KYC
  // This allows users to get started quickly and complete KYC later
  app.post(
    "/api/properties/create-draft",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const {
          firstName,
          lastName,
          email,
          phone,
          propertyTitle,
          propCity,
          propState,
          propDistrict,
          propertyType,
          pricePerNight,
          images,
          categorizedImages,
          description,
          latitude,
          longitude,
          geoVerified,
          geoSource,
        } = req.body;

        // Validate required fields
        if (!propertyTitle || propertyTitle.length < 5) {
          return res
            .status(400)
            .json({ message: "Property title must be at least 5 characters" });
        }
        if (!propCity) {
          return res.status(400).json({ message: "City is required" });
        }
        if (!propertyType) {
          return res.status(400).json({ message: "Property type is required" });
        }
        if (!pricePerNight || pricePerNight < 100) {
          return res
            .status(400)
            .json({ message: "Price must be at least ₹100" });
        }
        if (!images || !Array.isArray(images) || images.length === 0) {
          return res
            .status(400)
            .json({ message: "At least one property image is required" });
        }
        if (!latitude || !longitude) {
          return res.status(400).json({
            message:
              "Property location (GPS coordinates) is required. Please use the map picker to set your property's location.",
          });
        }

        // Update user info if provided, and promote to owner role
        const currentUser = await storage.getUser(userId);
        if (currentUser) {
          const updateData: any = { ...currentUser };
          if (firstName) updateData.firstName = firstName;
          if (lastName) updateData.lastName = lastName;
          if (phone) updateData.phone = phone;
          // Promote to owner role if they're still a guest
          if (currentUser.userRole === "guest") {
            updateData.userRole = "owner";
          }
          // Set listing mode to quick if not already set
          if (
            !currentUser.listingMode ||
            currentUser.listingMode === "not_selected"
          ) {
            updateData.listingMode = "quick";
          }
          // Don't update email - it's tied to auth
          await storage.upsertUser(updateData);
        }

        // Create property with draft status (limited visibility, no full KYC required)
        const createdProperty = await storage.createProperty({
          title: propertyTitle,
          description: description || `Welcome to ${propertyTitle}`,
          propertyType: propertyType,
          destination: propCity,
          propCity: propCity,
          propState: propState || null,
          propDistrict: propDistrict || null,
          latitude: latitude ? String(latitude) : null,
          longitude: longitude ? String(longitude) : null,
          geoVerified: geoVerified || false,
          geoSource: geoSource || null,
          images: images,
          categorizedImages: categorizedImages || null,
          pricePerNight: String(pricePerNight),
          maxGuests: 2,
          bedrooms: 1,
          beds: 1,
          bathrooms: 1,
          ownerId: userId,
          status: "draft", // Draft status = limited visibility until KYC complete
        });

        res.json({
          message: "Draft listing created! Complete your KYC to go fully live.",
          propertyId: createdProperty.id,
          status: "draft",
          nextStep: "Complete KYC verification to publish your listing",
        });
      } catch (error) {
        console.error("Error creating draft property:", error);
        res.status(500).json({ message: "Failed to create draft listing" });
      }
    },
  );

  // Wizard auto-save draft: creates draft property + room types mid-wizard (for pricing/availability steps)
  app.post(
    "/api/owner/wizard-auto-save",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { property, roomTypes, existingPropertyId } = req.body;

        if (!property || !property.title) {
          return res
            .status(400)
            .json({ message: "Property title is required" });
        }

        let savedProperty: any;

        if (existingPropertyId) {
          // Update existing draft property
          savedProperty = await storage.updateProperty(existingPropertyId, {
            title: property.title,
            description: property.description || `Welcome to ${property.title}`,
            propertyType: property.propertyType || "hotel",
            destination: property.propCity || property.destination || "",
            propCity: property.propCity || null,
            propState: property.propState || null,
            propDistrict: property.propDistrict || null,
            propStreetAddress: property.propStreetAddress || null,
            propLocality: property.propLocality || null,
            propPincode: property.propPincode || null,
            latitude:
              property.latitude != null ? String(property.latitude) : null,
            longitude:
              property.longitude != null ? String(property.longitude) : null,
            geoVerified: !!(property.latitude && property.longitude),
            checkInTime: property.checkInTime || null,
            checkOutTime: property.checkOutTime || null,
            coupleFriendly: property.coupleFriendly ?? false,
            localIdAllowed: property.localIdAllowed ?? false,
            foreignGuestsAllowed: property.foreignGuestsAllowed ?? false,
            hourlyBookingAllowed: property.hourlyBookingAllowed ?? false,
            cancellationPolicyType:
              property.cancellationPolicyType || "flexible",
            freeCancellationHours: property.freeCancellationHours ?? 24,
            partialRefundPercent: property.partialRefundPercent ?? 50,
            policies: property.policies || null,
          });
        } else {
          // Before creating a new draft, check if owner already has one (prevents duplicates on page refresh/remount)
          const ownerProperties = await storage.getProperties({
            ownerId: userId,
          });
          const existingDraft = ownerProperties.find(
            (p: any) => p.status === "draft",
          );

          if (existingDraft) {
            // Reuse the existing draft instead of creating a duplicate
            savedProperty = await storage.updateProperty(existingDraft.id, {
              title: property.title,
              description:
                property.description || `Welcome to ${property.title}`,
              propertyType: property.propertyType || "hotel",
              destination: property.propCity || property.destination || "",
              propCity: property.propCity || null,
              propState: property.propState || null,
              propDistrict: property.propDistrict || null,
              propStreetAddress: property.propStreetAddress || null,
              propLocality: property.propLocality || null,
              propPincode: property.propPincode || null,
              latitude:
                property.latitude != null ? String(property.latitude) : null,
              longitude:
                property.longitude != null ? String(property.longitude) : null,
              geoVerified: !!(property.latitude && property.longitude),
              checkInTime: property.checkInTime || null,
              checkOutTime: property.checkOutTime || null,
              coupleFriendly: property.coupleFriendly ?? false,
              localIdAllowed: property.localIdAllowed ?? false,
              foreignGuestsAllowed: property.foreignGuestsAllowed ?? false,
              hourlyBookingAllowed: property.hourlyBookingAllowed ?? false,
              cancellationPolicyType:
                property.cancellationPolicyType || "flexible",
              freeCancellationHours: property.freeCancellationHours ?? 24,
              partialRefundPercent: property.partialRefundPercent ?? 50,
              policies: property.policies || null,
            });
          } else {
            // Create new draft property
            const basePrice = roomTypes?.[0]?.basePrice || 1000;
            savedProperty = await storage.createProperty({
              title: property.title,
              description:
                property.description || `Welcome to ${property.title}`,
              propertyType: property.propertyType || "hotel",
              destination: property.propCity || property.destination || "",
              propCity: property.propCity || null,
              propState: property.propState || null,
              propDistrict: property.propDistrict || null,
              propStreetAddress: property.propStreetAddress || null,
              propLocality: property.propLocality || null,
              propPincode: property.propPincode || null,
              latitude: null,
              longitude: null,
              geoVerified: false,
              images: [],
              categorizedImages: null,
              pricePerNight: String(basePrice),
              maxGuests: 2,
              bedrooms: 1,
              beds: 1,
              bathrooms: 1,
              ownerId: userId,
              status: "draft",
              checkInTime: property.checkInTime || null,
              checkOutTime: property.checkOutTime || null,
              coupleFriendly: property.coupleFriendly ?? false,
              localIdAllowed: property.localIdAllowed ?? false,
              foreignGuestsAllowed: property.foreignGuestsAllowed ?? false,
              hourlyBookingAllowed: property.hourlyBookingAllowed ?? false,
              cancellationPolicyType:
                property.cancellationPolicyType || "flexible",
              freeCancellationHours: property.freeCancellationHours ?? 24,
              partialRefundPercent: property.partialRefundPercent ?? 50,
            });
          }
        }

        const propertyId = savedProperty.id;

        // Create/update room types
        if (roomTypes && Array.isArray(roomTypes) && roomTypes.length > 0) {
          // Get existing room types for this property
          const existingRooms = await storage.getRoomTypes(propertyId);
          // Delete old ones if refreshing (to avoid duplicates on re-save)
          if (existingPropertyId && existingRooms.length > 0) {
            for (const er of existingRooms) {
              await storage.deleteRoom(er.id);
            }
          }
          for (const rt of roomTypes) {
            const basePrice = parseFloat(rt.basePrice);
            if (!rt.name || isNaN(basePrice) || basePrice < 100) continue;
            const created = await storage.createRoom({
              propertyId,
              name: rt.name,
              description: rt.description || null,
              basePrice: String(basePrice),
              originalPrice: rt.originalPrice ? String(rt.originalPrice) : null,
              singleOccupancyPrice: String(basePrice),
              doubleOccupancyPrice: rt.doubleOccupancyAdjustment
                ? String(rt.doubleOccupancyAdjustment)
                : null,
              tripleOccupancyPrice: rt.tripleOccupancyAdjustment
                ? String(rt.tripleOccupancyAdjustment)
                : null,
              maxGuests: parseInt(rt.maxGuests) || 2,
              totalRooms: parseInt(rt.totalRooms) || 1,
              bedType: rt.bedType || null,
              viewType: rt.viewType || null,
              bathroomType: rt.bathroomType || null,
              smokingPolicy: rt.smokingAllowed ? "Smoking" : "Non-smoking",
              roomSizeSqft: rt.roomSizeSqft ? parseInt(rt.roomSizeSqft) : null,
              hasAC: rt.hasAC ?? false,
              hasTV: rt.hasTV ?? false,
              hasWifi: rt.hasWifi ?? false,
              hasFridge: rt.hasFridge ?? false,
              hasKettle: rt.hasKettle ?? false,
              hasSafe: rt.hasSafe ?? false,
              hasBalcony: rt.hasBalcony ?? false,
              hasHeater: rt.hasHeater ?? false,
              roomAmenityIds: rt.roomAmenityIds ?? [],
            });
            // Create meal options
            if (rt.mealOptions && Array.isArray(rt.mealOptions)) {
              for (const mo of rt.mealOptions) {
                if (!mo.name) continue;
                await storage.createRoomOption({
                  roomTypeId: created.id,
                  name: mo.name,
                  inclusions: mo.inclusions || null,
                  priceAdjustment: String(mo.priceAdjustment || 0),
                });
              }
            }
          }
        }

        // Promote user to owner if not already
        const currentUser = await storage.getUser(userId);
        if (currentUser && currentUser.userRole === "guest") {
          await storage.upsertUser({ ...currentUser, userRole: "owner" });
        }

        res.json({ propertyId, message: "Draft saved successfully" });
      } catch (error) {
        console.error("Error in wizard auto-save:", error);
        res.status(500).json({ message: "Failed to save draft" });
      }
    },
  );

  // Get user's KYC application status
  app.get("/api/kyc/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const application = await storage.getUserKycApplication(userId);

      if (!application) {
        // Return user's kycStatus even if no application exists
        const status = user?.kycStatus || "not_started";

        // If user is rejected but has no application, provide generic rejection message
        let rejectionDetails = null;
        if (status === "rejected") {
          rejectionDetails = {
            sections: [
              {
                sectionId: "personal" as const,
                message:
                  "Your KYC application was rejected. Please contact support or resubmit your documents.",
              },
            ],
            isRevocation: false,
          };
        }

        return res.json({
          status,
          hasActiveApplication: false,
          userId: userId,
          rejectionDetails,
        });
      }

      // Build rejectionDetails from existing data
      // If rejectionDetails is empty but reviewNotes exists, create a fallback structure
      let rejectionDetails = application.rejectionDetails as {
        sections?: Array<{ sectionId: string; message: string }>;
        isRevocation?: boolean;
      } | null;

      if (
        application.status === "rejected" &&
        (!rejectionDetails ||
          !rejectionDetails.sections ||
          rejectionDetails.sections.length === 0)
      ) {
        // Create fallback rejectionDetails from reviewNotes
        if (application.reviewNotes) {
          rejectionDetails = {
            sections: [
              {
                sectionId: "personal" as const,
                message: application.reviewNotes,
              },
            ],
            isRevocation: false,
          };
        } else {
          // Generic rejection message if no notes provided
          rejectionDetails = {
            sections: [
              {
                sectionId: "personal" as const,
                message:
                  "Your KYC application was rejected. Please contact support for more details.",
              },
            ],
            isRevocation: false,
          };
        }
      }

      // Return full application with additional status info and enhanced rejectionDetails
      res.json({
        ...application,
        rejectionDetails,
        hasActiveApplication: true,
        userId: userId,
      });
    } catch (error) {
      console.error("Error fetching KYC status:", error);
      res.status(500).json({ message: "Failed to fetch KYC status" });
    }
  });

  // Update rejected KYC application (resubmit)
  app.patch("/api/kyc/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applicationId = req.params.id;

      // Get the existing application
      const existingApplication =
        await storage.getKycApplication(applicationId);

      if (!existingApplication) {
        return res.status(404).json({ message: "KYC application not found" });
      }

      // Verify ownership
      if (existingApplication.userId !== userId) {
        return res
          .status(403)
          .json({ message: "You can only update your own applications" });
      }

      // Only allow updating rejected applications
      if (existingApplication.status !== "rejected") {
        return res
          .status(400)
          .json({ message: "Only rejected applications can be updated" });
      }

      // Validate the update data
      const validatedData = insertKycApplicationSchema.parse(req.body);

      // Update the application (resets status to pending)
      const updatedApplication = await storage.updateKycApplication(
        applicationId,
        validatedData,
      );

      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating KYC application:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid application data", error: error.message });
      }
      res.status(500).json({ message: "Failed to update KYC application" });
    }
  });

  app.patch("/api/user/kyc", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // If trying to become an owner, require all KYC fields
      if (req.body.userRole === "owner") {
        const validatedData = becomeOwnerSchema.parse(req.body);

        const updatedUser = await storage.upsertUser({
          ...currentUser,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phone: validatedData.phone,
          kycAddress: validatedData.kycAddress,
          governmentIdType: validatedData.governmentIdType,
          governmentIdNumber: validatedData.governmentIdNumber,
          kycStatus: "pending",
          userRole: "owner",
        });

        return res.json(updatedUser);
      }

      // For other updates, use less strict validation
      const validatedData = updateKYCSchema.parse(req.body);

      const updateData: any = { ...currentUser };
      if (validatedData.firstName)
        updateData.firstName = validatedData.firstName;
      if (validatedData.lastName) updateData.lastName = validatedData.lastName;
      if (validatedData.phone) updateData.phone = validatedData.phone;
      if (validatedData.kycAddress)
        updateData.kycAddress = validatedData.kycAddress;
      if (validatedData.governmentIdType)
        updateData.governmentIdType = validatedData.governmentIdType;
      if (validatedData.governmentIdNumber) {
        updateData.governmentIdNumber = validatedData.governmentIdNumber;
        updateData.kycStatus = "pending";
      }

      const updatedUser = await storage.upsertUser(updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user KYC:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid KYC data", error: error.message });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Listing mode endpoint - for owner onboarding
  app.patch(
    "/api/user/listing-mode",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const currentUser = await storage.getUser(userId);

        if (!currentUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const { listingMode } = req.body;

        if (!listingMode || !["quick", "full"].includes(listingMode)) {
          return res.status(400).json({
            message: "Invalid listing mode. Must be 'quick' or 'full'",
          });
        }

        const updatedUser = await storage.upsertUser({
          ...currentUser,
          listingMode,
          userRole:
            currentUser.userRole === "guest" ? "owner" : currentUser.userRole,
        });

        res.json(updatedUser);
      } catch (error) {
        console.error("Error updating listing mode:", error);
        res.status(500).json({ message: "Failed to update listing mode" });
      }
    },
  );

  // Dismiss owner welcome modal endpoint
  app.patch(
    "/api/user/dismiss-owner-modal",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const currentUser = await storage.getUser(userId);

        if (!currentUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const updatedUser = await storage.upsertUser({
          ...currentUser,
          hasSeenOwnerModal: true,
        });

        res.json(updatedUser);
      } catch (error) {
        console.error("Error dismissing owner modal:", error);
        res.status(500).json({ message: "Failed to dismiss owner modal" });
      }
    },
  );

  // Admin KYC routes
  app.get("/api/admin/kyc", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can view KYC applications" });
      }

      const applications = await storage.getAllKycApplications();
      res.json(applications);
    } catch (error) {
      console.error("Error fetching KYC applications:", error);
      res.status(500).json({ message: "Failed to fetch KYC applications" });
    }
  });

  app.patch(
    "/api/admin/kyc/:id/verified",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can verify KYC applications" });
        }

        const { reviewNotes } = req.body;
        const kycId = req.params.id;

        // First check if the application exists
        const existingApplication = await storage.getKycApplication(kycId);
        if (!existingApplication) {
          return res.status(404).json({ message: "KYC application not found" });
        }

        const application = await storage.updateKycApplicationStatus(
          kycId,
          "verified",
          reviewNotes,
        );

        if (!application) {
          return res
            .status(500)
            .json({ message: "Failed to update KYC application status" });
        }

        // Promote user to owner role when KYC is verified
        const applicantUser = await storage.getUser(application.userId);
        if (!applicantUser) {
          console.error(
            "KYC verified but applicant user not found:",
            application.userId,
          );
          return res.status(500).json({ message: "Applicant user not found" });
        }

        try {
          // Normalize and validate KYC data before syncing
          const normalizedPhone =
            application.phone && application.phone.trim()
              ? application.phone.trim()
              : null;
          const normalizedFirstName =
            application.firstName && application.firstName.trim()
              ? application.firstName.trim()
              : null;
          const normalizedLastName =
            application.lastName && application.lastName.trim()
              ? application.lastName.trim()
              : null;

          // Build full address from KYC application fields
          const addressParts = [
            application.streetAddress,
            application.locality,
            application.city,
            application.district,
            application.state,
            application.pincode,
          ].filter(Boolean);
          const fullAddress =
            addressParts.length > 0
              ? addressParts.join(", ")
              : applicantUser.kycAddress || null;

          await storage.upsertUser({
            ...applicantUser,
            userRole: "owner",
            kycStatus: "verified",
            kycVerifiedAt: new Date(),
            phone: normalizedPhone || applicantUser.phone,
            firstName: normalizedFirstName || applicantUser.firstName,
            lastName: normalizedLastName || applicantUser.lastName,
            kycAddress: fullAddress,
          });
        } catch (userUpdateError) {
          console.error(
            "Error updating user role after KYC verification:",
            userUpdateError,
          );
          // Roll back KYC status if user update fails
          await storage.updateKycApplicationStatus(
            kycId,
            "rejected",
            "System error - please retry verification",
          );
          return res
            .status(500)
            .json({ message: "Failed to update user role" });
        }

        // Send approval email notification (fire-and-forget)
        if (applicantUser.email) {
          // Get property name if exists
          const properties = await storage.getOwnerProperties(
            application.userId,
          );
          const propertyName =
            properties.length > 0 ? properties[0].title : undefined;
          sendKycApprovedEmail(
            applicantUser.email,
            applicantUser.firstName || "Property Owner",
            propertyName,
          ).catch(console.error);
        }

        res.json(application);
      } catch (error) {
        console.error("Error verifying KYC application:", error);
        res.status(500).json({ message: "Failed to verify KYC application" });
      }
    },
  );

  app.patch(
    "/api/admin/kyc/:id/rejected",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can reject KYC applications" });
        }

        const { reviewNotes, rejectionDetails } = req.body;
        const application = await storage.updateKycApplicationStatus(
          req.params.id,
          "rejected",
          reviewNotes,
          rejectionDetails,
        );

        // Update user's kycStatus to rejected so the UI reflects the rejection
        if (application) {
          const applicantUser = await storage.getUser(application.userId);
          if (applicantUser) {
            await storage.upsertUser({
              ...applicantUser,
              kycStatus: "rejected",
            });
          }

          // Send rejection email notification (fire-and-forget)
          if (applicantUser?.email) {
            // Extract rejection reasons from rejectionDetails
            const rejectionReasons: string[] = [];
            if (rejectionDetails) {
              if (rejectionDetails.personalInfo)
                rejectionReasons.push(
                  `Personal Information: ${rejectionDetails.personalInfo}`,
                );
              if (rejectionDetails.propertyInfo)
                rejectionReasons.push(
                  `Property Information: ${rejectionDetails.propertyInfo}`,
                );
              if (rejectionDetails.documents)
                rejectionReasons.push(
                  `Documents: ${rejectionDetails.documents}`,
                );
              if (rejectionDetails.general)
                rejectionReasons.push(rejectionDetails.general);
            }
            if (reviewNotes && rejectionReasons.length === 0) {
              rejectionReasons.push(reviewNotes);
            }
            sendKycRejectedEmail(
              applicantUser.email,
              applicantUser.firstName || "Property Owner",
              rejectionReasons,
            ).catch(console.error);
          }
        }

        res.json(application);
      } catch (error) {
        console.error("Error rejecting KYC application:", error);
        res.status(500).json({ message: "Failed to reject KYC application" });
      }
    },
  );

  // Revoke verification - demote owner back to guest
  app.patch(
    "/api/admin/kyc/:id/revoke",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can revoke KYC verification" });
        }

        const { reviewNotes } = req.body;

        // Get the application first
        const applications = await storage.getAllKycApplications();
        const application = applications.find(
          (app) => app.id === req.params.id,
        );

        if (!application) {
          return res.status(404).json({ message: "KYC application not found" });
        }

        // Update KYC application status to rejected with isRevocation flag
        const updatedApplication = await storage.updateKycApplicationStatus(
          req.params.id,
          "rejected",
          reviewNotes || "Verification revoked by admin",
          { isRevocation: true },
        );

        // Demote user back to guest
        if (application) {
          const applicantUser = await storage.getUser(application.userId);
          if (applicantUser) {
            await storage.upsertUser({
              ...applicantUser,
              userRole: "guest",
              kycStatus: "rejected",
              kycVerifiedAt: null,
            });
          }
        }

        res.json({
          message: "Verification revoked successfully",
          application: updatedApplication,
        });
      } catch (error) {
        console.error("Error revoking KYC verification:", error);
        res.status(500).json({ message: "Failed to revoke verification" });
      }
    },
  );

  // Admin endpoint to sync KYC data to user profiles for existing verified owners
  app.post(
    "/api/admin/sync-kyc-data",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can sync KYC data" });
        }

        // Get all verified KYC applications
        const verifiedApplications =
          await storage.getKycApplicationsByStatus("verified");
        let syncedCount = 0;
        const syncResults: Array<{
          userId: string;
          email: string | null;
          phone: string | null;
          synced: boolean;
        }> = [];

        for (const application of verifiedApplications) {
          const applicantUser = await storage.getUser(application.userId);
          if (applicantUser) {
            // Normalize KYC data
            const normalizedPhone =
              application.phone && application.phone.trim()
                ? application.phone.trim()
                : null;
            const normalizedFirstName =
              application.firstName && application.firstName.trim()
                ? application.firstName.trim()
                : null;
            const normalizedLastName =
              application.lastName && application.lastName.trim()
                ? application.lastName.trim()
                : null;
            const userPhone =
              applicantUser.phone && applicantUser.phone.trim()
                ? applicantUser.phone.trim()
                : null;

            // Only sync if user doesn't have valid phone but KYC application has valid phone
            const needsSync = !userPhone && normalizedPhone;

            if (needsSync) {
              await storage.upsertUser({
                ...applicantUser,
                phone: normalizedPhone,
                firstName: normalizedFirstName || applicantUser.firstName,
                lastName: normalizedLastName || applicantUser.lastName,
              });
              syncedCount++;
            }

            syncResults.push({
              userId: application.userId,
              email: applicantUser.email,
              phone: needsSync ? normalizedPhone : userPhone,
              synced: !!needsSync,
            });
          }
        }

        res.json({
          message: `Synced KYC data for ${syncedCount} users`,
          totalVerified: verifiedApplications.length,
          syncedCount,
          results: syncResults,
        });
      } catch (error) {
        console.error("Error syncing KYC data:", error);
        res.status(500).json({ message: "Failed to sync KYC data" });
      }
    },
  );

  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      const {
        destination,
        propertyType,
        minPrice,
        maxPrice,
        minGuests,
        search,
        localIdAllowed,
        hourlyBookingAllowed,
        foreignGuestsAllowed,
        coupleFriendly,
      } = req.query;

      const filters: any = {};
      // Use 'search' for property name + destination search, fallback to 'destination' for legacy
      if (search) filters.search = search as string;
      else if (destination) filters.destination = destination as string;
      if (propertyType) filters.propertyType = propertyType as string;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (minGuests) filters.minGuests = Number(minGuests);

      // Guest policy filters - support both 'true' and 'false' values
      if (localIdAllowed === "true") filters.localIdAllowed = true;
      else if (localIdAllowed === "false") filters.localIdAllowed = false;
      if (hourlyBookingAllowed === "true") filters.hourlyBookingAllowed = true;
      else if (hourlyBookingAllowed === "false")
        filters.hourlyBookingAllowed = false;
      if (foreignGuestsAllowed === "true") filters.foreignGuestsAllowed = true;
      else if (foreignGuestsAllowed === "false")
        filters.foreignGuestsAllowed = false;
      if (coupleFriendly === "true") filters.coupleFriendly = true;
      else if (coupleFriendly === "false") filters.coupleFriendly = false;

      const properties = await storage.getProperties(filters);

      // Determine the requesting user and pre-fetch their bookings once to avoid N+1
      const requestUserId =
        req.isAuthenticated() && (req.user as any)
          ? (req.user as any).claims?.sub || (req.user as any).id
          : null;
      let guestBookedPropertyIds = new Set<string>();
      if (requestUserId) {
        const guestBookings = await storage.getBookingsByGuest(requestUserId);
        for (const b of guestBookings) {
          guestBookedPropertyIds.add(b.propertyId);
        }
      }

      // Batch fetch — 2 queries total instead of 2 per property (N+1 fix)
      const propertyIds = properties.map((p) => p.id);
      const uniqueOwnerIds = Array.from(new Set(properties.map((p) => p.ownerId)));

      const [allRoomTypes, allOwners] = await Promise.all([
        storage.getRoomTypesByPropertyIds(propertyIds),
        storage.getUsersByIds(uniqueOwnerIds),
      ]);

      const roomTypesByProperty = new Map<string, typeof allRoomTypes>();
      for (const rt of allRoomTypes) {
        if (!roomTypesByProperty.has(rt.propertyId))
          roomTypesByProperty.set(rt.propertyId, []);
        roomTypesByProperty.get(rt.propertyId)!.push(rt);
      }
      const ownersById = new Map(allOwners.map((o) => [o.id, o]));

      const propertiesWithDetails = properties.map((property) => {
        const propertyRoomTypes = roomTypesByProperty.get(property.id) || [];

        let startingRoomPrice: string | null = null;
        let startingRoomOriginalPrice: string | null = null;

        if (propertyRoomTypes.length > 0) {
          const sortedRoomTypes = [...propertyRoomTypes].sort(
            (a, b) => parseFloat(a.basePrice) - parseFloat(b.basePrice),
          );
          const cheapestRoomType = sortedRoomTypes[0];
          startingRoomPrice = cheapestRoomType.basePrice;
          if (
            cheapestRoomType.originalPrice &&
            parseFloat(cheapestRoomType.originalPrice) >
              parseFloat(cheapestRoomType.basePrice)
          ) {
            startingRoomOriginalPrice = cheapestRoomType.originalPrice;
          }
        }

        // Strip private contact fields — never returned in public listing responses.
        // Only the owner, admin, or a guest with a confirmed booking may see them
        // (enforced per-property in GET /api/properties/:id).
        const {
          receptionNumber: _rn,
          contactEmail: _ce,
          contactPhone: _cp,
          whatsappNumber: _wn,
          ...publicProperty
        } = property;

        if (property.status === "published") {
          const owner = ownersById.get(property.ownerId);
          const ownerPhone =
            owner?.phone && owner.phone.trim() ? owner.phone.trim() : null;
          const canCall =
            requestUserId !== null &&
            (requestUserId === property.ownerId ||
              guestBookedPropertyIds.has(property.id));
          return {
            ...publicProperty,
            startingRoomPrice,
            startingRoomOriginalPrice,
            ownerContact: owner
              ? {
                  name:
                    owner.firstName && owner.lastName
                      ? `${owner.firstName} ${owner.lastName}`
                      : owner.firstName || null,
                  canCall,
                  ...(canCall ? { phone: ownerPhone } : {}),
                }
              : null,
          };
        }
        return {
          ...publicProperty,
          startingRoomPrice,
          startingRoomOriginalPrice,
        };
      });

      res.json(propertiesWithDetails);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/by-slug/:slug", async (req: any, res) => {
    try {
      const [property] = await db
        .select()
        .from(propertiesTable)
        .where(eq(propertiesTable.slug, req.params.slug))
        .limit(1);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      const requestUserId =
        req.isAuthenticated() && req.user
          ? req.user.claims?.sub || req.user.id
          : null;
      const shaped = await shapePropertyResponse(property, requestUserId);
      if (!shaped) {
        return res.status(404).json({ message: "Property not found" });
      }
      return res.json(shaped);
    } catch (error) {
      console.error("by-slug lookup error:", error);
      return res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.get("/api/properties/:id", async (req: any, res) => {
    try {
      const property = await storage.getProperty(req.params.id, true);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      const requestUserId =
        req.isAuthenticated() && req.user
          ? req.user.claims?.sub || req.user.id
          : null;
      const shaped = await shapePropertyResponse(property, requestUserId);
      if (!shaped) {
        return res.status(404).json({ message: "Property not found" });
      }
      return res.json(shaped);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // Nearby places endpoint - fetches localities, landmarks, and things to do using Google Places API
  app.get("/api/properties/:id/nearby-places", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (!property.latitude || !property.longitude) {
        return res
          .status(400)
          .json({ message: "Property location not available" });
      }

      const lat = property.latitude;
      const lng = property.longitude;
      // Use server-side API key (falls back to VITE_ key if not set)
      const apiKey =
        process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        return res
          .status(500)
          .json({ message: "Google Maps API key not configured" });
      }

      // Define place types for each category
      const categories = {
        transportHubs: {
          types: ["subway_station", "train_station", "bus_station", "airport"],
          radius: 25000,
          maxResults: 8,
        },
        landmarks: {
          types: [
            "hospital",
            "shopping_mall",
            "hindu_temple",
            "mosque",
            "church",
          ],
          radius: 5000,
          maxResults: 8,
        },
        localities: {
          types: ["neighborhood", "locality", "sublocality"],
          radius: 5000,
          maxResults: 6,
        },
        thingsToDo: {
          types: [
            "tourist_attraction",
            "museum",
            "park",
            "art_gallery",
            "amusement_park",
            "zoo",
            "aquarium",
            "stadium",
            "movie_theater",
          ],
          radius: 10000,
          maxResults: 8,
        },
      };

      const results: {
        transportHubs: any[];
        landmarks: any[];
        localities: any[];
        thingsToDo: any[];
      } = {
        transportHubs: [],
        landmarks: [],
        localities: [],
        thingsToDo: [],
      };

      // Fetch nearby places for each category
      for (const [category, config] of Object.entries(categories)) {
        const allPlaces: any[] = [];

        for (const type of config.types) {
          try {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${config.radius}&type=${type}&key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === "OK" && data.results) {
              for (const place of data.results) {
                // Calculate distance from property
                const placeLat = place.geometry?.location?.lat;
                const placeLng = place.geometry?.location?.lng;
                let distance = 0;

                if (placeLat && placeLng) {
                  // Haversine formula for distance calculation
                  const R = 6371; // Earth's radius in km
                  const dLat = ((placeLat - Number(lat)) * Math.PI) / 180;
                  const dLng = ((placeLng - Number(lng)) * Math.PI) / 180;
                  const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((Number(lat) * Math.PI) / 180) *
                      Math.cos((placeLat * Math.PI) / 180) *
                      Math.sin(dLng / 2) *
                      Math.sin(dLng / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  distance = R * c; // Distance in km
                }

                allPlaces.push({
                  name: place.name,
                  type: type.replace(/_/g, " "),
                  rating: place.rating || null,
                  userRatingsTotal: place.user_ratings_total || 0,
                  vicinity: place.vicinity || "",
                  distance: Math.round(distance * 10) / 10, // Round to 1 decimal
                  placeId: place.place_id,
                  icon: place.icon || null,
                  photoReference: place.photos?.[0]?.photo_reference || null,
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching ${type} places:`, error);
          }
        }

        // Remove duplicates by place_id and sort by distance
        const uniquePlaces = allPlaces.reduce((acc: any[], place) => {
          if (!acc.find((p) => p.placeId === place.placeId)) {
            acc.push(place);
          }
          return acc;
        }, []);

        // Sort by distance and limit results
        uniquePlaces.sort((a, b) => a.distance - b.distance);
        results[category as keyof typeof results] = uniquePlaces.slice(
          0,
          config.maxResults,
        );
      }

      res.json(results);
    } catch (error) {
      console.error("Error fetching nearby places:", error);
      res.status(500).json({ message: "Failed to fetch nearby places" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "owner")) {
        return res
          .status(403)
          .json({ message: "Only owners can create properties" });
      }

      // Require KYC to be at least pending before allowing property creation
      if (
        !user.kycStatus ||
        user.kycStatus === "not_started" ||
        user.kycStatus === "rejected"
      ) {
        return res.status(403).json({
          message: "Please complete KYC verification before listing properties",
        });
      }

      const validatedData = insertPropertySchema.parse(req.body);
      const {
        amenityIds,
        status,
        pricePerNight,
        latitude,
        longitude,
        ...propertyData
      } = validatedData;

      // Always force status to "pending" for new properties - prevent bypass
      const property = await storage.createProperty({
        ...propertyData,
        pricePerNight: String(pricePerNight),
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
        ownerId: userId,
        status: "pending",
      });

      // Set amenities if provided
      if (amenityIds && amenityIds.length > 0) {
        await storage.setPropertyAmenities(property.id, amenityIds);
      }

      // Notify all admins about new property listing
      try {
        const adminUsers = await storage.getAdminUsers();
        for (const admin of adminUsers) {
          await createNotification({
            userId: admin.id,
            title: "New Property Listed",
            body: `${user.firstName || "An owner"} has listed a new property: "${property.title}" — pending your review.`,
            type: "property_pending",
            entityId: property.id,
            entityType: "property",
          });
          broadcastToUser(admin.id, { type: "notification_update" });
          // Send email to admin
          if (admin.email) {
            sendPropertyStatusEmail(
              admin.email,
              admin.firstName || "Admin",
              property.title,
              "pending" as any,
            ).catch(console.error);
          }
        }
      } catch (notifError) {
        console.error("Failed to notify admins of new property:", notifError);
      }

      res.json(property);
    } catch (error: any) {
      console.error("Error creating property:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid property data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "owner")) {
        return res
          .status(403)
          .json({ message: "Only owners can update properties" });
      }

      // Owner can always access their own property regardless of subscription
      const property = await storage.getProperty(req.params.id, true);

      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (property.ownerId !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this property" });
      }

      // Validate with partial schema
      const validatedData = insertPropertySchema.partial().parse(req.body);
      const {
        amenityIds,
        pricePerNight,
        latitude,
        longitude,
        status,
        ...propertyData
      } = validatedData;

      // SECURITY: Owners cannot directly change property status - must use deactivation request flow
      // Status changes are handled through dedicated endpoints (pause, resume, admin-approved deactivation)
      if (status !== undefined) {
        console.warn(
          `Owner ${userId} attempted to directly change status for property ${req.params.id}`,
        );
      }

      // Convert numeric fields to strings if provided
      const updateData = {
        ...propertyData,
        ...(pricePerNight !== undefined && {
          pricePerNight: String(pricePerNight),
        }),
        ...(latitude !== undefined && {
          latitude: latitude ? String(latitude) : null,
        }),
        ...(longitude !== undefined && {
          longitude: longitude ? String(longitude) : null,
        }),
      };

      const updated = await storage.updateProperty(req.params.id, updateData);

      // Update amenities if provided
      if (amenityIds !== undefined) {
        await storage.setPropertyAmenities(req.params.id, amenityIds);
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating property:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid property data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  // SECURITY: Direct property deletion is admin-only
  // Owners must use the deactivation request flow (POST /api/properties/:id/deactivation-request with requestType: "delete")
  app.delete("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Only admins can directly delete properties
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({
          message:
            "Property deletion requires admin approval. Please submit a deactivation request instead.",
        });
      }

      const property = await storage.getProperty(req.params.id);

      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      await storage.deleteProperty(req.params.id);

      // Revert owner role to guest if no properties remain
      try {
        const remainingProperties = await storage.getProperties({
          ownerId: property.ownerId,
          includeAllStatuses: true,
        });
        if (remainingProperties.length === 0) {
          const ownerUser = await storage.getUser(property.ownerId);
          if (ownerUser && ownerUser.userRole === "owner") {
            await storage.upsertUser({
              ...ownerUser,
              userRole: "guest",
              kycStatus: "not_started",
              kycVerifiedAt: null,
            });
            broadcastToUser(property.ownerId, {
              type: "role_changed",
              message:
                "Your property has been removed. Your account has been updated to guest.",
            });
          }
        }
      } catch (roleError) {
        console.error("Failed to revert owner role:", roleError);
      }

      res.json({ message: "Property deleted successfully" });
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Update property price (owner only)
  app.patch(
    "/api/properties/:id/price",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can update property price" });
        }

        const property = await storage.getProperty(req.params.id, true);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this property" });
        }

        const { pricePerNight, originalPrice } = req.body;

        if (
          !pricePerNight ||
          isNaN(Number(pricePerNight)) ||
          Number(pricePerNight) <= 0
        ) {
          return res.status(400).json({ message: "Valid price is required" });
        }

        const updateData: Record<string, any> = {
          pricePerNight: String(pricePerNight),
        };

        if (originalPrice !== undefined) {
          if (
            originalPrice === null ||
            originalPrice === "" ||
            originalPrice === 0
          ) {
            (updateData as any).originalPrice = null;
          } else if (
            !isNaN(Number(originalPrice)) &&
            Number(originalPrice) > 0
          ) {
            (updateData as any).originalPrice = String(originalPrice);
          } else {
            (updateData as any).originalPrice = null;
          }
        }

        const updatedProperty = await storage.updateProperty(
          req.params.id,
          updateData,
        );

        res.json(updatedProperty);
      } catch (error) {
        console.error("Error updating property price:", error);
        res.status(500).json({ message: "Failed to update property price" });
      }
    },
  );

  // Owner properties route
  app.get("/api/owner/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "owner")) {
        return res
          .status(403)
          .json({ message: "Only owners can access this endpoint" });
      }

      const properties = await storage.getProperties({ ownerId: userId });
      res.json(properties);
    } catch (error) {
      console.error("Error fetching owner properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Get owner's draft property (for continuing listing flow)
  app.get(
    "/api/owner/draft-property",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Get owner's properties with draft status
        const properties = await storage.getProperties({ ownerId: userId });
        const draftProperty = properties.find((p: any) => p.status === "draft");

        if (!draftProperty) {
          return res.status(404).json({ message: "No draft property found" });
        }

        res.json(draftProperty);
      } catch (error) {
        console.error("Error fetching draft property:", error);
        res.status(500).json({ message: "Failed to fetch draft property" });
      }
    },
  );

  // Pause property listing (owner only)
  app.patch(
    "/api/properties/:id/pause",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can pause properties" });
        }

        const property = await storage.getProperty(req.params.id, true);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to pause this property" });
        }

        if (property.status !== "published") {
          return res
            .status(400)
            .json({ message: "Only published properties can be paused" });
        }

        const updatedProperty = await storage.updateProperty(req.params.id, {
          status: "paused",
        });

        // Send email notification to owner
        if (user.email) {
          sendPropertyStatusEmail(
            user.email,
            user.firstName || "",
            property.title,
            "paused",
          ).catch(console.error);
        }

        res.json(updatedProperty);
      } catch (error) {
        console.error("Error pausing property:", error);
        res.status(500).json({ message: "Failed to pause property" });
      }
    },
  );

  // Resume paused property listing (owner only)
  app.patch(
    "/api/properties/:id/resume",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can resume properties" });
        }

        const property = await storage.getProperty(req.params.id, true);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res.status(403).json({
            message: "Not authorized to request deactivation for this property",
          });
        }

        if (property.status !== "paused") {
          return res
            .status(400)
            .json({ message: "Only paused properties can be resumed" });
        }

        // Check if property has geolocation - required for publishing
        if (!property.latitude || !property.longitude) {
          return res.status(400).json({
            message:
              "Property cannot be resumed without GPS coordinates. Please set the property location in the Location tab first.",
            missingGeotag: true,
          });
        }

        const updatedProperty = await storage.updateProperty(req.params.id, {
          status: "published",
        });

        // Send email notification to owner
        if (user.email) {
          sendPropertyStatusEmail(
            user.email,
            user.firstName || "",
            property.title,
            "resumed",
          ).catch(console.error);
        }

        res.json(updatedProperty);
      } catch (error) {
        console.error("Error resuming property:", error);
        res.status(500).json({ message: "Failed to resume property" });
      }
    },
  );

  // ===============================
  // PROPERTY DEACTIVATION REQUEST ROUTES
  // Owners submit requests, only admins can deactivate/delete
  // ===============================

  // Owner submits a deactivation request
  app.post(
    "/api/properties/:id/deactivation-request",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can request property deactivation" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res.status(403).json({
            message: "Not authorized to request deactivation for this property",
          });
        }

        const { reason, requestType } = req.body;

        // For reactivation requests, property must be deactivated
        // For deactivation/deletion requests, property must NOT be deactivated
        if (requestType === "reactivate") {
          if (property.status !== "deactivated") {
            return res.status(400).json({
              message: "Only deactivated properties can request reactivation",
            });
          }
        } else {
          if (property.status === "deactivated") {
            return res
              .status(400)
              .json({ message: "Property is already deactivated" });
          }
        }

        // Check if there's already a pending request
        const existingRequest = await storage.getDeactivationRequestByProperty(
          req.params.id,
        );
        if (existingRequest) {
          const requestTypeLabel =
            requestType === "reactivate" ? "reactivation" : "deactivation";
          return res.status(400).json({
            message: `A ${requestTypeLabel} request is already pending for this property`,
          });
        }

        if (!reason || reason.trim().length < 10) {
          return res.status(400).json({
            message: "Please provide a reason (at least 10 characters)",
          });
        }

        // Validate and normalize request type - support deactivate, delete, and reactivate
        const validRequestTypes = ["deactivate", "delete", "reactivate"];
        const actualRequestType = validRequestTypes.includes(requestType)
          ? requestType
          : "deactivate";
        const request = await storage.createDeactivationRequest(
          req.params.id,
          userId,
          reason.trim(),
          actualRequestType as "deactivate" | "delete" | "reactivate",
        );

        // Send email notification to all admins
        const adminUsers = await storage.getAdminUsers();
        const adminEmails = adminUsers
          .filter((a) => a.email)
          .map((a) => a.email as string);
        if (adminEmails.length > 0) {
          const ownerName =
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            "Property Owner";
          sendAdminDeactivationRequestEmail(
            adminEmails,
            ownerName,
            property.title,
            actualRequestType,
            reason.trim(),
          ).catch(console.error);
        }

        res.json(request);
      } catch (error) {
        console.error("Error creating deactivation request:", error);
        res
          .status(500)
          .json({ message: "Failed to submit deactivation request" });
      }
    },
  );

  // Owner gets their deactivation request for a property
  app.get(
    "/api/properties/:id/deactivation-request",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        // Only owner or admin can view
        if (property.ownerId !== userId && user.userRole !== "admin") {
          return res.status(403).json({ message: "Not authorized" });
        }

        const request = await storage.getDeactivationRequestByProperty(
          req.params.id,
        );
        res.json(request || null);
      } catch (error) {
        console.error("Error fetching deactivation request:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch deactivation request" });
      }
    },
  );

  // Owner cancels their pending deactivation request
  app.delete(
    "/api/properties/:id/deactivation-request",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can cancel deactivation requests" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const request = await storage.getDeactivationRequestByProperty(
          req.params.id,
        );
        if (!request) {
          return res
            .status(404)
            .json({ message: "No pending deactivation request found" });
        }

        await storage.cancelDeactivationRequest(request.id);
        res.json({ message: "Deactivation request cancelled" });
      } catch (error) {
        console.error("Error cancelling deactivation request:", error);
        res
          .status(500)
          .json({ message: "Failed to cancel deactivation request" });
      }
    },
  );

  // Availability Overrides routes (owner only)
  // Get all availability overrides for a property
  app.get("/api/properties/:id/availability-overrides", async (req, res) => {
    try {
      const overrides = await storage.getAvailabilityOverrides(req.params.id);
      res.json(overrides);
    } catch (error) {
      console.error("Error fetching availability overrides:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch availability overrides" });
    }
  });

  // Create a new availability override
  app.post(
    "/api/properties/:id/availability-overrides",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can create availability overrides" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to modify this property" });
        }

        const {
          overrideType,
          startDate,
          endDate,
          reason,
          availableRooms,
          roomTypeId,
        } = req.body;

        if (!overrideType || !startDate || !endDate) {
          return res.status(400).json({
            message: "Override type, start date, and end date are required",
          });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
          return res
            .status(400)
            .json({ message: "End date must be after start date" });
        }

        // Block when overlapping with active reservations on this property.
        // Active = locked at the booking layer: confirmed, customer_confirmed, checked_in.
        // pending / cancelled / rejected / completed do NOT block (per spec).
        const ACTIVE_STATUSES = [
          "confirmed",
          "customer_confirmed",
          "checked_in",
        ];
        const allBookings = await storage.getBookingsByProperty(req.params.id);
        const conflictingBookings = allBookings
          .filter((b: any) => {
            if (!ACTIVE_STATUSES.includes(b.status)) return false;
            if (roomTypeId && b.roomTypeId && b.roomTypeId !== roomTypeId)
              return false;
            const bIn = new Date(b.checkIn);
            const bOut = new Date(b.checkOut);
            return bIn < end && bOut > start;
          })
          .map((b: any) => ({
            bookingCode: b.bookingCode || b.id.slice(0, 8).toUpperCase(),
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guestName: b.guestName || null,
          }));

        if (conflictingBookings.length > 0) {
          return res.status(409).json({
            error: "conflict",
            message: "Cannot block dates with existing bookings",
            conflictingBookings,
          });
        }

        const override = await storage.createAvailabilityOverride({
          propertyId: req.params.id,
          overrideType,
          startDate: start,
          endDate: end,
          reason: reason || null,
          availableRooms: availableRooms !== undefined ? availableRooms : null,
          roomTypeId: roomTypeId || null,
          createdBy: userId,
        });

        res.json(override);
      } catch (error: any) {
        console.error("Error creating availability override:", error);
        res
          .status(500)
          .json({ message: "Failed to create availability override" });
      }
    },
  );

  // Delete an availability override
  app.delete(
    "/api/properties/:id/availability-overrides/:overrideId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can delete availability overrides" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to modify this property" });
        }

        await storage.deleteAvailabilityOverride(req.params.overrideId);

        res.json({ message: "Availability override deleted successfully" });
      } catch (error) {
        console.error("Error deleting availability override:", error);
        res
          .status(500)
          .json({ message: "Failed to delete availability override" });
      }
    },
  );

  // Room inventory check endpoint - get available rooms for a date range
  app.get("/api/properties/:id/room-inventory", async (req, res) => {
    try {
      const { startDate, endDate, roomTypeId } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Start date and end date are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Get all room types for this property
      const roomTypes = await storage.getRoomsByProperty(req.params.id);

      // Get all bookings that overlap with the date range
      // ONLY count ACTIVE bookings: confirmed (owner_accepted), customer_confirmed, checked_in
      // Do NOT count: pending, rejected, cancelled, checked_out, completed
      const ACTIVE_BOOKING_STATUSES = [
        "confirmed",
        "customer_confirmed",
        "checked_in",
      ];
      const allBookings = await storage.getBookingsByProperty(req.params.id);
      const overlappingBookings = allBookings.filter((booking: any) => {
        if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) return false;
        const bookingStart = new Date(booking.checkIn);
        const bookingEnd = new Date(booking.checkOut);
        return bookingStart < end && bookingEnd > start;
      });

      // Get availability overrides for the date range
      const overrides = await storage.getAvailabilityOverrides(req.params.id);
      const overlappingOverrides = overrides.filter((override: any) => {
        const overrideStart = new Date(override.startDate);
        const overrideEnd = new Date(override.endDate);
        return overrideStart < end && overrideEnd > start;
      });

      // Calculate available rooms for each room type (per-date minimum availability)
      const roomInventory = roomTypes.map((roomType: any) => {
        const totalRoomsDefault = roomType.totalRooms || 1;

        // Get bookings and overrides for this room type
        const roomTypeBookings = overlappingBookings.filter(
          (b: any) => b.roomTypeId === roomType.id,
        );
        const roomTypeOverrides = overlappingOverrides.filter(
          (o: any) => o.roomTypeId === roomType.id || !o.roomTypeId,
        );

        // Calculate minimum available rooms across all dates in the range
        // Also track if any date has a blocking override
        let minAvailableRooms = totalRoomsDefault;
        let maxBookedRooms = 0;
        let hasSoldOutOverride = false;
        let hasMaintenanceOverride = false;
        let hasHoldOverride = false;
        const dateToCheck = new Date(start);

        while (dateToCheck < end) {
          const currentDate = new Date(dateToCheck);
          const nextDate = new Date(dateToCheck);
          nextDate.setDate(nextDate.getDate() + 1);

          // Check for blocking overrides on this specific date
          const blockingOverride = roomTypeOverrides.find((o: any) => {
            const overrideStart = new Date(o.startDate);
            const overrideEnd = new Date(o.endDate);
            const overlapsDate =
              overrideStart <= currentDate && overrideEnd > currentDate;
            const isBlockingType = ["hold", "sold_out", "maintenance"].includes(
              o.overrideType,
            );
            return overlapsDate && isBlockingType;
          });

          if (blockingOverride) {
            // Mark the type of block found
            if (blockingOverride.overrideType === "sold_out")
              hasSoldOutOverride = true;
            if (blockingOverride.overrideType === "maintenance")
              hasMaintenanceOverride = true;
            if (blockingOverride.overrideType === "hold")
              hasHoldOverride = true;
            // If blocked, this date has 0 availability
            minAvailableRooms = 0;
          } else {
            // Count rooms booked for this specific date
            const bookedOnDate = roomTypeBookings
              .filter((b: any) => {
                const bookingStart = new Date(b.checkIn);
                const bookingEnd = new Date(b.checkOut);
                return bookingStart < nextDate && bookingEnd > currentDate;
              })
              .reduce((sum: number, b: any) => sum + (b.rooms || 1), 0);

            // Check for custom availability override on this date
            let availableOnDate = totalRoomsDefault;
            const dateOverride = roomTypeOverrides.find((o: any) => {
              const overrideStart = new Date(o.startDate);
              const overrideEnd = new Date(o.endDate);
              return (
                overrideStart <= currentDate &&
                overrideEnd > currentDate &&
                o.availableRooms !== null
              );
            });

            if (dateOverride && dateOverride.availableRooms !== null) {
              availableOnDate = dateOverride.availableRooms;
            }

            const remainingOnDate = Math.max(0, availableOnDate - bookedOnDate);

            if (remainingOnDate < minAvailableRooms) {
              minAvailableRooms = remainingOnDate;
            }
            if (bookedOnDate > maxBookedRooms) {
              maxBookedRooms = bookedOnDate;
            }
          }

          dateToCheck.setDate(dateToCheck.getDate() + 1);
        }

        // Calculate low stock threshold: min(5, 20% of totalRooms)
        const lowStockThreshold = Math.min(
          5,
          Math.ceil(totalRoomsDefault * 0.2),
        );
        const isSoldOut = minAvailableRooms === 0;
        const isLowStock = !isSoldOut && minAvailableRooms <= lowStockThreshold;

        return {
          roomTypeId: roomType.id,
          roomTypeName: roomType.name,
          totalRooms: totalRoomsDefault,
          bookedRooms: maxBookedRooms,
          availableRooms: minAvailableRooms,
          lowestAvailabilityInRange: minAvailableRooms,
          isSoldOut,
          isLowStock,
          hasSoldOutOverride,
          hasMaintenanceOverride,
          hasHoldOverride,
        };
      });

      // If a specific room type was requested, filter to just that one
      if (roomTypeId) {
        const specific = roomInventory.find(
          (r: any) => r.roomTypeId === roomTypeId,
        );
        return res.json(specific || { error: "Room type not found" });
      }

      res.json(roomInventory);
    } catch (error) {
      console.error("Error checking room inventory:", error);
      res.status(500).json({ message: "Failed to check room inventory" });
    }
  });

  // Rooms routes
  app.get("/api/properties/:id/rooms", async (req, res) => {
    try {
      const rooms = await storage.getRoomsByProperty(req.params.id);

      // Fetch meal options for each room type
      const roomsWithMealOptions = await Promise.all(
        rooms.map(async (room) => {
          const mealOptions = await storage.getRoomOptions(room.id);
          return {
            ...room,
            mealOptions: mealOptions.filter((opt) => opt.isActive),
          };
        }),
      );

      res.json(roomsWithMealOptions);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post(
    "/api/properties/:id/rooms",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        console.log("Creating room - userId:", userId, "body:", req.body);

        if (!user || !userHasRole(user, "owner")) {
          console.log("Room creation failed: user not owner", user?.userRole);
          return res.status(403).json({ message: "Only owners can add rooms" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          console.log(
            "Room creation failed: property not found",
            req.params.id,
          );
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          console.log(
            "Room creation failed: not authorized",
            property.ownerId,
            "!=",
            userId,
          );
          return res
            .status(403)
            .json({ message: "Not authorized to add rooms to this property" });
        }

        // Validate with Zod schema
        const validatedData = insertRoomSchema.parse({
          ...req.body,
          propertyId: req.params.id,
        });

        console.log("Room validated data:", validatedData);

        const room = await storage.createRoom({
          ...validatedData,
          roomAmenityIds: Array.isArray(validatedData.roomAmenityIds)
            ? (validatedData.roomAmenityIds as string[])
            : [],
        });

        console.log("Room created successfully:", room.id);

        // Auto-add the 4 default meal options
        const defaultMealOptions = [
          {
            name: "Room Only (Best Price)",
            priceAdjustment: "0",
            inclusions: "No meals included",
            mealPlanType: "ep",
            isActive: true,
          },
          {
            name: "Breakfast Included",
            priceAdjustment: "300",
            inclusions: "Daily breakfast buffet",
            mealPlanType: "cp",
            isActive: false,
          },
          {
            name: "Breakfast + Dinner/Lunch",
            priceAdjustment: "600",
            inclusions: "Breakfast and dinner or lunch included",
            mealPlanType: "map",
            isActive: false,
          },
          {
            name: "All Meals Included",
            priceAdjustment: "900",
            inclusions: "All meals included (breakfast, lunch, dinner)",
            mealPlanType: "ap",
            isActive: false,
          },
        ];

        for (const mealOpt of defaultMealOptions) {
          try {
            await storage.createRoomOption({
              roomTypeId: room.id,
              name: mealOpt.name,
              priceAdjustment: mealOpt.priceAdjustment,
              inclusions: mealOpt.inclusions,
              mealPlanType: (mealOpt as any).mealPlanType ?? "custom",
              isActive: mealOpt.isActive,
            });
          } catch (mealError) {
            console.error("Error creating default meal option:", mealError);
          }
        }

        res.json(room);
      } catch (error: any) {
        console.error("Error creating room:", error);
        console.error("Error details:", error.message, error.stack);
        if (error.name === "ZodError") {
          console.error("Zod validation errors:", JSON.stringify(error.errors));
          return res
            .status(400)
            .json({ message: "Invalid room data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create room" });
      }
    },
  );

  // Update room type
  app.patch(
    "/api/properties/:id/rooms/:roomId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can update rooms" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res.status(403).json({
            message: "Not authorized to modify rooms for this property",
          });
        }

        const room = await storage.updateRoom(req.params.roomId, req.body);

        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        res.json(room);
      } catch (error: any) {
        console.error("Error updating room:", error);
        res.status(500).json({ message: "Failed to update room" });
      }
    },
  );

  // Delete room type
  app.delete(
    "/api/properties/:id/rooms/:roomId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can delete rooms" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.ownerId !== userId) {
          return res.status(403).json({
            message: "Not authorized to delete rooms from this property",
          });
        }

        await storage.deleteRoom(req.params.roomId);

        res.json({ message: "Room deleted successfully" });
      } catch (error) {
        console.error("Error deleting room:", error);
        res.status(500).json({ message: "Failed to delete room" });
      }
    },
  );

  // Room Options (Meal Plans) routes
  app.get("/api/rooms/:roomId/options", async (req, res) => {
    try {
      const options = await storage.getRoomOptions(req.params.roomId);
      res.json(options);
    } catch (error) {
      console.error("Error fetching room options:", error);
      res.status(500).json({ message: "Failed to fetch room options" });
    }
  });

  app.post(
    "/api/rooms/:roomId/options",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can add room options" });
        }

        // Verify room exists and user owns the property
        const room = await storage.getRoomType(req.params.roomId);
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        const property = await storage.getProperty(room.propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to add options to this room" });
        }

        const validatedData = insertRoomOptionSchema.parse({
          ...req.body,
          roomTypeId: req.params.roomId,
        });

        const option = await storage.createRoomOption(validatedData);
        res.json(option);
      } catch (error: any) {
        console.error("Error creating room option:", error);
        if (error.name === "ZodError") {
          return res.status(400).json({
            message: "Invalid room option data",
            errors: error.errors,
          });
        }
        res.status(500).json({ message: "Failed to create room option" });
      }
    },
  );

  app.patch(
    "/api/rooms/:roomId/options/:optionId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can update room options" });
        }

        const room = await storage.getRoomType(req.params.roomId);
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        const property = await storage.getProperty(room.propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({
            message: "Not authorized to update options for this room",
          });
        }

        const option = await storage.updateRoomOption(
          req.params.optionId,
          req.body,
        );

        if (!option) {
          return res.status(404).json({ message: "Room option not found" });
        }

        res.json(option);
      } catch (error) {
        console.error("Error updating room option:", error);
        res.status(500).json({ message: "Failed to update room option" });
      }
    },
  );

  app.delete(
    "/api/rooms/:roomId/options/:optionId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can delete room options" });
        }

        const room = await storage.getRoomType(req.params.roomId);
        if (!room) {
          return res.status(404).json({ message: "Room not found" });
        }

        const property = await storage.getProperty(room.propertyId);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({
            message: "Not authorized to delete options from this room",
          });
        }

        await storage.deleteRoomOption(req.params.optionId);
        res.json({ message: "Room option deleted successfully" });
      } catch (error) {
        console.error("Error deleting room option:", error);
        res.status(500).json({ message: "Failed to delete room option" });
      }
    },
  );

  // Wishlists routes
  app.get("/api/wishlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res
          .status(403)
          .json({ message: "Login required to access wishlists" });
      }

      const wishlists = await storage.getWishlists(userId);
      res.json(wishlists);
    } catch (error) {
      console.error("Error fetching wishlists:", error);
      res.status(500).json({ message: "Failed to fetch wishlists" });
    }
  });

  app.post("/api/wishlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res
          .status(403)
          .json({ message: "Login required to add to wishlists" });
      }

      const validatedData = insertWishlistSchema.parse({
        ...req.body,
        userId,
      });

      const wishlist = await storage.createWishlist(validatedData);
      res.json(wishlist);
    } catch (error: any) {
      console.error("Error creating wishlist:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid wishlist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create wishlist" });
    }
  });

  app.delete("/api/wishlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res
          .status(403)
          .json({ message: "Login required to manage wishlists" });
      }

      // Verify ownership before deletion
      const wishlist = await storage.getWishlistById(req.params.id);
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      if (wishlist.userId !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this wishlist item" });
      }

      await storage.deleteWishlist(req.params.id);
      res.json({ message: "Wishlist item removed successfully" });
    } catch (error) {
      console.error("Error deleting wishlist:", error);
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  });

  // User preferences routes
  app.get("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences || {});
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const validatedData = insertUserPreferencesSchema.parse({
        ...req.body,
        userId,
      });

      const preferences = await storage.upsertUserPreferences(validatedData);
      res.json(preferences);
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid preferences data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // Amenities routes
  app.get("/api/amenities", async (req, res) => {
    try {
      const amenities = await storage.getAllAmenities();
      res.json(amenities);
    } catch (error) {
      console.error("Error fetching amenities:", error);
      res.status(500).json({ message: "Failed to fetch amenities" });
    }
  });

  app.get("/api/properties/:id/amenities", async (req, res) => {
    try {
      const amenities = await storage.getPropertyAmenities(req.params.id);
      res.json(amenities);
    } catch (error) {
      console.error("Error fetching property amenities:", error);
      res.status(500).json({ message: "Failed to fetch property amenities" });
    }
  });

  // GST calculation helper — Indian hotel slabs (0% < ₹1000, 12% < ₹7500, 18% otherwise).
  // Returns extracted GST when gstInclusive=true; otherwise returns gstAmount=0 and the
  // unmodified room subtotal (caller should add gstAmount on top if exclusive).
  function calculateGST(
    pricePerNight: number,
    nights: number,
    rooms: number,
    gstInclusive: boolean,
  ): { gstRate: number; gstAmount: number; roomSubtotalExGST: number } {
    const rate = pricePerNight < 1000 ? 0 : pricePerNight < 7500 ? 12 : 18;
    const totalRoomCharge = pricePerNight * nights * rooms;
    if (!gstInclusive || rate === 0) {
      return {
        gstRate: rate,
        gstAmount: 0,
        roomSubtotalExGST: totalRoomCharge,
      };
    }
    const gstAmount = Math.round((totalRoomCharge * rate) / (100 + rate));
    return {
      gstRate: rate,
      gstAmount,
      roomSubtotalExGST: totalRoomCharge - gstAmount,
    };
  }

  // Booking routes
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res
          .status(403)
          .json({ message: "Login required to create bookings" });
      }

      const validatedData = insertBookingSchema.parse({
        ...req.body,
        guestId: userId,
      });

      // Check if property exists and prevent self-booking
      const property = await storage.getProperty(validatedData.propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      if (property.ownerId === userId) {
        return res
          .status(403)
          .json({ message: "You cannot book your own property" });
      }
      // Check owner's subscription status
      const ownerActiveSub = await db
        .select()
        .from(ownerSubscriptions)
        .where(
          and(
            eq(ownerSubscriptions.ownerId, property.ownerId),
            eq(ownerSubscriptions.status, "active"),
          ),
        )
        .limit(1);

      if (ownerActiveSub.length === 0) {
        return res.status(400).json({
          message:
            "This property is not currently accepting bookings. Please try again later.",
          reason: "subscription_inactive",
        });
      }
      // Check owner's KYC status - cannot book if owner's KYC is not verified
      const owner = await storage.getUser(property.ownerId);
      if (!owner || owner.kycStatus !== "verified") {
        return res.status(400).json({
          message:
            "This property is currently not accepting bookings. The property owner needs to complete verification first.",
          reason: "owner_kyc_not_verified",
        });
      }

      // Check for date overlaps
      const checkIn = new Date(validatedData.checkIn);
      const checkOut = new Date(validatedData.checkOut);

      if (checkIn >= checkOut) {
        return res
          .status(400)
          .json({ message: "Check-out must be after check-in" });
      }

      // Check if property has room types - if so, require roomTypeId selection
      const propertyRoomTypes = await storage.getRoomTypes(
        validatedData.propertyId,
      );
      if (propertyRoomTypes.length > 0 && !validatedData.roomTypeId) {
        return res.status(400).json({
          message: "Please select a room type for this property",
        });
      }

      // NOTE: The per-date inventory validation below handles availability correctly by:
      // 1. Counting only ACTIVE bookings (confirmed, customer_confirmed, checked_in)
      // 2. Comparing against totalRooms to allow multiple bookings until capacity is reached
      // 3. Checking blocking overrides (hold, sold_out, maintenance) per date

      // Validate room inventory availability per-date (if room type selected)
      if (validatedData.roomTypeId) {
        const roomType = await storage.getRoomType(validatedData.roomTypeId);
        if (!roomType) {
          return res
            .status(400)
            .json({ message: "Selected room type not found" });
        }

        // Enforce minimum stay at booking time
        const bookingNights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (roomType.minimumStay && bookingNights < roomType.minimumStay) {
          return res.status(400).json({
            message: `This room type requires a minimum stay of ${roomType.minimumStay} night${roomType.minimumStay > 1 ? "s" : ""}`,
            code: "MINIMUM_STAY_REQUIRED",
            minimumStay: roomType.minimumStay,
            nights: bookingNights,
          });
        }

        const totalRoomsDefault = roomType.totalRooms || 1;
        const requestedRooms = validatedData.rooms || 1;
        const guests = validatedData.guests || 1;

        // SERVER-SIDE VALIDATION: Enforce minimum rooms based on guest count
        // Calculate required rooms: ceil(guests / max_guests_per_room)
        const maxGuestsPerRoom = roomType.maxGuests || property?.maxGuests || 2;
        const requiredRooms = Math.ceil(guests / maxGuestsPerRoom);

        if (requestedRooms < requiredRooms) {
          return res.status(400).json({
            message: `You need at least ${requiredRooms} room${requiredRooms > 1 ? "s" : ""} for ${guests} guest${guests > 1 ? "s" : ""} (max ${maxGuestsPerRoom} per room)`,
            code: "INSUFFICIENT_ROOMS",
            requiredRooms,
            requestedRooms,
            maxGuestsPerRoom,
          });
        }

        // Count ACTIVE bookings + recent pending (< 15 min old) to prevent last-room race conditions.
        // Confirmed/customer_confirmed/checked_in always block inventory.
        // Pending bookings older than 15 min are ignored so they don't permanently hold rooms.
        const ACTIVE_BOOKING_STATUSES = [
          "confirmed",
          "customer_confirmed",
          "checked_in",
        ];
        const recentPendingCutoff = new Date(Date.now() - 15 * 60 * 1000);
        const allBookings = await storage.getBookingsByProperty(
          validatedData.propertyId,
        );
        const activeBookingsForRoomType = allBookings.filter((booking: any) => {
          if (booking.roomTypeId !== validatedData.roomTypeId) return false;
          if (ACTIVE_BOOKING_STATUSES.includes(booking.status)) return true;
          if (booking.status === "pending") {
            const createdAt = new Date(
              booking.bookingCreatedAt || booking.createdAt,
            );
            return createdAt > recentPendingCutoff;
          }
          return false;
        });

        // Get availability overrides for this room type
        const overrides = await storage.getAvailabilityOverrides(
          validatedData.propertyId,
        );
        const roomTypeOverrides = overrides.filter(
          (o: any) =>
            o.roomTypeId === validatedData.roomTypeId || !o.roomTypeId,
        );

        // Check availability PER DATE - iterate through each night
        const dateToCheck = new Date(checkIn);
        let insufficientDate: Date | null = null;
        let minAvailable = totalRoomsDefault;
        let blockedReason: string | null = null;

        while (dateToCheck < checkOut) {
          const currentDate = new Date(dateToCheck);
          const nextDate = new Date(dateToCheck);
          nextDate.setDate(nextDate.getDate() + 1);

          // Check for blocking overrides on this specific date (hold, sold_out, maintenance)
          const blockingOverride = roomTypeOverrides.find((o: any) => {
            const overrideStart = new Date(o.startDate);
            const overrideEnd = new Date(o.endDate);
            const overlapsDate =
              overrideStart <= currentDate && overrideEnd > currentDate;
            const isBlockingType = ["hold", "sold_out", "maintenance"].includes(
              o.overrideType,
            );
            return overlapsDate && isBlockingType;
          });

          if (blockingOverride) {
            insufficientDate = currentDate;
            blockedReason = blockingOverride.overrideType;
            console.log("[INVENTORY BLOCK - OVERRIDE]", {
              roomTypeId: validatedData.roomTypeId,
              date: currentDate.toISOString().split("T")[0],
              overrideType: blockingOverride.overrideType,
              requestedRooms,
            });
            break;
          }

          // Count rooms booked for this specific date
          const bookedRoomsOnDate = activeBookingsForRoomType
            .filter((booking: any) => {
              const bookingStart = new Date(booking.checkIn);
              const bookingEnd = new Date(booking.checkOut);
              // Booking overlaps this date if it starts before next day and ends after current day
              return bookingStart < nextDate && bookingEnd > currentDate;
            })
            .reduce(
              (sum: number, booking: any) => sum + (booking.rooms || 1),
              0,
            );

          // Check for custom availability on this date
          let availableOnDate = totalRoomsDefault;
          const dateOverride = roomTypeOverrides.find((o: any) => {
            const overrideStart = new Date(o.startDate);
            const overrideEnd = new Date(o.endDate);
            return (
              overrideStart <= currentDate &&
              overrideEnd > currentDate &&
              o.availableRooms !== null
            );
          });

          if (dateOverride && dateOverride.availableRooms !== null) {
            availableOnDate = dateOverride.availableRooms;
          }

          const remainingRooms = availableOnDate - bookedRoomsOnDate;

          if (remainingRooms < minAvailable) {
            minAvailable = remainingRooms;
          }

          if (requestedRooms > remainingRooms) {
            insufficientDate = currentDate;
            // Debug logging when blocking a booking
            console.log("[INVENTORY BLOCK]", {
              roomTypeId: validatedData.roomTypeId,
              date: currentDate.toISOString().split("T")[0],
              totalRoomsAvailable: availableOnDate,
              bookedRoomsOnDate,
              remainingRooms,
              requestedRooms,
              activeBookings: activeBookingsForRoomType
                .filter((b: any) => {
                  const bs = new Date(b.checkIn);
                  const be = new Date(b.checkOut);
                  return bs < nextDate && be > currentDate;
                })
                .map((b: any) => ({
                  id: b.id,
                  status: b.status,
                  rooms: b.rooms,
                })),
            });
            break;
          }

          dateToCheck.setDate(dateToCheck.getDate() + 1);
        }

        if (insufficientDate) {
          const dateStr = insufficientDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });

          // Show appropriate message based on block reason
          if (blockedReason === "hold") {
            return res.status(400).json({
              message: `Property is temporarily not accepting bookings on ${dateStr}. Please choose different dates.`,
              availableRooms: 0,
            });
          } else if (blockedReason === "sold_out") {
            return res.status(400).json({
              message: `Property is fully booked on ${dateStr}. Please choose different dates.`,
              availableRooms: 0,
            });
          } else if (blockedReason === "maintenance") {
            return res.status(400).json({
              message: `Property is under maintenance on ${dateStr}. Please choose different dates.`,
              availableRooms: 0,
            });
          }

          return res.status(400).json({
            message: `Only ${Math.max(0, minAvailable)} room${minAvailable !== 1 ? "s" : ""} available on ${dateStr}. Please reduce the number of rooms or select different dates.`,
            availableRooms: Math.max(0, minAvailable),
          });
        }
      } else {
        // No room type selected - property without room types (simple property like villa/apartment)
        // Check for blocking overrides AND existing active bookings (single-unit properties)
        const overrides = await storage.getAvailabilityOverrides(
          validatedData.propertyId,
        );
        const propertyWideOverrides = overrides.filter(
          (o: any) => !o.roomTypeId,
        );

        // For simple properties, check for overlapping ACTIVE bookings + recent pending (< 15 min).
        const ACTIVE_BOOKING_STATUSES = [
          "confirmed",
          "customer_confirmed",
          "checked_in",
        ];
        const recentPendingCutoffSimple = new Date(Date.now() - 15 * 60 * 1000);
        const allBookings = await storage.getBookingsByProperty(
          validatedData.propertyId,
        );
        const overlappingActiveBookings = allBookings.filter((booking: any) => {
          const bookingStart = new Date(booking.checkIn);
          const bookingEnd = new Date(booking.checkOut);
          const overlaps = bookingStart < checkOut && bookingEnd > checkIn;
          if (!overlaps) return false;
          if (ACTIVE_BOOKING_STATUSES.includes(booking.status)) return true;
          if (booking.status === "pending") {
            const createdAt = new Date(
              booking.bookingCreatedAt || booking.createdAt,
            );
            return createdAt > recentPendingCutoffSimple;
          }
          return false;
        });

        if (overlappingActiveBookings.length > 0) {
          return res.status(400).json({
            message:
              "This property is already booked for the selected dates. Please choose different dates.",
          });
        }

        const dateToCheck = new Date(checkIn);
        while (dateToCheck < checkOut) {
          const currentDate = new Date(dateToCheck);

          const blockingOverride = propertyWideOverrides.find((o: any) => {
            const overrideStart = new Date(o.startDate);
            const overrideEnd = new Date(o.endDate);
            const overlapsDate =
              overrideStart <= currentDate && overrideEnd > currentDate;
            const isBlockingType = ["hold", "sold_out", "maintenance"].includes(
              o.overrideType,
            );
            return overlapsDate && isBlockingType;
          });

          if (blockingOverride) {
            const dateStr = currentDate.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            });
            let message = `Selected dates are unavailable on ${dateStr}. Please choose different dates.`;
            if (blockingOverride.overrideType === "maintenance") {
              message = `Property is under maintenance on ${dateStr}. Please choose different dates.`;
            } else if (blockingOverride.overrideType === "sold_out") {
              message = `Property is fully booked on ${dateStr}. Please choose different dates.`;
            } else if (blockingOverride.overrideType === "hold") {
              message = `Property is temporarily not accepting bookings on ${dateStr}. Please choose different dates.`;
            }
            return res.status(400).json({ message });
          }

          dateToCheck.setDate(dateToCheck.getDate() + 1);
        }
      }

      // Calculate total price server-side (don't trust client)
      // Room cost = occupancy-resolved price × nights × rooms
      // Meal cost = mealOptionPrice × guests × nights (per person per night)
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      const roomsCount = validatedData.rooms || 1;
      const guestCount = validatedData.guests || 1;
      const adultsCount = validatedData.adults || guestCount;

      let mealSubtotal = 0;
      let roomSubtotal = nights * Number(property.pricePerNight) * roomsCount;
      let occupancyTier: string | null = null;
      let pricePerNight: number | null = null;

      // If room type is selected, use room type pricing with per-night overrides
      if (validatedData.roomTypeId) {
        const roomType = await storage.getRoomType(validatedData.roomTypeId);
        if (roomType) {
          const adultsPerRoom = Math.ceil(adultsCount / roomsCount);

          // Determine which occupancy tier was applied
          if (adultsPerRoom >= 3 && roomType.tripleOccupancyPrice) {
            occupancyTier = "triple";
          } else if (adultsPerRoom >= 2 && roomType.doubleOccupancyPrice) {
            occupancyTier = "double";
          } else {
            occupancyTier = "single";
          }

          // Fetch day-level price overrides for the booking date range
          const startKey = checkIn.toISOString().split("T")[0];
          const endKey = new Date(checkOut.getTime() - 86400000)
            .toISOString()
            .split("T")[0];
          const overrideRows = await storage.getRoomPriceOverrides(
            validatedData.roomTypeId,
            startKey,
            endKey,
          );
          const overridesMap = new Map<
            string,
            { base?: number; double?: number; triple?: number }
          >(
            overrideRows.map((r) => [
              r.date,
              {
                base: r.roomPrice != null ? Number(r.roomPrice) : undefined,
                double:
                  r.doublePriceOverride != null
                    ? Number(r.doublePriceOverride)
                    : undefined,
                triple:
                  r.triplePriceOverride != null
                    ? Number(r.triplePriceOverride)
                    : undefined,
              },
            ]),
          );

          // Sum nightly prices: each night uses tier override or base+increment
          roomSubtotal = calculateNightlyRoomCost(
            roomType,
            adultsPerRoom,
            roomsCount,
            checkIn,
            checkOut,
            overridesMap,
          );
          // Effective per-room per-night rate (for owner visibility)
          pricePerNight =
            nights > 0 && roomsCount > 0
              ? roomSubtotal / nights / roomsCount
              : null;

          // Meal option price: per-night with day-level overrides applied
          if (validatedData.roomOptionId) {
            const mealOption = await storage.getRoomOption(
              validatedData.roomOptionId,
            );
            if (
              mealOption &&
              mealOption.roomTypeId === validatedData.roomTypeId
            ) {
              const mealOverrides = await storage.getMealPlanPriceOverrides(
                [validatedData.roomOptionId],
                startKey,
                endKey,
              );
              const mealOverridesMap = new Map<string, number>(
                mealOverrides.map((r) => [r.date, Number(r.price)]),
              );
              const mc = new Date(checkIn);
              while (mc < checkOut) {
                const dk = mc.toISOString().split("T")[0];
                mealSubtotal +=
                  (mealOverridesMap.get(dk) ??
                    Number(mealOption.priceAdjustment)) * guestCount;
                mc.setDate(mc.getDate() + 1);
              }
            }
          }
        }
      }

      // Fetch admin-configured platform settings (auto-creates default row on first call)
      const settings = await storage.getPlatformSettings();

      // Effective per-room per-night rate drives the GST slab. Fall back to the
      // averaged value when room-type pricing didn't set pricePerNight.
      const effectivePricePerNight =
        pricePerNight ??
        (nights > 0 && roomsCount > 0
          ? roomSubtotal / nights / roomsCount
          : 0);

      const { gstRate, gstAmount } = calculateGST(
        effectivePricePerNight,
        nights,
        roomsCount,
        settings.gstInclusive,
      );

      const platformFeePercent = Number(settings.platformFeePercent);
      const platformFee = Math.round(
        (roomSubtotal * platformFeePercent) / 100,
      );

      // In the inclusive model GST is already part of roomSubtotal — don't add it again.
      const totalPrice = roomSubtotal + mealSubtotal + platformFee;

      const advancePercent = Number(settings.advancePaymentPercent);
      const advanceAmount = Math.round((totalPrice * advancePercent) / 100);

      const booking = await storage.createBooking({
        ...validatedData,
        rooms: roomsCount,
        totalPrice: totalPrice.toString(),
        roomPrice: roomSubtotal.toString(),
        mealPrice: mealSubtotal.toString(),
        platformFee: platformFee.toString(),
        gstAmount: gstAmount.toString(),
        advanceAmount: advanceAmount.toString(),
        adults: validatedData.adults || null,
        childrenCount: validatedData.childrenCount || null,
        occupancyTier,
        pricePerNight: pricePerNight !== null ? pricePerNight.toString() : null,
      });

      // STATE: CREATED - Send state-driven booking emails
      const guest = await storage.getUser(userId);
      // owner already fetched above for KYC check
      const checkInFormatted = checkIn.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const checkOutFormatted = checkOut.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Format booking created date for emails with IST timezone
      const bookingCreatedAtFormatted = booking.bookingCreatedAt
        ? new Date(booking.bookingCreatedAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
        : undefined;

      // Get room type details for email
      let roomTypeName: string | undefined;
      let roomTypeDescription: string | undefined;
      let roomBasePrice: string | undefined;
      let roomOriginalPrice: string | undefined;
      let mealOptionName: string | undefined;
      let mealOptionPrice: string | undefined;
      if (validatedData.roomTypeId) {
        const roomTypeForEmail = await storage.getRoomType(
          validatedData.roomTypeId,
        );
        if (roomTypeForEmail) {
          roomTypeName = roomTypeForEmail.name;
          roomTypeDescription = roomTypeForEmail.description || undefined;
          roomBasePrice = roomTypeForEmail.basePrice;
          // Only include original price if it's greater than base price (discount scenario)
          if (
            roomTypeForEmail.originalPrice &&
            parseFloat(roomTypeForEmail.originalPrice) >
              parseFloat(roomTypeForEmail.basePrice)
          ) {
            roomOriginalPrice = roomTypeForEmail.originalPrice;
          }
        }
      }
      // Get meal option details for email (per-person pricing)
      if (validatedData.roomOptionId) {
        const mealOptionForEmail = await storage.getRoomOption(
          validatedData.roomOptionId,
        );
        if (mealOptionForEmail) {
          mealOptionName = mealOptionForEmail.name;
          mealOptionPrice = mealOptionForEmail.priceAdjustment;
        }
      }

      // Build full property address
      const propertyAddressParts = [
        property.propFlatNo,
        property.propHouseNo,
        property.propStreetAddress,
        property.propLandmark,
        property.propLocality,
      ].filter(Boolean);
      const propertyAddress =
        propertyAddressParts.length > 0
          ? propertyAddressParts.join(", ")
          : property.address || undefined;

      const bookingEmailData = {
        bookingCode:
          booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
        propertyName: property.title,
        propertyId: property.id,
        checkIn: checkInFormatted,
        checkOut: checkOutFormatted,
        guests: validatedData.guests || 1,
        rooms: roomsCount,
        totalPrice: totalPrice.toString(),
        guestName:
          guest?.firstName && guest?.lastName
            ? `${guest.firstName} ${guest.lastName}`
            : guest?.email || "Guest",
        guestEmail: guest?.email || "",
        bookingCreatedAt: bookingCreatedAtFormatted,
        // Extended property details
        propertyAddress,
        propertyCity: property.propCity || property.destination || undefined,
        propertyState: property.propState || undefined,
        propertyPincode: property.propPincode || undefined,
        latitude: property.latitude?.toString() || undefined,
        longitude: property.longitude?.toString() || undefined,
        // Room details
        roomTypeName,
        roomTypeDescription,
        // Pricing details for strikethrough display
        roomBasePrice,
        roomOriginalPrice,
        // Payment type - default to pay_at_hotel
        paymentType: "pay_at_hotel",
        // Meal option details (per-person pricing)
        mealOptionName,
        mealOptionPrice,
      };

      // Email to guest: "Reservation Requested"
      if (guest?.email) {
        sendBookingCreatedGuestEmail(
          guest.email,
          guest.firstName || "",
          bookingEmailData,
        ).catch(console.error);
      }

      // Email to owner: "New Booking Request"
      if (owner?.email) {
        sendBookingRequestToOwnerEmail(owner.email, owner.firstName || "", {
          propertyName: property.title,
          guestName: bookingEmailData.guestName || "Guest",
          guestEmail: guest?.email || "",
          bookingCode:
            booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
          checkIn: checkInFormatted,
          checkOut: checkOutFormatted,
          guests: validatedData.guests || 1,
          rooms: roomsCount,
          totalPrice: totalPrice.toString(),
          bookingCreatedAt: bookingCreatedAtFormatted,
          roomTypeName,
          maxOccupancy: validatedData.roomTypeId
            ? (await storage.getRoomType(validatedData.roomTypeId))
                ?.maxGuests || undefined
            : undefined,
          roomBasePrice,
          roomOriginalPrice,
          mealOptionName,
          mealOptionPrice,
          paymentType: "pay_at_hotel",
        }).catch(console.error);
      }

      // Create in-app notification for owner about new booking request
      const guestFullName =
        guest?.firstName && guest?.lastName
          ? `${guest.firstName} ${guest.lastName}`
          : guest?.email || "Guest";

      // Create/get conversation and send automated message with booking details
      try {
        const conversation = await storage.getOrCreateConversation(
          validatedData.propertyId,
          userId,
        );

        const bookingMessage = `I'd like to book ${roomsCount} room${roomsCount > 1 ? "s" : ""} for ${validatedData.guests || 1} guest${(validatedData.guests || 1) > 1 ? "s" : ""} from ${checkInFormatted} to ${checkOutFormatted}. Total: Rs. ${totalPrice}`;

        const message = await storage.createMessage({
          conversationId: conversation.id,
          senderId: userId,
          content: bookingMessage,
          messageType: "booking_request",
          bookingId: booking.id,
        });

        // Broadcast the message to both guest and owner for real-time updates
        const messageWithSender = {
          ...message,
          sender: {
            id: userId,
            firstName: guest?.firstName || null,
            lastName: guest?.lastName || null,
            profileImageUrl: guest?.profileImageUrl || null,
          },
        };

        const broadcastData = {
          type: "new_message",
          conversationId: conversation.id,
          message: messageWithSender,
        };

        // Notify the owner (recipient)
        broadcastToUser(property.ownerId, broadcastData);

        // Also broadcast to guest (sender) so they see the booking in their chat
        broadcastToUser(userId, broadcastData);
      } catch (msgError) {
        console.error("Failed to send booking message to owner:", msgError);
        // Don't fail the booking if message fails
      }

      // Create in-app notification for owner
      try {
        await createNotification({
          userId: property.ownerId,
          title: "New Booking Request",
          body: `${guest?.firstName || "A guest"} has requested to book ${property.title}`,
          type: "booking_request",
          entityId: booking.id,
          entityType: "booking",
        });

        broadcastToUser(property.ownerId, { type: "notification_update" });

        // Send urgent push notification to owner with action buttons
        const { sendUrgentBookingPush } = require("./services/pushService");
        await sendUrgentBookingPush(
          property.ownerId,
          booking.id,
          booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
          guestFullName,
          property.title,
          checkInFormatted,
          roomTypeName || "Standard Room",
        );

        // Broadcast urgent booking alert via WebSocket for in-app modal
        broadcastToUser(property.ownerId, {
          type: "urgent_booking_alert",
          bookingId: booking.id,
          bookingCode:
            booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
          guestName: guestFullName,
          propertyName: property.title,
          checkIn: checkInFormatted,
          checkOut: checkOutFormatted,
          roomType: roomTypeName || "Standard Room",
          guests: validatedData.guests || 1,
          rooms: roomsCount,
          totalPrice: totalPrice.toString(),
          timestamp: Date.now(),
        });

        // Log WebSocket notification
        await storage.createNotificationLog({
          userId: property.ownerId,
          bookingId: booking.id,
          channel: "websocket",
          status: "sent",
          title: "Urgent Booking Alert (WebSocket)",
          body: `Booking ${booking.bookingCode || booking.id.slice(0, 8).toUpperCase()} for ${property.title}`,
          sentAt: new Date(),
        });
      } catch (notifError) {
        console.error("Failed to create booking notification:", notifError);
      }

      res.json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      console.error("Error details:", error.message, error.stack);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid booking data", errors: error.errors });
      }
      // Return more specific error message for debugging
      res.status(500).json({
        message: "Failed to create booking",
        error:
          process.env.NODE_ENV !== "production" ? error.message : undefined,
      });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const property = await storage.getProperty(booking.propertyId);

      if (booking.guestId !== userId && property?.ownerId !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to view this booking" });
      }

      let roomTypeName: string | null = null;
      let mealOptionName: string | null = null;

      if (booking.roomTypeId) {
        const rt = await storage.getRoomType(booking.roomTypeId);
        if (rt) roomTypeName = rt.name;
      }

      if (booking.roomOptionId) {
        const ro = await storage.getRoomOption(booking.roomOptionId);
        if (ro) mealOptionName = ro.name;
      }

      res.json({ ...booking, roomTypeName, mealOptionName });
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get guest's bookings with property details
      const bookings = await storage.getBookingsByGuest(userId);

      // Enrich with property, owner contact, room type and meal option info
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const property = await storage.getProperty(booking.propertyId);

          // Fetch owner contact info
          let ownerContact = null;
          if (property?.ownerId) {
            const owner = await storage.getUser(property.ownerId);
            if (owner) {
              const ownerPhone =
                owner.phone && owner.phone.trim() ? owner.phone.trim() : null;
              ownerContact = {
                name:
                  `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
                  "Owner",
                phone: ownerPhone,
              };
            }
          }

          // Fetch room type and meal option if present
          let roomType = null;
          let roomOption = null;

          if (booking.roomTypeId) {
            const rt = await storage.getRoomType(booking.roomTypeId);
            if (rt) {
              roomType = { id: rt.id, name: rt.name, basePrice: rt.basePrice };
            }
          }

          if (booking.roomOptionId) {
            const ro = await storage.getRoomOption(booking.roomOptionId);
            if (ro) {
              roomOption = {
                id: ro.id,
                name: ro.name,
                priceAdjustment: ro.priceAdjustment,
              };
            }
          }

          // Check if booking has been reviewed (for completed/checked_out bookings)
          let hasReview = false;
          if (["completed", "checked_out"].includes(booking.status)) {
            const existingReview = await storage.getReviewByBookingId(
              booking.id,
            );
            hasReview = !!existingReview;
          }

          return {
            ...booking,
            property: property
              ? {
                  id: property.id,
                  title: property.title,
                  images: property.images,
                  destination: property.destination,
                }
              : null,
            ownerContact,
            roomType,
            roomOption,
            hasReview,
          };
        }),
      );

      res.json(enrichedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/properties/:id/booked-dates", async (req, res) => {
    try {
      const { startDate, endDate, roomTypeId } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "startDate and endDate are required" });
      }

      // Optionally filter by room type - allows different room types on overlapping dates
      const bookedDates = await storage.getPropertyBookedDates(
        req.params.id,
        new Date(startDate as string),
        new Date(endDate as string),
        (roomTypeId as string) || null,
      );

      res.json(bookedDates);
    } catch (error) {
      console.error("Error fetching booked dates:", error);
      res.status(500).json({ message: "Failed to fetch booked dates" });
    }
  });

  // Calendar availability endpoint - returns per-date availability for customer calendar
  // Returns array of dates with their availability status (available, partial, full)
  app.get("/api/properties/:id/calendar-availability", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "startDate and endDate are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // Get all room types for this property
      const roomTypes = await storage.getRoomsByProperty(req.params.id);

      if (roomTypes.length === 0) {
        return res.json([]);
      }

      // Get all bookings that overlap with the date range
      // Count ACTIVE bookings: confirmed (owner_accepted), customer_confirmed, checked_in
      const ACTIVE_BOOKING_STATUSES = [
        "confirmed",
        "customer_confirmed",
        "checked_in",
      ];
      const allBookings = await storage.getBookingsByProperty(req.params.id);
      const overlappingBookings = allBookings.filter((booking: any) => {
        if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) return false;
        const bookingStart = new Date(booking.checkIn);
        const bookingEnd = new Date(booking.checkOut);
        return bookingStart < end && bookingEnd > start;
      });

      // Get availability overrides for the date range
      const overrides = await storage.getAvailabilityOverrides(req.params.id);
      const overlappingOverrides = overrides.filter((override: any) => {
        const overrideStart = new Date(override.startDate);
        const overrideEnd = new Date(override.endDate);
        return overrideStart < end && overrideEnd > start;
      });

      // Calculate availability for each date
      const calendarDates: Array<{
        date: string;
        totalRooms: number;
        availableRooms: number;
        status: "available" | "partial" | "full";
        isBlocked: boolean;
      }> = [];

      const dateToCheck = new Date(start);
      while (dateToCheck < end) {
        const currentDate = new Date(dateToCheck);
        currentDate.setHours(0, 0, 0, 0); // Normalize to midnight for consistent comparison
        const nextDate = new Date(dateToCheck);
        nextDate.setDate(nextDate.getDate() + 1);

        // Calculate total rooms and booked rooms across all room types for this date
        let totalRoomsAllTypes = 0;
        let availableRoomsAllTypes = 0;
        let isBlocked = false;

        for (const roomType of roomTypes) {
          const totalRoomsDefault = roomType.totalRooms || 1;
          totalRoomsAllTypes += totalRoomsDefault;

          // Check for blocking overrides on this specific date for this room type
          const blockingOverride = overlappingOverrides.find((o: any) => {
            if (o.roomTypeId && o.roomTypeId !== roomType.id) return false;
            const overrideStart = new Date(o.startDate);
            const overrideEnd = new Date(o.endDate);
            const overlapsDate =
              overrideStart <= currentDate && overrideEnd > currentDate;
            const isBlockingType = ["hold", "sold_out", "maintenance"].includes(
              o.overrideType,
            );
            return overlapsDate && isBlockingType;
          });

          if (blockingOverride && !blockingOverride.roomTypeId) {
            // Property-wide block
            isBlocked = true;
            continue;
          }

          if (blockingOverride) {
            // Room type specific block - this room type has 0 availability
            continue;
          }

          // Count rooms booked for this specific night (check-in date up to but excluding checkout date)
          // A room is booked on a given night if: checkIn <= currentDate < checkOut
          // The checkout day itself is NOT counted as booked (guest leaves that morning)
          const roomTypeBookings = overlappingBookings.filter(
            (b: any) => b.roomTypeId === roomType.id,
          );
          const bookedOnDate = roomTypeBookings
            .filter((b: any) => {
              const bookingStart = new Date(b.checkIn);
              const bookingEnd = new Date(b.checkOut);
              bookingStart.setHours(0, 0, 0, 0);
              bookingEnd.setHours(0, 0, 0, 0);
              // Room is occupied on nights where: checkIn <= date < checkOut
              // Checkout day is available for new check-ins
              return bookingStart <= currentDate && bookingEnd > currentDate;
            })
            .reduce((sum: number, b: any) => sum + (b.rooms || 1), 0);

          // Check for custom availability override on this date
          let baseAvailable = totalRoomsDefault;
          const dateOverride = overlappingOverrides.find((o: any) => {
            if (o.roomTypeId && o.roomTypeId !== roomType.id) return false;
            const overrideStart = new Date(o.startDate);
            const overrideEnd = new Date(o.endDate);
            return (
              overrideStart <= currentDate &&
              overrideEnd > currentDate &&
              o.availableRooms !== null
            );
          });

          if (dateOverride && dateOverride.availableRooms !== null) {
            baseAvailable = dateOverride.availableRooms;
          }

          const remainingOnDate = Math.max(0, baseAvailable - bookedOnDate);
          availableRoomsAllTypes += remainingOnDate;
        }

        // Determine status
        let status: "available" | "partial" | "full" = "available";
        if (isBlocked || availableRoomsAllTypes === 0) {
          status = "full";
        } else if (availableRoomsAllTypes < totalRoomsAllTypes) {
          status = "partial";
        }

        calendarDates.push({
          date: dateToCheck.toISOString().split("T")[0],
          totalRooms: totalRoomsAllTypes,
          availableRooms: availableRoomsAllTypes,
          status,
          isBlocked,
        });

        dateToCheck.setDate(dateToCheck.getDate() + 1);
      }

      res.json(calendarDates);
    } catch (error) {
      console.error("Error fetching calendar availability:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch calendar availability" });
    }
  });

  app.patch(
    "/api/bookings/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const booking = await storage.getBooking(req.params.id);

        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Only the guest who made the booking may use this endpoint.
        // Property owners must use PATCH /api/owner/bookings/:id/status which
        // enforces proper role and workflow checks.
        if (booking.guestId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this booking" });
        }

        const { status } = req.body;

        // Guests are only permitted to cancel their own pending bookings.
        // All other status transitions (confirm, complete, etc.) are owner
        // responsibilities and must go through the owner endpoint.
        if (status !== "cancelled") {
          return res
            .status(403)
            .json({ message: "Guests may only cancel bookings" });
        }

        if (booking.status !== "pending") {
          return res
            .status(400)
            .json({ message: "Only pending bookings can be cancelled by the guest" });
        }

        const updated = await storage.updateBookingStatus(
          req.params.id,
          "cancelled",
        );
        res.json(updated);
      } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({ message: "Failed to update booking status" });
      }
    },
  );

  app.delete("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const property = await storage.getProperty(booking.propertyId);

      if (booking.guestId !== userId && property?.ownerId !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this booking" });
      }

      await storage.deleteBooking(req.params.id);
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Customer booking confirmation (after owner accepts)
  app.post(
    "/api/bookings/:id/customer-confirm",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const booking = await storage.getBooking(req.params.id);

        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Only the guest who made the booking can confirm
        if (booking.guestId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to confirm this booking" });
        }

        // Can only confirm if the owner has accepted (status is "confirmed")
        if (booking.status !== "confirmed") {
          return res.status(400).json({
            message:
              "Booking cannot be confirmed. The hotel must accept your request first.",
          });
        }

        // Update status to customer_confirmed (cast to any to work around TypeScript enum sync)
        const updated = await storage.updateBookingStatus(
          req.params.id,
          "customer_confirmed" as any,
        );

        // Create notification for owner about customer confirmation
        const property = await storage.getProperty(booking.propertyId);
        const guest = await storage.getUser(userId);

        if (property) {
          try {
            // Find or create conversation to notify the owner
            const conversations = await storage.getConversationsByUser(
              property.ownerId,
            );
            const existingConv = conversations.find(
              (c) =>
                c.guestId === userId &&
                c.ownerId === property.ownerId &&
                c.propertyId === property.id,
            );

            if (existingConv) {
              // Send system message to owner about confirmation
              //await storage.createMessage({
              //  conversationId: existingConv.id,
              //  senderId: userId,
              //  content: `Great news! I've confirmed my booking (${booking.bookingCode || booking.id.slice(0, 8).toUpperCase()}). Looking forward to my stay!`,
              //  read: false,
              //});
            }
          } catch (msgError) {
            console.error("Error sending confirmation notification:", msgError);
            // Don't fail the request if messaging fails
          }

          // Create in-app notification for owner about customer confirmation
          const guestFullName =
            guest?.firstName && guest?.lastName
              ? `${guest.firstName} ${guest.lastName}`
              : guest?.email || "Guest";
          createNotification({
            userId: property.ownerId,
            title: "Booking Confirmed",
            body: `${guestFullName} has confirmed their booking at ${property.title}. Get ready to welcome them!`,
            type: "booking_confirmed",
            entityId: booking.id,
            entityType: "booking",
          })
            .then(() =>
              broadcastToUser(property.ownerId, {
                type: "notification_update",
              }),
            )
            .catch(console.error);

          // Send push notification to owner about customer confirmation
          try {
            const { sendBookingPush } = require("./services/pushService");
            await sendBookingPush(
              property.ownerId,
              "customer_confirmed",
              property.title,
              booking.id,
            );
          } catch (pushError) {
            console.error(
              "Failed to send customer confirmation push notification:",
              pushError,
            );
          }

          // STATE: CUSTOMER_CONFIRMED - Send confirmation emails to both guest and owner
          const checkInFormatted = new Date(booking.checkIn).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" },
          );
          const checkOutFormatted = new Date(
            booking.checkOut,
          ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const bookingCreatedAtFormatted = booking.bookingCreatedAt
            ? new Date(booking.bookingCreatedAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata",
              })
            : undefined;

          // Get room type details for email
          let roomTypeName: string | undefined;
          let roomTypeDescription: string | undefined;
          let roomBasePrice: string | undefined;
          let roomOriginalPrice: string | undefined;
          let mealOptionName: string | undefined;
          let mealOptionPrice: string | undefined;
          if (booking.roomTypeId) {
            const roomTypeForEmail = await storage.getRoomType(
              booking.roomTypeId,
            );
            if (roomTypeForEmail) {
              roomTypeName = roomTypeForEmail.name;
              roomTypeDescription = roomTypeForEmail.description || undefined;
              roomBasePrice = roomTypeForEmail.basePrice;
              if (
                roomTypeForEmail.originalPrice &&
                parseFloat(roomTypeForEmail.originalPrice) >
                  parseFloat(roomTypeForEmail.basePrice)
              ) {
                roomOriginalPrice = roomTypeForEmail.originalPrice;
              }
            }
          }
          // Get meal option details for email (per-person pricing)
          if (booking.roomOptionId) {
            const mealOptionForEmail = await storage.getRoomOption(
              booking.roomOptionId,
            );
            if (mealOptionForEmail) {
              mealOptionName = mealOptionForEmail.name;
              mealOptionPrice = mealOptionForEmail.priceAdjustment;
            }
          }

          // Build full property address
          const propertyAddressParts = [
            property.propFlatNo,
            property.propHouseNo,
            property.propStreetAddress,
            property.propLandmark,
            property.propLocality,
          ].filter(Boolean);
          const propertyAddress =
            propertyAddressParts.length > 0
              ? propertyAddressParts.join(", ")
              : property.address || undefined;

          const bookingEmailData = {
            bookingCode:
              booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
            propertyName: property.title,
            propertyId: property.id,
            checkIn: checkInFormatted,
            checkOut: checkOutFormatted,
            guests: booking.guests || 1,
            rooms: booking.rooms || 1,
            totalPrice: booking.totalPrice?.toString() || "0",
            guestName:
              guest?.firstName && guest?.lastName
                ? `${guest.firstName} ${guest.lastName}`
                : guest?.email || "Guest",
            guestEmail: guest?.email || "",
            bookingCreatedAt: bookingCreatedAtFormatted,
            // Extended property details
            propertyAddress,
            propertyCity:
              property.propCity || property.destination || undefined,
            propertyState: property.propState || undefined,
            propertyPincode: property.propPincode || undefined,
            latitude: property.latitude?.toString() || undefined,
            longitude: property.longitude?.toString() || undefined,
            // Room details
            roomTypeName,
            roomTypeDescription,
            // Pricing details for strikethrough display
            roomBasePrice,
            roomOriginalPrice,
            // Payment type
            paymentType: "pay_at_hotel",
            // Meal option details (per-person pricing)
            mealOptionName,
            mealOptionPrice,
          };

          // Email to guest: "Booking Confirmed"
          //if (guest?.email) {
          //  sendBookingConfirmedGuestEmail(
          //   guest.email,
          //    guest.firstName || "",
          //    bookingEmailData,
          //  ).catch(console.error);
          //}

          // Email to owner: "Guest Confirmed"
          //const owner = await storage.getUser(property.ownerId);
          //if (owner?.email) {
          //  sendBookingConfirmedOwnerEmail(
          //   owner.email,
          //    owner.firstName || "",
          //    bookingEmailData,
          //  ).catch(console.error);
          //}
        }

        res.json({
          ...updated,
          message: "Booking confirmed! The hotel has been notified.",
        });
      } catch (error) {
        console.error("Error confirming booking:", error);
        res.status(500).json({ message: "Failed to confirm booking" });
      }
    },
  );

  // Preview cancellation refund before actually cancelling
  app.get(
    "/api/bookings/:id/cancel-preview",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const bookingId = req.params.id;

        const booking = await storage.getBooking(bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Only the guest can view cancellation preview
        if (booking.guestId !== userId) {
          return res.status(403).json({
            message: "You can only view your own booking cancellation",
          });
        }

        // Check if booking can be cancelled based on status
        const cancellableStatuses = [
          "pending",
          "confirmed",
          "customer_confirmed",
        ];
        if (!cancellableStatuses.includes(booking.status)) {
          return res.status(400).json({
            canCancel: false,
            message: `Cannot cancel a booking with status '${booking.status}'.`,
          });
        }

        const property = await storage.getProperty(booking.propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        const now = new Date();
        const checkInDate = new Date(booking.checkIn);
        const hoursUntilCheckIn =
          (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Can't cancel after check-in
        if (hoursUntilCheckIn < 0) {
          return res.json({
            canCancel: false,
            message: "Cannot cancel after check-in date has passed.",
          });
        }

        // Calculate refund preview using same logic as storage method
        const totalPrice = parseFloat(booking.totalPrice);
        const policyType = property.cancellationPolicyType || "flexible";
        const freeCancellationHours = property.freeCancellationHours || 24;
        const partialRefundPercent = property.partialRefundPercent || 50;

        let refundPercentage = 0;

        if (policyType === "flexible") {
          if (hoursUntilCheckIn >= freeCancellationHours) {
            refundPercentage = 100;
          } else {
            refundPercentage = partialRefundPercent;
          }
        } else if (policyType === "moderate") {
          if (hoursUntilCheckIn >= freeCancellationHours) {
            refundPercentage = 100;
          } else if (hoursUntilCheckIn >= freeCancellationHours / 2) {
            refundPercentage = partialRefundPercent;
          } else {
            refundPercentage = 0;
          }
        } else if (policyType === "strict") {
          if (hoursUntilCheckIn >= freeCancellationHours * 2) {
            refundPercentage = partialRefundPercent;
          } else {
            refundPercentage = 0;
          }
        }

        const refundAmount = ((totalPrice * refundPercentage) / 100).toFixed(2);

        res.json({
          canCancel: true,
          policyType,
          freeCancellationHours,
          partialRefundPercent,
          hoursUntilCheckIn: Math.floor(hoursUntilCheckIn),
          totalPrice: booking.totalPrice,
          refundPercentage,
          refundAmount,
          message:
            refundPercentage === 100
              ? "Full refund available"
              : refundPercentage > 0
                ? `${refundPercentage}% refund available based on ${policyType} policy`
                : "No refund available based on cancellation policy",
        });
      } catch (error) {
        console.error("Error previewing cancellation:", error);
        res.status(500).json({ message: "Failed to preview cancellation" });
      }
    },
  );

  // Guest cancels their own booking
  app.post(
    "/api/bookings/:id/cancel",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const bookingId = req.params.id;
        const { reason } = req.body;

        const booking = await storage.getBooking(bookingId);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Only the guest can cancel their own booking
        if (booking.guestId !== userId) {
          return res
            .status(403)
            .json({ message: "You can only cancel your own bookings" });
        }

        // Check if booking can be cancelled based on status
        const cancellableStatuses = [
          "pending",
          "confirmed",
          "customer_confirmed",
        ];
        if (!cancellableStatuses.includes(booking.status)) {
          return res.status(400).json({
            message: `Cannot cancel a booking with status '${booking.status}'. Only pending or confirmed bookings can be cancelled.`,
          });
        }

        // Check cancellation policy based on check-in date
        const checkInDate = new Date(booking.checkIn);
        const now = new Date();
        const hoursUntilCheckIn =
          (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Get property to check cancellation policy
        const property = await storage.getProperty(booking.propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        // Check if check-in has already passed
        if (hoursUntilCheckIn < 0) {
          return res.status(400).json({
            message:
              "Cannot cancel a booking after the check-in date has passed.",
          });
        }

        // Guests can always cancel, but refund amount varies based on policy
        // The storage method calculates the appropriate refund

        // Update booking to cancelled
        const updated = await storage.cancelBooking(
          bookingId,
          "guest",
          reason || "Cancelled by guest",
        );

        // Get guest info for emails
        const guest = await storage.getUser(userId);
        const checkInFormatted = format(checkInDate, "MMM d, yyyy");
        const checkOutFormatted = format(
          new Date(booking.checkOut),
          "MMM d, yyyy",
        );

        // Get room type details for email
        let roomTypeName: string | undefined;
        let roomTypeDescription: string | undefined;
        let roomBasePrice: string | undefined;
        let roomOriginalPrice: string | undefined;
        if (booking.roomTypeId) {
          const roomTypeForEmail = await storage.getRoomType(
            booking.roomTypeId,
          );
          if (roomTypeForEmail) {
            roomTypeName = roomTypeForEmail.name;
            roomTypeDescription = roomTypeForEmail.description || undefined;
            roomBasePrice = roomTypeForEmail.basePrice;
            if (
              roomTypeForEmail.originalPrice &&
              parseFloat(roomTypeForEmail.originalPrice) >
                parseFloat(roomTypeForEmail.basePrice)
            ) {
              roomOriginalPrice = roomTypeForEmail.originalPrice;
            }
          }
        }

        // Build full property address
        const propertyAddressParts = [
          property.propFlatNo,
          property.propHouseNo,
          property.propStreetAddress,
          property.propLandmark,
          property.propLocality,
        ].filter(Boolean);
        const propertyAddress =
          propertyAddressParts.length > 0
            ? propertyAddressParts.join(", ")
            : property.address || undefined;

        // Send email to guest
        if (guest?.email) {
          sendBookingDeclinedEmail(
            guest.email,
            guest.firstName || "",
            {
              bookingCode: booking.bookingCode || bookingId,
              propertyName: property.title,
              propertyId: property.id,
              checkIn: checkInFormatted,
              checkOut: checkOutFormatted,
              totalPrice: booking.totalPrice?.toString() || "0",
              guests: booking.guests,
              rooms: booking.rooms || 1,
              // Extended property details
              propertyAddress,
              propertyCity:
                property.propCity || property.destination || undefined,
              propertyState: property.propState || undefined,
              propertyPincode: property.propPincode || undefined,
              latitude: property.latitude?.toString() || undefined,
              longitude: property.longitude?.toString() || undefined,
              // Room details
              roomTypeName,
              roomTypeDescription,
              // Pricing details for strikethrough display
              roomBasePrice,
              roomOriginalPrice,
              // Payment type
              paymentType: "pay_at_hotel",
            },
            "cancelled",
          ).catch(console.error);
        }

        // Send email to owner
        const owner = await storage.getUser(property.ownerId);
        if (owner?.email) {
          sendBookingCancelledOwnerEmail(owner.email, owner.firstName || "", {
            bookingCode: booking.bookingCode || bookingId,
            propertyName: property.title,
            propertyId: property.id,
            checkIn: checkInFormatted,
            checkOut: checkOutFormatted,
            totalPrice: booking.totalPrice?.toString() || "0",
            guests: booking.guests,
            rooms: booking.rooms || 1,
            guestName:
              guest?.firstName && guest?.lastName
                ? `${guest.firstName} ${guest.lastName}`
                : guest?.email || "Guest",
            cancellationReason: reason || "No reason provided",
            // Extended property details
            propertyAddress,
            propertyCity:
              property.propCity || property.destination || undefined,
            propertyState: property.propState || undefined,
            propertyPincode: property.propPincode || undefined,
            latitude: property.latitude?.toString() || undefined,
            longitude: property.longitude?.toString() || undefined,
            // Room details
            roomTypeName,
            roomTypeDescription,
            // Pricing details for strikethrough display
            roomBasePrice,
            roomOriginalPrice,
            // Payment type
            paymentType: "pay_at_hotel",
          }).catch(console.error);
        }

        console.log(
          `[BOOKING:CANCELLED] Guest ${userId} cancelled booking ${bookingId}, refund: ${updated?.refundPercentage}% (${updated?.refundAmount})`,
        );

        // Create in-app notification for owner about guest cancellation
        const guestFullName =
          guest?.firstName && guest?.lastName
            ? `${guest.firstName} ${guest.lastName}`
            : guest?.email || "Guest";
        createBookingNotification(
          property.ownerId,
          bookingId,
          guestFullName,
          property.title,
          "booking_cancelled",
        ).catch(console.error);

        res.json({
          ...updated,
          message: "Booking cancelled successfully.",
        });
      } catch (error) {
        console.error("Error cancelling booking:", error);
        res.status(500).json({ message: "Failed to cancel booking" });
      }
    },
  );

  // Conversation routes
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);

      // Strip sensitive KYC / identity fields from both guest and owner before
      // returning — the messaging feature only needs basic profile info.
      const safeConversations = conversations.map((conv) => ({
        ...conv,
        guest: sanitizeConversationUser(conv.guest),
        owner: sanitizeConversationUser(conv.owner),
      }));

      res.json(safeConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res
          .status(403)
          .json({ message: "Login required to start conversations" });
      }

      const { propertyId } = req.body;

      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }

      const conversation = await storage.getOrCreateConversation(
        propertyId,
        userId,
      );
      res.json(conversation);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to create conversation" });
    }
  });

  // Message routes
  app.get(
    "/api/conversations/:id/messages",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const conversation = await storage.getConversation(req.params.id);

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        if (
          conversation.guestId !== userId &&
          conversation.ownerId !== userId
        ) {
          return res
            .status(403)
            .json({ message: "Not authorized to view this conversation" });
        }

        const messages = await storage.getMessagesByConversation(req.params.id);

        // Enrich messages with booking data if they have a bookingId
        const enrichedMessages = await Promise.all(
          messages.map(async (message) => {
            if (message.bookingId) {
              const booking = await storage.getBooking(message.bookingId);
              return { ...message, booking };
            }
            return message;
          }),
        );

        await storage.markMessagesAsRead(req.params.id, userId);

        res.json(enrichedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    },
  );

  app.post(
    "/api/conversations/:id/messages",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const conversation = await storage.getConversation(req.params.id);

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        if (
          conversation.guestId !== userId &&
          conversation.ownerId !== userId
        ) {
          return res.status(403).json({
            message: "Not authorized to send messages in this conversation",
          });
        }

        const validatedData = insertMessageSchema.parse({
          ...req.body,
          conversationId: req.params.id,
          senderId: userId,
        });

        const message = await storage.createMessage({
          ...validatedData,
          attachments: validatedData.attachments as any,
        });

        // Get sender info for real-time display
        const sender = await storage.getUser(userId);
        const messageWithSender = {
          ...message,
          sender: sender
            ? {
                id: sender.id,
                firstName: sender.firstName,
                lastName: sender.lastName,
                email: sender.email,
                profileImageUrl: sender.profileImageUrl,
              }
            : null,
        };

        // Broadcast new message to the other participant via WebSocket
        const broadcastData = {
          type: "new_message",
          conversationId: req.params.id,
          message: messageWithSender,
        };

        // Notify the other participant
        const recipientId =
          userId === conversation.guestId
            ? conversation.ownerId
            : conversation.guestId;
        broadcastToUser(recipientId, broadcastData);

        // Also broadcast to sender so they see instant updates across tabs/devices
        broadcastToUser(userId, broadcastData);

        // Send push notification to recipient
        try {
          const { sendMessagePush } = require("./services/pushService");
          const senderName = sender
            ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() ||
              "Someone"
            : "Someone";
          await sendMessagePush(
            recipientId,
            senderName,
            req.params.id,
            validatedData.content,
          );
        } catch (pushError) {
          console.error("Failed to send message push notification:", pushError);
        }

        res.json(messageWithSender);
      } catch (error: any) {
        console.error("Error creating message:", error);
        if (error.name === "ZodError") {
          return res
            .status(400)
            .json({ message: "Invalid message data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create message" });
      }
    },
  );

  // Message attachment upload endpoint
  app.post("/api/messages/upload", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, accessPath } =
        await objectStorageService.getObjectEntityUploadURLWithAccessPath();

      // Generate upload token tied to this user and access path
      const uploadToken = generateUploadToken(userId, accessPath);

      res.json({
        uploadURL,
        accessPath,
        uploadToken,
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Finalize message attachment (set ACL after upload complete)
  app.post(
    "/api/messages/upload/finalize",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { accessPath, uploadToken, conversationId } = req.body;

        if (!accessPath || !uploadToken || !conversationId) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // Verify the upload token
        const tokenData = verifyUploadToken(uploadToken);
        if (
          !tokenData ||
          tokenData.userId !== userId ||
          tokenData.accessPath !== accessPath
        ) {
          return res
            .status(403)
            .json({ message: "Invalid or expired upload token" });
        }

        // Verify user has access to the conversation
        const conversation = await storage.getConversation(conversationId);
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        if (
          conversation.guestId !== userId &&
          conversation.ownerId !== userId
        ) {
          return res
            .status(403)
            .json({ message: "Not authorized for this conversation" });
        }

        // Set ACL policy to allow both conversation participants to access
        const objectStorageService = new ObjectStorageService();
        const objectFile =
          await objectStorageService.getObjectEntityFile(accessPath);

        // Set ACL so both participants can view - use public visibility for conversation attachments
        const { setObjectAclPolicy: setAcl } = await import("./objectAcl");
        await setAcl(objectFile, {
          visibility: "public",
          owner: userId,
        });

        res.json({ success: true, accessPath });
      } catch (error) {
        console.error("Error finalizing upload:", error);
        res.status(500).json({ message: "Failed to finalize upload" });
      }
    },
  );

  // Review routes
  app.get("/api/properties/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByProperty(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Check if review exists for a booking
  app.get(
    "/api/bookings/:id/review",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const booking = await storage.getBooking(req.params.id);

        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.guestId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to view this booking's review" });
        }

        const review = await storage.getReviewByBookingId(req.params.id);

        if (review) {
          return res.json({ exists: true, review });
        }

        return res.json({ exists: false, review: null });
      } catch (error) {
        console.error("Error checking booking review:", error);
        res.status(500).json({ message: "Failed to check review status" });
      }
    },
  );

  // Get booking details for review page
  app.get(
    "/api/bookings/:id/review-details",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const booking = await storage.getBooking(req.params.id);

        if (!booking) {
          return res
            .status(404)
            .json({ message: "Booking not found", code: "BOOKING_NOT_FOUND" });
        }

        if (booking.guestId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized", code: "NOT_AUTHORIZED" });
        }

        // Check if already reviewed
        const existingReview = await storage.getReviewByBookingId(
          req.params.id,
        );
        if (existingReview) {
          return res.status(400).json({
            message: "You've already reviewed this stay",
            code: "ALREADY_REVIEWED",
            reviewId: existingReview.id,
          });
        }

        // Check if booking is reviewable (completed or checked_out)
        if (!["completed", "checked_out"].includes(booking.status)) {
          return res.status(400).json({
            message: "You can only review completed stays",
            code: "NOT_COMPLETED",
          });
        }

        const property = await storage.getProperty(booking.propertyId);
        if (!property) {
          return res.status(404).json({
            message: "Property not found",
            code: "PROPERTY_NOT_FOUND",
          });
        }

        res.json({
          booking: {
            id: booking.id,
            bookingCode: booking.bookingCode,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            status: booking.status,
          },
          property: {
            id: property.id,
            title: property.title,
            images: property.images,
            destination: property.destination,
          },
        });
      } catch (error) {
        console.error("Error fetching review details:", error);
        res.status(500).json({ message: "Failed to fetch review details" });
      }
    },
  );

  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.userRole !== "guest") {
        return res
          .status(403)
          .json({ message: "Only guests can leave reviews" });
      }

      const validatedData = insertReviewSchema.parse({
        ...req.body,
        guestId: userId,
      });

      if (validatedData.bookingId) {
        const booking = await storage.getBooking(validatedData.bookingId);

        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.guestId !== userId) {
          return res
            .status(403)
            .json({ message: "You can only review your own bookings" });
        }

        if (!["completed", "checked_out"].includes(booking.status)) {
          return res
            .status(400)
            .json({ message: "You can only review completed bookings" });
        }
      }

      const review = await storage.createReview(validatedData);

      // Notify property owner of new review
      try {
        const { sendReviewPush } = require("./services/pushService");
        const reviewProperty = await storage.getProperty(
          validatedData.propertyId,
        );
        if (reviewProperty) {
          const guestName =
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            "A guest";
          await sendReviewPush(
            reviewProperty.ownerId,
            guestName,
            reviewProperty.title,
            validatedData.rating,
            review.id,
          );
        }
      } catch {}

      res.json(review);
    } catch (error: any) {
      console.error("Error creating review:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.patch(
    "/api/reviews/:id/response",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can respond to reviews" });
        }

        const review = await storage.getReview(req.params.id);

        if (!review) {
          return res.status(404).json({ message: "Review not found" });
        }

        const property = await storage.getProperty(review.propertyId);

        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to respond to this review" });
        }

        const { response } = req.body;

        if (!response || typeof response !== "string") {
          return res.status(400).json({ message: "Response is required" });
        }

        const updated = await storage.updateOwnerResponse(
          req.params.id,
          response,
        );
        res.json(updated);
      } catch (error) {
        console.error("Error updating review response:", error);
        res.status(500).json({ message: "Failed to update review response" });
      }
    },
  );
  app.post(
    "/api/owner/reviews/:id/respond",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can respond to reviews" });
        }

        const review = await storage.getReview(req.params.id);
        if (!review) {
          return res.status(404).json({ message: "Review not found" });
        }

        const property = await storage.getProperty(review.propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to respond to this review" });
        }

        const { response } = req.body;
        if (!response || typeof response !== "string") {
          return res.status(400).json({ message: "Response is required" });
        }

        const updated = await storage.updateOwnerResponse(
          req.params.id,
          response,
        );
        res.json(updated);
      } catch (error) {
        console.error("Error updating review response:", error);
        res.status(500).json({ message: "Failed to update review response" });
      }
    },
  );
  app.patch(
    "/api/reviews/:id/helpful",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;

        if (!userId) {
          return res.status(401).json({ message: "Authentication required" });
        }

        const review = await storage.getReview(req.params.id);

        if (!review) {
          return res.status(404).json({ message: "Review not found" });
        }

        const updated = await storage.incrementReviewHelpful(req.params.id);

        if (!updated) {
          return res.status(500).json({ message: "Failed to update review" });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error marking review as helpful:", error);
        res.status(500).json({ message: "Failed to mark review as helpful" });
      }
    },
  );

  // Destinations routes

  // Lightweight search endpoint - returns destinations and matching properties for autocomplete
  app.get("/api/destinations/search", async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== "string" || q.trim().length === 0) {
        return res.json([]);
      }

      const searchQuery = q.trim();

      // Search destinations
      const destinations = await storage.searchDestinations(searchQuery, 8);

      // Also search for matching published properties (hotels)
      const allProperties = await storage.getProperties();
      const searchLower = searchQuery.toLowerCase();
      const matchingProperties = allProperties
        .filter(
          (p: any) =>
            p.status === "published" &&
            (p.title?.toLowerCase().includes(searchLower) ||
              p.propCity?.toLowerCase().includes(searchLower)),
        )
        .slice(0, 5) // Limit to 5 properties
        .map((p: any) => ({
          id: p.id,
          name: p.title || "Unnamed Property",
          state: p.propState || "",
          city: p.propCity || "",
          isProperty: true,
          propertyId: p.id,
        }));

      // Combine: destinations first, then properties
      const results = [
        ...destinations.map((d) => ({ ...d, isProperty: false })),
        ...matchingProperties,
      ];

      res.json(results);
    } catch (error) {
      console.error("Error searching destinations:", error);
      res.status(500).json({ message: "Failed to search destinations" });
    }
  });

  // Get top hotels for a specific city - for Swiggy-style search suggestions
  app.get("/api/cities/:city/top-hotels", async (req, res) => {
    try {
      const { city } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      if (!city || city.trim().length === 0) {
        return res.json([]);
      }

      const cityLower = city.toLowerCase().trim();

      // Get all published properties in the city
      const allProperties = await storage.getProperties();
      const cityProperties = allProperties.filter(
        (p: any) =>
          p.status === "published" && p.propCity?.toLowerCase() === cityLower,
      );

      // Sort by rating DESC, then by number of reviews (as proxy for booking count)
      const sortedProperties = cityProperties.sort((a: any, b: any) => {
        // First by rating DESC
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;

        // Then by review count (proxy for popularity)
        const reviewsA = a.reviewCount || 0;
        const reviewsB = b.reviewCount || 0;
        return reviewsB - reviewsA;
      });

      // Take top N hotels
      const topHotels = sortedProperties.slice(0, limit).map((p: any) => ({
        id: p.id,
        name: p.title || "Unnamed Hotel",
        city: p.propCity || "",
        state: p.propState || "",
        rating: p.rating ? parseFloat(p.rating).toFixed(1) : null,
        reviewCount: p.reviewCount || 0,
        imageUrl: p.images?.[0]?.url || null,
        pricePerNight: p.pricePerNight,
      }));

      res.json(topHotels);
    } catch (error) {
      console.error("Error fetching top hotels for city:", error);
      res.status(500).json({ message: "Failed to fetch top hotels" });
    }
  });

  app.get("/api/destinations", async (req, res) => {
    try {
      const { search } = req.query;
      let destinations = await storage.getAllDestinations();

      // Filter by search term if provided
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchLower = search.toLowerCase().trim();
        destinations = destinations.filter(
          (dest: any) =>
            dest.name.toLowerCase().includes(searchLower) ||
            dest.state?.toLowerCase().includes(searchLower) ||
            dest.shortDescription?.toLowerCase().includes(searchLower),
        );
      }

      res.json(destinations);
    } catch (error) {
      console.error("Error fetching destinations:", error);
      res.status(500).json({ message: "Failed to fetch destinations" });
    }
  });

  app.get("/api/destinations/featured", async (req, res) => {
    try {
      const destinations = await storage.getFeaturedDestinations();
      res.json(destinations);
    } catch (error) {
      console.error("Error fetching featured destinations:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch featured destinations" });
    }
  });

  app.get("/api/destinations/:id", async (req, res) => {
    try {
      const destination = await storage.getDestination(req.params.id);
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      res.json(destination);
    } catch (error) {
      console.error("Error fetching destination:", error);
      res.status(500).json({ message: "Failed to fetch destination" });
    }
  });

  app.post("/api/destinations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (
        !user ||
        (!userHasRole(user, "admin") && !userHasRole(user, "owner"))
      ) {
        return res
          .status(403)
          .json({ message: "Only admins or owners can create destinations" });
      }

      const validatedData = insertDestinationSchema.parse(req.body);
      const destination = await storage.createDestination(validatedData);
      res.json(destination);
    } catch (error) {
      console.error("Error creating destination:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid destination data" });
      }
      res.status(500).json({ message: "Failed to create destination" });
    }
  });

  app.patch("/api/destinations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (
        !user ||
        (!userHasRole(user, "admin") && !userHasRole(user, "owner"))
      ) {
        return res
          .status(403)
          .json({ message: "Only admins or owners can update destinations" });
      }

      const destination = await storage.updateDestination(
        req.params.id,
        req.body,
      );
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      res.json(destination);
    } catch (error) {
      console.error("Error updating destination:", error);
      res.status(500).json({ message: "Failed to update destination" });
    }
  });

  app.delete(
    "/api/destinations/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (
          !user ||
          (!userHasRole(user, "admin") && !userHasRole(user, "owner"))
        ) {
          return res
            .status(403)
            .json({ message: "Only admins or owners can delete destinations" });
        }

        await storage.deleteDestination(req.params.id);
        res.json({ message: "Destination deleted successfully" });
      } catch (error) {
        console.error("Error deleting destination:", error);
        res.status(500).json({ message: "Failed to delete destination" });
      }
    },
  );

  app.patch(
    "/api/destinations/:id/feature",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (
          !user ||
          (!userHasRole(user, "admin") && !userHasRole(user, "owner"))
        ) {
          return res.status(403).json({
            message: "Only admins or owners can feature destinations",
          });
        }

        const { isFeatured } = req.body;
        const destination = await storage.setFeaturedDestination(
          req.params.id,
          isFeatured,
        );
        if (!destination) {
          return res.status(404).json({ message: "Destination not found" });
        }
        res.json(destination);
      } catch (error) {
        console.error("Error featuring destination:", error);
        res.status(500).json({ message: "Failed to feature destination" });
      }
    },
  );

  // Admin routes for property management
  app.get("/api/admin/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can access this endpoint" });
      }

      const properties = await storage.getProperties({
        includeAllStatuses: true,
        adminView: true,
      });
      res.json(properties);
    } catch (error) {
      console.error("Error fetching admin properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.patch(
    "/api/admin/properties/:id/approve",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can approve properties" });
        }

        const property = await storage.getProperty(req.params.id, true);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        // Check owner's KYC status - cannot approve property if KYC is not verified
        const owner = await storage.getUser(property.ownerId);
        if (!owner) {
          return res.status(400).json({ message: "Property owner not found" });
        }

        if (owner.kycStatus !== "verified") {
          const statusMessage =
            owner.kycStatus === "rejected"
              ? "Owner's KYC has been rejected. Property cannot be approved until KYC is resubmitted and verified."
              : owner.kycStatus === "pending"
                ? "Owner's KYC is pending review. Property cannot be approved until KYC is verified."
                : "Owner has not completed KYC verification. Property cannot be approved until KYC is verified.";
          return res.status(400).json({
            message: statusMessage,
            ownerKycStatus: owner.kycStatus,
          });
        }

        // Check if property has geolocation - required for publishing
        if (!property.latitude || !property.longitude) {
          return res.status(400).json({
            message:
              "Property cannot be approved without GPS coordinates. Please ask the owner to set the property location using the map picker in the Owner Portal.",
            missingGeotag: true,
          });
        }

        const { notes } = req.body;
        const updated = await storage.updateProperty(req.params.id, {
          status: "published",
          verificationNotes: notes || null,
          verifiedAt: new Date(),
          verifiedBy: userId,
        });

        // Notify property owner via WebSocket
        broadcastToUser(property.ownerId, {
          type: "property_status_update",
          propertyId: property.id,
          status: "published",
          message: `Your property "${property.title}" has been approved and is now live!`,
          propertyTitle: property.title,
        });

        // Send push notification to owner (works when offline/background)
        try {
          const { sendPushNotification } = require("./services/pushService");
          await sendPushNotification(property.ownerId, {
            title: "Property Approved! 🎉",
            body: `Your property "${property.title}" is now live on Zecoho.`,
            tag: `property-approved-${property.id}`,
            data: { url: "/owner/property" },
          });
        } catch {}

        // Send email notification
        if (owner.email) {
          sendPropertyLiveEmail(
            owner.email,
            owner.firstName || "Property Owner",
            property.title,
          ).catch(console.error);
        }

        res.json(updated);
      } catch (error) {
        console.error("Error approving property:", error);
        res.status(500).json({ message: "Failed to approve property" });
      }
    },
  );

  app.patch(
    "/api/admin/properties/:id/reject",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can reject properties" });
        }

        const property = await storage.getProperty(req.params.id, true);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        const { notes } = req.body;
        if (!notes || notes.trim() === "") {
          return res
            .status(400)
            .json({ message: "Rejection/revocation reason is required" });
        }

        const updated = await storage.updateProperty(req.params.id, {
          status: "draft",
          verificationNotes: notes,
          verifiedAt: new Date(),
          verifiedBy: userId,
        });

        // Notify property owner via WebSocket
        broadcastToUser(property.ownerId, {
          type: "property_status_update",
          propertyId: property.id,
          status: "draft",
          message: `Your property "${property.title}" requires attention. Reason: ${notes}`,
          propertyTitle: property.title,
          reason: notes,
        });

        // Send push notification to owner (works when offline/background)
        try {
          const { sendPushNotification } = require("./services/pushService");
          await sendPushNotification(property.ownerId, {
            title: "Property Needs Attention",
            body: `"${property.title}" requires updates: ${notes}`,
            tag: `property-rejected-${property.id}`,
            data: { url: "/owner/property" },
          });
        } catch {}

        // Send rejection email to owner (fire-and-forget; don't block response)
        try {
          const owner = await storage.getUser(property.ownerId);
          if (owner?.email) {
            sendPropertyRejectedEmail(
              owner.email,
              owner.firstName || "Property Owner",
              property.title,
              notes,
            ).catch(console.error);
          }
        } catch (emailErr) {
          console.error(
            "Property rejection email lookup failed:",
            emailErr,
          );
        }

        res.json(updated);
      } catch (error) {
        console.error("Error rejecting property:", error);
        res.status(500).json({ message: "Failed to reject property" });
      }
    },
  );

  app.delete(
    "/api/admin/properties/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can delete properties" });
        }

        const property = await storage.getProperty(req.params.id, true);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        const activeBookings = await db
          .select({
            bookingCode: bookings.bookingCode,
            status: bookings.status
          })
          .from(bookings)
          .where(
            and(
              eq(bookings.propertyId, req.params.id),
              inArray(bookings.status, [
                "confirmed",
                "customer_confirmed",
                "checked_in"
              ])
            )
          )
          .limit(5);

        if (activeBookings.length > 0) {
          return res.status(409).json({
            message: `Cannot delete — ${activeBookings.length} active booking(s) exist. Cancel them first.`,
            activeBookings: activeBookings.map(b => b.bookingCode)
          });
        }

        await storage.deleteProperty(req.params.id);

        const owner = await storage.getUser(property.ownerId);
        if (owner?.email) {
          sendPropertyStatusEmail(
            owner.email,
            owner.firstName || "",
            property.title,
            "deleted",
          ).catch(console.error);
        }

        res.json({ message: "Property deleted successfully" });
      } catch (error) {
        console.error("Error deleting property:", error);
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        res.status(500).json({
          message: "Failed to delete property",
          detail: errorMessage
        });
      }
    },
  );

  // ===============================
  // ADMIN DEACTIVATION REQUEST MANAGEMENT
  // ===============================

  // Admin: Get all pending deactivation requests
  app.get(
    "/api/admin/deactivation-requests",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can view deactivation requests" });
        }

        const requests = await storage.getAllPendingDeactivationRequests();
        res.json(requests);
      } catch (error) {
        console.error("Error fetching deactivation requests:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch deactivation requests" });
      }
    },
  );

  // Admin: Approve deactivation request (actually deactivate or delete the property)
  app.patch(
    "/api/admin/deactivation-requests/:id/approve",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can approve deactivation requests" });
        }

        const request = await storage.getDeactivationRequest(req.params.id);
        if (!request) {
          return res
            .status(404)
            .json({ message: "Deactivation request not found" });
        }

        if (request.status !== "pending") {
          return res
            .status(400)
            .json({ message: "Request has already been processed" });
        }

        const property = await storage.getProperty(request.propertyId);
        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        const owner = await storage.getUser(request.ownerId);
        const { adminNotes } = req.body;

        // Process based on request type
        if (request.requestType === "delete") {
          await storage.deleteProperty(request.propertyId);
        } else if (request.requestType === "reactivate") {
          // Reactivate - set status to published (or pending if needs review)
          await storage.updateProperty(request.propertyId, {
            status: "published",
          });
        } else {
          await storage.updateProperty(request.propertyId, {
            status: "deactivated",
          });
        }

        // Update the request status
        await storage.processDeactivationRequest(
          req.params.id,
          userId,
          "approved",
          adminNotes,
        );

        // Send email notification to owner
        if (owner?.email) {
          let action:
            | "paused"
            | "resumed"
            | "deactivated"
            | "deleted"
            | "reactivated";
          if (request.requestType === "delete") {
            action = "deleted";
          } else if (request.requestType === "reactivate") {
            action = "reactivated";
          } else {
            action = "deactivated";
          }
          sendPropertyStatusEmail(
            owner.email,
            owner.firstName || "",
            property.title,
            action,
          ).catch(console.error);
        }

        let message: string;
        if (request.requestType === "delete") {
          message = "Property deleted successfully";
        } else if (request.requestType === "reactivate") {
          message = "Property reactivated successfully";
        } else {
          message = "Property deactivated successfully";
        }

        res.json({ message });
      } catch (error) {
        console.error("Error approving deactivation request:", error);
        res
          .status(500)
          .json({ message: "Failed to approve deactivation request" });
      }
    },
  );

  // Admin: Reject deactivation request (property remains active)
  app.patch(
    "/api/admin/deactivation-requests/:id/reject",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can reject deactivation requests" });
        }

        const request = await storage.getDeactivationRequest(req.params.id);
        if (!request) {
          return res
            .status(404)
            .json({ message: "Deactivation request not found" });
        }

        if (request.status !== "pending") {
          return res
            .status(400)
            .json({ message: "Request has already been processed" });
        }

        const { adminNotes } = req.body;
        if (!adminNotes || adminNotes.trim() === "") {
          return res
            .status(400)
            .json({ message: "Please provide a reason for rejection" });
        }

        await storage.processDeactivationRequest(
          req.params.id,
          userId,
          "rejected",
          adminNotes,
        );

        res.json({ message: "Deactivation request rejected" });
      } catch (error) {
        console.error("Error rejecting deactivation request:", error);
        res
          .status(500)
          .json({ message: "Failed to reject deactivation request" });
      }
    },
  );

  // Admin: Fix misclassified reactivation requests (migration endpoint)
  // This fixes requests that were incorrectly stored as "deactivate" when they should be "reactivate"
  app.post(
    "/api/admin/fix-reactivation-requests",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can run this migration" });
        }

        // Find pending "deactivate" requests where the property is already deactivated
        // These are actually reactivation requests that were incorrectly stored
        const fixedCount = await storage.fixMisclassifiedReactivationRequests();

        res.json({
          message: `Migration complete. Fixed ${fixedCount} misclassified reactivation request(s).`,
          fixedCount,
        });
      } catch (error) {
        console.error("Error fixing reactivation requests:", error);
        res.status(500).json({ message: "Failed to run migration" });
      }
    },
  );

  // Admin: Deduplicate properties — remove extra copies created by the wizard auto-save bug
  app.post(
    "/api/admin/cleanup-duplicate-properties",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admin access required" });
        }

        // Find all properties, group by (owner_id, lower(title)) to detect dupes
        const allProps = await db
          .select({
            id: propertiesTable.id,
            ownerId: propertiesTable.ownerId,
            title: propertiesTable.title,
            status: propertiesTable.status,
            createdAt: propertiesTable.createdAt,
          })
          .from(propertiesTable)
          .orderBy(propertiesTable.createdAt);

        type PropRow = (typeof allProps)[number];

        // Group by ownerId + normalized title
        const groupsMap: Record<string, PropRow[]> = {};
        for (const p of allProps) {
          const key = `${p.ownerId}::${p.title.toLowerCase().trim()}`;
          if (!groupsMap[key]) groupsMap[key] = [];
          groupsMap[key].push(p);
        }

        let deletedCount = 0;
        let skippedCount = 0;
        const deletedIds: string[] = [];

        for (const key of Object.keys(groupsMap)) {
          const group = groupsMap[key];
          if (group.length <= 1) continue;

          // Sort newest first — keep the last one created
          group.sort((a: PropRow, b: PropRow) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          });

          const [_keep, ...toRemove] = group;

          for (const dupe of toRemove) {
            // Safety: only delete if property has no bookings
            const [{ cnt }] = await db
              .select({ cnt: sql<number>`COUNT(*)::int` })
              .from(bookings)
              .where(eq(bookings.propertyId, dupe.id));

            if (cnt > 0) {
              skippedCount++;
              continue;
            }

            await storage.deleteProperty(dupe.id);
            deletedIds.push(dupe.id);
            deletedCount++;
          }
        }

        res.json({
          message: `Cleanup complete. Removed ${deletedCount} duplicate propert${deletedCount === 1 ? "y" : "ies"}.${skippedCount > 0 ? ` Skipped ${skippedCount} duplicate(s) that had bookings.` : ""}`,
          deletedCount,
          skippedCount,
          deletedIds,
        });
      } catch (error) {
        console.error("Error cleaning up duplicate properties:", error);
        res.status(500).json({ message: "Failed to run cleanup" });
      }
    },
  );

  // Admin: Direct deactivate property (admin-only, no request needed)
  app.patch(
    "/api/admin/properties/:id/deactivate",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can deactivate properties" });
        }

        const property = await storage.getProperty(req.params.id);

        if (!property) {
          return res.status(404).json({ message: "Property not found" });
        }

        if (property.status === "deactivated") {
          return res
            .status(400)
            .json({ message: "Property is already deactivated" });
        }

        const updatedProperty = await storage.updateProperty(req.params.id, {
          status: "deactivated",
        });

        // Send email notification to owner
        const owner = await storage.getUser(property.ownerId);
        if (owner?.email) {
          sendPropertyStatusEmail(
            owner.email,
            owner.firstName || "",
            property.title,
            "deactivated",
          ).catch(console.error);
        }

        res.json(updatedProperty);
      } catch (error) {
        console.error("Error deactivating property:", error);
        res.status(500).json({ message: "Failed to deactivate property" });
      }
    },
  );

  // ===============================
  // ADMIN POLICY MANAGEMENT
  // ===============================

  // Public: Get published policy by type (for Terms/Privacy pages)
  app.get("/api/policies/:type", async (req: any, res) => {
    try {
      const { type } = req.params;
      if (type !== "terms" && type !== "privacy") {
        return res.status(400).json({ message: "Invalid policy type" });
      }

      const policy = await storage.getPublishedPolicy(type);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }

      res.json(policy);
    } catch (error) {
      console.error("Error fetching policy:", error);
      res.status(500).json({ message: "Failed to fetch policy" });
    }
  });

  // Public: Get current policy versions (for consent checking)
  app.get("/api/policies/versions/current", async (req: any, res) => {
    try {
      const termsPolicy = await storage.getPublishedPolicy("terms");
      const privacyPolicy = await storage.getPublishedPolicy("privacy");

      res.json({
        termsVersion: termsPolicy?.version || null,
        privacyVersion: privacyPolicy?.version || null,
      });
    } catch (error) {
      console.error("Error fetching policy versions:", error);
      res.status(500).json({ message: "Failed to fetch policy versions" });
    }
  });

  // Admin: Get all policies
  app.get("/api/admin/policies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can view all policies" });
      }

      const allPolicies = await storage.getAllPolicies();
      res.json(allPolicies);
    } catch (error) {
      console.error("Error fetching policies:", error);
      res.status(500).json({ message: "Failed to fetch policies" });
    }
  });

  // Admin: Get a single policy by ID
  app.get("/api/admin/policies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can view policy details" });
      }

      const policy = await storage.getPolicy(req.params.id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }

      res.json(policy);
    } catch (error) {
      console.error("Error fetching policy:", error);
      res.status(500).json({ message: "Failed to fetch policy" });
    }
  });

  // Admin: Create a new policy version
  app.post("/api/admin/policies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can create policies" });
      }

      const { type, title, content } = req.body;

      if (!type || !title || !content) {
        return res
          .status(400)
          .json({ message: "Type, title, and content are required" });
      }

      if (type !== "terms" && type !== "privacy") {
        return res.status(400).json({ message: "Invalid policy type" });
      }

      // Get the next version number
      const latestVersion = await storage.getLatestPolicyVersion(type);
      const newVersion = latestVersion + 1;

      const policy = await storage.createPolicy({
        type,
        version: newVersion,
        title,
        content,
        status: "draft",
        createdBy: userId,
      });

      res.status(201).json(policy);
    } catch (error) {
      console.error("Error creating policy:", error);
      res.status(500).json({ message: "Failed to create policy" });
    }
  });

  // Admin: Update policy content (only drafts can be updated)
  app.patch(
    "/api/admin/policies/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can update policies" });
        }

        const policy = await storage.getPolicy(req.params.id);
        if (!policy) {
          return res.status(404).json({ message: "Policy not found" });
        }

        if (policy.status !== "draft") {
          return res.status(400).json({
            message:
              "Only draft policies can be edited. Create a new version instead.",
          });
        }

        const { title, content } = req.body;
        const updates: { title?: string; content?: string } = {};

        if (title) updates.title = title;
        if (content) updates.content = content;

        const updatedPolicy = await storage.updatePolicy(
          req.params.id,
          updates,
        );
        res.json(updatedPolicy);
      } catch (error) {
        console.error("Error updating policy:", error);
        res.status(500).json({ message: "Failed to update policy" });
      }
    },
  );

  // Admin: Publish a policy (archives any existing published version of same type)
  app.post(
    "/api/admin/policies/:id/publish",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can publish policies" });
        }

        const policy = await storage.getPolicy(req.params.id);
        if (!policy) {
          return res.status(404).json({ message: "Policy not found" });
        }

        if (policy.status === "published") {
          return res
            .status(400)
            .json({ message: "Policy is already published" });
        }

        if (policy.status === "archived") {
          return res.status(400).json({
            message:
              "Cannot publish an archived policy. Create a new version instead.",
          });
        }

        const publishedPolicy = await storage.publishPolicy(req.params.id);

        res.json({
          message: `Policy published successfully. All users will be required to accept the new ${policy.type === "terms" ? "Terms & Conditions" : "Privacy Policy"} version ${policy.version}.`,
          policy: publishedPolicy,
        });
      } catch (error) {
        console.error("Error publishing policy:", error);
        res.status(500).json({ message: "Failed to publish policy" });
      }
    },
  );

  // Updated consent endpoint to handle policy versions
  app.post("/api/auth/consent-v2", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { consentCommunication } = req.body;

      // Get current published policy versions
      const termsPolicy = await storage.getPublishedPolicy("terms");
      const privacyPolicy = await storage.getPublishedPolicy("privacy");

      if (!termsPolicy || !privacyPolicy) {
        return res.status(400).json({
          message: "Cannot accept policies. Published policies not available.",
        });
      }

      const updatedUser = await storage.updateUserPolicyConsent(
        userId,
        termsPolicy.version,
        privacyPolicy.version,
        consentCommunication,
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "Consent recorded successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error recording consent:", error);
      res.status(500).json({ message: "Failed to record consent" });
    }
  });

  // Public: Get contact settings for Contact Us page
  app.get("/api/contact-settings", async (req, res) => {
    try {
      let settings = await storage.getContactSettings();

      // If no settings exist, create default settings
      if (!settings) {
        settings = await storage.upsertContactSettings({});
      }

      res.json(settings);
    } catch (error) {
      console.error("Error getting contact settings:", error);
      res.status(500).json({ message: "Failed to get contact settings" });
    }
  });

  // Admin: Update contact settings
  app.patch(
    "/api/admin/contact-settings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can update contact settings" });
        }

        const updatedSettings = await storage.upsertContactSettings({
          ...req.body,
          updatedBy: userId,
        });

        res.json({
          message: "Contact settings updated successfully",
          settings: updatedSettings,
        });
      } catch (error) {
        console.error("Error updating contact settings:", error);
        res.status(500).json({ message: "Failed to update contact settings" });
      }
    },
  );

  // ===============================
  // SITE SETTINGS (logo, branding)
  // ===============================

  // Public: Get site settings (logo URL, alt text)
  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings || { logoUrl: null, logoAlt: "ZECOHO" });
    } catch (error) {
      console.error("Error getting site settings:", error);
      res.status(500).json({ message: "Failed to get site settings" });
    }
  });

  // Admin: Update site settings (logo URL, alt text, coming soon mode)
  app.patch(
    "/api/admin/site-settings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can update site settings" });
        }
        const { logoUrl, logoAlt, comingSoonMode } = req.body;
        const existing = await storage.getSiteSettings();
        let comingSoonEnabledAt = existing?.comingSoonEnabledAt ?? null;
        // Track when coming soon mode was first enabled so we know which users are "existing"
        if (comingSoonMode === true && !existing?.comingSoonMode) {
          comingSoonEnabledAt = new Date();
        } else if (comingSoonMode === false) {
          comingSoonEnabledAt = null;
        }
        const updated = await storage.upsertSiteSettings({
          ...(logoUrl !== undefined && { logoUrl }),
          ...(logoAlt !== undefined && { logoAlt }),
          ...(comingSoonMode !== undefined && { comingSoonMode }),
          ...(comingSoonEnabledAt !== undefined && { comingSoonEnabledAt }),
          updatedBy: userId,
        });
        res.json({
          message: "Site settings updated successfully",
          settings: updated,
        });
      } catch (error) {
        console.error("Error updating site settings:", error);
        res.status(500).json({ message: "Failed to update site settings" });
      }
    },
  );

  // ===============================
  // PLATFORM SETTINGS (GST, fees)
  // ===============================

  // Public: Get platform settings (guests need GST info for display)
  app.get("/api/platform-settings", async (req, res) => {
    try {
      const settings = await storage.getPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error getting platform settings:", error);
      res.status(500).json({ message: "Failed to get platform settings" });
    }
  });

  // Admin: Update platform settings
  app.patch(
    "/api/admin/platform-settings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can update platform settings" });
        }
        const { gstInclusive, platformFeePercent, advancePaymentPercent } =
          req.body ?? {};
        const patch: Record<string, unknown> = { updatedBy: userId };
        if (gstInclusive !== undefined) patch.gstInclusive = !!gstInclusive;
        if (platformFeePercent !== undefined)
          patch.platformFeePercent = String(platformFeePercent);
        if (advancePaymentPercent !== undefined)
          patch.advancePaymentPercent = String(advancePaymentPercent);
        const updated = await storage.upsertPlatformSettings(patch);
        res.json({
          message: "Platform settings updated successfully",
          settings: updated,
        });
      } catch (error) {
        console.error("Error updating platform settings:", error);
        res
          .status(500)
          .json({ message: "Failed to update platform settings" });
      }
    },
  );

  // ===============================
  // COMING SOON — WAITLIST & WHITELIST
  // ===============================

  // Auth-optional: Check if current user can bypass Coming Soon gate
  // Returns { comingSoonMode, canAccess }
  // canAccess=true if mode is off, user is admin, existing user, or whitelisted
  app.get("/api/coming-soon/access", async (req: any, res) => {
    // Never allow the browser or CDN to cache this response — it depends on session state
    res.setHeader("Cache-Control", "no-store");
    try {
      const settings = await storage.getSiteSettings();
      if (!settings?.comingSoonMode) {
        return res.json({ comingSoonMode: false, canAccess: true });
      }
      // Mode is on — check who gets through
      const isAuth = req.isAuthenticated?.() && req.user?.claims?.sub;
      if (!isAuth) {
        return res.json({ comingSoonMode: true, canAccess: false });
      }
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email as string | undefined;
      // Try by OAuth ID first; fall back to email for users who registered via
      // email/password and have a different stored ID than the Replit OAuth sub
      let user = await storage.getUser(userId);
      if (!user && userEmail) {
        user = await storage.getUserByEmail(userEmail);
      }
      if (!user) {
        return res.json({ comingSoonMode: true, canAccess: false });
      }
      // Any authenticated user gets through — Coming Soon is only for anonymous visitors.
      // Admins, existing users, and anyone who successfully logs in via OAuth all get access.
      return res.json({ comingSoonMode: true, canAccess: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to check access" });
    }
  });

  // Public: Submit to waitlist
  app.post("/api/waitlist", async (req, res) => {
    try {
      const { name, email, phone, message } = req.body;
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      const emailLower = email.toLowerCase().trim();
      const already = await storage.isEmailInWaitlist(emailLower);
      if (already) {
        return res.json({
          message: "You're already on the list! We'll be in touch soon.",
        });
      }
      await storage.addToWaitlist({
        name: name.trim(),
        email: emailLower,
        phone: phone?.trim() || null,
        message: message?.trim() || null,
      });
      // Send confirmation email (non-blocking — don't fail if email fails)
      sendWaitlistConfirmationEmail(name.trim(), emailLower).catch((e) =>
        console.error("[WAITLIST] Email error:", e),
      );
      res.json({
        message:
          "You've been added to the waitlist! We'll notify you when we launch.",
      });
    } catch (error) {
      console.error("Error adding to waitlist:", error);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  // Admin: Get waitlist
  app.get("/api/admin/waitlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Admins only" });
      }
      const list = await storage.getWaitlist();
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Failed to get waitlist" });
    }
  });

  // Admin: Delete waitlist entry
  app.delete(
    "/api/admin/waitlist/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admins only" });
        }
        await storage.deleteWaitlistEntry(req.params.id);
        res.json({ message: "Entry deleted" });
      } catch (error) {
        res.status(500).json({ message: "Failed to delete entry" });
      }
    },
  );

  // Admin: Get tester whitelist
  app.get("/api/admin/whitelist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Admins only" });
      }
      const list = await storage.getTesterWhitelist();
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Failed to get whitelist" });
    }
  });

  // Admin: Add email to tester whitelist
  app.post("/api/admin/whitelist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Admins only" });
      }
      const { email, note } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const alreadyExists = await storage.isEmailWhitelisted(email);
      if (alreadyExists) {
        return res
          .status(409)
          .json({ message: "Email is already on the whitelist" });
      }
      const entry = await storage.addToTesterWhitelist({
        email: email.trim(),
        note: note?.trim() || null,
        addedBy: userId,
      });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to whitelist" });
    }
  });

  // Admin: Remove from tester whitelist
  app.delete(
    "/api/admin/whitelist/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admins only" });
        }
        await storage.removeTesterWhitelistEntry(req.params.id);
        res.json({ message: "Removed from whitelist" });
      } catch (error) {
        res.status(500).json({ message: "Failed to remove from whitelist" });
      }
    },
  );

  // ===============================
  // CONTACT INTERACTION LOGGING
  // ===============================

  // Log contact interaction (call/whatsapp) for audit and monetization
  app.post("/api/contact/log", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bookingId, actorRole, actionType, targetPhoneLast4, metadata } =
        req.body;

      if (!bookingId || !actorRole || !actionType) {
        return res.status(400).json({
          message: "bookingId, actorRole, and actionType are required",
        });
      }

      if (!["guest", "owner"].includes(actorRole)) {
        return res
          .status(400)
          .json({ message: "actorRole must be 'guest' or 'owner'" });
      }

      if (!["call", "whatsapp"].includes(actionType)) {
        return res
          .status(400)
          .json({ message: "actionType must be 'call' or 'whatsapp'" });
      }

      // Verify booking exists and user has access
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify user is either guest or owner of this booking
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const isGuest = booking.guestId === userId;

      // Get property to check ownership
      const property = booking.propertyId
        ? await storage.getProperty(booking.propertyId)
        : null;
      const isOwner =
        property?.ownerId === userId ||
        (actorRole === "owner" && userHasRole(user, "owner"));

      if (!isGuest && !isOwner) {
        return res
          .status(403)
          .json({ message: "Not authorized to log contact for this booking" });
      }

      // Determine target role based on actor role
      const targetRole = actorRole === "guest" ? "owner" : "guest";

      // Log the interaction
      const interaction = await storage.logContactInteraction({
        bookingId,
        actorUserId: userId,
        actorRole,
        targetRole,
        actionType,
        targetPhoneLast4: targetPhoneLast4 || null,
        metadata: metadata || null,
      });

      res.json({
        message: "Contact interaction logged",
        interaction,
      });
    } catch (error) {
      console.error("Error logging contact interaction:", error);
      res.status(500).json({ message: "Failed to log contact interaction" });
    }
  });

  // Get contact interaction statistics for owner
  app.get(
    "/api/owner/contact-interactions/stats",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || user.userRole !== "owner") {
          return res.status(403).json({ message: "Owner access required" });
        }

        // Get all properties for this owner
        const properties = await storage.getOwnerProperties(userId);
        const propertyIds = properties.map((p: any) => p.id);

        // Get all bookings for these properties
        const allBookings: any[] = [];
        for (const propId of propertyIds) {
          const bookings = await storage.getBookingsByProperty(propId);
          allBookings.push(...bookings);
        }
        const bookingIds = allBookings.map((b: any) => b.id);

        // Fetch contact interactions for these bookings
        const interactions = await db
          .select()
          .from(contactInteractions)
          .where(
            inArray(
              contactInteractions.bookingId,
              bookingIds.length > 0 ? bookingIds : [""],
            ),
          )
          .orderBy(desc(contactInteractions.createdAt));

        // Calculate statistics
        const stats = {
          totalCalls: interactions.filter((i) => i.actionType === "call")
            .length,
          totalWhatsapp: interactions.filter((i) => i.actionType === "whatsapp")
            .length,
          receivedCalls: interactions.filter(
            (i) => i.actionType === "call" && i.targetRole === "owner",
          ).length,
          receivedWhatsapp: interactions.filter(
            (i) => i.actionType === "whatsapp" && i.targetRole === "owner",
          ).length,
          initiatedCalls: interactions.filter(
            (i) => i.actionType === "call" && i.actorRole === "owner",
          ).length,
          initiatedWhatsapp: interactions.filter(
            (i) => i.actionType === "whatsapp" && i.actorRole === "owner",
          ).length,
          last30Days: {
            calls: interactions.filter(
              (i) =>
                i.actionType === "call" &&
                new Date(i.createdAt!) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            ).length,
            whatsapp: interactions.filter(
              (i) =>
                i.actionType === "whatsapp" &&
                new Date(i.createdAt!) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            ).length,
          },
          recentInteractions: interactions.slice(0, 20).map((i) => ({
            id: i.id,
            actionType: i.actionType,
            actorRole: i.actorRole,
            targetRole: i.targetRole,
            createdAt: i.createdAt,
            metadata: i.metadata,
          })),
        };

        res.json(stats);
      } catch (error) {
        console.error("Error fetching contact interaction stats:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch contact interaction stats" });
      }
    },
  );

  // Get contact interactions list for owner (for download)
  app.get(
    "/api/owner/contact-interactions",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || user.userRole !== "owner") {
          return res.status(403).json({ message: "Owner access required" });
        }

        // Get all properties for this owner
        const properties = await storage.getOwnerProperties(userId);
        const propertyIds = properties.map((p: any) => p.id);

        // Get all bookings for these properties
        const allBookings: any[] = [];
        for (const propId of propertyIds) {
          const bookings = await storage.getBookingsByProperty(propId);
          allBookings.push(...bookings);
        }
        const bookingIds = allBookings.map((b: any) => b.id);

        // Fetch contact interactions for these bookings
        const interactions = await db
          .select()
          .from(contactInteractions)
          .where(
            inArray(
              contactInteractions.bookingId,
              bookingIds.length > 0 ? bookingIds : [""],
            ),
          )
          .orderBy(desc(contactInteractions.createdAt));

        // Enrich with booking and property info
        const enrichedInteractions = await Promise.all(
          interactions.map(async (i) => {
            const booking = allBookings.find((b: any) => b.id === i.bookingId);
            const property = booking
              ? properties.find((p: any) => p.id === booking.propertyId)
              : null;
            const actor = await storage.getUser(i.actorUserId);

            return {
              id: i.id,
              actionType: i.actionType,
              actorRole: i.actorRole,
              targetRole: i.targetRole,
              actorName: actor
                ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() ||
                  actor.email
                : "Unknown",
              propertyName: property?.title || "Unknown",
              bookingCode: booking?.bookingCode || "Unknown",
              createdAt: i.createdAt,
              metadata: i.metadata,
            };
          }),
        );

        res.json(enrichedInteractions);
      } catch (error) {
        console.error("Error fetching contact interactions:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch contact interactions" });
      }
    },
  );

  // Admin: Get contact interaction statistics for specific owner
  app.get(
    "/api/admin/owners/:ownerId/contact-interactions/stats",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const adminUserId = req.user.claims.sub;
        const adminUser = await storage.getUser(adminUserId);
        if (!adminUser || adminUser.userRole !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { ownerId } = req.params;
        const owner = await storage.getUser(ownerId);

        if (!owner) {
          return res.status(404).json({ message: "Owner not found" });
        }

        // Get all properties for this owner
        const properties = await storage.getOwnerProperties(ownerId);
        const propertyIds = properties.map((p: any) => p.id);

        // Get all bookings for these properties
        const allBookings: any[] = [];
        for (const propId of propertyIds) {
          const bookings = await storage.getBookingsByProperty(propId);
          allBookings.push(...bookings);
        }
        const bookingIds = allBookings.map((b: any) => b.id);

        // Fetch contact interactions for these bookings
        const interactions = await db
          .select()
          .from(contactInteractions)
          .where(
            inArray(
              contactInteractions.bookingId,
              bookingIds.length > 0 ? bookingIds : [""],
            ),
          )
          .orderBy(desc(contactInteractions.createdAt));

        // Calculate statistics
        const stats = {
          ownerId,
          ownerName:
            `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
            owner.email,
          totalCalls: interactions.filter((i) => i.actionType === "call")
            .length,
          totalWhatsapp: interactions.filter((i) => i.actionType === "whatsapp")
            .length,
          receivedCalls: interactions.filter(
            (i) => i.actionType === "call" && i.targetRole === "owner",
          ).length,
          receivedWhatsapp: interactions.filter(
            (i) => i.actionType === "whatsapp" && i.targetRole === "owner",
          ).length,
          initiatedCalls: interactions.filter(
            (i) => i.actionType === "call" && i.actorRole === "owner",
          ).length,
          initiatedWhatsapp: interactions.filter(
            (i) => i.actionType === "whatsapp" && i.actorRole === "owner",
          ).length,
          last30Days: {
            calls: interactions.filter(
              (i) =>
                i.actionType === "call" &&
                new Date(i.createdAt!) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            ).length,
            whatsapp: interactions.filter(
              (i) =>
                i.actionType === "whatsapp" &&
                new Date(i.createdAt!) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            ).length,
          },
          recentInteractions: interactions.slice(0, 20).map((i) => ({
            id: i.id,
            actionType: i.actionType,
            actorRole: i.actorRole,
            targetRole: i.targetRole,
            createdAt: i.createdAt,
            metadata: i.metadata,
          })),
        };

        res.json(stats);
      } catch (error) {
        console.error("Error fetching owner contact interaction stats:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch contact interaction stats" });
      }
    },
  );

  // Admin: Get all contact interactions for specific owner (for download)
  app.get(
    "/api/admin/owners/:ownerId/contact-interactions",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const adminUserId = req.user.claims.sub;
        const adminUser = await storage.getUser(adminUserId);
        if (!adminUser || adminUser.userRole !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { ownerId } = req.params;
        const owner = await storage.getUser(ownerId);

        if (!owner) {
          return res.status(404).json({ message: "Owner not found" });
        }

        // Get all properties for this owner
        const properties = await storage.getOwnerProperties(ownerId);
        const propertyIds = properties.map((p: any) => p.id);

        // Get all bookings for these properties
        const allBookings: any[] = [];
        for (const propId of propertyIds) {
          const bookings = await storage.getBookingsByProperty(propId);
          allBookings.push(...bookings);
        }
        const bookingIds = allBookings.map((b: any) => b.id);

        // Fetch contact interactions for these bookings
        const interactions = await db
          .select()
          .from(contactInteractions)
          .where(
            inArray(
              contactInteractions.bookingId,
              bookingIds.length > 0 ? bookingIds : [""],
            ),
          )
          .orderBy(desc(contactInteractions.createdAt));

        // Enrich with booking and property info
        const enrichedInteractions = await Promise.all(
          interactions.map(async (i) => {
            const booking = allBookings.find((b: any) => b.id === i.bookingId);
            const property = booking
              ? properties.find((p: any) => p.id === booking.propertyId)
              : null;
            const actor = await storage.getUser(i.actorUserId);

            return {
              id: i.id,
              actionType: i.actionType,
              actorRole: i.actorRole,
              targetRole: i.targetRole,
              actorName: actor
                ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() ||
                  actor.email
                : "Unknown",
              propertyName: property?.title || "Unknown",
              bookingCode: booking?.bookingCode || "Unknown",
              createdAt: i.createdAt,
              metadata: i.metadata,
            };
          }),
        );

        res.json(enrichedInteractions);
      } catch (error) {
        console.error("Error fetching owner contact interactions:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch contact interactions" });
      }
    },
  );

  // Admin: Get all owners with contact interaction summary
  app.get(
    "/api/admin/contact-interactions/summary",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const adminUserId = req.user.claims.sub;
        const adminUser = await storage.getUser(adminUserId);
        if (!adminUser || adminUser.userRole !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }

        // Get all owners
        const allUsers = await db
          .select()
          .from(users)
          .where(eq(users.userRole, "owner"));

        const ownerSummaries = await Promise.all(
          allUsers.map(async (owner) => {
            // Get all properties for this owner
            const properties = await storage.getOwnerProperties(owner.id);
            const propertyIds = properties.map((p: any) => p.id);

            // Get all bookings for these properties
            const allBookings = [];
            for (const propId of propertyIds) {
              const bookings = await storage.getBookingsByProperty(propId);
              allBookings.push(...bookings);
            }
            const bookingIds = allBookings.map((b) => b.id);

            // Fetch contact interactions count
            const interactions =
              bookingIds.length > 0
                ? await db
                    .select()
                    .from(contactInteractions)
                    .where(inArray(contactInteractions.bookingId, bookingIds))
                : [];

            return {
              ownerId: owner.id,
              ownerName:
                `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
                owner.email ||
                "Unknown",
              ownerEmail: owner.email,
              propertyCount: properties.length,
              totalCalls: interactions.filter((i) => i.actionType === "call")
                .length,
              totalWhatsapp: interactions.filter(
                (i) => i.actionType === "whatsapp",
              ).length,
              totalInteractions: interactions.length,
            };
          }),
        );

        // Sort by total interactions (descending)
        ownerSummaries.sort(
          (a, b) => b.totalInteractions - a.totalInteractions,
        );

        res.json(ownerSummaries);
      } catch (error) {
        console.error("Error fetching contact interaction summary:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch contact interaction summary" });
      }
    },
  );

  // ===============================
  // OWNER AGREEMENT MANAGEMENT
  // ===============================

  // Public: Get published owner agreement
  app.get("/api/owner-agreement", async (req: any, res) => {
    try {
      const agreement = await storage.getPublishedOwnerAgreement();
      if (!agreement) {
        return res.status(404).json({ message: "Owner agreement not found" });
      }
      res.json(agreement);
    } catch (error) {
      console.error("Error fetching owner agreement:", error);
      res.status(500).json({ message: "Failed to fetch owner agreement" });
    }
  });

  // Public: Get current owner agreement version (for consent checking)
  app.get("/api/owner-agreement/version/current", async (req: any, res) => {
    try {
      const agreement = await storage.getPublishedOwnerAgreement();
      res.json({
        version: agreement?.version || null,
      });
    } catch (error) {
      console.error("Error fetching owner agreement version:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch owner agreement version" });
    }
  });

  // Admin: Get all owner agreements
  app.get(
    "/api/admin/owner-agreements",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can view all owner agreements" });
        }

        const allAgreements = await storage.getAllOwnerAgreements();
        res.json(allAgreements);
      } catch (error) {
        console.error("Error fetching owner agreements:", error);
        res.status(500).json({ message: "Failed to fetch owner agreements" });
      }
    },
  );

  // Admin: Get a single owner agreement by ID
  app.get(
    "/api/admin/owner-agreements/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can view agreement details" });
        }

        const agreement = await storage.getOwnerAgreement(req.params.id);
        if (!agreement) {
          return res.status(404).json({ message: "Owner agreement not found" });
        }

        res.json(agreement);
      } catch (error) {
        console.error("Error fetching owner agreement:", error);
        res.status(500).json({ message: "Failed to fetch owner agreement" });
      }
    },
  );

  // Admin: Create a new owner agreement version
  app.post(
    "/api/admin/owner-agreements",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can create owner agreements" });
        }

        const { title, content } = req.body;

        if (!title || !content) {
          return res
            .status(400)
            .json({ message: "Title and content are required" });
        }

        // Get the next version number
        const latestVersion = await storage.getLatestOwnerAgreementVersion();
        const newVersion = latestVersion + 1;

        const agreement = await storage.createOwnerAgreement({
          version: newVersion,
          title,
          content,
          status: "draft",
          createdBy: userId,
        });

        res.status(201).json(agreement);
      } catch (error) {
        console.error("Error creating owner agreement:", error);
        res.status(500).json({ message: "Failed to create owner agreement" });
      }
    },
  );

  // Admin: Update owner agreement content (only drafts can be updated)
  app.patch(
    "/api/admin/owner-agreements/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can update owner agreements" });
        }

        const agreement = await storage.getOwnerAgreement(req.params.id);
        if (!agreement) {
          return res.status(404).json({ message: "Owner agreement not found" });
        }

        if (agreement.status !== "draft") {
          return res.status(400).json({
            message:
              "Only draft agreements can be edited. Create a new version instead.",
          });
        }

        const { title, content } = req.body;
        const updates: { title?: string; content?: string } = {};

        if (title) updates.title = title;
        if (content) updates.content = content;

        const updatedAgreement = await storage.updateOwnerAgreement(
          req.params.id,
          updates,
        );
        res.json(updatedAgreement);
      } catch (error) {
        console.error("Error updating owner agreement:", error);
        res.status(500).json({ message: "Failed to update owner agreement" });
      }
    },
  );

  // Admin: Publish an owner agreement (archives any existing published version)
  app.post(
    "/api/admin/owner-agreements/:id/publish",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can publish owner agreements" });
        }

        const agreement = await storage.getOwnerAgreement(req.params.id);
        if (!agreement) {
          return res.status(404).json({ message: "Owner agreement not found" });
        }

        if (agreement.status === "published") {
          return res
            .status(400)
            .json({ message: "Agreement is already published" });
        }

        if (agreement.status === "archived") {
          return res.status(400).json({
            message:
              "Cannot publish an archived agreement. Create a new version instead.",
          });
        }

        const publishedAgreement = await storage.publishOwnerAgreement(
          req.params.id,
        );

        res.json({
          message: `Owner Agreement published successfully. All property owners will be required to accept version ${agreement.version}.`,
          agreement: publishedAgreement,
        });
      } catch (error) {
        console.error("Error publishing owner agreement:", error);
        res.status(500).json({ message: "Failed to publish owner agreement" });
      }
    },
  );

  // Admin: Get all owner agreement acceptances
  app.get(
    "/api/admin/owner-agreement-acceptances",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can view agreement acceptances" });
        }

        const acceptances = await storage.getOwnerAgreementAcceptances();
        res.json(acceptances);
      } catch (error) {
        console.error("Error fetching owner agreement acceptances:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch agreement acceptances" });
      }
    },
  );

  // Owner consent endpoint for accepting owner agreement
  app.post(
    "/api/auth/owner-agreement-consent",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;

        // Get current published owner agreement version
        const agreement = await storage.getPublishedOwnerAgreement();

        if (!agreement) {
          return res.status(400).json({
            message:
              "Cannot accept agreement. Published owner agreement not available.",
          });
        }

        const updatedUser = await storage.updateUserOwnerAgreementConsent(
          userId,
          agreement.version,
        );

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({
          message: "Owner Agreement consent recorded successfully",
          user: updatedUser,
        });
      } catch (error) {
        console.error("Error recording owner agreement consent:", error);
        res.status(500).json({ message: "Failed to record consent" });
      }
    },
  );

  // ===== ABOUT US ROUTES =====

  // Public: Get published About Us content
  app.get("/api/about-us", async (req: any, res) => {
    try {
      const aboutUs = await storage.getPublishedAboutUs();
      if (!aboutUs) {
        return res.status(404).json({ message: "About Us content not found" });
      }
      res.json(aboutUs);
    } catch (error) {
      console.error("Error fetching about us:", error);
      res.status(500).json({ message: "Failed to fetch about us content" });
    }
  });

  // Admin: Get all About Us versions
  app.get("/api/admin/about-us", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can view all about us versions" });
      }

      const allAboutUs = await storage.getAllAboutUs();
      res.json(allAboutUs);
    } catch (error) {
      console.error("Error fetching all about us:", error);
      res.status(500).json({ message: "Failed to fetch about us versions" });
    }
  });

  // Admin: Get specific About Us version
  app.get("/api/admin/about-us/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can view about us details" });
      }

      const aboutUs = await storage.getAboutUs(req.params.id);
      if (!aboutUs) {
        return res.status(404).json({ message: "About Us not found" });
      }
      res.json(aboutUs);
    } catch (error) {
      console.error("Error fetching about us:", error);
      res.status(500).json({ message: "Failed to fetch about us" });
    }
  });

  // Admin: Create new About Us version
  app.post("/api/admin/about-us", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can create about us content" });
      }

      const { title, content } = req.body;

      if (!title || !content) {
        return res
          .status(400)
          .json({ message: "Title and content are required" });
      }

      const latestVersion = await storage.getLatestAboutUsVersion();
      const newVersion = latestVersion + 1;

      const aboutUs = await storage.createAboutUs({
        title,
        content,
        version: newVersion,
        status: "draft",
        createdBy: userId,
      });

      res.json({ message: "About Us created successfully", aboutUs });
    } catch (error) {
      console.error("Error creating about us:", error);
      res.status(500).json({ message: "Failed to create about us" });
    }
  });

  // Admin: Update About Us content (only drafts)
  app.patch(
    "/api/admin/about-us/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can update about us content" });
        }

        const aboutUs = await storage.getAboutUs(req.params.id);
        if (!aboutUs) {
          return res.status(404).json({ message: "About Us not found" });
        }

        if (aboutUs.status !== "draft") {
          return res
            .status(400)
            .json({ message: "Can only edit draft versions" });
        }

        const { title, content } = req.body;
        const updated = await storage.updateAboutUs(req.params.id, {
          title,
          content,
        });

        res.json({
          message: "About Us updated successfully",
          aboutUs: updated,
        });
      } catch (error) {
        console.error("Error updating about us:", error);
        res.status(500).json({ message: "Failed to update about us" });
      }
    },
  );

  // Admin: Publish About Us
  app.post(
    "/api/admin/about-us/:id/publish",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can publish about us content" });
        }

        const aboutUs = await storage.getAboutUs(req.params.id);
        if (!aboutUs) {
          return res.status(404).json({ message: "About Us not found" });
        }

        if (aboutUs.status === "published") {
          return res
            .status(400)
            .json({ message: "About Us is already published" });
        }

        if (aboutUs.status === "archived") {
          return res.status(400).json({
            message:
              "Cannot publish archived content. Create a new version instead.",
          });
        }

        const publishedAboutUs = await storage.publishAboutUs(req.params.id);

        res.json({
          message: `About Us version ${aboutUs.version} published successfully.`,
          aboutUs: publishedAboutUs,
        });
      } catch (error) {
        console.error("Error publishing about us:", error);
        res.status(500).json({ message: "Failed to publish about us" });
      }
    },
  );

  // Admin: Archive About Us
  app.post(
    "/api/admin/about-us/:id/archive",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can archive about us content" });
        }

        const aboutUs = await storage.getAboutUs(req.params.id);
        if (!aboutUs) {
          return res.status(404).json({ message: "About Us not found" });
        }

        if (aboutUs.status === "archived") {
          return res
            .status(400)
            .json({ message: "About Us is already archived" });
        }

        const archivedAboutUs = await storage.archiveAboutUs(req.params.id);

        res.json({
          message: `About Us version ${aboutUs.version} archived.`,
          aboutUs: archivedAboutUs,
        });
      } catch (error) {
        console.error("Error archiving about us:", error);
        res.status(500).json({ message: "Failed to archive about us" });
      }
    },
  );

  // Admin: Mark booking as no-show (with time-based validation)
  app.patch(
    "/api/admin/bookings/:id/no-show",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        const { reason } = req.body;

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can mark no-show" });
        }

        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Prevent no-show if already checked-in, cancelled, or already marked no-show
        const blockedStatuses = [
          "checked_in",
          "checked_out",
          "completed",
          "cancelled",
          "no_show",
          "rejected",
        ];
        if (blockedStatuses.includes(booking.status)) {
          return res.status(400).json({
            message: "Cannot mark no-show for this booking status",
            code: "INVALID_STATUS",
          });
        }

        // Allow admin to mark no-show from customer_confirmed status
        if (booking.status !== "customer_confirmed") {
          return res.status(400).json({
            message: "Can only mark no-show for guest-confirmed bookings",
          });
        }

        // Time-based validation with 2-hour grace period
        const NO_SHOW_GRACE_PERIOD_HOURS = 2;
        const now = new Date();
        const checkInDateTime = new Date(booking.checkIn);
        checkInDateTime.setHours(12, 0, 0, 0);
        const noShowAvailableAt = new Date(
          checkInDateTime.getTime() +
            NO_SHOW_GRACE_PERIOD_HOURS * 60 * 60 * 1000,
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDateOnly = new Date(booking.checkIn);
        checkInDateOnly.setHours(0, 0, 0, 0);
        const isPastCheckInDate = today > checkInDateOnly;

        if (now < noShowAvailableAt && !isPastCheckInDate) {
          return res.status(400).json({
            message: "Cannot mark no-show before the grace period has passed",
            code: "TOO_EARLY",
            noShowAvailableAt: noShowAvailableAt.toISOString(),
          });
        }

        const updated = await storage.markNoShow(
          req.params.id,
          userId,
          "admin",
          reason,
        );

        // Send emails to both guest and owner
        const property = await storage.getProperty(booking.propertyId);
        const guest = await storage.getUser(booking.guestId);

        if (property && guest?.email) {
          const checkInFormatted = new Date(booking.checkIn).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" },
          );
          const checkOutFormatted = new Date(
            booking.checkOut,
          ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          sendBookingNoShowEmail(
            guest.email,
            guest.firstName || "",
            {
              bookingCode:
                booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
              propertyName: property.title,
              propertyId: property.id,
              checkIn: checkInFormatted,
              checkOut: checkOutFormatted,
              guests: booking.guests,
              rooms: booking.rooms || 1,
              totalPrice: booking.totalPrice,
              bookingCreatedAt: booking.bookingCreatedAt
                ? new Date(booking.bookingCreatedAt).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short", year: "numeric" },
                  )
                : undefined,
              paymentType: "pay_at_hotel",
            },
            "guest",
          ).catch(console.error);
        }

        // Push notifications for no-show
        try {
          const { sendPushNotification } = require("./services/pushService");
          const noShowProperty = await storage.getProperty(booking.propertyId);
          const bookingCode =
            booking.bookingCode || booking.id.slice(0, 8).toUpperCase();
          // Notify guest
          await sendPushNotification(booking.guestId, {
            title: "No-Show Recorded",
            body: `Booking ${bookingCode} at ${noShowProperty?.title || "property"} has been marked as no-show.`,
            tag: `no-show-${booking.id}`,
            data: { url: "/my-bookings" },
          });
          // Notify owner
          if (noShowProperty) {
            await sendPushNotification(noShowProperty.ownerId, {
              title: "Guest No-Show",
              body: `Booking ${bookingCode} has been marked as no-show.`,
              tag: `no-show-owner-${booking.id}`,
              data: { url: "/owner/bookings" },
            });
          }
        } catch {}

        res.json(updated);
      } catch (error) {
        console.error("Error admin marking no-show:", error);
        res.status(500).json({ message: "Failed to mark no-show" });
      }
    },
  );

  // Admin: Unmark no-show (reverse to customer_confirmed)
  app.patch(
    "/api/admin/bookings/:id/unmark-no-show",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can unmark no-show" });
        }

        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Only allow unmarking no-show status
        if (booking.status !== "no_show") {
          return res
            .status(400)
            .json({ message: "Can only unmark bookings with no-show status" });
        }

        const updated = await storage.adminUnmarkNoShow(req.params.id, userId);

        res.json(updated);
      } catch (error) {
        console.error("Error admin unmarking no-show:", error);
        res.status(500).json({ message: "Failed to unmark no-show" });
      }
    },
  );

  // Admin: Cancel booking (with full refund)
  app.post(
    "/api/admin/bookings/:id/cancel",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can cancel bookings" });
        }

        const { reason } = req.body;
        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.status === "completed") {
          return res
            .status(400)
            .json({ message: "Cannot cancel completed bookings" });
        }

        const updated = await storage.adminCancelBooking(
          req.params.id,
          userId,
          reason,
        );

        // Send notification email to guest
        const property = await storage.getProperty(booking.propertyId);
        const guest = await storage.getUser(booking.guestId);

        if (property && guest?.email) {
          const checkInFormatted = new Date(booking.checkIn).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" },
          );
          const checkOutFormatted = new Date(
            booking.checkOut,
          ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          // Notify guest about admin cancellation
          sendBookingDeclinedEmail(
            guest.email,
            guest.firstName || "",
            {
              bookingCode:
                booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
              propertyName: property.title,
              propertyId: property.id,
              checkIn: checkInFormatted,
              checkOut: checkOutFormatted,
              guests: booking.guests,
              rooms: booking.rooms || 1,
              totalPrice: booking.totalPrice,
            },
            "cancelled",
            reason || "Cancelled by platform administrator",
          ).catch(console.error);
        }

        res.json(updated);
      } catch (error) {
        console.error("Error admin cancelling booking:", error);
        res.status(500).json({ message: "Failed to cancel booking" });
      }
    },
  );

  // Admin: Force check-in
  app.post(
    "/api/admin/bookings/:id/force-check-in",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can force check-in" });
        }

        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        const updated = await storage.adminForceCheckIn(req.params.id, userId);

        // Push to guest and owner on check-in
        try {
          const { sendPushNotification } = require("./services/pushService");
          const ciProperty = await storage.getProperty(booking.propertyId);
          const bookingCode =
            booking.bookingCode || booking.id.slice(0, 8).toUpperCase();
          await sendPushNotification(booking.guestId, {
            title: "Check-In Confirmed",
            body: `Welcome! Your check-in at ${ciProperty?.title || "the property"} (${bookingCode}) has been recorded.`,
            tag: `checkin-${booking.id}`,
            data: { url: "/my-bookings" },
          });
          if (ciProperty) {
            await sendPushNotification(ciProperty.ownerId, {
              title: "Guest Checked In",
              body: `Booking ${bookingCode} — guest has checked in.`,
              tag: `checkin-owner-${booking.id}`,
              data: { url: "/owner/bookings" },
            });
          }
        } catch {}

        res.json(updated);
      } catch (error) {
        console.error("Error admin force check-in:", error);
        res.status(500).json({ message: "Failed to force check-in" });
      }
    },
  );

  // Admin: Force check-out
  app.post(
    "/api/admin/bookings/:id/force-check-out",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can force check-out" });
        }

        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        const updated = await storage.adminForceCheckOut(req.params.id, userId);

        // Push to guest and owner on check-out
        try {
          const { sendPushNotification } = require("./services/pushService");
          const coProperty = await storage.getProperty(booking.propertyId);
          const bookingCode =
            booking.bookingCode || booking.id.slice(0, 8).toUpperCase();
          await sendPushNotification(booking.guestId, {
            title: "Check-Out Recorded",
            body: `Your stay at ${coProperty?.title || "the property"} (${bookingCode}) is complete. Thanks for staying with us!`,
            tag: `checkout-${booking.id}`,
            data: { url: "/my-bookings" },
          });
          if (coProperty) {
            await sendPushNotification(coProperty.ownerId, {
              title: "Guest Checked Out",
              body: `Booking ${bookingCode} — guest has checked out.`,
              tag: `checkout-owner-${booking.id}`,
              data: { url: "/owner/bookings" },
            });
          }
        } catch {}

        res.json(updated);
      } catch (error) {
        console.error("Error admin force check-out:", error);
        res.status(500).json({ message: "Failed to force check-out" });
      }
    },
  );

  // Admin: Get all bookings with filters
  app.get("/api/admin/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can view all bookings" });
      }

      const { status, propertyId, limit } = req.query;
      const bookings = await storage.getAllBookingsForAdmin({
        status: status as string,
        propertyId: propertyId as string,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.json(bookings);
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Admin: Get booking management stats
  app.get(
    "/api/admin/stats/bookings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can view stats" });
        }

        const stats = await storage.getBookingManagementStats();
        res.json(stats);
      } catch (error) {
        console.error("Error fetching booking stats:", error);
        res.status(500).json({ message: "Failed to fetch booking stats" });
      }
    },
  );

  // Admin: Get owner compliance stats
  app.get("/api/admin/stats/owners", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Only admins can view stats" });
      }

      const stats = await storage.getOwnerComplianceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching owner stats:", error);
      res.status(500).json({ message: "Failed to fetch owner stats" });
    }
  });

  // Admin: Suspend owner
  app.post(
    "/api/admin/owners/:id/suspend",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can suspend owners" });
        }

        const { reason } = req.body;
        if (!reason || reason.length < 10) {
          return res.status(400).json({
            message: "Suspension reason must be at least 10 characters",
          });
        }

        const owner = await storage.getUser(req.params.id);
        if (!owner) {
          return res.status(404).json({ message: "Owner not found" });
        }

        if (owner.userRole !== "owner") {
          return res.status(400).json({ message: "User is not an owner" });
        }

        if (owner.suspensionStatus === "suspended") {
          return res
            .status(400)
            .json({ message: "Owner is already suspended" });
        }

        const updated = await storage.suspendOwner(
          req.params.id,
          userId,
          reason,
        );

        // Send suspension notification email
        if (owner.email) {
          // Email notification would be sent here
          console.log(
            `Suspension notification would be sent to ${owner.email}`,
          );
        }

        res.json(updated);
      } catch (error) {
        console.error("Error suspending owner:", error);
        res.status(500).json({ message: "Failed to suspend owner" });
      }
    },
  );

  // Admin: Reinstate owner
  app.post(
    "/api/admin/owners/:id/reinstate",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can reinstate owners" });
        }

        const owner = await storage.getUser(req.params.id);
        if (!owner) {
          return res.status(404).json({ message: "Owner not found" });
        }

        if (owner.suspensionStatus !== "suspended") {
          return res.status(400).json({ message: "Owner is not suspended" });
        }

        const updated = await storage.reinstateOwner(req.params.id, userId);

        // Send reinstatement notification email
        if (owner.email) {
          console.log(
            `Reinstatement notification would be sent to ${owner.email}`,
          );
        }

        res.json(updated);
      } catch (error) {
        console.error("Error reinstating owner:", error);
        res.status(500).json({ message: "Failed to reinstate owner" });
      }
    },
  );

  // Admin: Get suspended owners
  app.get(
    "/api/admin/owners/suspended",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can view suspended owners" });
        }

        const suspendedOwners = await storage.getSuspendedOwners();
        res.json(suspendedOwners);
      } catch (error) {
        console.error("Error fetching suspended owners:", error);
        res.status(500).json({ message: "Failed to fetch suspended owners" });
      }
    },
  );

  // ===== Admin User Management Routes =====

  // Admin: Get all users (with filters for search and status)
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Only admins can view users" });
      }

      const { search, status, limit } = req.query;
      const users = await storage.getAllUsersForAdmin({
        search: search as string,
        status: (status as "active" | "deactivated" | "all") || "all",
        limit: limit ? parseInt(limit as string) : 100,
      });
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Get deactivated users
  app.get(
    "/api/admin/users/deactivated",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can view deactivated users" });
        }

        const deactivatedUsers = await storage.getDeactivatedUsers();
        res.json(deactivatedUsers);
      } catch (error) {
        console.error("Error fetching deactivated users:", error);
        res.status(500).json({ message: "Failed to fetch deactivated users" });
      }
    },
  );

  // Admin: Deactivate user (soft delete)
  app.post(
    "/api/admin/users/:id/deactivate",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const adminId = req.user.claims.sub;
        const admin = await storage.getUser(adminId);

        if (!admin || !userHasRole(admin, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can deactivate users" });
        }

        const { reason } = req.body;
        if (!reason || reason.length < 10) {
          return res.status(400).json({
            message: "Deactivation reason must be at least 10 characters",
          });
        }

        const targetUser = await storage.getUser(req.params.id);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }

        if (targetUser.userRole === "admin") {
          return res
            .status(400)
            .json({ message: "Cannot deactivate admin users" });
        }

        if (targetUser.isDeactivated) {
          return res
            .status(400)
            .json({ message: "User is already deactivated" });
        }

        const updated = await storage.deactivateUser(
          req.params.id,
          adminId,
          reason,
        );

        res.json({
          message: "User deactivated successfully",
          user: updated,
        });
      } catch (error) {
        console.error("Error deactivating user:", error);
        res.status(500).json({ message: "Failed to deactivate user" });
      }
    },
  );

  // Admin: Restore user (reactivate)
  app.post(
    "/api/admin/users/:id/restore",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const adminId = req.user.claims.sub;
        const admin = await storage.getUser(adminId);

        if (!admin || !userHasRole(admin, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can restore users" });
        }

        const targetUser = await storage.getUser(req.params.id);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }

        if (!targetUser.isDeactivated) {
          return res.status(400).json({ message: "User is not deactivated" });
        }

        const updated = await storage.restoreUser(req.params.id, adminId);

        res.json({
          message: "User restored successfully",
          user: updated,
        });
      } catch (error) {
        console.error("Error restoring user:", error);
        res.status(500).json({ message: "Failed to restore user" });
      }
    },
  );

  // Admin: Permanently delete a user and all their data (CASCADE)
  // Admin: Change user role (owner ↔ guest)
  app.patch(
    "/api/admin/users/:id/role",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const adminId = req.user.claims.sub;
        const admin = await storage.getUser(adminId);
        if (!admin || !userHasRole(admin, "admin")) {
          return res.status(403).json({ message: "Admin only" });
        }

        const { role } = req.body;
        if (!["guest", "owner"].includes(role)) {
          return res
            .status(400)
            .json({ message: "Role must be guest or owner" });
        }

        const targetUser = await storage.getUser(req.params.id);
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }
        if (targetUser.userRole === "admin") {
          return res.status(400).json({ message: "Cannot change admin role" });
        }

        const updated = await storage.upsertUser({
          ...targetUser,
          userRole: role,
          ...(role === "guest" && {
            kycStatus: "not_started",
            kycVerifiedAt: null,
          }),
        });

        broadcastToUser(req.params.id, {
          type: "role_changed",
          message: `Your account role has been updated to ${role}.`,
        });

        res.json({ message: `Role updated to ${role}`, user: updated });
      } catch (error) {
        console.error("Error changing user role:", error);
        res.status(500).json({ message: "Failed to change role" });
      }
    },
  );
  app.delete("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const admin = await storage.getUser(adminId);
      if (!admin || !userHasRole(admin, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can permanently delete users" });
      }
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (targetUser.id === adminId) {
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(req.params.id, adminId);
      res.json({
        message: "User permanently deleted",
        email: targetUser.email,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin: Get user management stats
  app.get("/api/admin/stats/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can view user stats" });
      }

      const allUsers = await storage.getAllUsersForAdmin({
        status: "all",
        limit: 10000,
      });
      const activeUsers = allUsers.filter((u) => !u.isDeactivated);
      const deactivatedUsers = allUsers.filter((u) => u.isDeactivated);
      const guestUsers = allUsers.filter(
        (u) => u.userRole === "guest" && !u.isDeactivated,
      );
      const ownerUsers = allUsers.filter(
        (u) => u.userRole === "owner" && !u.isDeactivated,
      );

      res.json({
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        deactivatedUsers: deactivatedUsers.length,
        guests: guestUsers.length,
        owners: ownerUsers.length,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Admin: Get inventory health
  app.get(
    "/api/admin/inventory/health",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can view inventory health" });
        }

        const { propertyId } = req.query;
        const health = await storage.getInventoryHealth(propertyId as string);
        res.json(health);
      } catch (error) {
        console.error("Error fetching inventory health:", error);
        res.status(500).json({ message: "Failed to fetch inventory health" });
      }
    },
  );

  // Admin: Fix inventory issues
  app.post(
    "/api/admin/inventory/fix",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Only admins can fix inventory" });
        }

        const { propertyId, roomTypeId, startDate, endDate, dryRun } = req.body;

        if (!propertyId) {
          return res.status(400).json({ message: "Property ID is required" });
        }

        const result = await storage.fixInventory(
          propertyId,
          roomTypeId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
          dryRun,
        );

        // Log the action
        await storage.createAdminAuditLog({
          adminId: userId,
          action: "fix_inventory",
          propertyId,
          reason: `Inventory fix ${dryRun ? "(dry run)" : ""}: ${result.details.join(", ")}`,
        });

        res.json(result);
      } catch (error) {
        console.error("Error fixing inventory:", error);
        res.status(500).json({ message: "Failed to fix inventory" });
      }
    },
  );

  // Admin: Get audit logs
  app.get("/api/admin/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "admin")) {
        return res
          .status(403)
          .json({ message: "Only admins can view audit logs" });
      }

      const { adminId, action, limit } = req.query;
      const logs = await storage.getAdminAuditLogs({
        adminId: adminId as string,
        action: action as string,
        limit: limit ? parseInt(limit) : undefined,
      });

      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ============================================
  // Support Chat API Routes
  // ============================================

  const {
    processMessage,
    processQuickAction,
    getGreetingMessage,
    QUICK_ACTIONS,
  } = await import("./supportAI");

  // Get quick actions for chat UI
  app.get("/api/support/quick-actions", async (_req, res) => {
    res.json(QUICK_ACTIONS);
  });

  // Start or resume support conversation
  app.post(
    "/api/support/conversations",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check for existing active conversation
        let conversation = await storage.getActiveSupportConversation(userId);

        if (!conversation) {
          // Create new conversation
          conversation = await storage.createSupportConversation({
            userId,
            userRole: user.userRole || "guest",
            subject: req.body.subject,
          });

          // Add greeting message
          const greetingContent = getGreetingMessage(
            user.firstName || undefined,
          );
          await storage.addSupportMessage({
            conversationId: conversation.id,
            senderType: "ai",
            content: greetingContent,
            metadata: { intent: "greeting", confidence: 1 },
          });
        }

        // Get messages
        const messages = await storage.getSupportMessages(conversation.id);

        res.json({ conversation, messages });
      } catch (error) {
        console.error("Error starting support conversation:", error);
        res
          .status(500)
          .json({ message: "Failed to start support conversation" });
      }
    },
  );

  // Get user's support conversations
  app.get(
    "/api/support/conversations",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const conversations =
          await storage.getSupportConversationsByUser(userId);
        res.json(conversations);
      } catch (error) {
        console.error("Error fetching support conversations:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch support conversations" });
      }
    },
  );

  // Get specific conversation with messages
  app.get(
    "/api/support/conversations/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const conversation = await storage.getSupportConversation(
          req.params.id,
        );

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        // Check user owns this conversation or is admin
        const user = await storage.getUser(userId);
        if (conversation.userId !== userId && !userHasRole(user, "admin")) {
          return res
            .status(403)
            .json({ message: "Not authorized to view this conversation" });
        }

        const messages = await storage.getSupportMessages(conversation.id);

        // Mark messages as read for this user
        await storage.markSupportMessagesAsRead(conversation.id, "user");

        res.json({ conversation, messages });
      } catch (error) {
        console.error("Error fetching support conversation:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch support conversation" });
      }
    },
  );

  // Send message in support conversation
  app.post(
    "/api/support/conversations/:id/messages",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { content, quickActionId } = req.body;

        const conversation = await storage.getSupportConversation(
          req.params.id,
        );
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        // Check user owns this conversation
        if (conversation.userId !== userId) {
          return res.status(403).json({ message: "Not authorized" });
        }

        // Check if conversation is closed
        if (conversation.status === "closed") {
          return res.status(400).json({
            message: "Conversation is closed. Please start a new conversation.",
          });
        }

        // Add user message
        const userMessage = await storage.addSupportMessage({
          conversationId: conversation.id,
          senderType: "user",
          senderId: userId,
          content: content || quickActionId,
        });

        // Process and get AI response
        const aiResponse = quickActionId
          ? processQuickAction(quickActionId)
          : processMessage(content);

        // Add AI response
        const aiMessage = await storage.addSupportMessage({
          conversationId: conversation.id,
          senderType: "ai",
          content: aiResponse.message,
          metadata: {
            intent: aiResponse.intent,
            confidence: aiResponse.confidence,
          },
        });

        // Handle escalation if needed
        if (aiResponse.shouldEscalate) {
          const escalation = await storage.escalateSupportConversation(
            conversation.id,
            aiResponse.escalationReason || "User requested human support",
          );

          // Notify admins via WebSocket
          const admins = await storage.getAdminUsers();
          admins.forEach((admin) => {
            broadcastToUser(admin.id, {
              type: "support_escalation",
              conversationId: conversation.id,
              ticketNumber: escalation?.ticket.ticketNumber,
            });
          });
        }

        res.json({
          userMessage,
          aiMessage,
          escalated: aiResponse.shouldEscalate,
        });
      } catch (error) {
        console.error("Error sending support message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

  // Close support conversation
  app.post(
    "/api/support/conversations/:id/close",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const conversation = await storage.getSupportConversation(
          req.params.id,
        );

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        // Allow user or admin to close
        const user = await storage.getUser(userId);
        if (conversation.userId !== userId && !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const updated = await storage.closeSupportConversation(conversation.id);
        res.json(updated);
      } catch (error) {
        console.error("Error closing support conversation:", error);
        res.status(500).json({ message: "Failed to close conversation" });
      }
    },
  );

  // Admin: Get all support conversations
  app.get(
    "/api/admin/support/conversations",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { status, assignedTo, limit } = req.query;
        const conversations = await storage.getAllSupportConversations({
          status: status as string,
          assignedTo: assignedTo as string,
          limit: limit ? parseInt(limit) : undefined,
        });

        res.json(conversations);
      } catch (error) {
        console.error("Error fetching admin support conversations:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
      }
    },
  );

  // Admin: Assign conversation to self
  app.post(
    "/api/admin/support/conversations/:id/assign",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admin access required" });
        }

        const updated = await storage.assignSupportConversation(
          req.params.id,
          userId,
        );
        if (!updated) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error assigning support conversation:", error);
        res.status(500).json({ message: "Failed to assign conversation" });
      }
    },
  );

  // Admin: Send message as admin
  app.post(
    "/api/admin/support/conversations/:id/messages",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { content } = req.body;
        if (!content) {
          return res
            .status(400)
            .json({ message: "Message content is required" });
        }

        const conversation = await storage.getSupportConversation(
          req.params.id,
        );
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        const message = await storage.addSupportMessage({
          conversationId: conversation.id,
          senderType: "admin",
          senderId: userId,
          content,
        });

        // Notify user via WebSocket
        broadcastToUser(conversation.userId, {
          type: "support_message",
          conversationId: conversation.id,
          message,
        });

        res.json(message);
      } catch (error) {
        console.error("Error sending admin support message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

  // Admin: Get support tickets
  app.get(
    "/api/admin/support/tickets",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { status, priority } = req.query;
        const tickets = await storage.getSupportTickets({
          status: status as string,
          priority: priority as string,
        });

        res.json(tickets);
      } catch (error) {
        console.error("Error fetching support tickets:", error);
        res.status(500).json({ message: "Failed to fetch tickets" });
      }
    },
  );

  // Admin: Resolve support ticket
  app.post(
    "/api/admin/support/tickets/:id/resolve",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admin access required" });
        }

        const { notes } = req.body;
        if (!notes) {
          return res
            .status(400)
            .json({ message: "Resolution notes are required" });
        }

        const ticket = await storage.resolveSupportTicket(req.params.id, notes);
        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        res.json(ticket);
      } catch (error) {
        console.error("Error resolving support ticket:", error);
        res.status(500).json({ message: "Failed to resolve ticket" });
      }
    },
  );

  // Search history routes
  app.post("/api/search-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSearchHistorySchema.parse(req.body);
      const search = await storage.createSearchHistory(userId, validatedData);
      res.json(search);
    } catch (error) {
      console.error("Error saving search history:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid search data" });
      }
      res.status(500).json({ message: "Failed to save search history" });
    }
  });

  app.get("/api/search-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      const searches = await storage.getUserSearchHistory(userId, limit);
      res.json(searches);
    } catch (error) {
      console.error("Error fetching search history:", error);
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  app.delete(
    "/api/search-history/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        await storage.deleteSearchHistory(req.params.id);
        res.json({ message: "Search history deleted" });
      } catch (error) {
        console.error("Error deleting search history:", error);
        res.status(500).json({ message: "Failed to delete search history" });
      }
    },
  );

  // Object Storage routes for file uploads
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const objectStorageService = new ObjectStorageService();
      const { uploadURL, accessPath } =
        await objectStorageService.getObjectEntityUploadURLWithAccessPath();

      // Generate a signed token that ties this upload to the current user
      const aclToken = generateUploadToken(userId, accessPath);

      res.json({ uploadURL, accessPath, aclToken });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Set ACL policy on uploaded object (called after upload is complete)
  // Requires a valid aclToken from the upload endpoint to prevent unauthorized ownership claims
  app.post("/api/objects/set-acl", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { accessPath, aclToken } = req.body;

      if (!accessPath || !accessPath.startsWith("/objects/")) {
        return res.status(400).json({ message: "Invalid access path" });
      }

      if (!aclToken) {
        return res.status(400).json({ message: "Missing ACL token" });
      }

      // Verify the token matches the current user and access path
      const tokenData = verifyUploadToken(aclToken);
      if (!tokenData) {
        return res.status(403).json({ message: "Invalid ACL token" });
      }

      if (tokenData.userId !== userId || tokenData.accessPath !== accessPath) {
        return res
          .status(403)
          .json({ message: "Token does not match user or path" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectFile =
        await objectStorageService.getObjectEntityFile(accessPath);

      // Allow specifying visibility - default to private for security, but property images should be public
      const visibility =
        req.body.visibility === "public" ? "public" : "private";

      await setObjectAclPolicy(objectFile, {
        owner: userId,
        visibility: visibility,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error setting ACL policy:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "Object not found" });
      }
      res.status(500).json({ message: "Failed to set ACL policy" });
    }
  });

  // Public objects route - no authentication required for public visibility objects
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );

      // Get the authenticated user if available (optional auth)
      let userId: string | undefined;
      if (
        req.isAuthenticated &&
        req.isAuthenticated() &&
        req.user?.claims?.sub
      ) {
        userId = req.user.claims.sub;
      }

      // Check access - this will allow public visibility objects without auth
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });

      if (!canAccess) {
        // If not public and user is admin, allow access
        if (userId) {
          const user = await storage.getUser(userId);
          if (userHasRole(user, "admin")) {
            objectStorageService.downloadObject(objectFile, res);
            return;
          }
        }
        return res.sendStatus(401);
      }

      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  // ─── Payment Accounts Routes ────────────────────────────────────────

  // Public: owners see where to pay
  app.get("/api/payment-accounts", async (req, res) => {
    try {
      const accounts = await db
        .select()
        .from(paymentAccounts)
        .where(eq(paymentAccounts.isActive, true))
        .orderBy(paymentAccounts.displayOrder);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment accounts" });
    }
  });

  // Admin: get all payment accounts
  app.get(
    "/api/admin/payment-accounts",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });
        const accounts = await db
          .select()
          .from(paymentAccounts)
          .orderBy(paymentAccounts.displayOrder);
        res.json(accounts);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch payment accounts" });
      }
    },
  );

  // Admin: create payment account
  app.post(
    "/api/admin/payment-accounts",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });
        const {
          accountType,
          accountName,
          upiId,
          qrCodeUrl,
          bankName,
          accountNumber,
          ifscCode,
          branchName,
          priority,
          displayOrder,
        } = req.body;
        if (!accountType || !accountName)
          return res
            .status(400)
            .json({ message: "accountType and accountName required" });
        // If new primary, demote existing primary of same type
        if (priority === "primary") {
          await db
            .update(paymentAccounts)
            .set({ priority: "secondary" })
            .where(
              and(
                eq(paymentAccounts.accountType, accountType),
                eq(paymentAccounts.priority, "primary"),
              ),
            );
        }
        const [account] = await db
          .insert(paymentAccounts)
          .values({
            accountType,
            accountName,
            upiId: upiId || null,
            qrCodeUrl: qrCodeUrl || null,
            bankName: bankName || null,
            accountNumber: accountNumber || null,
            ifscCode: ifscCode || null,
            branchName: branchName || null,
            priority: priority || "secondary",
            displayOrder: Number(displayOrder) || 0,
            isActive: true,
            createdBy: userId,
          })
          .returning();
        console.log("[PAYMENT ACCOUNT] Created:", JSON.stringify(account));
        res.json(account);
      } catch (error) {
        console.error("[PAYMENT ACCOUNT] Create error:", error);
        res.status(500).json({ message: "Failed to create payment account" });
      }
    },
  );

  // Admin: update payment account
  app.patch(
    "/api/admin/payment-accounts/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });
        const updateData = req.body;
        // If setting as primary, demote existing primary
        if (updateData.priority === "primary" && updateData.accountType) {
          await db
            .update(paymentAccounts)
            .set({ priority: "secondary" })
            .where(
              and(
                eq(paymentAccounts.accountType, updateData.accountType),
                eq(paymentAccounts.priority, "primary"),
                sql`id != ${req.params.id}`,
              ),
            );
        }
        const [updated] = await db
          .update(paymentAccounts)
          .set(updateData)
          .where(eq(paymentAccounts.id, req.params.id))
          .returning();
        if (!updated)
          return res.status(404).json({ message: "Account not found" });
        res.json(updated);
      } catch (error) {
        res.status(500).json({ message: "Failed to update payment account" });
      }
    },
  );

  // Admin: delete payment account
  app.delete(
    "/api/admin/payment-accounts/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });
        await db
          .delete(paymentAccounts)
          .where(eq(paymentAccounts.id, req.params.id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: "Failed to delete payment account" });
      }
    },
  );

  // Owner: submit payment proof
  app.post(
    "/api/owner/payment-proof",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const {
          subscriptionId,
          transactionId,
          screenshotUrl,
          paymentMethod,
          amount,
        } = req.body;
        if (!subscriptionId || !transactionId || !amount) {
          return res.status(400).json({
            message: "subscriptionId, transactionId, and amount are required",
          });
        }
        const [proof] = await db
          .insert(subscriptionPayments)
          .values({
            subscriptionId,
            ownerId: userId,
            transactionId,
            screenshotUrl: screenshotUrl || null,
            paymentMethod: paymentMethod || "upi",
            amount: String(amount),
            status: "pending",
          })
          .returning();
        res.json(proof);
      } catch (error) {
        res.status(500).json({ message: "Failed to submit payment proof" });
      }
    },
  );

  // Admin: get payment proof by subscription
  app.get(
    "/api/admin/payment-proofs/by-subscription/:subscriptionId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });
        const proofs = await db
          .select()
          .from(subscriptionPayments)
          .where(
            eq(subscriptionPayments.subscriptionId, req.params.subscriptionId),
          )
          .orderBy(desc(subscriptionPayments.submittedAt));
        res.json(proofs);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch payment proof" });
      }
    },
  );

  // Admin: verify or reject payment proof
  app.patch(
    "/api/admin/payment-proofs/:id/verify",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });
        const { action, notes } = req.body;
        const [updated] = await db
          .update(subscriptionPayments)
          .set({
            status: action,
            verifiedAt: new Date(),
            verifiedBy: userId,
            adminNotes: notes || null,
          })
          .where(eq(subscriptionPayments.id, req.params.id))
          .returning();
        res.json(updated);
      } catch (error) {
        res.status(500).json({ message: "Failed to update payment proof" });
      }
    },
  );
  // ─── Invoice Routes ─────────────────────────────────────────────────
  // Admin: Manual trigger for expiry check
  app.post(
    "/api/admin/trigger-expiry-check",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });
        const { checkSubscriptionExpiry } = await import(
          "./subscriptionExpiry"
        );
        await checkSubscriptionExpiry();
        res.json({ message: "Expiry check completed successfully" });
      } catch (error: any) {
        res.status(500).json({ message: "Failed", error: error.message });
      }
    },
  );
  // Admin: Get all invoices
  app.get("/api/admin/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || !userHasRole(user, "admin"))
        return res.status(403).json({ message: "Admin only" });

      const allInvoices = await db
        .select()
        .from(invoices)
        .orderBy(desc(invoices.createdAt));
      res.json(allInvoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Admin + Owner: Download invoice PDF
  app.get(
    "/api/invoices/:id/download",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        const [invoice] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, req.params.id));

        if (!invoice)
          return res.status(404).json({ message: "Invoice not found" });

        // Allow admin or the invoice owner
        if (!userHasRole(user, "admin") && invoice.ownerId !== userId)
          return res.status(403).json({ message: "Not authorized" });

        const { generateInvoicePDF } = await import("./invoiceService");
        const pdfBuffer = await generateInvoicePDF(req.params.id);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
        );
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Invoice download error:", error);
        res.status(500).json({ message: "Failed to generate invoice" });
      }
    },
  );

  // Admin: Send invoice PDF by email (with optional custom recipient email)
  app.post(
    "/api/admin/invoices/:id/send-email",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const { email } = req.body;
        if (!email || typeof email !== "string") {
          return res
            .status(400)
            .json({ message: "Recipient email is required" });
        }

        const [invoice] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, req.params.id));

        if (!invoice) {
          return res.status(404).json({ message: "Invoice not found" });
        }

        const { generateInvoicePDF } = await import("./invoiceService");
        const pdfBuffer = await generateInvoicePDF(req.params.id);

        const { sendInvoiceEmail } = await import("./emailService");
        const sent = await sendInvoiceEmail(
          email.trim().toLowerCase(),
          invoice.ownerName,
          invoice.invoiceNumber,
          invoice.planName,
          String(invoice.totalAmount),
          pdfBuffer,
        );

        if (!sent) {
          return res.status(500).json({
            message: "Failed to send invoice email. Please try again.",
          });
        }

        res.json({ message: "Invoice sent successfully" });
      } catch (error) {
        console.error("Invoice send email error:", error);
        res.status(500).json({ message: "Failed to send invoice" });
      }
    },
  );

  // Owner: Get my invoices
  app.get("/api/owner/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const myInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.ownerId, userId))
        .orderBy(desc(invoices.createdAt));
      res.json(myInvoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });
  // ─── Referral Routes ───────────────────────────p��────────────────────
  app.get("/api/referral/my-code", isAuthenticated, async (req: any, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Unauthorized" });
    const userId = req.user.claims.sub;
    try {
      let referral = await db
        .select()
        .from(ownerReferrals)
        .where(eq(ownerReferrals.referrerId, userId))
        .limit(1);

      if (referral.length === 0) {
        const code =
          "ZC" + Math.random().toString(36).substring(2, 6).toUpperCase();
        const [newReferral] = await db
          .insert(ownerReferrals)
          .values({ referrerId: userId, referralCode: code })
          .returning();
        referral = [newReferral];
      }

      const stats = await db
        .select()
        .from(ownerReferrals)
        .where(eq(ownerReferrals.referrerId, userId));

      const totalReferred = stats.filter((r) => r.refereeId).length;
      const totalSubscribed = stats.filter(
        (r) => r.status === "subscribed" || r.status === "rewarded",
      ).length;
      const totalMonthsEarned = stats
        .filter((r) => r.status === "rewarded")
        .reduce((sum, r) => sum + r.rewardMonths, 0);

      res.json({
        referralCode: referral[0].referralCode,
        referralLink: `https://www.zecoho.com/list-property?ref=${referral[0].referralCode}`,
        stats: { totalReferred, totalSubscribed, totalMonthsEarned },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get referral code" });
    }
  });

  app.post("/api/referral/apply", async (req: any, res) => {
    const { referralCode, newOwnerId } = req.body;
    if (!referralCode || !newOwnerId)
      return res.status(400).json({ message: "Missing fields" });
    try {
      const [referral] = await db
        .select()
        .from(ownerReferrals)
        .where(eq(ownerReferrals.referralCode, referralCode))
        .limit(1);

      if (!referral)
        return res.status(404).json({ message: "Invalid referral code" });
      if (referral.refereeId)
        return res.status(400).json({ message: "Code already used" });

      await db
        .update(ownerReferrals)
        .set({ refereeId: newOwnerId, status: "signed_up" })
        .where(eq(ownerReferrals.referralCode, referralCode));

      res.json({ message: "Referral applied" });
    } catch (error) {
      res.status(500).json({ message: "Failed to apply referral" });
    }
  });

  app.post("/api/referral/reward", async (req: any, res) => {
    const { refereeId } = req.body;
    if (!refereeId)
      return res.status(400).json({ message: "Missing refereeId" });
    try {
      const [referral] = await db
        .select()
        .from(ownerReferrals)
        .where(
          and(
            eq(ownerReferrals.refereeId, refereeId),
            eq(ownerReferrals.status, "signed_up"),
          ),
        )
        .limit(1);

      if (!referral) return res.json({ message: "No pending referral found" });

      // Generate a unique reward code for the referrer
      const rewardCode =
        "ZREF" + Math.random().toString(36).substring(2, 8).toUpperCase();

      await db
        .update(ownerReferrals)
        .set({ status: "rewarded", rewardedAt: new Date(), rewardCode })
        .where(eq(ownerReferrals.id, referral.id));

      // Notify referrer via WebSocket
      broadcastToUser(referral.referrerId, {
        type: "referral_reward",
        message: `Your referral has subscribed! Use code ${rewardCode} to claim 1 free month on your next subscription renewal.`,
        rewardCode,
      });

      res.json({
        message: "Referral rewarded — reward code issued",
        rewardCode,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process reward" });
    }
  });

  // Referrer redeems reward code for 1 free month
  app.post("/api/referral/redeem", isAuthenticated, async (req: any, res) => {
    const ownerId = req.user.claims.sub;
    const { rewardCode } = req.body;
    if (!rewardCode)
      return res.status(400).json({ message: "Missing reward code" });
    try {
      const [referral] = await db
        .select()
        .from(ownerReferrals)
        .where(
          and(
            eq(ownerReferrals.rewardCode, rewardCode.trim().toUpperCase()),
            eq(ownerReferrals.referrerId, ownerId),
            eq(ownerReferrals.status, "rewarded"),
          ),
        )
        .limit(1);

      if (!referral)
        return res
          .status(404)
          .json({ message: "Invalid or already used reward code" });
      if (referral.rewardRedeemedAt)
        return res
          .status(400)
          .json({ message: "Reward code already redeemed" });

      // Get referrer's last subscription to know which plan to use
      const [lastSub] = await db
        .select()
        .from(ownerSubscriptions)
        .where(eq(ownerSubscriptions.ownerId, ownerId))
        .orderBy(desc(ownerSubscriptions.createdAt))
        .limit(1);

      if (!lastSub)
        return res.status(400).json({
          message: "No previous subscription found. Please subscribe first.",
        });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      // Create a free 1-month subscription on the same plan
      const freeSub = await storage.createOwnerSubscription({
        ownerId,
        planId: lastSub.planId,
        tier: lastSub.tier,
        duration: "monthly",
        pricePaid: "0",
        status: "active",
        startDate,
        endDate,
        isWaived: true,
        activationNote: `Referral reward — code ${rewardCode}`,
      });

      // Mark the reward code as redeemed
      await db
        .update(ownerReferrals)
        .set({ rewardRedeemedAt: new Date() })
        .where(eq(ownerReferrals.id, referral.id));

      res.json({
        message: "Reward redeemed! 1 free month activated.",
        subscription: freeSub,
      });
    } catch (error) {
      console.error("Referral redeem error:", error);
      res.status(500).json({ message: "Failed to redeem reward code" });
    }
  });

  // Validate reward code (owner checks if their code is usable)
  app.get(
    "/api/referral/my-rewards",
    isAuthenticated,
    async (req: any, res) => {
      const ownerId = req.user.claims.sub;
      try {
        const rewards = await db
          .select()
          .from(ownerReferrals)
          .where(
            and(
              eq(ownerReferrals.referrerId, ownerId),
              eq(ownerReferrals.status, "rewarded"),
            ),
          );
        res.json(
          rewards.map((r) => ({
            rewardCode: r.rewardCode,
            rewardedAt: r.rewardedAt,
            rewardRedeemedAt: r.rewardRedeemedAt,
            rewardMonths: r.rewardMonths,
          })),
        );
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch rewards" });
      }
    },
  );

  // Admin — all referrals
  app.get("/api/admin/referrals", isAuthenticated, async (req: any, res) => {
    if (req.user.claims.userRole !== "admin")
      return res.status(403).json({ message: "Forbidden" });
    try {
      const referrals = await db
        .select()
        .from(ownerReferrals)
        .orderBy(desc(ownerReferrals.createdAt));
      // Enrich with user names
      const enriched = await Promise.all(
        referrals.map(async (r) => {
          const referrer = r.referrerId
            ? await storage.getUser(r.referrerId)
            : null;
          const referee = r.refereeId
            ? await storage.getUser(r.refereeId)
            : null;
          return {
            id: r.id,
            referralCode: r.referralCode,
            status: r.status,
            rewardCode: r.rewardCode,
            rewardMonths: r.rewardMonths,
            rewardedAt: r.rewardedAt,
            rewardRedeemedAt: r.rewardRedeemedAt,
            createdAt: r.createdAt,
            referrer: referrer
              ? {
                  name: `${referrer.firstName || ""} ${referrer.lastName || ""}`.trim(),
                  email: referrer.email,
                  phone: referrer.phone,
                }
              : null,
            referee: referee
              ? {
                  name: `${referee.firstName || ""} ${referee.lastName || ""}`.trim(),
                  email: referee.email,
                  phone: referee.phone,
                }
              : null,
          };
        }),
      );
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // Admin — CSV export of referrals
  app.get(
    "/api/admin/referrals/export",
    isAuthenticated,
    async (req: any, res) => {
      if (req.user.claims.userRole !== "admin")
        return res.status(403).json({ message: "Forbidden" });
      try {
        const referrals = await db
          .select()
          .from(ownerReferrals)
          .orderBy(desc(ownerReferrals.createdAt));
        const rows = await Promise.all(
          referrals.map(async (r) => {
            const referrer = r.referrerId
              ? await storage.getUser(r.referrerId)
              : null;
            const referee = r.refereeId
              ? await storage.getUser(r.refereeId)
              : null;
            return [
              r.referralCode,
              referrer
                ? `${referrer.firstName || ""} ${referrer.lastName || ""}`.trim()
                : "",
              referrer?.email || "",
              referrer?.phone || "",
              referee
                ? `${referee.firstName || ""} ${referee.lastName || ""}`.trim()
                : "",
              referee?.email || "",
              referee?.phone || "",
              r.status,
              r.rewardCode || "",
              r.rewardMonths,
              r.rewardedAt
                ? new Date(r.rewardedAt).toLocaleDateString("en-IN")
                : "",
              r.rewardRedeemedAt
                ? new Date(r.rewardRedeemedAt).toLocaleDateString("en-IN")
                : "",
              r.createdAt
                ? new Date(r.createdAt).toLocaleDateString("en-IN")
                : "",
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(",");
          }),
        );
        const header = [
          "Referral Code",
          "Referrer Name",
          "Referrer Email",
          "Referrer Phone",
          "Referee Name",
          "Referee Email",
          "Referee Phone",
          "Status",
          "Reward Code",
          "Reward Months",
          "Rewarded At",
          "Reward Redeemed At",
          "Created At",
        ].join(",");
        const csv = [header, ...rows].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="zecoho-referrals-${new Date().toISOString().slice(0, 10)}.csv"`,
        );
        res.send(csv);
      } catch (error) {
        res.status(500).json({ message: "Failed to export referrals" });
      }
    },
  );

  app.get("/api/referral/validate/:code", async (req: any, res) => {
    try {
      const [referral] = await db
        .select()
        .from(ownerReferrals)
        .where(eq(ownerReferrals.referralCode, req.params.code))
        .limit(1);

      if (!referral) return res.status(404).json({ valid: false });
      res.json({ valid: true, referralCode: referral.referralCode });
    } catch (error) {
      res.status(500).json({ valid: false });
    }
  });

  // ==================== OWNER DASHBOARD ROUTES ====================
  // ==================== OWNER DASHBOARD ROUTES ====================

  // Get owner dashboard stats (KPIs)
  app.get("/api/owner/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "owner")) {
        return res
          .status(403)
          .json({ message: "Only owners can access dashboard" });
      }

      // Get owner's properties
      const properties = await storage.getOwnerProperties(userId);

      if (properties.length === 0) {
        return res.json({
          bookingsToday: 0,
          bookingsThisMonth: 0,
          revenueToday: 0,
          revenueThisMonth: 0,
          propertyStatus: "none",
          avgRating: 0,
          reviewCount: 0,
          properties: [],
        });
      }

      const propertyIds = properties.map((p) => p.id);

      // Get all bookings for owner's properties - SINGLE SOURCE OF TRUTH
      const allBookings = await storage.getBookingsForProperties(propertyIds);

      // Create a map of propertyId to property for timezone lookup
      const propertyMap = new Map(properties.map((p) => [p.id, p]));

      // Default timezone for Indian properties (fallback when property has no timezone)
      const DEFAULT_TIMEZONE = "Asia/Kolkata";

      // Helper function to get property timezone (fallback to IST)
      // Note: Properties table currently doesn't have a timezone column, so always falls back to IST
      const getPropertyTimezone = (propertyId: string): string => {
        const property = propertyMap.get(propertyId);
        // Future: return (property as any)?.timezone || DEFAULT_TIMEZONE;
        return DEFAULT_TIMEZONE;
      };

      // Helper function to get timezone-safe date string (YYYY-MM-DD)
      const getLocalDateString = (date: Date, timezone: string): string => {
        try {
          return date.toLocaleDateString("en-CA", { timeZone: timezone });
        } catch {
          return date.toLocaleDateString("en-CA", {
            timeZone: DEFAULT_TIMEZONE,
          });
        }
      };

      // Get current timestamp for timezone conversions
      const now = new Date();

      // Calculate KPIs
      let bookingsToday = 0;
      let bookingsThisMonth = 0;
      let revenueToday = 0;
      let revenueThisMonth = 0;

      // Action-focused counts from bookings table
      let pendingRequests = 0;
      let ongoingStays = 0;
      let todaysCheckIns = 0;
      let todaysCheckOuts = 0;

      // Monthly summary breakdown - all from bookings table
      const monthlySummary = {
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        rejected: 0,
        noShow: 0,
        pending: 0,
        totalRevenue: 0,
      };

      for (const booking of allBookings) {
        // Get property-specific timezone for this booking (fallback to IST)
        const propertyTimezone = getPropertyTimezone(booking.propertyId);

        // Get timezone-safe date strings for booking dates using property timezone
        const checkInDateStr = getLocalDateString(
          new Date(booking.checkIn),
          propertyTimezone,
        );
        const checkOutDateStr = getLocalDateString(
          new Date(booking.checkOut),
          propertyTimezone,
        );
        const createdAtStr = booking.createdAt
          ? getLocalDateString(new Date(booking.createdAt), propertyTimezone)
          : checkInDateStr;

        // Get today string in property's timezone for comparison
        const propertyTodayStr = getLocalDateString(now, propertyTimezone);

        // Count pending requests: status = 'pending' (excludes cancelled/rejected by definition)
        if (booking.status === "pending") {
          pendingRequests++;
        }

        // Count ongoing stays: status = 'checked_in' (no checkOutTime means still in property)
        // Note: checked_in status implies guest is still in property; checked_out/completed means they left
        if (booking.status === "checked_in") {
          ongoingStays++;
        }

        // Count today's check-ins: check_in_date = today, status = 'confirmed' OR 'customer_confirmed'
        // These are guests expected to arrive today (owner-confirmed or guest-confirmed, not cancelled/no_show)
        if (
          (booking.status === "confirmed" ||
            booking.status === "customer_confirmed") &&
          checkInDateStr === propertyTodayStr
        ) {
          todaysCheckIns++;
        }

        // Count today's check-outs: check_out_date = today, status = 'checked_in'
        // These are guests who should depart today
        if (
          booking.status === "checked_in" &&
          checkOutDateStr === propertyTodayStr
        ) {
          todaysCheckOuts++;
        }

        // Calculate property-specific month boundaries based on createdAt
        const [propYear, propMonth] = propertyTodayStr.split("-").map(Number);
        const propStartOfMonthStr = `${propYear}-${String(propMonth).padStart(2, "0")}-01`;
        const propLastDayOfMonth = new Date(propYear, propMonth, 0).getDate();
        const propEndOfMonthStr = `${propYear}-${String(propMonth).padStart(2, "0")}-${String(propLastDayOfMonth).padStart(2, "0")}`;

        // Monthly summary: based on booking.createdAt month (when the booking was made)
        if (
          createdAtStr >= propStartOfMonthStr &&
          createdAtStr <= propEndOfMonthStr
        ) {
          const price = parseFloat(booking.totalPrice as string) || 0;
          switch (booking.status) {
            case "confirmed":
            case "customer_confirmed":
            case "checked_in":
              // Confirmed = owner accepted (includes ongoing stays)
              monthlySummary.confirmed++;
              break;
            case "completed":
            case "checked_out":
              // Completed = guest finished their stay
              monthlySummary.completed++;
              break;
            case "cancelled":
              monthlySummary.cancelled++;
              break;
            case "rejected":
              monthlySummary.rejected++;
              break;
            case "no_show":
              monthlySummary.noShow++;
              break;
            case "pending":
              monthlySummary.pending++;
              break;
          }

          // Total revenue: sum totalPrice for completed/checked_in bookings only (confirmed revenue)
          // Excludes cancelled, no_show, rejected, and pending bookings
          if (
            booking.status === "completed" ||
            booking.status === "checked_out"
          ) {
            monthlySummary.totalRevenue += price;
          }
        }

        // Revenue calculations for active bookings (using property timezone)
        if (
          booking.status === "completed" ||
          booking.status === "checked_out"
        ) {
          const price = parseFloat(booking.totalPrice as string) || 0;
          if (createdAtStr === propertyTodayStr) {
            bookingsToday++;
            revenueToday += price;
          }
          if (createdAtStr >= propStartOfMonthStr) {
            bookingsThisMonth++;
            revenueThisMonth += price;
          }
        }
      }

      // Check for alerts
      const alerts: { type: string; message: string; link: string }[] = [];

      for (const prop of properties) {
        // Location incomplete check
        if (!prop.latitude || !prop.longitude) {
          alerts.push({
            type: "location",
            message: `"${prop.title}" is missing location coordinates`,
            link: `/owner/property/${prop.id}?tab=location`,
          });
        }

        // Check for room types (inventory)
        const roomTypes = await storage.getRoomTypes(prop.id);
        if (roomTypes.length === 0 && prop.status === "published") {
          alerts.push({
            type: "inventory",
            message: `"${prop.title}" has no room types configured`,
            link: `/owner/property/${prop.id}?tab=rooms`,
          });
        }
      }

      // KYC pending check
      if (user.kycStatus !== "verified") {
        alerts.push({
          type: "kyc",
          message:
            user.kycStatus === "pending"
              ? "Your KYC verification is pending review"
              : user.kycStatus === "rejected"
                ? "Your KYC was rejected - please resubmit"
                : "Complete KYC to receive bookings",
          link: "/owner/kyc",
        });
      }

      // Property status - prioritize the "best" status across all properties
      // Priority: published > paused > pending > draft > rejected > deactivated
      const statusPriority: Record<string, number> = {
        published: 6,
        paused: 5,
        pending: 4,
        draft: 3,
        rejected: 2,
        deactivated: 1,
      };

      let propertyStatus = "draft";
      let highestPriority = 0;
      for (const prop of properties) {
        const priority = statusPriority[prop.status || "draft"] || 0;
        if (priority > highestPriority) {
          highestPriority = priority;
          propertyStatus = prop.status || "draft";
        }
      }

      // Calculate average rating across all properties
      let totalRating = 0;
      let totalReviews = 0;
      for (const prop of properties) {
        totalRating +=
          (parseFloat(prop.rating as string) || 0) * (prop.reviewCount || 0);
        totalReviews += prop.reviewCount || 0;
      }
      const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;

      res.json({
        bookingsToday,
        bookingsThisMonth,
        revenueToday,
        revenueThisMonth,
        propertyStatus,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: totalReviews,
        properties: properties.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          pricePerNight: p.pricePerNight,
        })),
        // NEW: Action-focused stats
        pendingRequests,
        ongoingStays,
        todaysCheckIns,
        todaysCheckOuts,
        monthlySummary,
        alerts,
      });
    } catch (error) {
      console.error("Error fetching owner stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get monthly booking summary with month selection
  app.get(
    "/api/owner/monthly-summary",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can access monthly summary" });
        }

        // Get year and month from query params (default to current month)
        const DEFAULT_TIMEZONE = "Asia/Kolkata";
        const now = new Date();
        const nowInIST = new Date(
          now.toLocaleString("en-US", { timeZone: DEFAULT_TIMEZONE }),
        );

        const year =
          parseInt(req.query.year as string) || nowInIST.getFullYear();
        const month =
          parseInt(req.query.month as string) || nowInIST.getMonth() + 1; // 1-indexed

        // Get all properties for this owner
        const properties = await storage.getOwnerProperties(userId);

        if (properties.length === 0) {
          return res.json({
            year,
            month,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            rejected: 0,
            noShow: 0,
            pending: 0,
            totalRevenue: 0,
          });
        }

        // Get all bookings for owner's properties
        const propertyIds = properties.map((p) => p.id);
        const allBookings = await storage.getBookingsForProperties(propertyIds);

        // Calculate month boundaries (IST timezone-safe)
        const startOfMonthStr = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const endOfMonthStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

        // Helper function to get timezone-safe date string (YYYY-MM-DD)
        const getLocalDateString = (date: Date, timezone: string): string => {
          try {
            return date.toLocaleDateString("en-CA", { timeZone: timezone });
          } catch {
            return date.toLocaleDateString("en-CA", {
              timeZone: DEFAULT_TIMEZONE,
            });
          }
        };

        // Monthly summary breakdown
        const monthlySummary = {
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          rejected: 0,
          noShow: 0,
          pending: 0,
          totalRevenue: 0,
        };

        for (const booking of allBookings) {
          // Use check-in date for determining which month the booking belongs to
          // This is more intuitive for owners - "bookings in January" = stays happening in January
          const checkInDateStr = getLocalDateString(
            new Date(booking.checkIn),
            DEFAULT_TIMEZONE,
          );
          const checkOutDateStr = getLocalDateString(
            new Date(booking.checkOut),
            DEFAULT_TIMEZONE,
          );

          // Check if booking overlaps with the selected month
          // A booking is in this month if: checkIn <= endOfMonth AND checkOut >= startOfMonth
          const isInMonth =
            checkInDateStr <= endOfMonthStr &&
            checkOutDateStr >= startOfMonthStr;

          if (!isInMonth) continue;

          const price = parseFloat(booking.totalPrice as string) || 0;

          // Categorize by status
          switch (booking.status) {
            case "confirmed":
            case "customer_confirmed":
            case "checked_in":
              // Confirmed = owner accepted (includes ongoing stays)
              monthlySummary.confirmed++;
              break;
            case "completed":
            case "checked_out":
              // Completed = guest finished their stay
              monthlySummary.completed++;
              break;
            case "cancelled":
              monthlySummary.cancelled++;
              break;
            case "rejected":
              monthlySummary.rejected++;
              break;
            case "no_show":
              monthlySummary.noShow++;
              break;
            case "pending":
              monthlySummary.pending++;
              break;
          }

          // Also count as completed if checked_out_at is set (regardless of status)
          if (
            (booking as any).checkedOutAt &&
            booking.status !== "completed" &&
            booking.status !== "checked_out"
          ) {
            // Already counted above if status is completed/checked_out, so only count if different status
            // This handles edge case where checked_out_at is set but status wasn't updated
          }

          // Total revenue: sum totalPrice for completed/checked_in bookings only (confirmed revenue)
          if (
            booking.status === "completed" ||
            booking.status === "checked_out" ||
            booking.status === "checked_in"
          ) {
            monthlySummary.totalRevenue += price;
          }
        }

        res.json({
          year,
          month,
          ...monthlySummary,
        });
      } catch (error) {
        console.error("Error fetching monthly summary:", error);
        res.status(500).json({ message: "Failed to fetch monthly summary" });
      }
    },
  );

  // Get property view counts for owner's properties (analytics)
  app.get(
    "/api/owner/analytics/views",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can access analytics" });
        }
        const days = parseInt(req.query.days as string) || 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const ownerProps = await storage.getOwnerProperties(userId);
        if (ownerProps.length === 0)
          return res.json({ properties: [], totalViews: 0 });

        const propertyIds = ownerProps.map((p: any) => p.id);

        const viewRows = await db
          .select({
            propertyId: propertyViews.propertyId,
            count: sql<number>`count(*)::int`,
          })
          .from(propertyViews)
          .where(
            and(
              inArray(propertyViews.propertyId, propertyIds),
              gte(propertyViews.createdAt, since),
            ),
          )
          .groupBy(propertyViews.propertyId);

        const viewMap = new Map(
          viewRows.map((r: any) => [r.propertyId, r.count]),
        );
        const result = ownerProps.map((p: any) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          views: viewMap.get(p.id) ?? 0,
        }));
        const totalViews = result.reduce(
          (sum: number, p: any) => sum + p.views,
          0,
        );
        res.json({ properties: result, totalViews, days });
      } catch (error) {
        console.error("Error fetching analytics views:", error);
        res.status(500).json({ message: "Failed to fetch analytics" });
      }
    },
  );

  // Get room utilization for owner's property
  app.get(
    "/api/owner/properties/:propertyId/utilization",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can view room utilization" });
        }

        const { propertyId } = req.params;
        const { startDate, endDate } = req.query;

        // Verify owner owns this property
        const property = await storage.getProperty(propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "You don't own this property" });
        }

        // Default date range: today through 30 days from now
        const start = startDate ? new Date(startDate as string) : new Date();
        const end = endDate
          ? new Date(endDate as string)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const utilization = await storage.getRoomUtilization(
          propertyId,
          start,
          end,
        );

        res.json({
          propertyId,
          propertyTitle: property.title,
          dateRange: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
          roomTypes: utilization,
        });
      } catch (error) {
        console.error("Error fetching room utilization:", error);
        res.status(500).json({ message: "Failed to fetch room utilization" });
      }
    },
  );

  // Get date-wise room utilization for a specific room type
  app.get(
    "/api/owner/properties/:propertyId/rooms/:roomTypeId/utilization",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can view room utilization" });
        }

        const { propertyId, roomTypeId } = req.params;
        const { startDate, endDate } = req.query;

        // Verify owner owns this property
        const property = await storage.getProperty(propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "You don't own this property" });
        }

        // Default date range: today through 30 days from now
        const start = startDate ? new Date(startDate as string) : new Date();
        const end = endDate
          ? new Date(endDate as string)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const utilization = await storage.getRoomUtilizationByDate(
          propertyId,
          roomTypeId,
          start,
          end,
        );

        res.json({
          propertyId,
          roomTypeId,
          dateRange: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
          dates: utilization,
        });
      } catch (error) {
        console.error("Error fetching date-wise room utilization:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch date-wise room utilization" });
      }
    },
  );

  // Get owner's bookings with filters
  app.get("/api/owner/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "owner")) {
        return res
          .status(403)
          .json({ message: "Only owners can access bookings" });
      }

      const { filter } = req.query; // upcoming, ongoing, past, all

      // Get owner's properties
      const properties = await storage.getOwnerProperties(userId);
      const propertyIds = properties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return res.json([]);
      }

      // Get bookings for owner's properties
      const bookings = await storage.getBookingsForProperties(propertyIds);

      const now = new Date();
      let filteredBookings = bookings;

      if (filter === "upcoming") {
        filteredBookings = bookings.filter(
          (b) =>
            new Date(b.checkIn) > now &&
            (b.status === "confirmed" || b.status === "pending"),
        );
      } else if (filter === "ongoing") {
        filteredBookings = bookings.filter(
          (b) =>
            new Date(b.checkIn) <= now &&
            new Date(b.checkOut) >= now &&
            b.status === "confirmed",
        );
      } else if (filter === "past") {
        filteredBookings = bookings.filter(
          (b) =>
            new Date(b.checkOut) < now ||
            b.status === "completed" ||
            b.status === "cancelled",
        );
      }

      // Enrich with property, guest, room type and meal option info
      const enrichedBookings = await Promise.all(
        filteredBookings.map(async (booking) => {
          const property = properties.find((p) => p.id === booking.propertyId);
          const guest = await storage.getUser(booking.guestId);

          // Fetch room type and meal option if present
          let roomType = null;
          let roomOption = null;

          if (booking.roomTypeId) {
            const rt = await storage.getRoomType(booking.roomTypeId);
            if (rt) {
              roomType = { id: rt.id, name: rt.name, basePrice: rt.basePrice };
            }
          }

          if (booking.roomOptionId) {
            const ro = await storage.getRoomOption(booking.roomOptionId);
            if (ro) {
              roomOption = {
                id: ro.id,
                name: ro.name,
                priceAdjustment: ro.priceAdjustment,
              };
            }
          }

          return {
            ...booking,
            property: property
              ? {
                  id: property.id,
                  title: property.title,
                  images: property.images,
                }
              : null,
            guest: guest
              ? {
                  id: guest.id,
                  name:
                    `${guest.firstName || ""} ${guest.lastName || ""}`.trim() ||
                    "Guest",
                  email: guest.email,
                  phone: guest.phone,
                }
              : null,
            roomType,
            roomOption,
          };
        }),
      );

      res.json(enrichedBookings);
    } catch (error) {
      console.error("Error fetching owner bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Update booking status (owner)
  app.patch(
    "/api/owner/bookings/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can update bookings" });
        }

        const { status, responseMessage } = req.body;
        if (
          !["confirmed", "rejected", "cancelled", "completed"].includes(status)
        ) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Verify owner owns the property
        const property = await storage.getProperty(booking.propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this booking" });
        }

        // Only allow status change from pending state (for confirmed/rejected)
        if (
          booking.status !== "pending" &&
          (status === "confirmed" || status === "rejected")
        ) {
          return res
            .status(400)
            .json({ message: "Can only accept/reject pending bookings" });
        }

        // Auto-advance confirmed → customer_confirmed (skip guest confirmation step)
        const finalStatus =
          status === "confirmed" ? "customer_confirmed" : status;
        const updated = await storage.updateBookingStatus(
          req.params.id,
          finalStatus,
          responseMessage,
        );

        // Get guest info for notification
        const guest = await storage.getUser(booking.guestId);

        // Send a booking update message to the conversation
        try {
          const conversation = await storage.getOrCreateConversation(
            booking.propertyId,
            booking.guestId,
          );

          const updateMessage =
            status === "confirmed"
              ? "I've accepted your booking request. Looking forward to hosting you!"
              : status === "rejected"
                ? `I'm sorry, I cannot accept this booking${responseMessage ? `: ${responseMessage}` : ". Please feel free to check other dates or properties."}`
                : `Booking status updated to ${status}.`;

          const message = await storage.createMessage({
            conversationId: conversation.id,
            senderId: userId,
            content: updateMessage,
            messageType: "booking_update",
            bookingId: booking.id,
          });

          // Broadcast the update message to both parties
          const messageWithSender = {
            ...message,
            sender: {
              id: userId,
              firstName: user?.firstName || null,
              lastName: user?.lastName || null,
              profileImageUrl: user?.profileImageUrl || null,
            },
          };

          const broadcastData = {
            type: "new_message",
            conversationId: conversation.id,
            message: messageWithSender,
          };

          broadcastToUser(booking.guestId, broadcastData);
          broadcastToUser(userId, broadcastData);
        } catch (msgError) {
          console.error("Failed to send booking update message:", msgError);
        }

        // Broadcast status update via WebSocket if available
        if (wss && guest) {
          const statusMessage =
            status === "confirmed"
              ? `Your booking for ${property.title} has been confirmed!`
              : status === "rejected"
                ? `Your booking request for ${property.title} was declined. ${responseMessage ? `Reason: ${responseMessage}` : ""}`
                : `Your booking status for ${property.title} has been updated to ${status}.`;

          const notification = {
            type: "booking_status_update",
            bookingId: booking.id,
            status,
            message: statusMessage,
            propertyTitle: property.title,
            responseMessage: responseMessage || null,
          };

          broadcastToUser(guest.id, notification);
        }

        // Create in-app notification for guest about booking status change
        if (status === "confirmed") {
          createNotification({
            userId: booking.guestId,
            title: "Booking Accepted",
            body: `Your booking at ${property.title} has been confirmed! You're all set.`,
            type: "booking_confirmed",
            entityId: booking.id,
            entityType: "booking",
          })
            .then(() =>
              broadcastToUser(booking.guestId, { type: "notification_update" }),
            )
            .catch(console.error);
        } else if (status === "rejected") {
          createNotification({
            userId: booking.guestId,
            title: "Booking Declined",
            body: `Your booking request at ${property.title} was declined.${responseMessage ? ` Reason: ${responseMessage}` : ""}`,
            type: "booking_cancelled",
            entityId: booking.id,
            entityType: "booking",
          })
            .then(() =>
              broadcastToUser(booking.guestId, { type: "notification_update" }),
            )
            .catch(console.error);
        }

        // Send push notification to guest about booking status
        try {
          const { sendBookingPush } = require("./services/pushService");
          if (status === "confirmed") {
            await sendBookingPush(
              booking.guestId,
              "booking_confirmed",
              property.title,
              booking.id,
            );
          } else if (status === "rejected") {
            await sendBookingPush(
              booking.guestId,
              "booking_rejected",
              property.title,
              booking.id,
            );
          } else if (status === "cancelled") {
            await sendBookingPush(
              booking.guestId,
              "booking_cancelled",
              property.title,
              booking.id,
            );
          }
        } catch (pushError) {
          console.error(
            "Failed to send booking status push notification:",
            pushError,
          );
        }

        // STATE-DRIVEN EMAILS: Send appropriate emails based on new status
        if (guest?.email) {
          const checkInFormatted = new Date(booking.checkIn).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" },
          );
          const checkOutFormatted = new Date(
            booking.checkOut,
          ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const bookingCreatedAtFormatted = booking.bookingCreatedAt
            ? new Date(booking.bookingCreatedAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata",
              })
            : undefined;

          // Get room type details for email
          let roomTypeName: string | undefined;
          let roomTypeDescription: string | undefined;
          let roomBasePrice: string | undefined;
          let roomOriginalPrice: string | undefined;
          let mealOptionName: string | undefined;
          let mealOptionPrice: string | undefined;
          if (booking.roomTypeId) {
            const roomTypeForEmail = await storage.getRoomType(
              booking.roomTypeId,
            );
            if (roomTypeForEmail) {
              roomTypeName = roomTypeForEmail.name;
              roomTypeDescription = roomTypeForEmail.description || undefined;
              roomBasePrice = roomTypeForEmail.basePrice;
              if (
                roomTypeForEmail.originalPrice &&
                parseFloat(roomTypeForEmail.originalPrice) >
                  parseFloat(roomTypeForEmail.basePrice)
              ) {
                roomOriginalPrice = roomTypeForEmail.originalPrice;
              }
            }
          }
          // Get meal option details for email (per-person pricing)
          if (booking.roomOptionId) {
            const mealOptionForEmail = await storage.getRoomOption(
              booking.roomOptionId,
            );
            if (mealOptionForEmail) {
              mealOptionName = mealOptionForEmail.name;
              mealOptionPrice = mealOptionForEmail.priceAdjustment;
            }
          }

          // Build full property address
          const propertyAddressParts = [
            property.propFlatNo,
            property.propHouseNo,
            property.propStreetAddress,
            property.propLandmark,
            property.propLocality,
          ].filter(Boolean);
          const propertyAddress =
            propertyAddressParts.length > 0
              ? propertyAddressParts.join(", ")
              : property.address || undefined;

          const bookingEmailData = {
            bookingCode:
              booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
            propertyName: property.title,
            propertyId: property.id,
            checkIn: checkInFormatted,
            checkOut: checkOutFormatted,
            guests: booking.guests || 1,
            rooms: booking.rooms || 1,
            totalPrice: booking.totalPrice?.toString() || "0",
            bookingCreatedAt: bookingCreatedAtFormatted,
            // Extended property details
            propertyAddress,
            propertyCity:
              property.propCity || property.destination || undefined,
            propertyState: property.propState || undefined,
            propertyPincode: property.propPincode || undefined,
            latitude: property.latitude?.toString() || undefined,
            longitude: property.longitude?.toString() || undefined,
            // Room details
            roomTypeName,
            roomTypeDescription,
            // Pricing details for strikethrough display
            roomBasePrice,
            roomOriginalPrice,
            // Payment type
            paymentType: "pay_at_hotel",
            // Meal option details (per-person pricing)
            mealOptionName,
            mealOptionPrice,
          };

          if (status === "confirmed") {
            const owner = await storage.getUser(property.ownerId);
            const ownerDisplayName =
              owner?.firstName && owner?.lastName
                ? `${owner.firstName} ${owner.lastName}`
                : owner?.firstName || undefined;

            const acceptedEmailData = {
              ...bookingEmailData,
              checkInTime: property.checkInTime || undefined,
              checkOutTime: property.checkOutTime || undefined,
              ownerName: ownerDisplayName,
            };

            // Owner just accepted — send the booking-confirmed email to the guest.
            // Skip if the booking was already past pending (avoid duplicate sends on retry).
            if (booking.status !== "customer_confirmed") {
              sendBookingOwnerAcceptedEmail(
                guest.email,
                guest.firstName || "",
                acceptedEmailData,
                responseMessage,
              ).catch(console.error);
            }

            // Owner-side confirmation email (kept on the existing template)
            if (owner?.email) {
              sendBookingConfirmedOwnerEmail(
                owner.email,
                owner.firstName || "",
                bookingEmailData,
              ).catch(console.error);
            }
          } else if (status === "rejected") {
            sendBookingDeclinedEmail(
              guest.email,
              guest.firstName || "",
              bookingEmailData,
              "rejected",
              responseMessage,
            ).catch(console.error);
          }
        }

        res.json(updated);
      } catch (error) {
        console.error("Error updating booking status:", error);
        res.status(500).json({ message: "Failed to update booking" });
      }
    },
  );

  // Mark booking as checked-in (owner only)
  app.patch(
    "/api/owner/bookings/:id/check-in",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can mark check-in" });
        }

        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Verify owner owns the property
        const property = await storage.getProperty(booking.propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this booking" });
        }

        // Only allow check-in from confirmed or customer_confirmed status
        if (
          booking.status !== "confirmed" &&
          booking.status !== "customer_confirmed"
        ) {
          return res
            .status(400)
            .json({ message: "Can only check-in confirmed bookings" });
        }

        // Verify check-in date has arrived (current date >= check-in date)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDate = new Date(booking.checkIn);
        checkInDate.setHours(0, 0, 0, 0);

        if (today < checkInDate) {
          return res.status(400).json({
            message: "Cannot check-in before the scheduled check-in date",
          });
        }

        const updated = await storage.markCheckedIn(req.params.id, userId);

        // Notify guest via WebSocket
        const guest = await storage.getUser(booking.guestId);
        if (wss && guest) {
          const notification = {
            type: "booking_status_update",
            bookingId: booking.id,
            status: "checked_in",
            message: `You have been checked in at ${property.title}. Enjoy your stay!`,
            propertyTitle: property.title,
          };
          broadcastToUser(guest.id, notification);
        }

        res.json(updated);
      } catch (error) {
        console.error("Error marking check-in:", error);
        res.status(500).json({ message: "Failed to mark check-in" });
      }
    },
  );

  // Mark booking as checked-out (owner only) - supports early checkout
  app.patch(
    "/api/owner/bookings/:id/check-out",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can mark check-out" });
        }

        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Verify owner owns the property
        const property = await storage.getProperty(booking.propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this booking" });
        }

        // Only allow check-out from checked_in status
        if (booking.status !== "checked_in") {
          return res.status(400).json({
            message: "Can only check-out guests who are currently checked-in",
          });
        }

        // Check if this is an early checkout
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkOutDate = new Date(booking.checkOut);
        checkOutDate.setHours(0, 0, 0, 0);
        const isEarlyCheckout = today < checkOutDate;

        // If early checkout, require explicit confirmation from frontend
        const { confirmEarlyCheckout } = req.body || {};
        if (isEarlyCheckout && !confirmEarlyCheckout) {
          return res.status(400).json({
            message: "Early checkout detected",
            requiresConfirmation: true,
            scheduledCheckOutDate: booking.checkOut,
            isEarlyCheckout: true,
          });
        }

        // Mark as checked out with early checkout tracking
        await storage.markCheckedOut(req.params.id, userId, isEarlyCheckout);

        // Then automatically mark as completed
        const updated = await storage.updateBookingStatus(
          req.params.id,
          "completed",
        );

        // Notify guest via WebSocket
        const guest = await storage.getUser(booking.guestId);
        if (wss && guest) {
          const notificationMessage = isEarlyCheckout
            ? `You've checked out early from ${property.title}. Please contact the hotel regarding any refund policies.`
            : `Thank you for staying at ${property.title}. We hope you enjoyed your stay!`;
          const notification = {
            type: "booking_status_update",
            bookingId: booking.id,
            status: "completed",
            message: notificationMessage,
            propertyTitle: property.title,
            isEarlyCheckout,
          };
          broadcastToUser(guest.id, notification);
        }

        // Send review request email to guest after check-out
        if (guest?.email) {
          const checkInFormatted = new Date(booking.checkIn).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" },
          );
          const checkOutFormatted = new Date(
            booking.checkOut,
          ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          sendReviewRequestEmail(
            guest.email,
            guest.firstName || guest.email.split("@")[0],
            {
              propertyId: property.id,
              propertyName: property.title,
              bookingId: booking.id,
              bookingCode:
                booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
              checkIn: checkInFormatted,
              checkOut: checkOutFormatted,
            },
          ).catch((err) =>
            console.error("[REVIEW:REQUEST] Failed to send email:", err),
          );
        }

        res.json({ ...updated, isEarlyCheckout });
      } catch (error) {
        console.error("Error marking check-out:", error);
        res.status(500).json({ message: "Failed to mark check-out" });
      }
    },
  );

  // Mark booking as no-show (owner only)
  // Time-based validation: allow after check-in datetime + 2 hour grace period, or if current date > check-in date
  app.patch(
    "/api/owner/bookings/:id/no-show",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        const { reason } = req.body;

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can mark no-show" });
        }

        const booking = await storage.getBooking(req.params.id);
        if (!booking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Verify owner owns the property
        const property = await storage.getProperty(booking.propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to update this booking" });
        }

        // Prevent no-show if already checked-in, cancelled, or already marked no-show
        const blockedStatuses = [
          "checked_in",
          "checked_out",
          "completed",
          "cancelled",
          "no_show",
          "rejected",
        ];
        if (blockedStatuses.includes(booking.status)) {
          const statusMessages: Record<string, string> = {
            checked_in:
              "Cannot mark no-show for a guest who has already checked in",
            checked_out: "Cannot mark no-show for a completed stay",
            completed: "Cannot mark no-show for a completed booking",
            cancelled: "Cannot mark no-show for a cancelled booking",
            no_show: "This booking is already marked as no-show",
            rejected: "Cannot mark no-show for a rejected booking",
          };
          return res.status(400).json({
            message:
              statusMessages[booking.status] ||
              "Cannot mark no-show for this booking status",
            code: "INVALID_STATUS",
          });
        }

        // Only allow no-show from customer_confirmed status
        if (booking.status !== "customer_confirmed") {
          return res.status(400).json({
            message: "Can only mark no-show for guest-confirmed bookings",
          });
        }

        // Time-based validation with 2-hour grace period
        const NO_SHOW_GRACE_PERIOD_HOURS = 2;
        const now = new Date();
        const checkInDateTime = new Date(booking.checkIn);

        // Set check-in time to 12:00 PM (noon) on check-in date (standard hotel check-in)
        checkInDateTime.setHours(12, 0, 0, 0);

        // Calculate when no-show becomes available (check-in time + grace period)
        const noShowAvailableAt = new Date(
          checkInDateTime.getTime() +
            NO_SHOW_GRACE_PERIOD_HOURS * 60 * 60 * 1000,
        );

        // Also check if we're past the check-in date entirely
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDateOnly = new Date(booking.checkIn);
        checkInDateOnly.setHours(0, 0, 0, 0);
        const isPastCheckInDate = today > checkInDateOnly;

        // Allow no-show if: current time >= check-in + grace period, OR current date > check-in date
        if (now < noShowAvailableAt && !isPastCheckInDate) {
          const availableTimeFormatted = noShowAvailableAt.toLocaleTimeString(
            "en-IN",
            {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            },
          );
          const availableDateFormatted = noShowAvailableAt.toLocaleDateString(
            "en-IN",
            {
              day: "numeric",
              month: "short",
            },
          );
          return res.status(400).json({
            message: `No-show can only be marked after ${availableTimeFormatted} on ${availableDateFormatted}`,
            code: "TOO_EARLY",
            noShowAvailableAt: noShowAvailableAt.toISOString(),
          });
        }

        const updated = await storage.markNoShow(
          req.params.id,
          userId,
          "owner",
          reason,
        );

        // Notify guest via WebSocket
        const guest = await storage.getUser(booking.guestId);
        if (wss && guest) {
          const notification = {
            type: "booking_status_update",
            bookingId: booking.id,
            status: "no_show",
            message: `Your booking at ${property.title} has been marked as a no-show. Please contact the property for any queries.`,
            propertyTitle: property.title,
          };
          broadcastToUser(guest.id, notification);
        }

        // Send no-show emails
        if (guest?.email) {
          const checkInFormatted = new Date(booking.checkIn).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" },
          );
          const checkOutFormatted = new Date(
            booking.checkOut,
          ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const noShowEmailData = {
            bookingCode:
              booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
            propertyName: property.title,
            propertyId: property.id,
            checkIn: checkInFormatted,
            checkOut: checkOutFormatted,
            guests: booking.guests,
            rooms: booking.rooms || 1,
            totalPrice: booking.totalPrice,
            bookingCreatedAt: booking.bookingCreatedAt
              ? new Date(booking.bookingCreatedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : undefined,
            paymentType: "pay_at_hotel",
          };
          sendBookingNoShowEmail(
            guest.email,
            guest.firstName || "",
            noShowEmailData,
            "guest",
          ).catch(console.error);
        }

        // Send email to owner
        const owner = await storage.getUser(property.ownerId);
        if (owner?.email) {
          const checkInFormatted = new Date(booking.checkIn).toLocaleDateString(
            "en-IN",
            { day: "numeric", month: "short", year: "numeric" },
          );
          const checkOutFormatted = new Date(
            booking.checkOut,
          ).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const noShowEmailData = {
            bookingCode:
              booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
            propertyName: property.title,
            propertyId: property.id,
            checkIn: checkInFormatted,
            checkOut: checkOutFormatted,
            guests: booking.guests,
            rooms: booking.rooms || 1,
            totalPrice: booking.totalPrice,
            guestName: guest
              ? `${guest.firstName || ""} ${guest.lastName || ""}`.trim()
              : "Guest",
            bookingCreatedAt: booking.bookingCreatedAt
              ? new Date(booking.bookingCreatedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : undefined,
            paymentType: "pay_at_hotel",
          };
          sendBookingNoShowEmail(
            owner.email,
            owner.firstName || "",
            noShowEmailData,
            "owner",
          ).catch(console.error);
        }

        res.json(updated);
      } catch (error) {
        console.error("Error marking no-show:", error);
        res.status(500).json({ message: "Failed to mark no-show" });
      }
    },
  );

  // Create stay extension for checked-in booking (owner only)
  // Creates a new extension booking linked to the parent booking
  app.post(
    "/api/owner/bookings/:id/extend",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can extend stays" });
        }

        const parentBooking = await storage.getBooking(req.params.id);
        if (!parentBooking) {
          return res.status(404).json({ message: "Booking not found" });
        }

        // Verify owner owns the property
        const property = await storage.getProperty(parentBooking.propertyId);
        if (!property || property.ownerId !== userId) {
          return res
            .status(403)
            .json({ message: "Not authorized to extend this booking" });
        }

        // Only allow extension from checked_in status
        if (parentBooking.status !== "checked_in") {
          return res
            .status(400)
            .json({ message: "Can only extend stays for checked-in guests" });
        }

        // Validate extension dates
        const { newCheckOutDate, rooms, specialRequests } = req.body;
        if (!newCheckOutDate) {
          return res
            .status(400)
            .json({ message: "New check-out date is required" });
        }

        const extensionCheckIn = new Date(parentBooking.checkOut);
        const extensionCheckOut = new Date(newCheckOutDate);

        // Validate: extension must start from original checkout and end after it
        if (extensionCheckOut <= extensionCheckIn) {
          return res.status(400).json({
            message:
              "Extension check-out must be after the original check-out date",
          });
        }

        // Check for overlapping bookings during extension period (for same room type)
        const overlappingBookings = await storage.getPropertyBookedDates(
          parentBooking.propertyId,
          extensionCheckIn,
          extensionCheckOut,
          parentBooking.roomTypeId || null,
        );

        // Filter out the parent booking from overlap check
        const actualOverlaps = overlappingBookings.filter((b) => {
          // This is a simple check - in reality we'd need booking IDs here
          return true;
        });

        // Check for blocked dates during extension period (for same room type)
        const blockedDates = await storage.getPropertyBlockedDates(
          parentBooking.propertyId,
          extensionCheckIn,
          extensionCheckOut,
          parentBooking.roomTypeId || null,
        );

        if (blockedDates.length > 0) {
          return res.status(400).json({
            message:
              "Extension dates are blocked. Please choose different dates.",
          });
        }

        // Calculate extension price using room type pricing from original booking
        const nights = Math.ceil(
          (extensionCheckOut.getTime() - extensionCheckIn.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const roomsCount = rooms || parentBooking.rooms || 1;
        const guestCount = parentBooking.guests || 1;
        const adultsCount = parentBooking.adults || guestCount;

        let mealSubtotal = 0;
        let roomSubtotal = nights * Number(property.pricePerNight) * roomsCount;

        // Use same room type and meal option pricing from parent booking
        if (parentBooking.roomTypeId) {
          const roomType = await storage.getRoomType(parentBooking.roomTypeId);
          if (roomType) {
            const adultsPerRoom = Math.ceil(adultsCount / roomsCount);

            // Fetch day-level overrides for the extension date range
            const startKey = extensionCheckIn.toISOString().split("T")[0];
            const endKey = new Date(extensionCheckOut.getTime() - 86400000)
              .toISOString()
              .split("T")[0];
            const overrideRows = await storage.getRoomPriceOverrides(
              parentBooking.roomTypeId,
              startKey,
              endKey,
            );
            const overridesMap = new Map<
              string,
              { base?: number; double?: number; triple?: number }
            >(
              overrideRows.map((r) => [
                r.date,
                {
                  base: r.roomPrice != null ? Number(r.roomPrice) : undefined,
                  double:
                    r.doublePriceOverride != null
                      ? Number(r.doublePriceOverride)
                      : undefined,
                  triple:
                    r.triplePriceOverride != null
                      ? Number(r.triplePriceOverride)
                      : undefined,
                },
              ]),
            );

            roomSubtotal = calculateNightlyRoomCost(
              roomType,
              adultsPerRoom,
              roomsCount,
              extensionCheckIn,
              extensionCheckOut,
              overridesMap,
            );

            if (parentBooking.roomOptionId) {
              const mealOption = await storage.getRoomOption(
                parentBooking.roomOptionId,
              );
              if (
                mealOption &&
                mealOption.roomTypeId === parentBooking.roomTypeId
              ) {
                const mealOverrides = await storage.getMealPlanPriceOverrides(
                  [parentBooking.roomOptionId],
                  startKey,
                  endKey,
                );
                const mealOverridesMap = new Map<string, number>(
                  mealOverrides.map((r) => [r.date, Number(r.price)]),
                );
                const mc = new Date(extensionCheckIn);
                while (mc < extensionCheckOut) {
                  const dk = mc.toISOString().split("T")[0];
                  mealSubtotal +=
                    (mealOverridesMap.get(dk) ??
                      Number(mealOption.priceAdjustment)) * guestCount;
                  mc.setDate(mc.getDate() + 1);
                }
              }
            }
          }
        }
        const totalPrice = roomSubtotal + mealSubtotal;

        // Create extension booking (payment at hotel)
        const extensionBooking = await storage.createBooking({
          propertyId: parentBooking.propertyId,
          guestId: parentBooking.guestId,
          checkIn: extensionCheckIn,
          checkOut: extensionCheckOut,
          guests: parentBooking.guests,
          rooms: roomsCount,
          totalPrice: totalPrice.toString(),
          status: "confirmed", // Auto-confirm extension since guest is already checked in
          bookingType: "extension",
          parentBookingId: parentBooking.id,
          roomTypeId: parentBooking.roomTypeId,
          roomOptionId: parentBooking.roomOptionId,
        });

        // Notify guest via WebSocket
        const guest = await storage.getUser(parentBooking.guestId);
        if (wss && guest) {
          const notification = {
            type: "stay_extension",
            bookingId: extensionBooking.id,
            parentBookingId: parentBooking.id,
            message: `Your stay at ${property.title} has been extended until ${extensionCheckOut.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. Payment of ₹${totalPrice.toLocaleString("en-IN")} will be collected at the hotel.`,
            propertyTitle: property.title,
            newCheckOutDate: extensionCheckOut,
            additionalAmount: totalPrice,
          };
          broadcastToUser(guest.id, notification);
        }

        // Push notification to guest for stay extension
        try {
          const { sendPushNotification } = require("./services/pushService");
          const newCheckOutStr = extensionCheckOut.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          await sendPushNotification(parentBooking.guestId, {
            title: "Stay Extended",
            body: `Your stay at ${property.title} has been extended until ${newCheckOutStr}. Additional ₹${totalPrice.toLocaleString("en-IN")} payable at hotel.`,
            tag: `stay-extension-${extensionBooking.id}`,
            data: { url: "/my-bookings" },
          });
        } catch {}

        res.json({
          extensionBooking,
          message:
            "Stay extended successfully. Payment will be collected at the hotel.",
          additionalNights: nights,
          additionalAmount: totalPrice,
        });
      } catch (error) {
        console.error("Error extending stay:", error);
        res.status(500).json({ message: "Failed to extend stay" });
      }
    },
  );

  // Get owner's reviews
  app.get("/api/owner/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !userHasRole(user, "owner")) {
        return res
          .status(403)
          .json({ message: "Only owners can access reviews" });
      }

      const properties = await storage.getOwnerProperties(userId);
      const propertyIds = properties.map((p) => p.id);

      if (propertyIds.length === 0) {
        return res.json([]);
      }

      const reviews = await storage.getReviewsForProperties(propertyIds);

      // Enrich with guest info
      const enrichedReviews = await Promise.all(
        reviews.map(async (review) => {
          const guest = await storage.getUser(review.guestId);
          const property = properties.find((p) => p.id === review.propertyId);
          return {
            ...review,
            guest: guest
              ? {
                  name:
                    `${guest.firstName || ""} ${guest.lastName || ""}`.trim() ||
                    "Guest",
                  profileImageUrl: guest.profileImageUrl,
                }
              : null,
            property: property
              ? { id: property.id, title: property.title }
              : null,
          };
        }),
      );

      res.json(enrichedReviews);
    } catch (error) {
      console.error("Error fetching owner reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Get owner's conversation count (available regardless of KYC status for notification)
  app.get(
    "/api/owner/conversations/count",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can access this endpoint" });
        }

        const conversations = await storage.getConversationsByUser(userId);
        const totalConversations = conversations.length;
        const unreadCount = conversations.reduce(
          (sum, conv) => sum + (conv.unreadCount || 0),
          0,
        );

        res.json({
          totalConversations,
          unreadCount,
          hasEnquiries: totalConversations > 0,
        });
      } catch (error) {
        console.error("Error fetching owner conversation count:", error);
        res.status(500).json({ message: "Failed to fetch conversation count" });
      }
    },
  );

  // Get owner's conversations/messages
  app.get(
    "/api/owner/conversations",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res
            .status(403)
            .json({ message: "Only owners can access messages" });
        }

        // Check KYC status - only verified owners can view full conversations
        if (user.kycStatus !== "verified") {
          return res.status(403).json({
            message: "KYC verification required to access messages",
            kycStatus: user.kycStatus,
          });
        }

        const conversations = await storage.getConversationsByUser(userId);
        res.json(conversations);
      } catch (error) {
        console.error("Error fetching owner conversations:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
      }
    },
  );

  // ==================== COMMUNICATION ANALYTICS ROUTES ====================

  function getDateRangeBoundary(range: string): Date {
    const now = new Date();
    if (range === "daily") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (range === "weekly") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // Get owner's chat and call analytics
  app.get(
    "/api/communication/owner",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "owner")) {
          return res.status(403).json({
            message: "Only owners can access communication analytics",
          });
        }

        const range = (req.query.range as string) || "monthly";
        const since = getDateRangeBoundary(range);

        // Count conversations where this owner had activity in the period
        // Use lastMessageAt so conversations started before the window but still active are included
        const activeConvs = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(
            and(
              eq(conversations.ownerId, userId),
              gte(conversations.lastMessageAt, since),
            ),
          );
        const totalChats = activeConvs.length;
        const activeConvIds = activeConvs.map((c) => c.id);

        // Count messages sent in these conversations within the period
        let totalMessages = 0;
        if (activeConvIds.length > 0) {
          const msgResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(messages)
            .where(
              and(
                inArray(messages.conversationId, activeConvIds),
                gte(messages.createdAt, since),
              ),
            );
          totalMessages = msgResult[0]?.count ?? 0;
        }

        const properties = await storage.getOwnerProperties(userId);
        const propertyIds = properties.map((p: any) => p.id);

        const allBookings: any[] = [];
        for (const propId of propertyIds) {
          const bookings = await storage.getBookingsByProperty(propId);
          allBookings.push(...bookings);
        }
        const bookingIds = allBookings.map((b: any) => b.id);

        // Support custom date range (from/to) or legacy range preset
        const fromParam = req.query.from as string | undefined;
        const toParam = req.query.to as string | undefined;
        const fromDate = fromParam ? new Date(fromParam) : since;
        const toDate = toParam ? new Date(toParam) : new Date();
        toDate.setHours(23, 59, 59, 999);

        const interactionConditions: any[] = [
          gte(contactInteractions.createdAt, fromDate),
          lte(contactInteractions.createdAt, toDate),
        ];
        if (bookingIds.length > 0) {
          interactionConditions.push(
            inArray(contactInteractions.bookingId, bookingIds),
          );
        }

        const interactions =
          bookingIds.length > 0
            ? await db
                .select()
                .from(contactInteractions)
                .where(and(...interactionConditions))
                .orderBy(desc(contactInteractions.createdAt))
            : [];

        const totalCalls = interactions.filter(
          (i) => i.actionType === "call",
        ).length;
        const totalWhatsapp = interactions.filter(
          (i) => i.actionType === "whatsapp",
        ).length;

        // Build structured call log for the owner (masked phone: XXXXXX + last4)
        const callLog = interactions.map((i) => ({
          id: i.id,
          date: i.createdAt,
          actionType: i.actionType,
          actorRole: i.actorRole,
          propertyName: (i.metadata as any)?.propertyName || "—",
          propertyId: (i.metadata as any)?.propertyId || null,
          maskedPhone: i.targetPhoneLast4 ? `XXXXXX${i.targetPhoneLast4}` : "—",
        }));

        res.json({
          summary: {
            totalChats,
            totalMessages,
            totalCalls,
            totalWhatsapp,
            totalCallDuration: 0,
          },
          callLog,
        });
      } catch (error) {
        console.error("Error fetching owner communication analytics:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch communication analytics" });
      }
    },
  );

  // Admin: detailed call log with full phone data + CSV export
  app.get(
    "/api/communication/admin/call-log",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admin access required" });
        }

        const fromParam = req.query.from as string | undefined;
        const toParam = req.query.to as string | undefined;
        const today = new Date();
        const defaultFrom = new Date(today);
        defaultFrom.setDate(today.getDate() - 30);
        const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
        const toDate = toParam ? new Date(toParam) : today;
        toDate.setHours(23, 59, 59, 999);

        // Fetch interactions in range, join actor user for full phone
        const rows = await db
          .select({
            id: contactInteractions.id,
            createdAt: contactInteractions.createdAt,
            actionType: contactInteractions.actionType,
            actorRole: contactInteractions.actorRole,
            targetRole: contactInteractions.targetRole,
            targetPhoneLast4: contactInteractions.targetPhoneLast4,
            metadata: contactInteractions.metadata,
            actorPhone: users.phone,
            actorFirstName: users.firstName,
            actorLastName: users.lastName,
          })
          .from(contactInteractions)
          .leftJoin(users, eq(contactInteractions.actorUserId, users.id))
          .where(
            and(
              gte(contactInteractions.createdAt, fromDate),
              lte(contactInteractions.createdAt, toDate),
            ),
          )
          .orderBy(desc(contactInteractions.createdAt));

        const callLog = rows.map((r) => ({
          id: r.id,
          date: r.createdAt,
          actionType: r.actionType,
          actorRole: r.actorRole,
          callerName:
            `${r.actorFirstName || ""} ${r.actorLastName || ""}`.trim() || "—",
          callerPhone: r.actorPhone || "—",
          propertyName: (r.metadata as any)?.propertyName || "—",
          propertyId: (r.metadata as any)?.propertyId || null,
          targetPhoneLast4: r.targetPhoneLast4 || "—",
        }));

        // CSV export
        if (req.query.format === "csv") {
          const headers = [
            "Date",
            "Time",
            "Type",
            "Caller Role",
            "Caller Name",
            "Caller Phone",
            "Property",
          ];
          const csvRows = callLog.map((r) => [
            new Date(r.date!).toLocaleDateString("en-IN"),
            new Date(r.date!).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            r.actionType,
            r.actorRole,
            `"${r.callerName}"`,
            r.callerPhone,
            `"${r.propertyName}"`,
          ]);
          const csv = [headers, ...csvRows]
            .map((row) => row.join(","))
            .join("\n");
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="zecoho-call-log-${fromParam || "30d"}.csv"`,
          );
          return res.send(csv);
        }

        res.json({ callLog, total: callLog.length });
      } catch (error) {
        console.error("Error fetching admin call log:", error);
        res.status(500).json({ message: "Failed to fetch call log" });
      }
    },
  );

  // Get admin's communication analytics (all owners)
  app.get(
    "/api/communication/admin",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !userHasRole(user, "admin")) {
          return res.status(403).json({ message: "Admin access required" });
        }

        const range = (req.query.range as string) || "monthly";
        const since = getDateRangeBoundary(range);

        // Count all platform conversations that had activity in the period
        const activeConvsResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(conversations)
          .where(gte(conversations.lastMessageAt, since));
        const totalChats = activeConvsResult[0]?.count ?? 0;

        // Count all messages sent in the period
        const messagesResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(gte(messages.createdAt, since));
        const totalMessages = messagesResult[0]?.count ?? 0;

        // Count call-type contact interactions in the period
        const callsResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(contactInteractions)
          .where(
            and(
              eq(contactInteractions.actionType, "call"),
              gte(contactInteractions.createdAt, since),
            ),
          );
        const totalCalls = callsResult[0]?.count ?? 0;

        res.json({
          summary: {
            totalChats,
            totalCalls,
            totalMessages,
            totalCallDuration: 0,
          },
        });
      } catch (error) {
        console.error("Error fetching admin communication analytics:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch communication analytics" });
      }
    },
  );

  // Log a chat session
  app.post(
    "/api/communication/chat",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const {
          propertyId,
          guestId,
          ownerId,
          bookingId,
          messageCount,
          startedAt,
          endedAt,
          senderRole,
        } = req.body;

        const [chatLog] = await db
          .insert(chatLogs)
          .values({
            propertyId,
            guestId,
            ownerId,
            bookingId,
            messageCount,
            startedAt: startedAt ? new Date(startedAt) : null,
            endedAt: endedAt ? new Date(endedAt) : null,
            senderRole,
          })
          .returning();

        res.json(chatLog);
      } catch (error) {
        console.error("Error logging chat:", error);
        res.status(500).json({ message: "Failed to log chat" });
      }
    },
  );

  // Log a call
  app.post(
    "/api/communication/call",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const {
          propertyId,
          guestId,
          ownerId,
          bookingId,
          callType,
          initiatedBy,
          startedAt,
          endedAt,
          durationSeconds,
        } = req.body;

        const [callLog] = await db
          .insert(callLogs)
          .values({
            propertyId,
            guestId,
            ownerId,
            bookingId,
            callType,
            initiatedBy,
            startedAt: startedAt ? new Date(startedAt) : null,
            endedAt: endedAt ? new Date(endedAt) : null,
            durationSeconds,
          })
          .returning();

        res.json(callLog);
      } catch (error) {
        console.error("Error logging call:", error);
        res.status(500).json({ message: "Failed to log call" });
      }
    },
  );

  // ==================== NOTIFICATION ROUTES ====================

  // Get user's notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark single notification as read
  app.post(
    "/api/notifications/:id/read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const notificationId = req.params.id;

        await db
          .update(notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(notifications.id, notificationId),
              eq(notifications.userId, userId),
            ),
          );

        res.json({ success: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark notification as read" });
      }
    },
  );

  // Mark all notifications as read
  app.post(
    "/api/notifications/read-all",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;

        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.userId, userId));

        res.json({ success: true });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark notifications as read" });
      }
    },
  );

  // Push notification endpoints
  app.get("/api/push/vapid-key", (req, res) => {
    const { getVapidPublicKey } = require("./services/pushService");
    res.json({ publicKey: getVapidPublicKey() });
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endpoint, keys } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers["user-agent"],
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  app.post("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;

      if (endpoint) {
        await storage.deletePushSubscription(endpoint);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  // Notification log tracking endpoint (for push action tracking)
  app.post("/api/push/log-action", isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId, action } = req.body;
      const userId = req.user.claims.sub;

      if (!bookingId || !action) {
        return res
          .status(400)
          .json({ message: "bookingId and action are required" });
      }

      await storage.createNotificationLog({
        userId,
        bookingId,
        channel: "web_push",
        status: "clicked",
        title: `Push action: ${action}`,
        actionTaken: action,
        actionAt: new Date(),
        sentAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error logging push action:", error);
      res.status(500).json({ message: "Failed to log action" });
    }
  });

  // Get notification logs for a booking (admin/owner)
  app.get(
    "/api/notification-logs/:bookingId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const logs = await storage.getNotificationLogsByBooking(
          req.params.bookingId,
        );
        res.json(logs);
      } catch (error) {
        console.error("Error fetching notification logs:", error);
        res.status(500).json({ message: "Failed to fetch logs" });
      }
    },
  );

  // ==================== PRICING CALENDAR ROUTES ====================

  // GET /api/properties/:id/pricing-calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  app.get("/api/properties/:id/pricing-calendar", async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const { startDate, endDate } = req.query as {
        startDate?: string;
        endDate?: string;
      };

      if (!startDate || !endDate) {
        return res.status(400).json({
          message:
            "startDate and endDate query params are required (YYYY-MM-DD)",
        });
      }

      const property = await storage.getProperty(propertyId, true);
      if (!property)
        return res.status(404).json({ message: "Property not found" });

      const roomTypes = await storage.getRoomTypes(propertyId);

      // Room price overrides — keyed by roomTypeId → date → price
      const roomPriceData = await Promise.all(
        roomTypes.map(async (rt) => {
          const overrides = await storage.getRoomPriceOverrides(
            rt.id,
            startDate,
            endDate,
          );
          const overrideMap: Record<
            string,
            { id: string; base?: number; double?: number; triple?: number }
          > = {};
          for (const o of overrides) {
            overrideMap[o.date] = {
              id: o.id,
              base: o.roomPrice != null ? parseFloat(o.roomPrice) : undefined,
              double:
                o.doublePriceOverride != null
                  ? parseFloat(o.doublePriceOverride)
                  : undefined,
              triple:
                o.triplePriceOverride != null
                  ? parseFloat(o.triplePriceOverride)
                  : undefined,
            };
          }
          return {
            roomTypeId: rt.id,
            roomTypeName: rt.name,
            defaultPrice: parseFloat(rt.basePrice),
            singleOccupancyPrice: rt.singleOccupancyPrice
              ? parseFloat(rt.singleOccupancyPrice)
              : null,
            doubleOccupancyPrice: rt.doubleOccupancyPrice
              ? parseFloat(rt.doubleOccupancyPrice)
              : null,
            tripleOccupancyPrice: rt.tripleOccupancyPrice
              ? parseFloat(rt.tripleOccupancyPrice)
              : null,
            overrides: overrideMap,
          };
        }),
      );

      // Meal plan price overrides — collect all roomOption IDs across all room types
      const allRoomOptions = await Promise.all(
        roomTypes.map((rt) => storage.getRoomOptions(rt.id)),
      );
      const roomOptionsList = allRoomOptions.flat();
      const roomOptionIds = roomOptionsList.map((o: any) => o.id);

      const mealOverrides = await storage.getMealPlanPriceOverrides(
        roomOptionIds,
        startDate,
        endDate,
      );
      // Group by date → roomOptionId → { id, price }
      const mealPlanData: Record<
        string,
        Record<string, { id: string; price: number }>
      > = {};
      for (const o of mealOverrides) {
        if (!mealPlanData[o.date]) mealPlanData[o.date] = {};
        mealPlanData[o.date][o.roomOptionId] = {
          id: o.id,
          price: parseFloat(o.price),
        };
      }

      // Also include roomOptions metadata so client can resolve names
      const roomOptionsIndex: Record<
        string,
        { name: string; roomTypeId: string; defaultPrice: number }
      > = {};
      for (const opt of roomOptionsList as any[]) {
        roomOptionsIndex[opt.id] = {
          name: opt.name,
          roomTypeId: opt.roomTypeId,
          defaultPrice: parseFloat(opt.priceAdjustment),
        };
      }

      res.json({
        propertyId,
        startDate,
        endDate,
        roomTypes: roomPriceData,
        mealPlanOverrides: mealPlanData,
        roomOptions: roomOptionsIndex,
      });
    } catch (error) {
      console.error("Error fetching pricing calendar:", error);
      res.status(500).json({ message: "Failed to fetch pricing calendar" });
    }
  });

  // PUT /api/owner/room-types/:roomTypeId/price-overrides
  // Body: { startDate, endDate, price }
  app.put(
    "/api/owner/room-types/:roomTypeId/price-overrides",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { roomTypeId } = req.params;
        const { startDate, endDate, price, occupancyTier = 1 } = req.body;

        if (!startDate || !endDate || price === undefined) {
          return res
            .status(400)
            .json({ message: "startDate, endDate, and price are required" });
        }

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          return res
            .status(400)
            .json({ message: "price must be a non-negative number" });
        }

        const tier = Number(occupancyTier) as 1 | 2 | 3;
        if (![1, 2, 3].includes(tier)) {
          return res
            .status(400)
            .json({ message: "occupancyTier must be 1, 2, or 3" });
        }

        const roomType = await storage.getRoomType(roomTypeId);
        if (!roomType)
          return res.status(404).json({ message: "Room type not found" });

        const property = await storage.getProperty(roomType.propertyId, true);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const results = [];
        const current = new Date(startDate);
        const last = new Date(endDate);
        while (current <= last) {
          const dateStr = current.toISOString().split("T")[0];
          const override = await storage.upsertRoomPriceOverride(
            roomType.propertyId,
            roomTypeId,
            dateStr,
            parsedPrice,
            tier,
          );
          results.push(override);
          current.setDate(current.getDate() + 1);
        }

        res.json({
          message: `${results.length} date(s) updated`,
          overrides: results,
        });
      } catch (error) {
        console.error("Error setting room price overrides:", error);
        res.status(500).json({ message: "Failed to set price overrides" });
      }
    },
  );

  // DELETE /api/owner/price-overrides/:id?type=room|mealplan
  app.delete(
    "/api/owner/price-overrides/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const type = (req.query.type as string) || "room";
        if (type === "mealplan") {
          await storage.deleteMealPlanPriceOverride(id);
        } else {
          await storage.deleteRoomPriceOverride(id);
        }
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting price override:", error);
        res.status(500).json({ message: "Failed to delete price override" });
      }
    },
  );

  // PUT /api/owner/room-options/:roomOptionId/meal-plan-price-overrides
  // Body: { startDate, endDate, price }
  app.put(
    "/api/owner/room-options/:roomOptionId/meal-plan-price-overrides",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { roomOptionId } = req.params;
        const { startDate, endDate, price } = req.body;

        if (!startDate || !endDate || price === undefined) {
          return res
            .status(400)
            .json({ message: "startDate, endDate, and price are required" });
        }

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          return res
            .status(400)
            .json({ message: "price must be a non-negative number" });
        }

        // Verify ownership: roomOption → roomType → property → owner
        const roomOption = await storage.getRoomOption(roomOptionId);
        if (!roomOption)
          return res.status(404).json({ message: "Room option not found" });
        const roomType = await storage.getRoomType(roomOption.roomTypeId);
        if (!roomType)
          return res.status(404).json({ message: "Room type not found" });
        const property = await storage.getProperty(roomType.propertyId, true);
        if (!property || property.ownerId !== userId) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const results = [];
        const current = new Date(startDate);
        const last = new Date(endDate);
        while (current <= last) {
          const dateStr = current.toISOString().split("T")[0];
          const override = await storage.upsertMealPlanPriceOverride(
            roomOptionId,
            dateStr,
            parsedPrice,
          );
          results.push(override);
          current.setDate(current.getDate() + 1);
        }

        res.json({
          message: `${results.length} date(s) updated`,
          overrides: results,
        });
      } catch (error) {
        console.error("Error setting meal plan price overrides:", error);
        res
          .status(500)
          .json({ message: "Failed to set meal plan price overrides" });
      }
    },
  );

  const httpServer = existingServer || createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const claimedUserId = url.searchParams.get("userId");

    if (!claimedUserId) {
      ws.close(1008, "User ID required");
      return;
    }

    // Parse session cookie to validate the user
    const cookies = req.headers.cookie || "";
    const sessionMatch = cookies.match(/connect\.sid=s%3A([^.]+)/);

    if (!sessionMatch) {
      ws.close(1008, "Authentication required");
      return;
    }

    const sessionId = sessionMatch[1];

    // Validate session from database
    try {
      const sessionResult = await db.execute(
        sql`SELECT sess FROM sessions WHERE sid = ${sessionId} AND expire > NOW()`,
      );

      if (!sessionResult.rows || sessionResult.rows.length === 0) {
        ws.close(1008, "Invalid session");
        return;
      }

      const sessionData = sessionResult.rows[0].sess as any;
      const passportUser = sessionData?.passport?.user;
      const authenticatedUserId = passportUser?.claims?.sub;

      if (!authenticatedUserId || authenticatedUserId !== claimedUserId) {
        ws.close(1008, "User ID mismatch");
        return;
      }

      // Verified! Add connection to user's set
      const userId = authenticatedUserId;
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)!.add(ws);

      console.log(`WebSocket connected for user: ${userId}`);

      // Handle ping/pong for keepalive
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      // Remove connection on close
      ws.on("close", () => {
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            userConnections.delete(userId);
          }
        }
        console.log(`WebSocket disconnected for user: ${userId}`);
      });

      ws.on("error", (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
      });
    } catch (error) {
      console.error("WebSocket authentication error:", error);
      ws.close(1008, "Authentication failed");
    }
  });

  // ─── Analytics Tracking ────────────────────────────────────────────────────

  // Track property view (called from property-details page on load)
  app.post("/api/analytics/property-view", async (req: any, res) => {
    try {
      const { propertyId, source } = req.body;
      if (!propertyId)
        return res.status(400).json({ message: "propertyId required" });
      const userId = req.isAuthenticated() ? req.user?.claims?.sub : null;
      await db.insert(propertyViews).values({
        propertyId,
        userId: userId || null,
        source: source || "direct",
      });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true }); // never block page load for analytics
    }
  });

  // ─── Admin Reports ──────────────────────────────────────────────────────────

  function reportDateRange(req: any): { from: Date; to: Date; label: string } {
    const range = (req.query.range as string) || "monthly";
    const fromParam = req.query.from as string | undefined;
    const toParam = req.query.to as string | undefined;
    const to = toParam ? new Date(toParam) : new Date();
    to.setHours(23, 59, 59, 999);
    let from: Date;
    if (fromParam) {
      from = new Date(fromParam);
    } else if (range === "daily") {
      from = new Date(to);
      from.setDate(from.getDate() - 1);
    } else if (range === "weekly") {
      from = new Date(to);
      from.setDate(from.getDate() - 7);
    } else {
      from = new Date(to);
      from.setDate(from.getDate() - 30);
    }
    return { from, to, label: range };
  }

  function sendCsv(res: any, filename: string, rows: string[][]): void {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ── Property Views report ──────────────────────────────────────────────────
  app.get(
    "/api/admin/reports/property-views",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });

        const { from, to } = reportDateRange(req);

        const rows = await db
          .select({
            propertyId: propertyViews.propertyId,
            propertyTitle: propertiesTable.title,
            ownerId: propertiesTable.ownerId,
            createdAt: propertyViews.createdAt,
            source: propertyViews.source,
            userId: propertyViews.userId,
          })
          .from(propertyViews)
          .leftJoin(
            propertiesTable,
            eq(propertyViews.propertyId, propertiesTable.id),
          )
          .where(
            and(
              gte(propertyViews.createdAt, from),
              lte(propertyViews.createdAt, to),
            ),
          )
          .orderBy(desc(propertyViews.createdAt));

        // Aggregate by property
        const byProperty: Record<
          string,
          { title: string; views: number; uniqueUsers: Set<string> }
        > = {};
        for (const r of rows) {
          const key = r.propertyId;
          if (!byProperty[key])
            byProperty[key] = {
              title: r.propertyTitle || r.propertyId,
              views: 0,
              uniqueUsers: new Set(),
            };
          byProperty[key].views++;
          if (r.userId) byProperty[key].uniqueUsers.add(r.userId);
        }

        const summary = Object.entries(byProperty)
          .map(([id, d]) => ({
            propertyId: id,
            title: d.title,
            totalViews: d.views,
            uniqueViewers: d.uniqueUsers.size,
          }))
          .sort((a, b) => b.totalViews - a.totalViews);

        if (req.query.format === "csv") {
          return sendCsv(
            res,
            `property-views-${from.toISOString().slice(0, 10)}.csv`,
            [
              ["Date", "Time", "Property", "Source", "Logged In"],
              ...rows.map((r) => [
                new Date(r.createdAt!).toLocaleDateString("en-IN"),
                new Date(r.createdAt!).toLocaleTimeString("en-IN"),
                r.propertyTitle || r.propertyId,
                r.source || "",
                r.userId ? "Yes" : "No",
              ]),
            ],
          );
        }
        res.json({ total: rows.length, summary, rows: rows.slice(0, 200) });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed" });
      }
    },
  );

  // ── Booking Funnel report ──────────────────────────────────────────────────
  app.get(
    "/api/admin/reports/booking-funnel",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });

        const { from, to } = reportDateRange(req);

        const [searches, views, attempts, confirmed, completed, cancelled] =
          await Promise.all([
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(searchHistory)
              .where(
                and(
                  gte(searchHistory.createdAt, from),
                  lte(searchHistory.createdAt, to),
                ),
              ),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(propertyViews)
              .where(
                and(
                  gte(propertyViews.createdAt, from),
                  lte(propertyViews.createdAt, to),
                ),
              ),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(bookings)
              .where(
                and(gte(bookings.createdAt, from), lte(bookings.createdAt, to)),
              ),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(bookings)
              .where(
                and(
                  gte(bookings.createdAt, from),
                  lte(bookings.createdAt, to),
                  eq(bookings.status, "customer_confirmed"),
                ),
              ),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(bookings)
              .where(
                and(
                  gte(bookings.createdAt, from),
                  lte(bookings.createdAt, to),
                  eq(bookings.status, "completed"),
                ),
              ),
            db
              .select({ count: sql<number>`count(*)::int` })
              .from(bookings)
              .where(
                and(
                  gte(bookings.createdAt, from),
                  lte(bookings.createdAt, to),
                  eq(bookings.status, "cancelled"),
                ),
              ),
          ]);

        const s = searches[0]?.count ?? 0;
        const v = views[0]?.count ?? 0;
        const a = attempts[0]?.count ?? 0;
        const c = confirmed[0]?.count ?? 0;
        const cm = completed[0]?.count ?? 0;
        const cn = cancelled[0]?.count ?? 0;

        const funnel = [
          { step: "Searches", count: s, convRate: null },
          {
            step: "Property Views",
            count: v,
            convRate: s ? +((v / s) * 100).toFixed(1) : null,
          },
          {
            step: "Booking Attempts",
            count: a,
            convRate: v ? +((a / v) * 100).toFixed(1) : null,
          },
          {
            step: "Confirmed",
            count: c,
            convRate: a ? +((c / a) * 100).toFixed(1) : null,
          },
          {
            step: "Completed",
            count: cm,
            convRate: c ? +((cm / c) * 100).toFixed(1) : null,
          },
          {
            step: "Cancelled",
            count: cn,
            convRate: a ? +((cn / a) * 100).toFixed(1) : null,
          },
        ];

        if (req.query.format === "csv") {
          return sendCsv(
            res,
            `booking-funnel-${from.toISOString().slice(0, 10)}.csv`,
            [
              ["Step", "Count", "Conversion Rate (%)"],
              ...funnel.map((f) => [
                f.step,
                String(f.count),
                f.convRate !== null ? String(f.convRate) : "—",
              ]),
            ],
          );
        }
        res.json({ funnel });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed" });
      }
    },
  );

  // ── Cancellation Reasons report ────────────────────────────────────────────
  app.get(
    "/api/admin/reports/cancellations",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });

        const { from, to } = reportDateRange(req);

        const rows = await db
          .select({
            id: bookings.id,
            createdAt: bookings.createdAt,
            cancellationReason: bookings.cancellationReason,
            propertyId: bookings.propertyId,
            propertyTitle: propertiesTable.title,
            totalPrice: bookings.totalPrice,
            checkIn: bookings.checkIn,
          })
          .from(bookings)
          .leftJoin(
            propertiesTable,
            eq(bookings.propertyId, propertiesTable.id),
          )
          .where(
            and(
              eq(bookings.status, "cancelled"),
              gte(bookings.createdAt, from),
              lte(bookings.createdAt, to),
            ),
          )
          .orderBy(desc(bookings.createdAt));

        // Aggregate reasons
        const reasonMap: Record<string, number> = {};
        for (const r of rows) {
          const key = r.cancellationReason?.trim() || "No reason provided";
          reasonMap[key] = (reasonMap[key] || 0) + 1;
        }
        const byReason = Object.entries(reasonMap)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count);

        if (req.query.format === "csv") {
          return sendCsv(
            res,
            `cancellations-${from.toISOString().slice(0, 10)}.csv`,
            [
              ["Date", "Property", "Check-In", "Amount", "Reason"],
              ...rows.map((r) => [
                new Date(r.createdAt!).toLocaleDateString("en-IN"),
                r.propertyTitle || r.propertyId,
                r.checkIn
                  ? new Date(r.checkIn).toLocaleDateString("en-IN")
                  : "",
                r.totalPrice || "",
                r.cancellationReason || "No reason",
              ]),
            ],
          );
        }
        res.json({ total: rows.length, byReason, rows: rows.slice(0, 200) });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed" });
      }
    },
  );

  // ── Search History report ──────────────────────────────────────────────────
  app.get(
    "/api/admin/reports/search-history",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });

        const { from, to } = reportDateRange(req);

        const rows = await db
          .select({
            id: searchHistory.id,
            destination: searchHistory.destination,
            checkIn: searchHistory.checkIn,
            checkOut: searchHistory.checkOut,
            guests: searchHistory.guests,
            createdAt: searchHistory.createdAt,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(searchHistory)
          .leftJoin(users, eq(searchHistory.userId, users.id))
          .where(
            and(
              gte(searchHistory.createdAt, from),
              lte(searchHistory.createdAt, to),
            ),
          )
          .orderBy(desc(searchHistory.createdAt));

        // Top destinations
        const destMap: Record<string, number> = {};
        for (const r of rows) {
          const key = r.destination?.trim().toLowerCase() || "unknown";
          destMap[key] = (destMap[key] || 0) + 1;
        }
        const topDestinations = Object.entries(destMap)
          .map(([destination, count]) => ({ destination, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        if (req.query.format === "csv") {
          return sendCsv(
            res,
            `search-history-${from.toISOString().slice(0, 10)}.csv`,
            [
              [
                "Date",
                "Time",
                "User",
                "Destination",
                "Check-In",
                "Check-Out",
                "Guests",
              ],
              ...rows.map((r) => [
                new Date(r.createdAt!).toLocaleDateString("en-IN"),
                new Date(r.createdAt!).toLocaleTimeString("en-IN"),
                `${r.firstName || ""} ${r.lastName || ""}`.trim() || "Guest",
                r.destination,
                r.checkIn
                  ? new Date(r.checkIn).toLocaleDateString("en-IN")
                  : "",
                r.checkOut
                  ? new Date(r.checkOut).toLocaleDateString("en-IN")
                  : "",
                String(r.guests || ""),
              ]),
            ],
          );
        }
        res.json({
          total: rows.length,
          topDestinations,
          rows: rows.slice(0, 200),
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed" });
      }
    },
  );

  // ── Notification Logs report ───────────────────────────────────────────────
  app.get(
    "/api/admin/reports/notification-logs",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });

        const { from, to } = reportDateRange(req);

        const rows = await db
          .select({
            id: notificationLogs.id,
            channel: notificationLogs.channel,
            status: notificationLogs.status,
            title: notificationLogs.title,
            devicePlatform: notificationLogs.devicePlatform,
            actionTaken: notificationLogs.actionTaken,
            sentAt: notificationLogs.sentAt,
            error: notificationLogs.error,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(notificationLogs)
          .leftJoin(users, eq(notificationLogs.userId, users.id))
          .where(
            and(
              gte(notificationLogs.sentAt, from),
              lte(notificationLogs.sentAt, to),
            ),
          )
          .orderBy(desc(notificationLogs.sentAt));

        const total = rows.length;
        const byStatus: Record<string, number> = {};
        const byChannel: Record<string, number> = {};
        let actioned = 0;
        for (const r of rows) {
          byStatus[r.status] = (byStatus[r.status] || 0) + 1;
          byChannel[r.channel] = (byChannel[r.channel] || 0) + 1;
          if (r.actionTaken) actioned++;
        }
        const deliveryRate = total
          ? +(
              (((byStatus.delivered || 0) + (byStatus.clicked || 0)) / total) *
              100
            ).toFixed(1)
          : 0;
        const actionRate = total ? +((actioned / total) * 100).toFixed(1) : 0;

        if (req.query.format === "csv") {
          return sendCsv(
            res,
            `notification-logs-${from.toISOString().slice(0, 10)}.csv`,
            [
              [
                "Date",
                "User",
                "Channel",
                "Status",
                "Title",
                "Device",
                "Action Taken",
              ],
              ...rows.map((r) => [
                new Date(r.sentAt!).toLocaleDateString("en-IN"),
                `${r.firstName || ""} ${r.lastName || ""}`.trim() || "—",
                r.channel,
                r.status,
                r.title || "",
                r.devicePlatform || "",
                r.actionTaken || "",
              ]),
            ],
          );
        }
        res.json({
          total,
          deliveryRate,
          actionRate,
          byStatus,
          byChannel,
          rows: rows.slice(0, 200),
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed" });
      }
    },
  );

  // ── Chat Logs report ───────────────────────────────────────────────────────
  app.get(
    "/api/admin/reports/chat-logs",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });

        const { from, to } = reportDateRange(req);

        const rows = await db
          .select({
            id: chatLogs.id,
            messageCount: chatLogs.messageCount,
            senderRole: chatLogs.senderRole,
            startedAt: chatLogs.startedAt,
            endedAt: chatLogs.endedAt,
            createdAt: chatLogs.createdAt,
            propertyTitle: propertiesTable.title,
          })
          .from(chatLogs)
          .leftJoin(
            propertiesTable,
            eq(chatLogs.propertyId, propertiesTable.id),
          )
          .where(
            and(gte(chatLogs.createdAt, from), lte(chatLogs.createdAt, to)),
          )
          .orderBy(desc(chatLogs.createdAt));

        const totalMessages = rows.reduce(
          (s, r) => s + (r.messageCount || 0),
          0,
        );
        const avgMessages = rows.length
          ? Math.round(totalMessages / rows.length)
          : 0;

        if (req.query.format === "csv") {
          return sendCsv(
            res,
            `chat-logs-${from.toISOString().slice(0, 10)}.csv`,
            [
              [
                "Date",
                "Property",
                "Sender Role",
                "Message Count",
                "Duration (min)",
              ],
              ...rows.map((r) => {
                const dur =
                  r.startedAt && r.endedAt
                    ? Math.round(
                        (new Date(r.endedAt).getTime() -
                          new Date(r.startedAt).getTime()) /
                          60000,
                      )
                    : "";
                return [
                  new Date(r.createdAt!).toLocaleDateString("en-IN"),
                  r.propertyTitle || "",
                  r.senderRole || "",
                  String(r.messageCount || 0),
                  String(dur),
                ];
              }),
            ],
          );
        }
        res.json({
          total: rows.length,
          totalMessages,
          avgMessages,
          rows: rows.slice(0, 200),
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed" });
      }
    },
  );

  // ── Call Logs report ───────────────────────────────────────────────────────
  app.get(
    "/api/admin/reports/call-logs",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });

        const { from, to } = reportDateRange(req);

        const rows = await db
          .select({
            id: callLogs.id,
            initiatedBy: callLogs.initiatedBy,
            callType: callLogs.callType,
            durationSeconds: callLogs.durationSeconds,
            startedAt: callLogs.startedAt,
            createdAt: callLogs.createdAt,
            propertyTitle: propertiesTable.title,
            guestFirst: users.firstName,
            guestLast: users.lastName,
            guestPhone: users.phone,
          })
          .from(callLogs)
          .leftJoin(
            propertiesTable,
            eq(callLogs.propertyId, propertiesTable.id),
          )
          .leftJoin(users, eq(callLogs.guestId, users.id))
          .where(
            and(gte(callLogs.createdAt, from), lte(callLogs.createdAt, to)),
          )
          .orderBy(desc(callLogs.createdAt));

        const totalDuration = rows.reduce(
          (s, r) => s + (r.durationSeconds || 0),
          0,
        );

        if (req.query.format === "csv") {
          return sendCsv(
            res,
            `call-logs-${from.toISOString().slice(0, 10)}.csv`,
            [
              [
                "Date",
                "Property",
                "Initiated By",
                "Call Type",
                "Duration (sec)",
                "Guest",
                "Guest Phone",
              ],
              ...rows.map((r) => [
                new Date(r.createdAt!).toLocaleDateString("en-IN"),
                r.propertyTitle || "",
                r.initiatedBy || "",
                r.callType || "",
                String(r.durationSeconds || 0),
                `${r.guestFirst || ""} ${r.guestLast || ""}`.trim() || "—",
                r.guestPhone || "—",
              ]),
            ],
          );
        }
        res.json({
          total: rows.length,
          totalDurationSeconds: totalDuration,
          rows: rows.slice(0, 200),
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed" });
      }
    },
  );

  // ── Admin Audit Logs report ────────────────────────────────────────────────
  app.get(
    "/api/admin/reports/audit-logs",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || !userHasRole(user, "admin"))
          return res.status(403).json({ message: "Admin only" });

        const { from, to } = reportDateRange(req);

        const rows = await db
          .select({
            id: adminAuditLogs.id,
            action: adminAuditLogs.action,
            reason: adminAuditLogs.reason,
            createdAt: adminAuditLogs.createdAt,
            adminFirst: users.firstName,
            adminLast: users.lastName,
            propertyTitle: propertiesTable.title,
          })
          .from(adminAuditLogs)
          .leftJoin(users, eq(adminAuditLogs.adminId, users.id))
          .leftJoin(
            propertiesTable,
            eq(adminAuditLogs.propertyId, propertiesTable.id),
          )
          .where(
            and(
              gte(adminAuditLogs.createdAt, from),
              lte(adminAuditLogs.createdAt, to),
            ),
          )
          .orderBy(desc(adminAuditLogs.createdAt));

        const byAction: Record<string, number> = {};
        for (const r of rows)
          byAction[r.action] = (byAction[r.action] || 0) + 1;

        if (req.query.format === "csv") {
          return sendCsv(
            res,
            `audit-logs-${from.toISOString().slice(0, 10)}.csv`,
            [
              ["Date", "Admin", "Action", "Property", "Reason"],
              ...rows.map((r) => [
                new Date(r.createdAt!).toLocaleDateString("en-IN"),
                `${r.adminFirst || ""} ${r.adminLast || ""}`.trim() || "—",
                r.action,
                r.propertyTitle || "—",
                r.reason || "",
              ]),
            ],
          );
        }
        res.json({ total: rows.length, byAction, rows: rows.slice(0, 200) });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed" });
      }
    },
  );

  return httpServer;
}
