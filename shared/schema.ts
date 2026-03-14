// Referenced from blueprint:javascript_log_in_with_replit and blueprint:javascript_database
import { sql, relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Registration method enum
export const registrationMethodEnum = pgEnum("registration_method", [
  "replit",
  "local",
]);

// OTP purpose enum
export const otpPurposeEnum = pgEnum("otp_purpose", [
  "signup",
  "login",
  "password_reset",
]);

// OTP codes table for email/phone authentication
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    code: varchar("code", { length: 6 }).notNull(),
    purpose: otpPurposeEnum("purpose").notNull().default("signup"),
    expiresAt: timestamp("expires_at").notNull(),
    verified: boolean("verified").default(false),
    attempts: integer("attempts").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_otp_email").on(table.email),
    index("IDX_otp_phone").on(table.phone),
    index("IDX_otp_expires").on(table.expiresAt),
  ],
);

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

// Policy type enum
export const policyTypeEnum = pgEnum("policy_type", ["terms", "privacy"]);

// Policy status enum
export const policyStatusEnum = pgEnum("policy_status", [
  "draft",
  "published",
  "archived",
]);

// Policies table for Terms & Conditions and Privacy Policy
export const policies = pgTable(
  "policies",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: policyTypeEnum("type").notNull(),
    version: integer("version").notNull().default(1),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    status: policyStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at"),
    createdBy: varchar("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("IDX_policy_type").on(table.type),
    index("IDX_policy_status").on(table.status),
    uniqueIndex("IDX_policy_type_version").on(table.type, table.version),
  ],
);

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;
export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPolicyData = z.infer<typeof insertPolicySchema>;

// Owner Agreement status enum
export const ownerAgreementStatusEnum = pgEnum("owner_agreement_status", [
  "draft",
  "published",
  "archived",
]);

// Owner Agreements table for Property Owner Agreement
export const ownerAgreements = pgTable(
  "owner_agreements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    version: integer("version").notNull().default(1),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    status: ownerAgreementStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at"),
    createdBy: varchar("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("IDX_owner_agreement_status").on(table.status),
    uniqueIndex("IDX_owner_agreement_version").on(table.version),
  ],
);

export type OwnerAgreement = typeof ownerAgreements.$inferSelect;
export type InsertOwnerAgreement = typeof ownerAgreements.$inferInsert;
export const insertOwnerAgreementSchema = createInsertSchema(
  ownerAgreements,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOwnerAgreementData = z.infer<
  typeof insertOwnerAgreementSchema
>;

// About Us status enum
export const aboutUsStatusEnum = pgEnum("about_us_status", [
  "draft",
  "published",
  "archived",
]);

// About Us table for admin-editable About Us page content
export const aboutUs = pgTable(
  "about_us",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    version: integer("version").notNull().default(1),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    status: aboutUsStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at"),
    createdBy: varchar("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("IDX_about_us_status").on(table.status),
    uniqueIndex("IDX_about_us_version").on(table.version),
  ],
);

export type AboutUs = typeof aboutUs.$inferSelect;
export type InsertAboutUs = typeof aboutUs.$inferInsert;
export const insertAboutUsSchema = createInsertSchema(aboutUs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAboutUsData = z.infer<typeof insertAboutUsSchema>;

// Contact settings table for admin-editable contact information
export const contactSettings = pgTable("contact_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  // Customer Support
  customerSupportEmail: varchar("customer_support_email", {
    length: 255,
  }).default("support@zecoho.com"),
  customerSupportPhone: varchar("customer_support_phone", {
    length: 20,
  }).default("+91-XXXXXXXXXX"),
  customerSupportHours: varchar("customer_support_hours", {
    length: 255,
  }).default("Monday to Saturday, 9:00 AM - 6:00 PM IST"),
  // Property Owner Support
  ownerSupportEmail: varchar("owner_support_email", { length: 255 }).default(
    "owners@zecoho.com",
  ),
  ownerSupportPhone: varchar("owner_support_phone", { length: 20 }).default(
    "+91-XXXXXXXXXX",
  ),
  // Grievance Redressal Officer (required under Indian IT Act)
  grievanceOfficerName: varchar("grievance_officer_name", {
    length: 255,
  }).default("Mr./Ms. [Name]"),
  grievanceOfficerEmail: varchar("grievance_officer_email", {
    length: 255,
  }).default("grievance@zecoho.com"),
  grievanceOfficerPhone: varchar("grievance_officer_phone", {
    length: 20,
  }).default("+91-XXXXXXXXXX"),
  grievanceOfficerAddress: text("grievance_officer_address").default(
    "[Office Address]",
  ),
  // Privacy & Data Protection
  privacyEmail: varchar("privacy_email", { length: 255 }).default(
    "privacy@zecoho.com",
  ),
  dataProtectionOfficerName: varchar("data_protection_officer_name", {
    length: 255,
  }).default("Mr./Ms. [Name]"),
  // Business & Partnerships
  businessEmail: varchar("business_email", { length: 255 }).default(
    "partnerships@zecoho.com",
  ),
  businessPhone: varchar("business_phone", { length: 20 }).default(
    "+91-XXXXXXXXXX",
  ),
  // Registered Office
  registeredOfficeName: varchar("registered_office_name", {
    length: 255,
  }).default("ZECOHO Technologies Pvt. Ltd."),
  registeredOfficeAddress: text("registered_office_address").default(
    "[Complete Registered Address]",
  ),
  registeredOfficeCity: varchar("registered_office_city", {
    length: 100,
  }).default("[City]"),
  registeredOfficeState: varchar("registered_office_state", {
    length: 100,
  }).default("[State]"),
  registeredOfficePincode: varchar("registered_office_pincode", {
    length: 10,
  }).default("[Pincode]"),
  registeredOfficeCountry: varchar("registered_office_country", {
    length: 100,
  }).default("India"),
  // CIN/Registration Number
  companyRegistrationNumber: varchar("company_registration_number", {
    length: 50,
  }).default("[CIN Number]"),
  // Timestamps
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export type ContactSettings = typeof contactSettings.$inferSelect;
export type InsertContactSettings = typeof contactSettings.$inferInsert;
export const insertContactSettingsSchema = createInsertSchema(
  contactSettings,
).omit({ id: true, updatedAt: true });
export type InsertContactSettingsData = z.infer<
  typeof insertContactSettingsSchema
>;

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["guest", "owner", "admin"]);

// Property types enum
export const propertyTypeEnum = pgEnum("property_type", [
  "hotel",
  "villa",
  "hostel",
  "lodge",
  "resort",
  "apartment",
  "cottage",
  "farmhouse",
  "homestay",
]);

// Property status enum
export const propertyStatusEnum = pgEnum("property_status", [
  "draft",
  "published",
  "pending",
  "paused",
  "deactivated",
]);

// Booking status enum
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending", // Guest submitted request, waiting for owner response
  "confirmed", // Owner accepted the booking, waiting for guest confirmation
  "customer_confirmed", // Guest confirmed booking after owner acceptance
  "rejected", // Owner rejected the booking
  "cancelled", // Guest cancelled the booking
  "checked_in", // Guest has checked in (owner marked)
  "checked_out", // Guest has checked out (owner marked)
  "completed", // Stay completed
  "no_show", // Guest did not check in (marked by owner/admin)
]);

