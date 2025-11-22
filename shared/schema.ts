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

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["guest", "owner"]);

// Property types enum
export const propertyTypeEnum = pgEnum("property_type", [
  "hotel",
  "villa",
  "hostel",
  "lodge",
  "resort",
  "apartment",
  "cabin",
  "cottage",
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

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userRole: userRoleEnum("user_role").notNull().default("guest"),
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
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`),
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  maxGuests: integer("max_guests").notNull().default(2),
  bedrooms: integer("bedrooms").notNull().default(1),
  beds: integer("beds").notNull().default(1),
  bathrooms: integer("bathrooms").notNull().default(1),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  status: propertyStatusEnum("status").notNull().default("draft"),
  policies: text("policies"),
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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  properties: many(properties),
  wishlists: many(wishlists),
  preferences: one(userPreferences),
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

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
  reviewCount: true,
}).extend({
  amenityIds: z.array(z.string()).optional(),
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
