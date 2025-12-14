// Referenced from blueprint:javascript_log_in_with_replit and blueprint:javascript_database
import { sql, relations } from 'drizzle-orm';
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
export const registrationMethodEnum = pgEnum("registration_method", ["replit", "local"]);

// OTP purpose enum
export const otpPurposeEnum = pgEnum("otp_purpose", ["signup", "login", "password_reset"]);

// OTP codes table for email/phone authentication
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
]);

// Booking status enum
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

// KYC status enum
export const kycStatusEnum = pgEnum("kyc_status", [
  "not_started",
  "pending",
  "verified",
  "rejected",
]);

// Listing mode enum - for owner onboarding flow
export const listingModeEnum = pgEnum("listing_mode", ["not_selected", "quick", "full"]);

// User storage table - supports both Replit Auth and local registration
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userRole: userRoleEnum("user_role").notNull().default("guest"),
  additionalRoles: text("additional_roles").array().default(sql`ARRAY[]::text[]`),
  phone: varchar("phone", { length: 20 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  registrationMethod: registrationMethodEnum("registration_method").notNull().default("replit"),
  emailVerifiedAt: timestamp("email_verified_at"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  kycAddress: text("kyc_address"),
  governmentIdType: varchar("government_id_type", { length: 50 }),
  governmentIdNumber: varchar("government_id_number", { length: 100 }),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("not_started"),
  kycVerifiedAt: timestamp("kyc_verified_at"),
  listingMode: listingModeEnum("listing_mode").notNull().default("not_selected"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  categorizedImages: jsonb("categorized_images"),
  videos: text("videos").array().notNull().default(sql`ARRAY[]::text[]`),
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
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
  safetyFeatures: text("safety_features").array().default(sql`ARRAY[]::text[]`),
  cancellationPolicy: text("cancellation_policy"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Amenities table
export const amenities = pgTable("amenities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  category: varchar("category", { length: 50 }),
});

// Property amenities junction table
export const propertyAmenities = pgTable("property_amenities", {
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  amenityId: varchar("amenity_id").notNull().references(() => amenities.id, { onDelete: "cascade" }),
});

// Rooms table
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  maxOccupancy: integer("max_occupancy").notNull().default(2),
  quantity: integer("quantity").notNull().default(1),
  images: text("images").array().default(sql`ARRAY[]::text[]`),
});

// Wishlists table
export const wishlists = pgTable("wishlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserProperty: uniqueIndex("unique_user_property").on(table.userId, table.propertyId),
}));

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  tripPurpose: varchar("trip_purpose", { length: 100 }),
  preferredPropertyTypes: text("preferred_property_types").array().default(sql`ARRAY[]::text[]`),
  budgetMin: decimal("budget_min", { precision: 10, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 10, scale: 2 }),
  preferredAmenities: text("preferred_amenities").array().default(sql`ARRAY[]::text[]`),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestId: varchar("guest_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  guests: integer("guests").notNull().default(1),
  status: bookingStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestId: varchar("guest_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePropertyGuest: uniqueIndex("unique_property_guest").on(table.propertyId, table.guestId),
}));

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_conversation_created").on(table.conversationId, table.createdAt),
]);

// Reviews table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestId: varchar("guest_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookingId: varchar("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  photos: text("photos").array().default(sql`ARRAY[]::text[]`),
  helpful: integer("helpful").notNull().default(0),
  ownerResponse: text("owner_response"),
  ownerResponseAt: timestamp("owner_response_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_property_rating").on(table.propertyId, table.rating),
]);

// Destinations table - Best places to visit in India
export const destinations = pgTable("destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  shortDescription: text("short_description").notNull(),
  detailedInsight: text("detailed_insight").notNull(),
  highlights: text("highlights").array().notNull().default(sql`ARRAY[]::text[]`),
  famousFor: text("famous_for").array().notNull().default(sql`ARRAY[]::text[]`),
  thingsToDo: text("things_to_do").array().notNull().default(sql`ARRAY[]::text[]`),
  imageUrl: text("image_url").notNull(),
  bestSeason: varchar("best_season", { length: 100 }),
  isFeatured: boolean("is_featured").notNull().default(false),
  featuredDate: timestamp("featured_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_featured").on(table.isFeatured, table.featuredDate),
]);

// Search history table - tracks user searches for personalization
export const searchHistory = pgTable("search_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  destination: varchar("destination", { length: 255 }).notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  guests: integer("guests"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_created").on(table.userId, table.createdAt),
]);