// No-show marked by enum
export const noShowMarkedByEnum = pgEnum("no_show_marked_by", [
  "owner",
  "admin",
]);

// Booking type enum - for tracking standard vs extension bookings
export const bookingTypeEnum = pgEnum("booking_type", [
  "standard", // Regular booking
  "extension", // Stay extension linked to parent booking
]);

// Availability override type enum - for property date range blocks
export const availabilityOverrideTypeEnum = pgEnum(
  "availability_override_type",
  [
    "hold", // Temporary hold - owner not accepting bookings for this period
    "sold_out", // Sold out - all rooms booked externally or maintenance
    "maintenance", // Property under maintenance
  ],
);

// KYC status enum
export const kycStatusEnum = pgEnum("kyc_status", [
  "not_started",
  "pending",
  "verified",
  "rejected",
]);

// Deactivation request status enum
export const deactivationRequestStatusEnum = pgEnum(
  "deactivation_request_status",
  ["pending", "approved", "rejected"],
);

// Listing mode enum - for owner onboarding flow
export const listingModeEnum = pgEnum("listing_mode", [
  "not_selected",
  "quick",
  "full",
]);

// Geo source enum - for tracking how property location was set
export const geoSourceEnum = pgEnum("geo_source", [
  "manual_pin",
  "current_location",
]);

export const cancellationPolicyTypeEnum = pgEnum("cancellation_policy_type", [
  "flexible", // Free cancellation until X hours before check-in
  "moderate", // Partial refund if cancelled within X hours
  "strict", // No refund / non-refundable
]);

// Suspension status enum
export const suspensionStatusEnum = pgEnum("suspension_status", [
  "active",
  "suspended",
]);

// Admin action types enum for audit logging
export const adminActionTypeEnum = pgEnum("admin_action_type", [
  "cancel_booking",
  "mark_no_show",
  "force_check_in",
  "force_check_out",
  "fix_inventory",
  "suspend_owner",
  "reinstate_owner",
  "deactivate_user",
  "restore_user",
]);

