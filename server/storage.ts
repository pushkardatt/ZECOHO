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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, lt, gt, inArray, sql, or, not, desc, count } from "drizzle-orm";

// Helper function to generate unique property code (PROP-XXXXXX)
async function generatePropertyCode(): Promise<string> {
  const [result] = await db.select({ count: count() }).from(properties);
  const nextNum = (result?.count || 0) + 1;
  return `PROP-${String(nextNum).padStart(6, '0')}`;
}

// Helper function to generate unique booking code (BKG-XXXXXX)
async function generateBookingCode(): Promise<string> {
  const [result] = await db.select({ count: count() }).from(bookings);
  const nextNum = (result?.count || 0) + 1;
  return `BKG-${String(nextNum).padStart(6, '0')}`;
}

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  promoteUserToAdmin(email: string): Promise<User | undefined>;

  // Property operations
  getProperties(filters?: {
    destination?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minGuests?: number;
    ownerId?: string;
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
  
  // Room Option operations (meal plans, amenity packages)
  getRoomOptions(roomTypeId: string): Promise<RoomOption[]>;
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
  getPropertyBookedDates(propertyId: string, startDate: Date, endDate: Date): Promise<{ checkIn: Date; checkOut: Date }[]>;
  updateBookingStatus(id: string, status: "pending" | "confirmed" | "rejected" | "cancelled" | "checked_in" | "checked_out" | "completed", responseMessage?: string): Promise<Booking | undefined>;
  markCheckedIn(bookingId: string, userId: string): Promise<Booking | undefined>;
  markCheckedOut(bookingId: string, userId: string, isEarlyCheckout?: boolean): Promise<Booking | undefined>;
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
  createLocalUser(data: { firstName: string; lastName: string; email: string; passwordHash: string }): Promise<User>;
  updateUserEmailVerified(userId: string): Promise<User | undefined>;
  updateUserPassword(userId: string, passwordHash: string): Promise<User | undefined>;

  // Owner dashboard operations
  getOwnerProperties(userId: string): Promise<Property[]>;
  getBookingsForProperties(propertyIds: string[]): Promise<Booking[]>;
  getReviewsForProperties(propertyIds: string[]): Promise<(Review & { guest: User })[]>;

  // Availability Override operations
  getAvailabilityOverrides(propertyId: string): Promise<AvailabilityOverride[]>;
  createAvailabilityOverride(override: InsertAvailabilityOverride): Promise<AvailabilityOverride>;
  deleteAvailabilityOverride(id: string): Promise<void>;
  getPropertyBlockedDates(propertyId: string, startDate: Date, endDate: Date): Promise<{ startDate: Date; endDate: Date; type: string }[]>;
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
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room as RoomType | undefined;
  }

  // Room Option operations
  async getRoomOptions(roomTypeId: string): Promise<RoomOption[]> {
    return await db
      .select()
      .from(roomOptions)
      .where(eq(roomOptions.roomTypeId, roomTypeId))
      .orderBy(roomOptions.createdAt);
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
    const [booking] = await db.insert(bookings).values({ ...bookingData, bookingCode }).returning();
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
      .orderBy(sql`${bookings.checkIn} DESC`);
  }

  async getBookingsByGuest(guestId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.guestId, guestId))
      .orderBy(sql`${bookings.checkIn} DESC`);
  }

  async getPropertyBookedDates(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ checkIn: Date; checkOut: Date }[]> {
    const results = await db
      .select({
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          inArray(bookings.status, ["pending", "confirmed"]),
          gt(bookings.checkOut, startDate),
          lt(bookings.checkIn, endDate)
        )
      );
    return results.map(r => ({
      checkIn: new Date(r.checkIn),
      checkOut: new Date(r.checkOut),
    }));
  }

  async updateBookingStatus(
    id: string,
    status: "pending" | "confirmed" | "rejected" | "cancelled" | "checked_in" | "checked_out" | "completed",
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
  async createLocalUser(data: { firstName: string; lastName: string; email: string; passwordHash: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        registrationMethod: "local",
        userRole: "guest",
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

  async getPropertyBlockedDates(propertyId: string, checkIn: Date, checkOut: Date): Promise<{ startDate: Date; endDate: Date; type: string }[]> {
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
    
    return overrides.map(o => ({
      startDate: o.startDate,
      endDate: o.endDate,
      type: o.overrideType,
    }));
  }
}

export const storage = new DatabaseStorage();
