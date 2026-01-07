// Referenced from blueprint:javascript_log_in_with_replit and blueprint:javascript_database
import {
  users,
  properties,
  rooms,
  roomTypes,
  roomOptions,
  amenities,
  propertyAmenities,
  wishlists,
  userPreferences,
  bookings,
  conversations,
  messages,
  reviews,
  destinations,
  searchHistory,
  kycApplications,
  otpCodes,
  availabilityOverrides,
  propertyDeactivationRequests,
  policies,
  ownerAgreements,
  aboutUs,
  contactSettings,
  contactInteractions,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Room,
  type InsertRoom,
  type RoomType,
  type InsertRoomType,
  type RoomOption,
  type InsertRoomOption,
  type Amenity,
  type InsertAmenity,
  type Wishlist,
  type InsertWishlist,
  type UserPreferences,
  type InsertUserPreferences,
  type Booking,
  type InsertBooking,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Review,
  type InsertReview,
  type Destination,
  type InsertDestination,
  type SearchHistory,
  type InsertSearchHistory,
  type KycApplication,
  type InsertKycApplication,
  type KycApplicationFormData,
  type OtpCode,
  type InsertOtpCode,
  type AvailabilityOverride,
  type InsertAvailabilityOverride,
  type PropertyDeactivationRequest,
  type Policy,
  type InsertPolicy,
  type OwnerAgreement,
  type InsertOwnerAgreement,
  type AboutUs,
  type InsertAboutUs,
  type ContactSettings,
  type InsertContactSettings,
  type ContactInteraction,
  type InsertContactInteraction,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, lt, gt, inArray, sql, or, not, desc, count } from "drizzle-orm";