// User storage table - supports both Replit Auth and local registration
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userRole: userRoleEnum("user_role").notNull().default("guest"),
  additionalRoles: text("additional_roles")
    .array()
    .default(sql`ARRAY[]::text[]`),
  phone: varchar("phone", { length: 20 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  registrationMethod: registrationMethodEnum("registration_method")
    .notNull()
    .default("replit"),
  emailVerifiedAt: timestamp("email_verified_at"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  kycAddress: text("kyc_address"),
  governmentIdType: varchar("government_id_type", { length: 50 }),
  governmentIdNumber: varchar("government_id_number", { length: 100 }),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("not_started"),
  kycVerifiedAt: timestamp("kyc_verified_at"),
  listingMode: listingModeEnum("listing_mode")
    .notNull()
    .default("not_selected"),
  hasSeenOwnerModal: boolean("has_seen_owner_modal").notNull().default(false),
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsAcceptedVersion: integer("terms_accepted_version"),
  privacyAccepted: boolean("privacy_accepted").notNull().default(false),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  privacyAcceptedVersion: integer("privacy_accepted_version"),
  ownerAgreementAccepted: boolean("owner_agreement_accepted")
    .notNull()
    .default(false),
  ownerAgreementAcceptedAt: timestamp("owner_agreement_accepted_at"),
  ownerAgreementAcceptedVersion: integer("owner_agreement_accepted_version"),
  consentCommunication: boolean("consent_communication")
    .notNull()
    .default(false),
  // Suspension fields - for admin control over problematic owners
  suspensionStatus: suspensionStatusEnum("suspension_status")
    .notNull()
    .default("active"),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: varchar("suspended_by"), // References users.id (admin who suspended)
  suspensionReason: text("suspension_reason"),
  // Deactivation fields - for admin soft-delete of users (preserves all data)
  isDeactivated: boolean("is_deactivated").notNull().default(false),
  deactivatedAt: timestamp("deactivated_at"),
  deactivatedBy: varchar("deactivated_by"), // References users.id (admin who deactivated)
  deactivationReason: text("deactivation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  propertyCode: varchar("property_code", { length: 20 }).unique(),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  propertyType: propertyTypeEnum("property_type").notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  address: text("address"),
  propFlatNo: varchar("prop_flat_no", { length: 50 }),
  propHouseNo: varchar("prop_house_no", { length: 50 }),
  propStreetAddress: varchar("prop_street_address", { length: 255 }),
  propLandmark: varchar("prop_landmark", { length: 255 }),
  propLocality: varchar("prop_locality", { length: 255 }),
  propCity: varchar("prop_city", { length: 100 }),
  propDistrict: varchar("prop_district", { length: 100 }),
  propState: varchar("prop_state", { length: 100 }),
  propPincode: varchar("prop_pincode", { length: 10 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  geoVerified: boolean("geo_verified").notNull().default(false),
  geoSource: geoSourceEnum("geo_source"),
  images: text("images")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  categorizedImages: jsonb("categorized_images"),
  videos: text("videos")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  pricePerNight: decimal("price_per_night", {
    precision: 10,
    scale: 2,
  }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  // Occupancy-based pricing
  singleOccupancyPrice: decimal("single_occupancy_price", {
    precision: 10,
    scale: 2,
  }),
  doubleOccupancyPrice: decimal("double_occupancy_price", {
    precision: 10,
    scale: 2,
  }),
  tripleOccupancyPrice: decimal("triple_occupancy_price", {
    precision: 10,
    scale: 2,
  }),
  // Bulk booking options
  bulkBookingEnabled: boolean("bulk_booking_enabled").notNull().default(false),
  bulkBookingMinRooms: integer("bulk_booking_min_rooms").default(5),
  bulkBookingDiscountPercent: decimal("bulk_booking_discount_percent", {
    precision: 5,
    scale: 2,
  }).default("10"),
  maxGuests: integer("max_guests").notNull().default(2),
  bedrooms: integer("bedrooms").notNull().default(1),
  beds: integer("beds").notNull().default(1),
  bathrooms: integer("bathrooms").notNull().default(1),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  status: propertyStatusEnum("status").notNull().default("draft"),
  inquiryOnly: boolean("inquiry_only").notNull().default(false),
  verificationNotes: text("verification_notes"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  policies: text("policies"),
  checkInTime: varchar("check_in_time", { length: 20 }),
  checkOutTime: varchar("check_out_time", { length: 20 }),
  receptionNumber: varchar("reception_number", { length: 20 }),
  safetyFeatures: text("safety_features")
    .array()
    .default(sql`ARRAY[]::text[]`),
  cancellationPolicy: text("cancellation_policy"),
  // Structured cancellation policy
  cancellationPolicyType: cancellationPolicyTypeEnum(
    "cancellation_policy_type",
  ).default("flexible"),
  freeCancellationHours: integer("free_cancellation_hours").default(24), // Hours before check-in for free cancellation
  partialRefundPercent: integer("partial_refund_percent").default(50), // Refund percentage for moderate policy
  cancellationPolicyConfigured: boolean("cancellation_policy_configured")
    .notNull()
    .default(false), // True when owner explicitly saves policy
  // Guest policies
  localIdAllowed: boolean("local_id_allowed").notNull().default(true),
  hourlyBookingAllowed: boolean("hourly_booking_allowed")
    .notNull()
    .default(false),
  foreignGuestsAllowed: boolean("foreign_guests_allowed")
    .notNull()
    .default(true),
  coupleFriendly: boolean("couple_friendly").notNull().default(true),
  // Admin suspension - property-level suspension when owner is suspended
  suspended: boolean("suspended").notNull().default(false),
  suspendedAt: timestamp("suspended_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Audit Logs table - tracks all admin actions for accountability
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    adminId: varchar("admin_id")
      .notNull()
      .references(() => users.id),
    action: adminActionTypeEnum("action").notNull(),
    bookingId: varchar("booking_id"), // Optional - for booking-related actions
    ownerId: varchar("owner_id"), // Optional - for owner-related actions (suspend/reinstate)
    propertyId: varchar("property_id"), // Optional - for property-related actions
    reason: text("reason"), // Required for some actions (no-show, suspend)
    metadata: jsonb("metadata"), // Additional context (inventory fix details, etc.)
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_audit_admin").on(table.adminId),
    index("idx_audit_action").on(table.action),
    index("idx_audit_booking").on(table.bookingId),
    index("idx_audit_owner").on(table.ownerId),
    index("idx_audit_created").on(table.createdAt),
  ],
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;
export const insertAdminAuditLogSchema = createInsertSchema(
  adminAuditLogs,
).omit({ id: true, createdAt: true });
export type InsertAdminAuditLogData = z.infer<typeof insertAdminAuditLogSchema>;

// Amenities table
export const amenities = pgTable("amenities", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  category: varchar("category", { length: 50 }),
});

// Property amenities junction table
export const propertyAmenities = pgTable("property_amenities", {
  propertyId: varchar("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  amenityId: varchar("amenity_id")
    .notNull()
    .references(() => amenities.id, { onDelete: "cascade" }),
});

// Room Types table (formerly "rooms") - represents different room categories like Deluxe, Family, etc.
export const roomTypes = pgTable(
  "room_types",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
    // Original price for strikethrough display (optional - if set and > basePrice, shows discount)
    originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
    // Occupancy-based pricing adjustments (nullable - if not set, basePrice applies to all occupancy levels)
    singleOccupancyBase: integer("single_occupancy_base").default(1), // Number of guests included in base price
    doubleOccupancyAdjustment: decimal("double_occupancy_adjustment", {
      precision: 10,
      scale: 2,
    }), // Extra charge per night for 2 guests
    tripleOccupancyAdjustment: decimal("triple_occupancy_adjustment", {
      precision: 10,
      scale: 2,
    }), // Extra charge per night for 3+ guests
    maxGuests: integer("max_guests").notNull().default(2),
    totalRooms: integer("total_rooms").notNull().default(1),
    images: text("images")
      .array()
      .default(sql`ARRAY[]::text[]`),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_roomtype_property").on(table.propertyId)],
);

// Room Options table - meal plans and rate options for each room type
export const roomOptions = pgTable(
  "room_options",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roomTypeId: varchar("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    priceAdjustment: decimal("price_adjustment", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    // Original price adjustment for strikethrough display (optional)
    originalPriceAdjustment: decimal("original_price_adjustment", {
      precision: 10,
      scale: 2,
    }),
    refundable: boolean("refundable").notNull().default(true),
    inclusions: text("inclusions"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_roomoption_roomtype").on(table.roomTypeId)],
);

// Legacy rooms table alias for backwards compatibility
export const rooms = roomTypes;

// Wishlists table
export const wishlists = pgTable(
  "wishlists",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueUserProperty: uniqueIndex("unique_user_property").on(
      table.userId,
      table.propertyId,
    ),
  }),
);

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tripPurpose: varchar("trip_purpose", { length: 100 }),
  preferredPropertyTypes: text("preferred_property_types")
    .array()
    .default(sql`ARRAY[]::text[]`),
  budgetMin: decimal("budget_min", { precision: 10, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 10, scale: 2 }),
  preferredAmenities: text("preferred_amenities")
    .array()
    .default(sql`ARRAY[]::text[]`),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookingCode: varchar("booking_code", { length: 20 }).unique(),
  propertyId: varchar("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  guestId: varchar("guest_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Room type and option selection (for hotel-style bookings)
  roomTypeId: varchar("room_type_id").references(() => roomTypes.id, {
    onDelete: "set null",
  }),
  roomOptionId: varchar("room_option_id").references(() => roomOptions.id, {
    onDelete: "set null",
  }),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  guests: integer("guests").notNull().default(1),
  rooms: integer("rooms").notNull().default(1),
  // Guest details (collected during booking)
  guestName: varchar("guest_name", { length: 255 }),
  guestMobile: varchar("guest_mobile", { length: 20 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  gstNumber: varchar("gst_number", { length: 20 }),
  specialRequests: text("special_requests"),
  adults: integer("adults").default(1),
  childrenCount: integer("children_count").default(0),
  // Price breakdown
  roomPrice: decimal("room_price", { precision: 10, scale: 2 }),
  mealPrice: decimal("meal_price", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default(
    "0",
  ),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default("0"),
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }),
  status: bookingStatusEnum("status").notNull().default("pending"),
  ownerResponseMessage: text("owner_response_message"),
  respondedAt: timestamp("responded_at"),
  // Check-in/check-out tracking (owner-controlled)
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  checkedInBy: varchar("checked_in_by").references(() => users.id),
  checkedOutBy: varchar("checked_out_by").references(() => users.id),
  // Early checkout tracking
  actualCheckOutDate: timestamp("actual_check_out_date"),
  earlyCheckout: boolean("early_checkout").default(false),
  // Booking type and extension linking
  bookingType: bookingTypeEnum("booking_type").notNull().default("standard"),
  parentBookingId: varchar("parent_booking_id"),
  // Booking creation tracking - immutable after creation
  bookingCreatedAt: timestamp("booking_created_at").defaultNow(),
  // No-show tracking
  noShow: boolean("no_show").default(false),
  noShowMarkedAt: timestamp("no_show_marked_at"),
  noShowMarkedBy: noShowMarkedByEnum("no_show_marked_by"),
  noShowMarkedByUserId: varchar("no_show_marked_by_user_id").references(
    () => users.id,
  ),
  noShowReason: text("no_show_reason"),
  // Cancellation tracking
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: varchar("cancelled_by", { length: 20 }), // 'guest' or 'owner' or 'admin'
  cancellationReason: text("cancellation_reason"),
  // Refund tracking for cancelled bookings
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundPercentage: integer("refund_percentage"), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Availability overrides table - for date-range holds/sold-out/maintenance (now room-type specific)
export const availabilityOverrides = pgTable(
  "availability_overrides",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomTypeId: varchar("room_type_id").references(() => roomTypes.id, {
      onDelete: "cascade",
    }),
    overrideType: availabilityOverrideTypeEnum("override_type").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    reason: text("reason"),
    availableRooms: integer("available_rooms"),
    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_property_dates").on(
      table.propertyId,
      table.startDate,
      table.endDate,
    ),
    index("idx_roomtype_dates").on(
      table.roomTypeId,
      table.startDate,
      table.endDate,
    ),
  ],
);

// Conversations table
export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    guestId: varchar("guest_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniquePropertyGuest: uniqueIndex("unique_property_guest").on(
      table.propertyId,
      table.guestId,
    ),
  }),
);

// Messages table
// Message attachment type for storing file metadata
export type MessageAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
};

// Message type enum for special message types
export const messageTypeEnum = pgEnum("message_type", [
  "text", // Regular text message
  "booking_request", // Booking request from guest
  "booking_update", // Status update for booking
]);

export const messages = pgTable(
  "messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    messageType: messageTypeEnum("message_type").notNull().default("text"),
    bookingId: varchar("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    attachments: jsonb("attachments").$type<MessageAttachment[]>(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_conversation_created").on(table.conversationId, table.createdAt),
  ],
);

// Reviews table
export const reviews = pgTable(
  "reviews",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    guestId: varchar("guest_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookingId: varchar("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    photos: text("photos")
      .array()
      .default(sql`ARRAY[]::text[]`),
    helpful: integer("helpful").notNull().default(0),
    ownerResponse: text("owner_response"),
    ownerResponseAt: timestamp("owner_response_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_property_rating").on(table.propertyId, table.rating)],
);

// Contact interaction actor role enum
export const contactActorRoleEnum = pgEnum("contact_actor_role", [
  "guest",
  "owner",
]);

// Contact interaction target role enum
export const contactTargetRoleEnum = pgEnum("contact_target_role", [
  "guest",
  "owner",
]);

// Contact interaction action type enum
export const contactActionTypeEnum = pgEnum("contact_action_type", [
  "call",
  "whatsapp",
]);

// Contact Interactions table - for logging call/WhatsApp clicks for audit and monetization
export const contactInteractions = pgTable(
  "contact_interactions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    actorUserId: varchar("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorRole: contactActorRoleEnum("actor_role").notNull(),
    targetRole: contactTargetRoleEnum("target_role").notNull(),
    actionType: contactActionTypeEnum("action_type").notNull(),
    targetPhoneLast4: varchar("target_phone_last4", { length: 4 }),
    metadata: jsonb("metadata").$type<{
      userAgent?: string;
      page?: string;
      propertyId?: string;
      propertyName?: string;
    }>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_contact_booking").on(table.bookingId),
    index("idx_contact_actor").on(table.actorUserId),
    index("idx_contact_created").on(table.createdAt),
  ],
);

// Destinations table - Best places to visit in India
export const destinations = pgTable(
  "destinations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 255 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    shortDescription: text("short_description").notNull(),
    detailedInsight: text("detailed_insight").notNull(),
    highlights: text("highlights")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    famousFor: text("famous_for")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    thingsToDo: text("things_to_do")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    imageUrl: text("image_url").notNull(),
    bestSeason: varchar("best_season", { length: 100 }),
    isFeatured: boolean("is_featured").notNull().default(false),
    featuredDate: timestamp("featured_date"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_featured").on(table.isFeatured, table.featuredDate)],
);

// Search history table - tracks user searches for personalization
export const searchHistory = pgTable(
  "search_history",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    destination: varchar("destination", { length: 255 }).notNull(),
    checkIn: timestamp("check_in"),
    checkOut: timestamp("check_out"),
    guests: integer("guests"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_user_created").on(table.userId, table.createdAt)],
);

// KYC Applications table - stores OWNER IDENTITY VERIFICATION with document uploads
export const kycApplications = pgTable(
  "kyc_applications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    flatNo: varchar("flat_no", { length: 50 }),
    houseNo: varchar("house_no", { length: 50 }),
    streetAddress: varchar("street_address", { length: 255 }).notNull(),
    landmark: varchar("landmark", { length: 255 }),
    locality: varchar("locality", { length: 255 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    pincode: varchar("pincode", { length: 10 }).notNull(),
    gstNumber: varchar("gst_number", { length: 20 }),
    panNumber: varchar("pan_number", { length: 20 }).notNull(),
    propertyOwnershipDocs: jsonb("property_ownership_docs"),
    identityProofDocs: jsonb("identity_proof_docs"),
    businessLicenseDocs: jsonb("business_license_docs"),
    nocDocs: jsonb("noc_docs"),
    safetyCertificateDocs: jsonb("safety_certificate_docs"),
    status: kycStatusEnum("status").notNull().default("pending"),
    reviewedBy: varchar("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    rejectionDetails: jsonb("rejection_details"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_status_created").on(table.status, table.createdAt),
    index("idx_user_id").on(table.userId),
    uniqueIndex("idx_user_unique_kyc").on(table.userId),
  ],
);

// Property Deactivation Requests table - owner submits requests, admin approves/rejects
export const propertyDeactivationRequests = pgTable(
  "property_deactivation_requests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    requestType: varchar("request_type", { length: 20 })
      .notNull()
      .default("deactivate"), // "deactivate" or "delete"
    status: deactivationRequestStatusEnum("status")
      .notNull()
      .default("pending"),
    adminId: varchar("admin_id").references(() => users.id, {
      onDelete: "set null",
    }),
    adminNotes: text("admin_notes"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_deactivation_property").on(table.propertyId),
    index("idx_deactivation_status").on(table.status),
    index("idx_deactivation_owner").on(table.ownerId),
  ],
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  properties: many(properties),
  wishlists: many(wishlists),
  preferences: one(userPreferences),
  searchHistory: many(searchHistory),
  bookingsAsGuest: many(bookings, { relationName: "guestBookings" }),
  conversationsAsGuest: many(conversations, {
    relationName: "guestConversations",
  }),
  conversationsAsOwner: many(conversations, {
    relationName: "ownerConversations",
  }),
  sentMessages: many(messages),
  reviews: many(reviews),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  roomTypes: many(roomTypes),
  rooms: many(rooms), // Alias for roomTypes
  amenities: many(propertyAmenities),
  wishlists: many(wishlists),
  bookings: many(bookings),
  conversations: many(conversations),
  reviews: many(reviews),
  availabilityOverrides: many(availabilityOverrides),
}));

export const availabilityOverridesRelations = relations(
  availabilityOverrides,
  ({ one }) => ({
    property: one(properties, {
      fields: [availabilityOverrides.propertyId],
      references: [properties.id],
    }),
    roomType: one(roomTypes, {
      fields: [availabilityOverrides.roomTypeId],
      references: [roomTypes.id],
    }),
    createdByUser: one(users, {
      fields: [availabilityOverrides.createdBy],
      references: [users.id],
    }),
  }),
);

export const roomTypesRelations = relations(roomTypes, ({ one, many }) => ({
  property: one(properties, {
    fields: [roomTypes.propertyId],
    references: [properties.id],
  }),
  roomOptions: many(roomOptions),
  availabilityOverrides: many(availabilityOverrides),
  bookings: many(bookings),
}));

export const roomOptionsRelations = relations(roomOptions, ({ one }) => ({
  roomType: one(roomTypes, {
    fields: [roomOptions.roomTypeId],
    references: [roomTypes.id],
  }),
}));

// Alias for backwards compatibility
export const roomsRelations = roomTypesRelations;

export const propertyAmenitiesRelations = relations(
  propertyAmenities,
  ({ one }) => ({
    property: one(properties, {
      fields: [propertyAmenities.propertyId],
      references: [properties.id],
    }),
    amenity: one(amenities, {
      fields: [propertyAmenities.amenityId],
      references: [amenities.id],
    }),
  }),
);

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [wishlists.propertyId],
    references: [properties.id],
  }),
}));

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  property: one(properties, {
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
  guest: one(users, {
    fields: [bookings.guestId],
    references: [users.id],
    relationName: "guestBookings",
  }),
  roomType: one(roomTypes, {
    fields: [bookings.roomTypeId],
    references: [roomTypes.id],
  }),
  roomOption: one(roomOptions, {
    fields: [bookings.roomOptionId],
    references: [roomOptions.id],
  }),
  reviews: many(reviews),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    property: one(properties, {
      fields: [conversations.propertyId],
      references: [properties.id],
    }),
    guest: one(users, {
      fields: [conversations.guestId],
      references: [users.id],
      relationName: "guestConversations",
    }),
    owner: one(users, {
      fields: [conversations.ownerId],
      references: [users.id],
      relationName: "ownerConversations",
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  property: one(properties, {
    fields: [reviews.propertyId],
    references: [properties.id],
  }),
  guest: one(users, {
    fields: [reviews.guestId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
}));

export const kycApplicationsRelations = relations(
  kycApplications,
  ({ one }) => ({
    user: one(users, {
      fields: [kycApplications.userId],
      references: [users.id],
    }),
    reviewer: one(users, {
      fields: [kycApplications.reviewedBy],
      references: [users.id],
    }),
  }),
);

export const propertyDeactivationRequestsRelations = relations(
  propertyDeactivationRequests,
  ({ one }) => ({
    property: one(properties, {
      fields: [propertyDeactivationRequests.propertyId],
      references: [properties.id],
    }),
    owner: one(users, {
      fields: [propertyDeactivationRequests.ownerId],
      references: [users.id],
    }),
    admin: one(users, {
      fields: [propertyDeactivationRequests.adminId],
      references: [users.id],
    }),
  }),
);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertProperty = typeof properties.$inferInsert;
export type Property = typeof properties.$inferSelect;

export type InsertRoom = typeof rooms.$inferInsert;
export type Room = typeof rooms.$inferSelect;

export type RoomType = typeof roomTypes.$inferSelect;
export type InsertRoomType = typeof roomTypes.$inferInsert;

export type RoomOption = typeof roomOptions.$inferSelect;
export type InsertRoomOption = typeof roomOptions.$inferInsert;

export type Amenity = typeof amenities.$inferSelect;
export type InsertAmenity = typeof amenities.$inferInsert;

export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = typeof wishlists.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type InsertAvailabilityOverride =
  typeof availabilityOverrides.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export type KycApplication = typeof kycApplications.$inferSelect;
export type InsertKycApplication = typeof kycApplications.$inferInsert;

export type PropertyDeactivationRequest =
  typeof propertyDeactivationRequests.$inferSelect;
export type InsertPropertyDeactivationRequest =
  typeof propertyDeactivationRequests.$inferInsert;

export type ContactInteraction = typeof contactInteractions.$inferSelect;
export type InsertContactInteraction = typeof contactInteractions.$inferInsert;

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties)
  .omit({
    id: true,
    propertyCode: true,
    ownerId: true,
    createdAt: true,
    updatedAt: true,
    rating: true,
    reviewCount: true,
  })
  .extend({
    amenityIds: z.array(z.string()).optional(),
    videos: z.array(z.string()).default([]),
    pricePerNight: z.string().or(z.number()).pipe(z.coerce.number()),
    latitude: z
      .string()
      .or(z.number())
      .nullable()
      .optional()
      .pipe(z.coerce.number().nullable().optional()),
    longitude: z
      .string()
      .or(z.number())
      .nullable()
      .optional()
      .pipe(z.coerce.number().nullable().optional()),
  });

export const insertRoomSchema = createInsertSchema(rooms)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    basePrice: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number().min(100))
      .transform((v) => String(v)),
    maxGuests: z.coerce.number().int().min(1).optional(),
    totalRooms: z.coerce.number().int().min(1).optional(),
  });