// KYC Applications table - stores OWNER IDENTITY VERIFICATION with document uploads
export const kycApplications = pgTable("kyc_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionDetails: jsonb("rejection_details"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_status_created").on(table.status, table.createdAt),
  index("idx_user_id").on(table.userId),
  uniqueIndex("idx_user_unique_kyc").on(table.userId),
]);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  properties: many(properties),
  wishlists: many(wishlists),
  preferences: one(userPreferences),
  searchHistory: many(searchHistory),
  bookingsAsGuest: many(bookings, { relationName: "guestBookings" }),
  conversationsAsGuest: many(conversations, { relationName: "guestConversations" }),
  conversationsAsOwner: many(conversations, { relationName: "ownerConversations" }),
  sentMessages: many(messages),
  reviews: many(reviews),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(users, {
    fields: [properties.ownerId],
    references: [users.id],
  }),
  rooms: many(rooms),
  amenities: many(propertyAmenities),
  wishlists: many(wishlists),
  bookings: many(bookings),
  conversations: many(conversations),
  reviews: many(reviews),
}));

export const roomsRelations = relations(rooms, ({ one }) => ({
  property: one(properties, {
    fields: [rooms.propertyId],
    references: [properties.id],
  }),
}));

export const propertyAmenitiesRelations = relations(propertyAmenities, ({ one }) => ({
  property: one(properties, {
    fields: [propertyAmenities.propertyId],
    references: [properties.id],
  }),
  amenity: one(amenities, {
    fields: [propertyAmenities.amenityId],
    references: [amenities.id],
  }),
}));

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

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

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
  reviews: many(reviews),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
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
}));

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

export const kycApplicationsRelations = relations(kycApplications, ({ one }) => ({
  user: one(users, {
    fields: [kycApplications.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [kycApplications.reviewedBy],
    references: [users.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertProperty = typeof properties.$inferInsert;
export type Property = typeof properties.$inferSelect;

export type InsertRoom = typeof rooms.$inferInsert;
export type Room = typeof rooms.$inferSelect;

export type Amenity = typeof amenities.$inferSelect;
export type InsertAmenity = typeof amenities.$inferInsert;

export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = typeof wishlists.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export type KycApplication = typeof kycApplications.$inferSelect;
export type InsertKycApplication = typeof kycApplications.$inferInsert;

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
  reviewCount: true,
}).extend({
  amenityIds: z.array(z.string()).optional(),
  videos: z.array(z.string()).default([]),
  pricePerNight: z.string().or(z.number()).pipe(z.coerce.number()),
  latitude: z.string().or(z.number()).nullable().optional().pipe(z.coerce.number().nullable().optional()),
  longitude: z.string().or(z.number()).nullable().optional().pipe(z.coerce.number().nullable().optional()),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
});

export const insertWishlistSchema = createInsertSchema(wishlists).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  totalPrice: z.string().or(z.number().transform(v => v.toString())),
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

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  helpful: true,
  ownerResponse: true,
  ownerResponseAt: true,
}).extend({
  rating: z.number().min(1).max(5),
});

export const insertKycApplicationSchema = createInsertSchema(kycApplications).omit({
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

// KYC update schema - validates owner registration flow
export const updateKYCSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z.string().min(10, "Valid phone number is required").optional(),
  kycAddress: z.string().min(10, "Full address is required").optional(),
  governmentIdType: z.enum(["aadhaar", "pan", "passport", "driving_license", "voter_id"]).optional(),
  governmentIdNumber: z.string().min(5, "Valid ID number is required").optional(),
  userRole: z.enum(["guest", "owner"]).optional(),
});

// Schema for becoming an owner - requires all KYC fields
export const becomeOwnerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  kycAddress: z.string().min(10, "Full address is required"),
  governmentIdType: z.enum(["aadhaar", "pan", "passport", "driving_license", "voter_id"]),
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
export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  userId: true,
  createdAt: true,
});

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
  documentType: "property_registration" | "sale_deed" | "property_tax" | "lease_agreement";
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
  | "personal"       // Personal Information (name, email, phone)
  | "business"       // Business Info (business name, address, city, state, pincode, PAN, GST)
  | "propertyOwnership" // Property Ownership Documents
  | "identityProof"     // Identity Proof Documents
  | "businessLicense"   // Business License Documents
  | "noc"               // NOC Documents
  | "safetyCertificates"; // Safety Certificate Documents

// Individual rejection item for a specific section
export interface KycRejectionItem {
  sectionId: KycSectionId;
  message: string;       // Specific feedback for this section
}

// Complete rejection details structure stored in the database
export interface KycRejectionDetails {
  sections?: KycRejectionItem[];  // List of sections that need attention
  isRevocation?: boolean;  // True if this is a revocation of previously verified status
}