// Helper function to generate random alphanumeric code
function generateRandomCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function to generate unique property code (PROP-XXXXXX)
async function generatePropertyCode(): Promise<string> {
  // Use random alphanumeric to avoid race conditions and reuse issues
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `PROP-${generateRandomCode(6)}`;
    // Check if code already exists
    const [existing] = await db.select({ id: properties.id }).from(properties).where(eq(properties.propertyCode, code));
    if (!existing) {
      return code;
    }
  }
  // Fallback to timestamp-based if random fails
  return `PROP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// Helper function to generate unique booking code (BKG-XXXXXX)
async function generateBookingCode(): Promise<string> {
  // Use random alphanumeric to avoid race conditions and reuse issues
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `BKG-${generateRandomCode(6)}`;
    // Check if code already exists
    const [existing] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.bookingCode, code));
    if (!existing) {
      return code;
    }
  }
  // Fallback to timestamp-based if random fails
  return `BKG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  promoteUserToAdmin(email: string): Promise<User | undefined>;
  getAdminUsers(): Promise<User[]>;

  // Property operations
  getProperties(filters?: {
    destination?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minGuests?: number;
    ownerId?: string;
    localIdAllowed?: boolean;
    hourlyBookingAllowed?: boolean;
    foreignGuestsAllowed?: boolean;
    coupleFriendly?: boolean;
  }): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<void>;

  // Room Type operations (hotel-style room management)
  getRoomsByProperty(propertyId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<void>;
  getRoomType(id: string): Promise<RoomType | undefined>;
  getRoomTypes(propertyId: string): Promise<RoomType[]>;
  
  // Room Option operations (meal plans, amenity packages)
  getRoomOptions(roomTypeId: string): Promise<RoomOption[]>;
  getRoomOption(id: string): Promise<RoomOption | undefined>;
  createRoomOption(option: InsertRoomOption): Promise<RoomOption>;
  updateRoomOption(id: string, option: Partial<InsertRoomOption>): Promise<RoomOption | undefined>;
  deleteRoomOption(id: string): Promise<void>;

  // Wishlist operations
  getWishlists(userId: string): Promise<Wishlist[]>;
  createWishlist(wishlist: InsertWishlist): Promise<Wishlist>;
  deleteWishlist(id: string): Promise<void>;

  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;

  // Amenity operations
  getAllAmenities(): Promise<Amenity[]>;
  createAmenity(amenity: InsertAmenity): Promise<Amenity>;
  createAmenitiesIgnoreDuplicates(amenities: InsertAmenity[]): Promise<void>;
  getPropertyAmenities(propertyId: string): Promise<Amenity[]>;
  setPropertyAmenities(propertyId: string, amenityIds: string[]): Promise<void>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByProperty(propertyId: string): Promise<Booking[]>;
  getBookingsByGuest(guestId: string): Promise<Booking[]>;
  getPropertyBookedDates(propertyId: string, startDate: Date, endDate: Date, roomTypeId?: string | null): Promise<{ checkIn: Date; checkOut: Date }[]>;
  updateBookingStatus(id: string, status: "pending" | "confirmed" | "customer_confirmed" | "rejected" | "cancelled" | "checked_in" | "checked_out" | "completed" | "no_show", responseMessage?: string): Promise<Booking | undefined>;
  markCheckedIn(bookingId: string, userId: string): Promise<Booking | undefined>;
  markCheckedOut(bookingId: string, userId: string, isEarlyCheckout?: boolean): Promise<Booking | undefined>;
  markNoShow(bookingId: string, userId: string, markedBy: "owner" | "admin", reason?: string): Promise<Booking | undefined>;
  adminUnmarkNoShow(bookingId: string, userId: string): Promise<Booking | undefined>;
  cancelBooking(bookingId: string, cancelledBy: "guest" | "owner" | "admin", reason?: string): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  // Conversation operations
  getConversationsByUser(userId: string): Promise<(Conversation & { property: Property; guest: User; owner: User; unreadCount: number })[]>;
  getOrCreateConversation(propertyId: string, guestId: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string): Promise<(Message & { sender: User })[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByProperty(propertyId: string): Promise<(Review & { guest: User })[]>;
  getReview(id: string): Promise<Review | undefined>;
  getReviewByBookingId(bookingId: string): Promise<Review | undefined>;
  updateOwnerResponse(reviewId: string, response: string): Promise<Review | undefined>;
  getAverageRating(propertyId: string): Promise<number>;

  // Destination operations
  getAllDestinations(): Promise<Destination[]>;
  getFeaturedDestinations(): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | undefined>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  updateDestination(id: string, destination: Partial<InsertDestination>): Promise<Destination | undefined>;
  deleteDestination(id: string): Promise<void>;
  clearAllDestinations(): Promise<void>;
  setFeaturedDestination(id: string, isFeatured: boolean): Promise<Destination | undefined>;
  searchDestinations(query: string, limit?: number): Promise<{ id: string; name: string; state: string }[]>;

  // Search history operations
  createSearchHistory(userId: string, search: InsertSearchHistory): Promise<SearchHistory>;
  getUserSearchHistory(userId: string, limit?: number): Promise<SearchHistory[]>;
  deleteSearchHistory(id: string): Promise<void>;

  // KYC Application operations
  createKycApplication(userId: string, application: KycApplicationFormData): Promise<KycApplication>;
  getAllKycApplications(): Promise<KycApplication[]>;
  getKycApplicationsByStatus(status: "pending" | "verified" | "rejected"): Promise<KycApplication[]>;
  getUserKycApplication(userId: string): Promise<KycApplication | undefined>;
  getKycApplication(id: string): Promise<KycApplication | undefined>;
  updateKycApplicationStatus(id: string, status: "verified" | "rejected", reviewNotes?: string, rejectionDetails?: any): Promise<KycApplication | undefined>;
  updateKycApplication(id: string, updates: KycApplicationFormData): Promise<KycApplication | undefined>;
  deleteKycApplication(id: string): Promise<void>;

  // OTP operations
  createOtpCode(email: string, code: string, expiresAt: Date): Promise<OtpCode>;
  getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined>;
  incrementOtpAttempts(id: string): Promise<void>;
  markOtpVerified(id: string): Promise<void>;
  deleteExpiredOtpCodes(): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserFromEmail(email: string): Promise<User>;

  // Password-based auth operations
  createLocalUser(data: { firstName: string; lastName: string; email: string; passwordHash: string; termsAccepted: boolean; privacyAccepted: boolean; consentCommunication?: boolean }): Promise<User>;
  updateUserEmailVerified(userId: string): Promise<User | undefined>;
  updateUserPassword(userId: string, passwordHash: string): Promise<User | undefined>;

  // Owner dashboard operations
  getOwnerProperties(userId: string): Promise<Property[]>;
  getBookingsForProperties(propertyIds: string[]): Promise<Booking[]>;
  getReviewsForProperties(propertyIds: string[]): Promise<(Review & { guest: User })[]>;
  getRoomUtilization(propertyId: string, startDate: Date, endDate: Date): Promise<{
    roomTypeId: string;
    roomTypeName: string;
    totalRooms: number;
    confirmedRooms: number;
    pendingRooms: number;
    availableRooms: number;
  }[]>;
  getRoomUtilizationByDate(propertyId: string, roomTypeId: string, startDate: Date, endDate: Date): Promise<{
    date: string;
    confirmedRooms: number;
    pendingRooms: number;
    availableRooms: number;
    totalRooms: number;
  }[]>;

  // Availability Override operations
  getAvailabilityOverrides(propertyId: string): Promise<AvailabilityOverride[]>;
  createAvailabilityOverride(override: InsertAvailabilityOverride): Promise<AvailabilityOverride>;
  deleteAvailabilityOverride(id: string): Promise<void>;
  getPropertyBlockedDates(propertyId: string, startDate: Date, endDate: Date, roomTypeId?: string | null): Promise<{ startDate: Date; endDate: Date; type: string; roomTypeId: string | null }[]>;

  // Property Deactivation Request operations
  createDeactivationRequest(propertyId: string, ownerId: string, reason: string, requestType?: "deactivate" | "delete" | "reactivate"): Promise<PropertyDeactivationRequest>;
  getDeactivationRequest(id: string): Promise<PropertyDeactivationRequest | undefined>;
  getDeactivationRequestByProperty(propertyId: string): Promise<PropertyDeactivationRequest | undefined>;
  getDeactivationRequestsByOwner(ownerId: string): Promise<PropertyDeactivationRequest[]>;
  getAllPendingDeactivationRequests(): Promise<(PropertyDeactivationRequest & { property: Property; owner: User })[]>;
  processDeactivationRequest(id: string, adminId: string, status: "approved" | "rejected", adminNotes?: string): Promise<PropertyDeactivationRequest | undefined>;
  cancelDeactivationRequest(id: string): Promise<void>;
  fixMisclassifiedReactivationRequests(): Promise<number>;

  // Policy operations
  getAllPolicies(): Promise<Policy[]>;
  getPolicy(id: string): Promise<Policy | undefined>;
  getPolicyByTypeAndVersion(type: "terms" | "privacy", version: number): Promise<Policy | undefined>;
  getPublishedPolicy(type: "terms" | "privacy"): Promise<Policy | undefined>;
  getLatestPolicyVersion(type: "terms" | "privacy"): Promise<number>;
  createPolicy(policy: Omit<InsertPolicy, "id" | "createdAt" | "updatedAt">): Promise<Policy>;
  updatePolicy(id: string, updates: Partial<Pick<Policy, "title" | "content">>): Promise<Policy | undefined>;
  publishPolicy(id: string): Promise<Policy | undefined>;
  archivePolicy(id: string): Promise<Policy | undefined>;
  updateUserPolicyConsent(userId: string, termsVersion: number, privacyVersion: number, consentCommunication?: boolean): Promise<User | undefined>;

  // Owner Agreement operations
  getAllOwnerAgreements(): Promise<OwnerAgreement[]>;
  getOwnerAgreement(id: string): Promise<OwnerAgreement | undefined>;
  getOwnerAgreementByVersion(version: number): Promise<OwnerAgreement | undefined>;
  getPublishedOwnerAgreement(): Promise<OwnerAgreement | undefined>;
  getLatestOwnerAgreementVersion(): Promise<number>;
  createOwnerAgreement(agreement: Omit<InsertOwnerAgreement, "id" | "createdAt" | "updatedAt">): Promise<OwnerAgreement>;
  updateOwnerAgreement(id: string, updates: Partial<Pick<OwnerAgreement, "title" | "content">>): Promise<OwnerAgreement | undefined>;
  publishOwnerAgreement(id: string): Promise<OwnerAgreement | undefined>;
  archiveOwnerAgreement(id: string): Promise<OwnerAgreement | undefined>;
  updateUserOwnerAgreementConsent(userId: string, version: number): Promise<User | undefined>;

  // About Us operations
  getAllAboutUs(): Promise<AboutUs[]>;
  getAboutUs(id: string): Promise<AboutUs | undefined>;
  getAboutUsByVersion(version: number): Promise<AboutUs | undefined>;
  getPublishedAboutUs(): Promise<AboutUs | undefined>;
  getLatestAboutUsVersion(): Promise<number>;
  createAboutUs(about: Omit<InsertAboutUs, "id" | "createdAt" | "updatedAt">): Promise<AboutUs>;
  updateAboutUs(id: string, updates: Partial<Pick<AboutUs, "title" | "content">>): Promise<AboutUs | undefined>;
  publishAboutUs(id: string): Promise<AboutUs | undefined>;
  archiveAboutUs(id: string): Promise<AboutUs | undefined>;

  // Contact Settings operations
  getContactSettings(): Promise<ContactSettings | undefined>;
  upsertContactSettings(settings: Partial<InsertContactSettings>): Promise<ContactSettings>;

  // Contact Interaction logging
  logContactInteraction(data: InsertContactInteraction): Promise<ContactInteraction>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async promoteUserToAdmin(email: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ userRole: "admin", updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async getAdminUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.userRole, "admin"));
  }

  // Property operations
  async getProperties(filters?: {
    destination?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minGuests?: number;
    ownerId?: string;
    status?: string;
    includeAllStatuses?: boolean;
    search?: string;
  }): Promise<Property[]> {
    let query = db.select().from(properties);

    const conditions = [];
    
    // By default, only show published properties for public search
    // Unless explicitly requesting all statuses (for admin/owner views)
    if (!filters?.includeAllStatuses) {
      if (filters?.status) {
        conditions.push(eq(properties.status, filters.status as any));
      } else if (!filters?.ownerId) {
        // For public searches (no ownerId), only show published
        conditions.push(eq(properties.status, "published"));
      }
    }
    
    // Search by property title OR destination
    if (filters?.search) {
      conditions.push(
        or(
          sql`${properties.title} ILIKE ${`%${filters.search}%`}`,
          sql`${properties.destination} ILIKE ${`%${filters.search}%`}`,
          sql`${properties.propCity} ILIKE ${`%${filters.search}%`}`,
          sql`${properties.propState} ILIKE ${`%${filters.search}%`}`
        )
      );
    } else if (filters?.destination) {
      // Legacy: search destination only
      conditions.push(
        or(
          sql`${properties.destination} ILIKE ${`%${filters.destination}%`}`,
          sql`${properties.title} ILIKE ${`%${filters.destination}%`}`
        )
      );
    }
    if (filters?.propertyType) {
      conditions.push(eq(properties.propertyType, filters.propertyType as any));
    }
    if (filters?.minPrice !== undefined) {
      conditions.push(gte(properties.pricePerNight, filters.minPrice.toString()));
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(properties.pricePerNight, filters.maxPrice.toString()));
    }
    if (filters?.minGuests !== undefined) {
      conditions.push(gte(properties.maxGuests, filters.minGuests));
    }
    if (filters?.ownerId) {
      conditions.push(eq(properties.ownerId, filters.ownerId));
    }
    
    // Guest policy filters
    if (filters?.localIdAllowed !== undefined) {
      conditions.push(eq(properties.localIdAllowed, filters.localIdAllowed));
    }
    if (filters?.hourlyBookingAllowed !== undefined) {
      conditions.push(eq(properties.hourlyBookingAllowed, filters.hourlyBookingAllowed));
    }
    if (filters?.foreignGuestsAllowed !== undefined) {
      conditions.push(eq(properties.foreignGuestsAllowed, filters.foreignGuestsAllowed));
    }
    if (filters?.coupleFriendly !== undefined) {
      conditions.push(eq(properties.coupleFriendly, filters.coupleFriendly));
    }

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }

    return await query;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(propertyData: InsertProperty): Promise<Property> {
    const propertyCode = await generatePropertyCode();
    const [property] = await db
      .insert(properties)
      .values({ ...propertyData, propertyCode })
      .returning();
    return property;
  }

  async updateProperty(id: string, propertyData: Partial<InsertProperty>): Promise<Property | undefined> {
    // Remove fields that shouldn't be updated
    const { ownerId, ...updateData } = propertyData as any;
    
    const [property] = await db
      .update(properties)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  // Room operations
  async getRoomsByProperty(propertyId: string): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));
  }

  async createRoom(roomData: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(roomData).returning();
    return room;
  }

  async updateRoom(id: string, roomData: Partial<InsertRoom>): Promise<Room | undefined> {
    const [room] = await db
      .update(rooms)
      .set({ ...roomData, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return room;
  }

  async deleteRoom(id: string): Promise<void> {
    await db.delete(rooms).where(eq(rooms.id, id));
  }

  async getRoomType(id: string): Promise<RoomType | undefined> {
    const [room] = await db.select().from(roomTypes).where(eq(roomTypes.id, id));
    return room;
  }

  async getRoomTypes(propertyId: string): Promise<RoomType[]> {
    return await db.select().from(roomTypes).where(eq(roomTypes.propertyId, propertyId));
  }

  // Room Option operations
  async getRoomOptions(roomTypeId: string): Promise<RoomOption[]> {
    return await db
      .select()
      .from(roomOptions)
      .where(eq(roomOptions.roomTypeId, roomTypeId))
      .orderBy(roomOptions.createdAt);
  }

  async getRoomOption(id: string): Promise<RoomOption | undefined> {
    const [option] = await db.select().from(roomOptions).where(eq(roomOptions.id, id));
    return option;
  }

  async createRoomOption(optionData: InsertRoomOption): Promise<RoomOption> {
    const [option] = await db.insert(roomOptions).values(optionData).returning();
    return option;
  }

  async updateRoomOption(id: string, optionData: Partial<InsertRoomOption>): Promise<RoomOption | undefined> {
    const [option] = await db
      .update(roomOptions)
      .set({ ...optionData, updatedAt: new Date() })
      .where(eq(roomOptions.id, id))
      .returning();
    return option;
  }

  async deleteRoomOption(id: string): Promise<void> {
    await db.delete(roomOptions).where(eq(roomOptions.id, id));
  }

  // Wishlist operations
  async getWishlists(userId: string): Promise<Wishlist[]> {
    return await db.select().from(wishlists).where(eq(wishlists.userId, userId));
  }

  async getWishlistById(id: string): Promise<Wishlist | undefined> {
    const [wishlist] = await db.select().from(wishlists).where(eq(wishlists.id, id));
    return wishlist;
  }

  async createWishlist(wishlistData: InsertWishlist): Promise<Wishlist> {
    const [wishlist] = await db
      .insert(wishlists)
      .values(wishlistData)
      .returning();
    return wishlist;
  }

  async deleteWishlist(id: string): Promise<void> {
    await db.delete(wishlists).where(eq(wishlists.id, id));
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async upsertUserPreferences(preferencesData: InsertUserPreferences): Promise<UserPreferences> {
    const [prefs] = await db
      .insert(userPreferences)
      .values(preferencesData)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...preferencesData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return prefs;
  }

  // Amenity operations
  async getAllAmenities(): Promise<Amenity[]> {
    return await db.select().from(amenities);
  }

  async createAmenity(amenityData: InsertAmenity): Promise<Amenity> {
    const [amenity] = await db.insert(amenities).values(amenityData).returning();
    return amenity;
  }

  async createAmenitiesIgnoreDuplicates(amenitiesData: InsertAmenity[]): Promise<void> {
    if (amenitiesData.length === 0) return;
    
    await db.insert(amenities)
      .values(amenitiesData)
      .onConflictDoNothing()
      .execute();
  }

  async getPropertyAmenities(propertyId: string): Promise<Amenity[]> {
    const results = await db
      .select({
        id: amenities.id,
        name: amenities.name,
        icon: amenities.icon,
        category: amenities.category,
      })
      .from(propertyAmenities)
      .innerJoin(amenities, eq(propertyAmenities.amenityId, amenities.id))
      .where(eq(propertyAmenities.propertyId, propertyId));
    return results;
  }

  async setPropertyAmenities(propertyId: string, amenityIds: string[]): Promise<void> {
    // Delete existing amenities
    await db.delete(propertyAmenities).where(eq(propertyAmenities.propertyId, propertyId));
    
    // Insert new amenities
    if (amenityIds.length > 0) {
      await db.insert(propertyAmenities).values(
        amenityIds.map(amenityId => ({
          propertyId,
          amenityId,
        }))
      );
    }
  }

  // Booking operations
  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const bookingCode = await generateBookingCode();
    // Explicitly set bookingCreatedAt to server time (immutable after creation)
    const [booking] = await db.insert(bookings).values({ 
      ...bookingData, 
      bookingCode,
      bookingCreatedAt: new Date(),
    }).returning();
    return booking;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingsByProperty(propertyId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.propertyId, propertyId))
      .orderBy(sql`${bookings.bookingCreatedAt} DESC NULLS LAST`);
  }

  async getBookingsByGuest(guestId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.guestId, guestId))
      .orderBy(sql`${bookings.bookingCreatedAt} DESC NULLS LAST`);
  }

  async getPropertyBookedDates(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    roomTypeId?: string | null
  ): Promise<{ checkIn: Date; checkOut: Date }[]> {
    // ONLY count ACTIVE bookings: confirmed (owner_accepted), customer_confirmed, checked_in
    // Do NOT count: pending, rejected, cancelled, checked_out, completed
    // This allows multiple pending bookings for the same date - inventory locks only after owner accepts
    const ACTIVE_BOOKING_STATUSES: ("confirmed" | "customer_confirmed" | "checked_in")[] = 
      ["confirmed", "customer_confirmed", "checked_in"];
    
    // Build where conditions
    const conditions = [
      eq(bookings.propertyId, propertyId),
      inArray(bookings.status, ACTIVE_BOOKING_STATUSES),
      gt(bookings.checkOut, startDate),
      lt(bookings.checkIn, endDate)
    ];
    
    // If roomTypeId is provided, only check bookings for that specific room type
    // This allows different room types to be booked on overlapping dates
    if (roomTypeId) {
      conditions.push(eq(bookings.roomTypeId, roomTypeId));
    }
    
    const results = await db
      .select({
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
      })
      .from(bookings)
      .where(and(...conditions));
    return results.map(r => ({
      checkIn: new Date(r.checkIn),
      checkOut: new Date(r.checkOut),
    }));
  }

  async updateBookingStatus(
    id: string,
    status: "pending" | "confirmed" | "customer_confirmed" | "rejected" | "cancelled" | "checked_in" | "checked_out" | "completed",
    responseMessage?: string
  ): Promise<Booking | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (responseMessage !== undefined) {
      updateData.ownerResponseMessage = responseMessage;
      updateData.respondedAt = new Date();
    }
    const [updated] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  }

  async markCheckedIn(bookingId: string, userId: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({
        status: "checked_in",
        checkInTime: new Date(),
        checkedInBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  async markCheckedOut(bookingId: string, userId: string, isEarlyCheckout?: boolean): Promise<Booking | undefined> {
    const now = new Date();
    const [updated] = await db
      .update(bookings)
      .set({
        status: "checked_out",
        checkOutTime: now,
        checkedOutBy: userId,
        actualCheckOutDate: now,
        earlyCheckout: isEarlyCheckout || false,
        updatedAt: now,
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  async markNoShow(bookingId: string, userId: string, markedBy: "owner" | "admin", reason?: string): Promise<Booking | undefined> {
    const now = new Date();
    const [updated] = await db
      .update(bookings)
      .set({
        status: "no_show",
        noShow: true,
        noShowMarkedAt: now,
        noShowMarkedBy: markedBy,
        noShowMarkedByUserId: userId,
        noShowReason: reason || null,
        updatedAt: now,
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  async cancelBooking(bookingId: string, cancelledBy: "guest" | "owner" | "admin", reason?: string): Promise<Booking | undefined> {
    const now = new Date();
    
    // Get booking with property info to calculate refund
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });
    
    if (!booking) return undefined;
    
    // Get property cancellation policy
    const property = await db.query.properties.findFirst({
      where: eq(properties.id, booking.propertyId),
    });
    
    if (!property) return undefined;
    
    // Calculate refund based on cancellation policy
    let refundPercentage = 0;
    let refundAmount = "0.00";
    const totalPrice = parseFloat(booking.totalPrice);
    const hoursUntilCheckIn = (new Date(booking.checkIn).getTime() - now.getTime()) / (1000 * 60 * 60);
    const freeCancellationHours = property.freeCancellationHours || 24;
    const partialRefundPercent = property.partialRefundPercent || 50;
    
    // Owner/admin cancellations always get full refund for the guest
    if (cancelledBy === "owner" || cancelledBy === "admin") {
      refundPercentage = 100;
    } else {
      // Guest cancellation - apply property policy
      const policyType = property.cancellationPolicyType || "flexible";
      
      if (policyType === "flexible") {
        // Free cancellation until X hours before check-in
        if (hoursUntilCheckIn >= freeCancellationHours) {
          refundPercentage = 100;
        } else {
          refundPercentage = partialRefundPercent;
        }
      } else if (policyType === "moderate") {
        // Partial refund based on timing
        if (hoursUntilCheckIn >= freeCancellationHours) {
          refundPercentage = 100;
        } else if (hoursUntilCheckIn >= freeCancellationHours / 2) {
          refundPercentage = partialRefundPercent;
        } else {
          refundPercentage = 0;
        }
      } else if (policyType === "strict") {
        // Non-refundable (or very limited refund)
        if (hoursUntilCheckIn >= freeCancellationHours * 2) {
          refundPercentage = partialRefundPercent;
        } else {
          refundPercentage = 0;
        }
      }
    }
    
    refundAmount = ((totalPrice * refundPercentage) / 100).toFixed(2);
    
    const [updated] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancelledBy: cancelledBy,
        cancellationReason: reason || null,
        refundAmount: refundAmount,
        refundPercentage: refundPercentage,
        updatedAt: now,
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  async adminUnmarkNoShow(bookingId: string, userId: string): Promise<Booking | undefined> {
    const now = new Date();
    const [updated] = await db
      .update(bookings)
      .set({
        status: "customer_confirmed",
        noShow: false,
        noShowMarkedAt: null,
        noShowMarkedBy: null,
        noShowMarkedByUserId: null,
        updatedAt: now,
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // Conversation operations
  async getConversationsByUser(userId: string): Promise<(Conversation & { property: Property; guest: User; owner: User; unreadCount: number })[]> {
    const guestAlias = sql`guest_user`;
    const ownerAlias = sql`owner_user`;
    
    const userConversations = await db.execute(sql`
      SELECT 
        c.*,
        p.id as property_id, p.property_code as property_code, p.title as property_title, p.destination as property_destination, 
        p.price_per_night as property_price_per_night, p.images as property_images, p.videos as property_videos,
        p.property_type as property_type, p.max_guests as property_max_guests,
        p.owner_id as property_owner_id, p.status as property_status, p.rating as property_rating,
        p.review_count as property_review_count, p.description as property_description,
        p.bedrooms as property_bedrooms, p.bathrooms as property_bathrooms, p.beds as property_beds,
        p.address as property_address, p.latitude as property_latitude, p.longitude as property_longitude,
        p.policies as property_policies, p.created_at as property_created_at, p.updated_at as property_updated_at,
        gu.id as guest_id, gu.email as guest_email, gu.first_name as guest_first_name,
        gu.last_name as guest_last_name, gu.profile_image_url as guest_profile_image_url,
        gu.user_role as guest_user_role, gu.phone as guest_phone, gu.kyc_address as guest_kyc_address,
        gu.government_id_type as guest_government_id_type, gu.government_id_number as guest_government_id_number,
        gu.kyc_status as guest_kyc_status, gu.kyc_verified_at as guest_kyc_verified_at,
        gu.created_at as guest_created_at, gu.updated_at as guest_updated_at,
        ou.id as owner_id, ou.email as owner_email, ou.first_name as owner_first_name,
        ou.last_name as owner_last_name, ou.profile_image_url as owner_profile_image_url,
        ou.user_role as owner_user_role, ou.phone as owner_phone, ou.kyc_address as owner_kyc_address,
        ou.government_id_type as owner_government_id_type, ou.government_id_number as owner_government_id_number,
        ou.kyc_status as owner_kyc_status, ou.kyc_verified_at as owner_kyc_verified_at,
        ou.created_at as owner_created_at, ou.updated_at as owner_updated_at,
        COALESCE(m.unread_count, 0)::int as unread_count
      FROM conversations c
      LEFT JOIN properties p ON c.property_id = p.id
      LEFT JOIN users gu ON c.guest_id = gu.id
      LEFT JOIN users ou ON c.owner_id = ou.id
      LEFT JOIN (
        SELECT conversation_id, COUNT(*)::int as unread_count
        FROM messages
        WHERE read = false AND sender_id != ${userId}
        GROUP BY conversation_id
      ) m ON c.id = m.conversation_id
      WHERE c.guest_id = ${userId} OR c.owner_id = ${userId}
      ORDER BY c.last_message_at DESC
    `);

    return userConversations.rows.map((row: any) => ({
      id: row.id,
      propertyId: row.property_id,
      guestId: row.guest_id,
      ownerId: row.owner_id,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      property: {
        id: row.property_id,
        propertyCode: row.property_code,
        title: row.property_title,
        destination: row.property_destination,
        pricePerNight: row.property_price_per_night,
        images: row.property_images,
        videos: row.property_videos,
        propertyType: row.property_type,
        maxGuests: row.property_max_guests,
        ownerId: row.property_owner_id,
        status: row.property_status,
        rating: row.property_rating,
        reviewCount: row.property_review_count,
        description: row.property_description,
        bedrooms: row.property_bedrooms,
        bathrooms: row.property_bathrooms,
        beds: row.property_beds,
        address: row.property_address,
        latitude: row.property_latitude,
        longitude: row.property_longitude,
        policies: row.property_policies,
        createdAt: row.property_created_at,
        updatedAt: row.property_updated_at,
      } as Property,
      guest: {
        id: row.guest_id,
        email: row.guest_email,
        firstName: row.guest_first_name,
        lastName: row.guest_last_name,
        profileImageUrl: row.guest_profile_image_url,
        userRole: row.guest_user_role,
        phone: row.guest_phone,
        kycAddress: row.guest_kyc_address,
        governmentIdType: row.guest_government_id_type,
        governmentIdNumber: row.guest_government_id_number,
        kycStatus: row.guest_kyc_status,
        kycVerifiedAt: row.guest_kyc_verified_at,
        createdAt: row.guest_created_at,
        updatedAt: row.guest_updated_at,
      } as User,
      owner: {
        id: row.owner_id,
        email: row.owner_email,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
        profileImageUrl: row.owner_profile_image_url,
        userRole: row.owner_user_role,
        phone: row.owner_phone,
        kycAddress: row.owner_kyc_address,
        governmentIdType: row.owner_government_id_type,
        governmentIdNumber: row.owner_government_id_number,
        kycStatus: row.owner_kyc_status,
        kycVerifiedAt: row.owner_kyc_verified_at,
        createdAt: row.owner_created_at,
        updatedAt: row.owner_updated_at,
      } as User,
      unreadCount: row.unread_count,
    }));
  }

  async getOrCreateConversation(propertyId: string, guestId: string): Promise<Conversation> {
    const property = await this.getProperty(propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.propertyId, propertyId), eq(conversations.guestId, guestId)));

    if (existing) {
      return existing;
    }

    const [conversation] = await db
      .insert(conversations)
      .values({
        propertyId,
        guestId,
        ownerId: property.ownerId,
      })
      .returning();

    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  // Message operations
  async createMessage(messageData: InsertMessage): Promise<Message> {
    console.log("[MESSAGE CREATE] Starting message creation:", JSON.stringify(messageData));
    
    const [message] = await db.insert(messages).values(messageData).returning();
    console.log("[MESSAGE CREATE] Message inserted with ID:", message.id);

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, messageData.conversationId));
    console.log("[MESSAGE CREATE] Conversation lastMessageAt updated");

    // Verify the message was saved
    const [verifyMessage] = await db.select().from(messages).where(eq(messages.id, message.id));
    console.log("[MESSAGE CREATE] Verification - message exists:", !!verifyMessage);

    return message;
  }

  async getMessagesByConversation(conversationId: string): Promise<(Message & { sender: User })[]> {
    const results = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return results.map(r => ({
      ...r.message,
      sender: r.sender!,
    }));
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return;

    const otherParticipantId = conversation.guestId === userId ? conversation.ownerId : conversation.guestId;

    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.senderId, otherParticipantId),
          eq(messages.read, false)
        )
      );
  }

  // Review operations
  async createReview(reviewData: InsertReview): Promise<Review> {
    if (reviewData.bookingId) {
      const [existingReview] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.bookingId, reviewData.bookingId))
        .limit(1);

      if (existingReview) {
        throw new Error("A review already exists for this booking");
      }
    }

    const [review] = await db.insert(reviews).values(reviewData).returning();

    const stats = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(reviews)
      .where(eq(reviews.propertyId, reviewData.propertyId));

    const avgRating = Math.round((stats[0]?.avg || 0) * 10) / 10;
    const reviewCount = stats[0]?.count || 0;

    await db
      .update(properties)
      .set({
        rating: avgRating.toString(),
        reviewCount,
      })
      .where(eq(properties.id, reviewData.propertyId));

    return review;
  }

  async getReviewsByProperty(propertyId: string): Promise<(Review & { guest: User })[]> {
    const results = await db
      .select({
        review: reviews,
        guest: users,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.guestId, users.id))
      .where(eq(reviews.propertyId, propertyId))
      .orderBy(sql`${reviews.createdAt} DESC`);

    return results.map(r => ({
      ...r.review,
      guest: r.guest!,
    }));
  }

  async getReview(id: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getReviewByBookingId(bookingId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.bookingId, bookingId))
      .limit(1);
    return review;
  }

  async updateOwnerResponse(reviewId: string, response: string): Promise<Review | undefined> {
    const [updated] = await db
      .update(reviews)
      .set({
        ownerResponse: response,
        ownerResponseAt: new Date(),
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    return updated;
  }

  async incrementReviewHelpful(reviewId: string): Promise<(Review & { guest: User }) | undefined> {
    await db
      .update(reviews)
      .set({
        helpful: sql`${reviews.helpful} + 1`,
      })
      .where(eq(reviews.id, reviewId));

    const result = await db
      .select({
        review: reviews,
        guest: users,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.guestId, users.id))
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (result.length === 0) return undefined;

    return {
      ...result[0].review,
      guest: result[0].guest!,
    };
  }

  async getAverageRating(propertyId: string): Promise<number> {
    const result = await db
      .select({ avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)` })
      .from(reviews)
      .where(eq(reviews.propertyId, propertyId));

    return Math.round((result[0]?.avg || 0) * 10) / 10;
  }

  // Destination operations
  async getAllDestinations(): Promise<Destination[]> {
    const results = await db
      .select()
      .from(destinations)
      .orderBy(sql`${destinations.createdAt} DESC`);
    return results;
  }

  async getFeaturedDestinations(): Promise<Destination[]> {
    const results = await db
      .select()
      .from(destinations)
      .where(eq(destinations.isFeatured, true))
      .orderBy(sql`${destinations.featuredDate} DESC`)
      .limit(3);
    return results;
  }

  async getDestination(id: string): Promise<Destination | undefined> {
    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, id));
    return destination;
  }

  async createDestination(destinationData: InsertDestination): Promise<Destination> {
    const [destination] = await db
      .insert(destinations)
      .values(destinationData)
      .returning();
    return destination;
  }

  async updateDestination(id: string, destinationData: Partial<InsertDestination>): Promise<Destination | undefined> {
    const [updated] = await db
      .update(destinations)
      .set({
        ...destinationData,
        updatedAt: new Date(),
      })
      .where(eq(destinations.id, id))
      .returning();
    return updated;
  }

  async deleteDestination(id: string): Promise<void> {
    await db.delete(destinations).where(eq(destinations.id, id));
  }

  async clearAllDestinations(): Promise<void> {
    await db.delete(destinations);
  }

  async searchDestinations(query: string, limit: number = 10): Promise<{ id: string; name: string; state: string }[]> {
    const searchLower = query.toLowerCase();
    const results = await db
      .select({
        id: destinations.id,
        name: destinations.name,
        state: destinations.state,
      })
      .from(destinations)
      .where(
        or(
          sql`LOWER(${destinations.name}) LIKE ${`%${searchLower}%`}`,
          sql`LOWER(${destinations.state}) LIKE ${`%${searchLower}%`}`
        )
      )
      .limit(limit);
    return results;
  }

  async setFeaturedDestination(id: string, isFeatured: boolean): Promise<Destination | undefined> {
    const [updated] = await db
      .update(destinations)
      .set({
        isFeatured,
        featuredDate: isFeatured ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(destinations.id, id))
      .returning();
    return updated;
  }

  // Search history operations
  async createSearchHistory(userId: string, search: InsertSearchHistory): Promise<SearchHistory> {
    const [history] = await db
      .insert(searchHistory)
      .values({
        ...search,
        userId,
      })
      .returning();
    return history;
  }

  async getUserSearchHistory(userId: string, limit: number = 10): Promise<SearchHistory[]> {
    return await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(searchHistory.createdAt)
      .limit(limit);
  }

  async deleteSearchHistory(id: string): Promise<void> {
    await db.delete(searchHistory).where(eq(searchHistory.id, id));
  }

  // KYC Application operations
  async createKycApplication(userId: string, applicationData: KycApplicationFormData): Promise<KycApplication> {
    const [application] = await db
      .insert(kycApplications)
      .values({
        ...applicationData,
        userId,
      })
      .returning();
    return application;
  }

  async getKycApplicationsByStatus(status: "pending" | "verified" | "rejected"): Promise<KycApplication[]> {
    return await db
      .select()
      .from(kycApplications)
      .where(eq(kycApplications.status, status))
      .orderBy(kycApplications.createdAt);
  }

  async getUserKycApplication(userId: string): Promise<KycApplication | undefined> {
    const [application] = await db
      .select()
      .from(kycApplications)
      .where(eq(kycApplications.userId, userId))
      .limit(1);
    return application;
  }

  async getKycApplication(id: string): Promise<KycApplication | undefined> {
    const [application] = await db
      .select()
      .from(kycApplications)
      .where(eq(kycApplications.id, id))
      .limit(1);
    return application;
  }

  async getAllKycApplications(): Promise<KycApplication[]> {
    const applications = await db
      .select()
      .from(kycApplications)
      .orderBy(desc(kycApplications.createdAt));
    return applications;
  }

  async updateKycApplicationStatus(
    id: string,
    status: "verified" | "rejected",
    reviewNotes?: string,
    rejectionDetails?: any
  ): Promise<KycApplication | undefined> {
    const [updated] = await db
      .update(kycApplications)
      .set({
        status,
        reviewedAt: new Date(),
        reviewNotes,
        rejectionDetails: status === "rejected" ? rejectionDetails : null,
        updatedAt: new Date(),
      })
      .where(eq(kycApplications.id, id))
      .returning();
    return updated;
  }

  async updateKycApplication(id: string, updates: KycApplicationFormData): Promise<KycApplication | undefined> {
    const [updated] = await db
      .update(kycApplications)
      .set({
        ...updates,
        status: "pending",
        reviewNotes: null,
        rejectionDetails: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(kycApplications.id, id))
      .returning();
    return updated;
  }

  async deleteKycApplication(id: string): Promise<void> {
    await db.delete(kycApplications).where(eq(kycApplications.id, id));
  }

  // OTP operations
  async createOtpCode(email: string, code: string, expiresAt: Date): Promise<OtpCode> {
    // Delete any existing OTP codes for this email first
    await db.delete(otpCodes).where(eq(otpCodes.email, email.toLowerCase()));
    
    const [otp] = await db
      .insert(otpCodes)
      .values({
        email: email.toLowerCase(),
        code,
        expiresAt,
      })
      .returning();
    return otp;
  }

  async getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email.toLowerCase()),
          eq(otpCodes.code, code),
          eq(otpCodes.verified, false),
          gt(otpCodes.expiresAt, new Date()),
          lt(otpCodes.attempts, 5) // Max 5 attempts
        )
      )
      .limit(1);
    return otp;
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, id));
  }

  async markOtpVerified(id: string): Promise<void> {
    await db
      .update(otpCodes)
      .set({ verified: true })
      .where(eq(otpCodes.id, id));
  }

  async deleteExpiredOtpCodes(): Promise<void> {
    await db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date()));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUserFromEmail(email: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        userRole: "guest",
      })
      .returning();
    return user;
  }

  // Password-based auth operations
  async createLocalUser(data: { firstName: string; lastName: string; email: string; passwordHash: string; termsAccepted: boolean; privacyAccepted: boolean; consentCommunication?: boolean }): Promise<User> {
    const now = new Date();
    const [user] = await db
      .insert(users)
      .values({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        registrationMethod: "local",
        userRole: "guest",
        termsAccepted: data.termsAccepted,
        termsAcceptedAt: data.termsAccepted ? now : null,
        privacyAccepted: data.privacyAccepted,
        privacyAcceptedAt: data.privacyAccepted ? now : null,
        consentCommunication: data.consentCommunication ?? false,
      })
      .returning();
    return user;
  }

  async updateUserEmailVerified(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Owner dashboard operations
  async getOwnerProperties(userId: string): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.ownerId, userId));
  }

  async getBookingsForProperties(propertyIds: string[]): Promise<Booking[]> {
    if (propertyIds.length === 0) return [];
    return await db
      .select()
      .from(bookings)
      .where(inArray(bookings.propertyId, propertyIds))
      .orderBy(desc(bookings.createdAt));
  }

  async getReviewsForProperties(propertyIds: string[]): Promise<(Review & { guest: User })[]> {
    if (propertyIds.length === 0) return [];
    const results = await db
      .select({
        review: reviews,
        guest: users,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.guestId, users.id))
      .where(inArray(reviews.propertyId, propertyIds))
      .orderBy(desc(reviews.createdAt));

    return results.map(r => ({
      ...r.review,
      guest: r.guest as User,
    }));
  }

  async getRoomUtilization(propertyId: string, startDate: Date, endDate: Date): Promise<{
    roomTypeId: string;
    roomTypeName: string;
    totalRooms: number;
    confirmedRooms: number;
    pendingRooms: number;
    availableRooms: number;
  }[]> {
    // Get all room types for this property
    const propertyRoomTypes = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.propertyId, propertyId));
    
    if (propertyRoomTypes.length === 0) return [];
    
    // Get all bookings that overlap with the date range
    // Overlap: booking.checkIn < endDate AND booking.checkOut > startDate
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          lt(bookings.checkIn, endDate),
          gt(bookings.checkOut, startDate)
        )
      );
    
    // CONFIRMED statuses: confirmed (owner_accepted), customer_confirmed, checked_in
    const CONFIRMED_STATUSES = ['confirmed', 'customer_confirmed', 'checked_in'];
    // PENDING statuses: pending (awaiting owner response)
    const PENDING_STATUSES = ['pending'];
    
    return propertyRoomTypes.map(rt => {
      const roomTypeBookings = overlappingBookings.filter(b => b.roomTypeId === rt.id);
      
      const confirmedRooms = roomTypeBookings
        .filter(b => CONFIRMED_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rooms || 1), 0);
      
      const pendingRooms = roomTypeBookings
        .filter(b => PENDING_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rooms || 1), 0);
      
      const totalRooms = rt.totalRooms || 1;
      // Available = Total - Confirmed (pending does NOT reduce available)
      const availableRooms = Math.max(0, totalRooms - confirmedRooms);
      
      return {
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        totalRooms,
        confirmedRooms,
        pendingRooms,
        availableRooms,
      };
    });
  }

  async getRoomUtilizationByDate(propertyId: string, roomTypeId: string, startDate: Date, endDate: Date): Promise<{
    date: string;
    confirmedRooms: number;
    pendingRooms: number;
    availableRooms: number;
    totalRooms: number;
  }[]> {
    // Get the room type to get total rooms
    const [roomType] = await db
      .select()
      .from(roomTypes)
      .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.id, roomTypeId)));
    
    if (!roomType) return [];
    
    const totalRooms = roomType.totalRooms || 1;
    
    // Get all bookings that overlap with the date range for this room type
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          eq(bookings.roomTypeId, roomTypeId),
          lt(bookings.checkIn, endDate),
          gt(bookings.checkOut, startDate)
        )
      );
    
    const CONFIRMED_STATUSES = ['confirmed', 'customer_confirmed', 'checked_in'];
    const PENDING_STATUSES = ['pending'];
    
    // Generate date-by-date utilization
    const result: {
      date: string;
      confirmedRooms: number;
      pendingRooms: number;
      availableRooms: number;
      totalRooms: number;
    }[] = [];
    
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      // Find bookings that overlap with this specific day/night
      // A booking occupies the night if checkIn < dayEnd (next day start) AND checkOut > dayStart
      // This correctly counts a room as "occupied" for the night of dayStart
      const dayBookings = overlappingBookings.filter(b => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        return checkIn < dayEnd && checkOut > dayStart;
      });
      
      const confirmedRooms = dayBookings
        .filter(b => CONFIRMED_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rooms || 1), 0);
      
      const pendingRooms = dayBookings
        .filter(b => PENDING_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rooms || 1), 0);
      
      const availableRooms = Math.max(0, totalRooms - confirmedRooms);
      
      result.push({
        date: dateStr,
        confirmedRooms,
        pendingRooms,
        availableRooms,
        totalRooms,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  }

  // Availability Override operations
  async getAvailabilityOverrides(propertyId: string): Promise<AvailabilityOverride[]> {
    return await db
      .select()
      .from(availabilityOverrides)
      .where(eq(availabilityOverrides.propertyId, propertyId))
      .orderBy(desc(availabilityOverrides.startDate));
  }

  async createAvailabilityOverride(override: InsertAvailabilityOverride): Promise<AvailabilityOverride> {
    const [created] = await db
      .insert(availabilityOverrides)
      .values(override)
      .returning();
    return created;
  }

  async deleteAvailabilityOverride(id: string): Promise<void> {
    await db.delete(availabilityOverrides).where(eq(availabilityOverrides.id, id));
  }

  async getPropertyBlockedDates(propertyId: string, checkIn: Date, checkOut: Date, roomTypeId?: string | null): Promise<{ startDate: Date; endDate: Date; type: string; roomTypeId: string | null }[]> {
    // Overlap with exclusive end date semantics:
    // Override blocks [startDate, endDate), booking occupies [checkIn, checkOut)
    // Overlap exists when: overrideStart < checkOut AND overrideEnd > checkIn
    const overrides = await db
      .select()
      .from(availabilityOverrides)
      .where(
        and(
          eq(availabilityOverrides.propertyId, propertyId),
          lt(availabilityOverrides.startDate, checkOut),
          gt(availabilityOverrides.endDate, checkIn)
        )
      );
    
    // Filter by roomTypeId if provided:
    // - If roomTypeId is provided, return blocks that apply to ALL rooms (roomTypeId is null) OR to the specific room type
    // - If roomTypeId is not provided, return all blocks (property-wide check)
    const filteredOverrides = roomTypeId 
      ? overrides.filter(o => o.roomTypeId === null || o.roomTypeId === roomTypeId)
      : overrides;
    
    return filteredOverrides.map(o => ({
      startDate: o.startDate,
      endDate: o.endDate,
      type: o.overrideType,
      roomTypeId: o.roomTypeId,
    }));
  }

  // Property Deactivation Request operations
  async createDeactivationRequest(
    propertyId: string, 
    ownerId: string, 
    reason: string, 
    requestType: "deactivate" | "delete" | "reactivate" = "deactivate"
  ): Promise<PropertyDeactivationRequest> {
    const [created] = await db
      .insert(propertyDeactivationRequests)
      .values({
        propertyId,
        ownerId,
        reason,
        requestType,
        status: "pending",
      })
      .returning();
    return created;
  }

  async getDeactivationRequest(id: string): Promise<PropertyDeactivationRequest | undefined> {
    const [request] = await db
      .select()
      .from(propertyDeactivationRequests)
      .where(eq(propertyDeactivationRequests.id, id));
    return request;
  }

  async getDeactivationRequestByProperty(propertyId: string): Promise<PropertyDeactivationRequest | undefined> {
    const [request] = await db
      .select()
      .from(propertyDeactivationRequests)
      .where(
        and(
          eq(propertyDeactivationRequests.propertyId, propertyId),
          eq(propertyDeactivationRequests.status, "pending")
        )
      );
    return request;
  }

  async getDeactivationRequestsByOwner(ownerId: string): Promise<PropertyDeactivationRequest[]> {
    return await db
      .select()
      .from(propertyDeactivationRequests)
      .where(eq(propertyDeactivationRequests.ownerId, ownerId))
      .orderBy(desc(propertyDeactivationRequests.createdAt));
  }

  async getAllPendingDeactivationRequests(): Promise<(PropertyDeactivationRequest & { property: Property; owner: User })[]> {
    const requests = await db
      .select()
      .from(propertyDeactivationRequests)
      .where(eq(propertyDeactivationRequests.status, "pending"))
      .orderBy(desc(propertyDeactivationRequests.createdAt));
    
    // Fetch related property and owner data
    const result: (PropertyDeactivationRequest & { property: Property; owner: User })[] = [];
    for (const request of requests) {
      const [property] = await db.select().from(properties).where(eq(properties.id, request.propertyId));
      const [owner] = await db.select().from(users).where(eq(users.id, request.ownerId));
      if (property && owner) {
        result.push({ ...request, property, owner });
      }
    }
    return result;
  }

  async processDeactivationRequest(
    id: string, 
    adminId: string, 
    status: "approved" | "rejected", 
    adminNotes?: string
  ): Promise<PropertyDeactivationRequest | undefined> {
    const [updated] = await db
      .update(propertyDeactivationRequests)
      .set({
        status,
        adminId,
        adminNotes: adminNotes || null,
        processedAt: new Date(),
      })
      .where(eq(propertyDeactivationRequests.id, id))
      .returning();
    return updated;
  }

  async cancelDeactivationRequest(id: string): Promise<void> {
    await db.delete(propertyDeactivationRequests).where(eq(propertyDeactivationRequests.id, id));
  }

  async fixMisclassifiedReactivationRequests(): Promise<number> {
    // Find pending "deactivate" requests where the property is already deactivated
    // These are actually reactivation requests that were incorrectly stored due to the bug
    const misclassifiedRequests = await db
      .select({
        requestId: propertyDeactivationRequests.id,
        propertyId: propertyDeactivationRequests.propertyId,
        propertyStatus: properties.status,
      })
      .from(propertyDeactivationRequests)
      .innerJoin(properties, eq(propertyDeactivationRequests.propertyId, properties.id))
      .where(
        and(
          eq(propertyDeactivationRequests.status, "pending"),
          eq(propertyDeactivationRequests.requestType, "deactivate"),
          eq(properties.status, "deactivated")
        )
      );

    if (misclassifiedRequests.length === 0) {
      return 0;
    }

    // Update all misclassified requests to have requestType = "reactivate"
    const requestIds = misclassifiedRequests.map(r => r.requestId);
    await db
      .update(propertyDeactivationRequests)
      .set({ requestType: "reactivate" })
      .where(inArray(propertyDeactivationRequests.id, requestIds));

    return misclassifiedRequests.length;
  }

  // Policy operations
  async getAllPolicies(): Promise<Policy[]> {
    return await db
      .select()
      .from(policies)
      .orderBy(desc(policies.type), desc(policies.version));
  }

  async getPolicy(id: string): Promise<Policy | undefined> {
    const [policy] = await db.select().from(policies).where(eq(policies.id, id));
    return policy;
  }

  async getPolicyByTypeAndVersion(type: "terms" | "privacy", version: number): Promise<Policy | undefined> {
    const [policy] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.type, type), eq(policies.version, version)));
    return policy;
  }

  async getPublishedPolicy(type: "terms" | "privacy"): Promise<Policy | undefined> {
    const [policy] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.type, type), eq(policies.status, "published")))
      .orderBy(desc(policies.version))
      .limit(1);
    return policy;
  }

  async getLatestPolicyVersion(type: "terms" | "privacy"): Promise<number> {
    const [result] = await db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${policies.version}), 0)` })
      .from(policies)
      .where(eq(policies.type, type));
    return result?.maxVersion ?? 0;
  }

  async createPolicy(policy: Omit<InsertPolicy, "id" | "createdAt" | "updatedAt">): Promise<Policy> {
    const [created] = await db
      .insert(policies)
      .values(policy)
      .returning();
    return created;
  }

  async updatePolicy(id: string, updates: Partial<Pick<Policy, "title" | "content">>): Promise<Policy | undefined> {
    const [updated] = await db
      .update(policies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  async publishPolicy(id: string): Promise<Policy | undefined> {
    // First, get the policy to be published
    const policy = await this.getPolicy(id);
    if (!policy) return undefined;

    // Archive any existing published policy of the same type
    await db
      .update(policies)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(policies.type, policy.type), eq(policies.status, "published")));

    // Publish the new policy
    const [updated] = await db
      .update(policies)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  async archivePolicy(id: string): Promise<Policy | undefined> {
    const [updated] = await db
      .update(policies)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  async updateUserPolicyConsent(
    userId: string, 
    termsVersion: number, 
    privacyVersion: number, 
    consentCommunication?: boolean
  ): Promise<User | undefined> {
    const now = new Date();
    const updateData: any = {
      termsAccepted: true,
      termsAcceptedAt: now,
      termsAcceptedVersion: termsVersion,
      privacyAccepted: true,
      privacyAcceptedAt: now,
      privacyAcceptedVersion: privacyVersion,
      updatedAt: now,
    };
    
    if (consentCommunication !== undefined) {
      updateData.consentCommunication = consentCommunication;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Owner Agreement operations
  async getAllOwnerAgreements(): Promise<OwnerAgreement[]> {
    return await db
      .select()
      .from(ownerAgreements)
      .orderBy(desc(ownerAgreements.version));
  }

  async getOwnerAgreement(id: string): Promise<OwnerAgreement | undefined> {
    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.id, id));
    return agreement;
  }

  async getOwnerAgreementByVersion(version: number): Promise<OwnerAgreement | undefined> {
    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.version, version));
    return agreement;
  }

  async getPublishedOwnerAgreement(): Promise<OwnerAgreement | undefined> {
    const [agreement] = await db
      .select()
      .from(ownerAgreements)
      .where(eq(ownerAgreements.status, "published"))
      .orderBy(desc(ownerAgreements.version))
      .limit(1);
    return agreement;
  }

  async getLatestOwnerAgreementVersion(): Promise<number> {
    const [result] = await db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${ownerAgreements.version}), 0)` })
      .from(ownerAgreements);
    return result?.maxVersion || 0;
  }

  async createOwnerAgreement(agreement: Omit<InsertOwnerAgreement, "id" | "createdAt" | "updatedAt">): Promise<OwnerAgreement> {
    const [created] = await db
      .insert(ownerAgreements)
      .values(agreement)
      .returning();
    return created;
  }

  async updateOwnerAgreement(id: string, updates: Partial<Pick<OwnerAgreement, "title" | "content">>): Promise<OwnerAgreement | undefined> {
    const [updated] = await db
      .update(ownerAgreements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ownerAgreements.id, id))
      .returning();
    return updated;
  }

  async publishOwnerAgreement(id: string): Promise<OwnerAgreement | undefined> {
    // Archive any currently published agreement first
    await db
      .update(ownerAgreements)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(ownerAgreements.status, "published"));

    // Publish the new agreement
    const [updated] = await db
      .update(ownerAgreements)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(ownerAgreements.id, id))
      .returning();
    return updated;
  }

  async archiveOwnerAgreement(id: string): Promise<OwnerAgreement | undefined> {
    const [updated] = await db
      .update(ownerAgreements)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(ownerAgreements.id, id))
      .returning();
    return updated;
  }

  async updateUserOwnerAgreementConsent(userId: string, version: number): Promise<User | undefined> {
    const now = new Date();
    const [user] = await db
      .update(users)
      .set({
        ownerAgreementAccepted: true,
        ownerAgreementAcceptedAt: now,
        ownerAgreementAcceptedVersion: version,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getOwnerAgreementAcceptances(): Promise<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    ownerAgreementAcceptedAt: Date | null;
    ownerAgreementAcceptedVersion: number | null;
  }>> {
    const acceptances = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        ownerAgreementAcceptedAt: users.ownerAgreementAcceptedAt,
        ownerAgreementAcceptedVersion: users.ownerAgreementAcceptedVersion,
      })
      .from(users)
      .where(eq(users.ownerAgreementAccepted, true))
      .orderBy(desc(users.ownerAgreementAcceptedAt));
    return acceptances;
  }

  // About Us operations
  async getAllAboutUs(): Promise<AboutUs[]> {
    return await db
      .select()
      .from(aboutUs)
      .orderBy(desc(aboutUs.version));
  }

  async getAboutUs(id: string): Promise<AboutUs | undefined> {
    const [about] = await db
      .select()
      .from(aboutUs)
      .where(eq(aboutUs.id, id));
    return about;
  }

  async getAboutUsByVersion(version: number): Promise<AboutUs | undefined> {
    const [about] = await db
      .select()
      .from(aboutUs)
      .where(eq(aboutUs.version, version));
    return about;
  }

  async getPublishedAboutUs(): Promise<AboutUs | undefined> {
    const [about] = await db
      .select()
      .from(aboutUs)
      .where(eq(aboutUs.status, "published"))
      .orderBy(desc(aboutUs.version))
      .limit(1);
    return about;
  }

  async getLatestAboutUsVersion(): Promise<number> {
    const [result] = await db
      .select({ maxVersion: sql<number>`COALESCE(MAX(${aboutUs.version}), 0)` })
      .from(aboutUs);
    return result?.maxVersion || 0;
  }

  async createAboutUs(about: Omit<InsertAboutUs, "id" | "createdAt" | "updatedAt">): Promise<AboutUs> {
    const [created] = await db
      .insert(aboutUs)
      .values(about)
      .returning();
    return created;
  }

  async updateAboutUs(id: string, updates: Partial<Pick<AboutUs, "title" | "content">>): Promise<AboutUs | undefined> {
    const [updated] = await db
      .update(aboutUs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aboutUs.id, id))
      .returning();
    return updated;
  }

  async publishAboutUs(id: string): Promise<AboutUs | undefined> {
    // Archive any currently published about us first
    await db
      .update(aboutUs)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(aboutUs.status, "published"));

    // Publish the new about us
    const [updated] = await db
      .update(aboutUs)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(aboutUs.id, id))
      .returning();
    return updated;
  }

  async archiveAboutUs(id: string): Promise<AboutUs | undefined> {
    const [updated] = await db
      .update(aboutUs)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(aboutUs.id, id))
      .returning();
    return updated;
  }

  // Contact Settings operations
  async getContactSettings(): Promise<ContactSettings | undefined> {
    const [settings] = await db.select().from(contactSettings).limit(1);
    return settings;
  }

  async upsertContactSettings(settings: Partial<InsertContactSettings>): Promise<ContactSettings> {
    const existing = await this.getContactSettings();
    
    if (existing) {
      const [updated] = await db
        .update(contactSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(contactSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(contactSettings)
        .values({ ...settings })
        .returning();
      return created;
    }
  }

  // Contact Interaction logging
  async logContactInteraction(data: InsertContactInteraction): Promise<ContactInteraction> {
    const [interaction] = await db
      .insert(contactInteractions)
      .values(data)
      .returning();
    return interaction;
  }
}

export const storage = new DatabaseStorage();