export const insertRoomTypeSchema = createInsertSchema(roomTypes)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    basePrice: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number().min(100))
      .transform((v) => String(v)),
    originalPrice: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number().min(0))
      .transform((v) => String(v))
      .nullable()
      .optional(),
    maxGuests: z.coerce.number().int().min(1).optional(),
    totalRooms: z.coerce.number().int().min(1).optional(),
    singleOccupancyBase: z.coerce.number().int().min(1).optional(),
    doubleOccupancyAdjustment: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number().min(0))
      .transform((v) => String(v))
      .nullable()
      .optional(),
    tripleOccupancyAdjustment: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number().min(0))
      .transform((v) => String(v))
      .nullable()
      .optional(),
  });

export const insertRoomOptionSchema = createInsertSchema(roomOptions)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    priceAdjustment: z
      .string()
      .or(z.number())
      .transform((v) => String(v)),
    originalPriceAdjustment: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number().min(0))
      .transform((v) => String(v))
      .nullable()
      .optional(),
  });

export const insertWishlistSchema = createInsertSchema(wishlists).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(
  userPreferences,
).omit({
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings)
  .omit({
    id: true,
    bookingCode: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date(),
    totalPrice: z.string().or(z.number().transform((v) => v.toString())),
    roomPrice: z
      .string()
      .or(z.number().transform((v) => v.toString()))
      .optional()
      .nullable(),
    mealPrice: z
      .string()
      .or(z.number().transform((v) => v.toString()))
      .optional()
      .nullable(),
    platformFee: z
      .string()
      .or(z.number().transform((v) => v.toString()))
      .optional()
      .nullable(),
    gstAmount: z
      .string()
      .or(z.number().transform((v) => v.toString()))
      .optional()
      .nullable(),
    advanceAmount: z
      .string()
      .or(z.number().transform((v) => v.toString()))
      .optional()
      .nullable(),
    guestName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .optional()
      .nullable(),
    guestMobile: z
      .string()
      .min(10, "Enter a valid mobile number")
      .optional()
      .nullable(),
    guestEmail: z.string().email("Enter a valid email").optional().nullable(),
    gstNumber: z.string().optional().nullable(),
    specialRequests: z.string().optional().nullable(),
    adults: z.number().int().min(1).optional().nullable(),
    childrenCount: z.number().int().min(0).optional().nullable(),
  });

export const insertAvailabilityOverrideSchema = createInsertSchema(
  availabilityOverrides,
)
  .omit({
    id: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  });

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  read: true,
});

export const insertReviewSchema = createInsertSchema(reviews)
  .omit({
    id: true,
    createdAt: true,
    helpful: true,
    ownerResponse: true,
    ownerResponseAt: true,
  })
  .extend({
    rating: z.number().min(1).max(5),
  });

export const insertKycApplicationSchema = createInsertSchema(
  kycApplications,
).omit({
  id: true,
  userId: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  rejectionDetails: true,
  createdAt: true,
  updatedAt: true,
});

export type KycApplicationFormData = z.infer<typeof insertKycApplicationSchema>;

export const insertDeactivationRequestSchema = createInsertSchema(
  propertyDeactivationRequests,
).omit({
  id: true,
  ownerId: true,
  status: true,
  adminId: true,
  adminNotes: true,
  processedAt: true,
  createdAt: true,
});

export type DeactivationRequestFormData = z.infer<
  typeof insertDeactivationRequestSchema
>;

export const insertContactInteractionSchema = createInsertSchema(
  contactInteractions,
).omit({
  id: true,
  createdAt: true,
});

export type InsertContactInteractionData = z.infer<
  typeof insertContactInteractionSchema
>;

// KYC update schema - validates owner registration flow
export const updateKYCSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z.string().min(10, "Valid phone number is required").optional(),
  kycAddress: z.string().min(10, "Full address is required").optional(),
  governmentIdType: z
    .enum(["aadhaar", "pan", "passport", "driving_license", "voter_id"])
    .optional(),
  governmentIdNumber: z
    .string()
    .min(5, "Valid ID number is required")
    .optional(),
  userRole: z.enum(["guest", "owner"]).optional(),
});

// Schema for becoming an owner - requires all KYC fields
export const becomeOwnerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  kycAddress: z.string().min(10, "Full address is required"),
  governmentIdType: z.enum([
    "aadhaar",
    "pan",
    "passport",
    "driving_license",
    "voter_id",
  ]),
  governmentIdNumber: z.string().min(5, "Valid ID number is required"),
  userRole: z.literal("owner"),
});

// Destinations insert schema and types
export const insertDestinationSchema = createInsertSchema(destinations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDestination = z.infer<typeof insertDestinationSchema>;
export type Destination = typeof destinations.$inferSelect;

// Search history insert schema and types
export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit(
  {
    id: true,
    userId: true,
    createdAt: true,
  },
);

export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;

// Property image categories with captions
export type PropertyImageCategory =
  | "exterior"
  | "reception"
  | "room"
  | "bathroom"
  | "amenities"
  | "food";

export interface CategorizedImage {
  url: string;
  caption?: string;
  category: PropertyImageCategory;
}

export interface CategorizedPropertyImages {
  exterior: CategorizedImage[];
  reception: CategorizedImage[];
  room: CategorizedImage[];
  bathroom: CategorizedImage[];
  amenities: CategorizedImage[];
  food: CategorizedImage[];
}

// KYC Document types
export interface KycDocument {
  url: string;
  documentType: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface PropertyOwnershipDoc extends KycDocument {
  documentType:
    | "property_registration"
    | "sale_deed"
    | "property_tax"
    | "lease_agreement";
}

export interface IdentityProofDoc extends KycDocument {
  documentType: "passport" | "aadhaar" | "voter_id" | "driving_license";
}

export interface BusinessLicenseDoc extends KycDocument {
  documentType: "trade_license" | "hotel_registration" | "gst_registration";
}

export interface NocDoc extends KycDocument {
  documentType: "owner_noc" | "municipality_noc";
}

export interface SafetyCertificateDoc extends KycDocument {
  documentType: "fire_safety" | "electrical_safety" | "lift_safety";
}

// KYC Section identifiers for targeted rejection feedback
export type KycSectionId =
  | "personal" // Personal Information (name, email, phone)
  | "business" // Business Info (business name, address, city, state, pincode, PAN, GST)
  | "propertyOwnership" // Property Ownership Documents
  | "identityProof" // Identity Proof Documents
  | "businessLicense" // Business License Documents
  | "noc" // NOC Documents
  | "safetyCertificates"; // Safety Certificate Documents

// Individual rejection item for a specific section
export interface KycRejectionItem {
  sectionId: KycSectionId;
  message: string; // Specific feedback for this section
}

// Complete rejection details structure stored in the database
export interface KycRejectionDetails {
  sections?: KycRejectionItem[]; // List of sections that need attention
  isRevocation?: boolean; // True if this is a revocation of previously verified status
}

// ============================================
// AI Support Chat System
// ============================================

// Support conversation status enum
export const supportConversationStatusEnum = pgEnum(
  "support_conversation_status",
  ["open", "escalated", "closed"],
);

// Support message sender type enum
export const supportSenderTypeEnum = pgEnum("support_sender_type", [
  "user",
  "ai",
  "admin",
]);

// Support ticket status enum
export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "new",
  "in_progress",
  "resolved",
  "closed",
]);

// Support ticket priority enum
export const supportTicketPriorityEnum = pgEnum("support_ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

// Support conversations table
export const supportConversations = pgTable(
  "support_conversations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    userRole: varchar("user_role", { length: 20 }).notNull().default("guest"), // guest or owner
    status: supportConversationStatusEnum("status").notNull().default("open"),
    subject: varchar("subject", { length: 255 }),
    assignedAdminId: varchar("assigned_admin_id").references(() => users.id),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    escalatedAt: timestamp("escalated_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_support_conv_user").on(table.userId),
    index("IDX_support_conv_status").on(table.status),
    index("IDX_support_conv_assigned").on(table.assignedAdminId),
    index("IDX_support_conv_activity").on(table.lastActivityAt),
  ],
);

export type SupportConversation = typeof supportConversations.$inferSelect;
export type InsertSupportConversation =
  typeof supportConversations.$inferInsert;
export const insertSupportConversationSchema = createInsertSchema(
  supportConversations,
).omit({
  id: true,
  createdAt: true,
  lastActivityAt: true,
});

// Support messages table
export const supportMessages = pgTable(
  "support_messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => supportConversations.id),
    senderType: supportSenderTypeEnum("sender_type").notNull(),
    senderId: varchar("sender_id"), // null for AI messages
    content: text("content").notNull(),
    metadata: jsonb("metadata"), // For AI confidence, intent, etc.
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_support_msg_conv").on(table.conversationId),
    index("IDX_support_msg_sender").on(table.senderType),
    index("IDX_support_msg_created").on(table.createdAt),
  ],
);

export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = typeof supportMessages.$inferInsert;
export const insertSupportMessageSchema = createInsertSchema(
  supportMessages,
).omit({
  id: true,
  createdAt: true,
});

// Support tickets table (for escalations)
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => supportConversations.id),
    ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
    reason: text("reason").notNull(),
    priority: supportTicketPriorityEnum("priority").notNull().default("medium"),
    status: supportTicketStatusEnum("status").notNull().default("new"),
    autoGenerated: boolean("auto_generated").default(false),
    assignedTo: varchar("assigned_to").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("IDX_support_ticket_conv").on(table.conversationId),
    index("IDX_support_ticket_status").on(table.status),
    index("IDX_support_ticket_priority").on(table.priority),
    index("IDX_support_ticket_assigned").on(table.assignedTo),
  ],
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export const insertSupportTicketSchema = createInsertSchema(
  supportTickets,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ticketNumber: true,
});

// Relations for support tables
export const supportConversationsRelations = relations(
  supportConversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [supportConversations.userId],
      references: [users.id],
    }),
    assignedAdmin: one(users, {
      fields: [supportConversations.assignedAdminId],
      references: [users.id],
    }),
    messages: many(supportMessages),
    tickets: many(supportTickets),
  }),
);

export const supportMessagesRelations = relations(
  supportMessages,
  ({ one }) => ({
    conversation: one(supportConversations, {
      fields: [supportMessages.conversationId],
      references: [supportConversations.id],
    }),
  }),
);

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  conversation: one(supportConversations, {
    fields: [supportTickets.conversationId],
    references: [supportConversations.id],
  }),
  assignedUser: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
  }),
}));

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_request",
  "booking_confirmed",
  "booking_cancelled",
  "booking_completed",
  "review_received",
  "message_received",
  "kyc_approved",
  "kyc_rejected",
  "property_approved",
  "property_rejected",
  "system",
]);

// In-app notifications table
export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    type: notificationTypeEnum("type").notNull().default("system"),
    entityId: varchar("entity_id"),
    entityType: varchar("entity_type", { length: 50 }),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_notification_user").on(table.userId),
    index("IDX_notification_read").on(table.isRead),
    index("IDX_notification_created").on(table.createdAt),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Notification relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Chat logs for analytics
export const chatLogs = pgTable(
  "chat_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id").references(() => bookings.id),
    propertyId: varchar("property_id").references(() => properties.id),
    ownerId: varchar("owner_id").references(() => users.id),
    guestId: varchar("guest_id").references(() => users.id),
    senderRole: varchar("sender_role", { length: 20 }),
    messageCount: integer("message_count").default(0),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_chat_log_owner").on(table.ownerId),
    index("IDX_chat_log_property").on(table.propertyId),
    index("IDX_chat_log_created").on(table.createdAt),
  ],
);

export type ChatLog = typeof chatLogs.$inferSelect;
export type InsertChatLog = typeof chatLogs.$inferInsert;

// Call logs for analytics
export const callLogs = pgTable(
  "call_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id").references(() => bookings.id),
    propertyId: varchar("property_id").references(() => properties.id),
    ownerId: varchar("owner_id").references(() => users.id),
    guestId: varchar("guest_id").references(() => users.id),
    initiatedBy: varchar("initiated_by", { length: 20 }),
    callType: varchar("call_type", { length: 20 }),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_call_log_owner").on(table.ownerId),
    index("IDX_call_log_property").on(table.propertyId),
    index("IDX_call_log_created").on(table.createdAt),
  ],
);

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

// Relations for chat/call logs
export const chatLogsRelations = relations(chatLogs, ({ one }) => ({
  owner: one(users, {
    fields: [chatLogs.ownerId],
    references: [users.id],
  }),
  guest: one(users, {
    fields: [chatLogs.guestId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [chatLogs.propertyId],
    references: [properties.id],
  }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  owner: one(users, {
    fields: [callLogs.ownerId],
    references: [users.id],
  }),
  guest: one(users, {
    fields: [callLogs.guestId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [callLogs.propertyId],
    references: [properties.id],
  }),
}));

// Push notification subscriptions
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .references(() => users.id)
      .notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("IDX_push_sub_user").on(table.userId),
    uniqueIndex("IDX_push_sub_endpoint").on(table.endpoint),
  ],
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  }),
);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "web_push",
  "websocket",
  "in_app",
  "email",
]);

export const notificationDeliveryStatusEnum = pgEnum(
  "notification_delivery_status",
  ["sent", "delivered", "failed", "clicked", "dismissed"],
);

export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .references(() => users.id)
      .notNull(),
    bookingId: varchar("booking_id").references(() => bookings.id),
    channel: notificationChannelEnum("channel").notNull(),
    status: notificationDeliveryStatusEnum("status").notNull().default("sent"),
    title: varchar("title", { length: 255 }),
    body: text("body"),
    error: text("error"),
    devicePlatform: varchar("device_platform", { length: 50 }),
    sentAt: timestamp("sent_at").defaultNow(),
    deliveredAt: timestamp("delivered_at"),
    actionTaken: varchar("action_taken", { length: 50 }),
    actionAt: timestamp("action_at"),
  },
  (table) => [
    index("IDX_notif_log_user").on(table.userId),
    index("IDX_notif_log_booking").on(table.bookingId),
  ],
);

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationLogs.userId],
      references: [users.id],
    }),
    booking: one(bookings, {
      fields: [notificationLogs.bookingId],
      references: [bookings.id],
    }),
  }),
);

// Site-wide settings (singleton row) — logo URL, alt text, coming soon mode, etc.
export const siteSettings = pgTable("site_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  logoUrl: text("logo_url"),
  logoAlt: varchar("logo_alt", { length: 255 }).default("ZECOHO"),
  comingSoonMode: boolean("coming_soon_mode").default(false),
  comingSoonEnabledAt: timestamp("coming_soon_enabled_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = typeof siteSettings.$inferInsert;
export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertSiteSettingsData = z.infer<typeof insertSiteSettingsSchema>;

// Waitlist — visitors who submit their info while site is in Coming Soon mode
export const waitlist = pgTable("waitlist", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = typeof waitlist.$inferInsert;
export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
});

// Tester whitelist — emails admin has approved to bypass Coming Soon gate
export const testerWhitelist = pgTable("tester_whitelist", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  note: text("note"),
  addedBy: varchar("added_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TesterWhitelist = typeof testerWhitelist.$inferSelect;
export type InsertTesterWhitelist = typeof testerWhitelist.$inferInsert;
export const insertTesterWhitelistSchema = createInsertSchema(
  testerWhitelist,
).omit({ id: true, createdAt: true });

// ============================================================
// PRICING OVERRIDE TABLES
// ============================================================

// Room price overrides — per date, per room type
// Allows owner to set a custom base room price for specific dates
export const roomPriceOverrides = pgTable(
  "room_price_overrides",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomTypeId: varchar("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(), // ISO date string "YYYY-MM-DD"
    roomPrice: decimal("room_price", { precision: 10, scale: 2 }).notNull(),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_room_price_override_property").on(table.propertyId),
    index("IDX_room_price_override_room_type").on(table.roomTypeId),
    index("IDX_room_price_override_date").on(table.date),
    uniqueIndex("IDX_room_price_override_unique").on(
      table.roomTypeId,
      table.date,
    ),
  ],
);

export type RoomPriceOverride = typeof roomPriceOverrides.$inferSelect;
export type InsertRoomPriceOverride = typeof roomPriceOverrides.$inferInsert;
export const insertRoomPriceOverrideSchema = createInsertSchema(
  roomPriceOverrides,
).omit({ id: true, createdAt: true });
export type InsertRoomPriceOverrideData = z.infer<
  typeof insertRoomPriceOverrideSchema
>;

// Meal plan price overrides — per date, per room option
// Allows owner to set a custom meal plan price for specific dates
export const mealPlanPriceOverrides = pgTable(
  "meal_plan_price_overrides",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roomOptionId: varchar("room_option_id")
      .notNull()
      .references(() => roomOptions.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(), // ISO date string "YYYY-MM-DD"
    price: decimal("price", { precision: 10, scale: 2 }).notNull(), // per person per night
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("IDX_meal_plan_override_option").on(table.roomOptionId),
    index("IDX_meal_plan_override_date").on(table.date),
    uniqueIndex("IDX_meal_plan_override_unique").on(
      table.roomOptionId,
      table.date,
    ),
  ],
);

export type MealPlanPriceOverride = typeof mealPlanPriceOverrides.$inferSelect;
export type InsertMealPlanPriceOverride =
  typeof mealPlanPriceOverrides.$inferInsert;
export const insertMealPlanPriceOverrideSchema = createInsertSchema(
  mealPlanPriceOverrides,
).omit({ id: true, createdAt: true });
export type InsertMealPlanPriceOverrideData = z.infer<
  typeof insertMealPlanPriceOverrideSchema
>;

// Relations for pricing overrides
export const roomPriceOverridesRelations = relations(
  roomPriceOverrides,
  ({ one }) => ({
    property: one(properties, {
      fields: [roomPriceOverrides.propertyId],
      references: [properties.id],
    }),
    roomType: one(roomTypes, {
      fields: [roomPriceOverrides.roomTypeId],
      references: [roomTypes.id],
    }),
    createdByUser: one(users, {
      fields: [roomPriceOverrides.createdBy],
      references: [users.id],
    }),
  }),
);

export const mealPlanPriceOverridesRelations = relations(
  mealPlanPriceOverrides,
  ({ one }) => ({
    roomOption: one(roomOptions, {
      fields: [mealPlanPriceOverrides.roomOptionId],
      references: [roomOptions.id],
    }),
    createdByUser: one(users, {
      fields: [mealPlanPriceOverrides.createdBy],
      references: [users.id],
    }),
  }),
);
