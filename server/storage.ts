// Referenced from blueprint:javascript_log_in_with_replit and blueprint:javascript_database
import {
  users,
  properties,
  rooms,
  amenities,
  propertyAmenities,
  wishlists,
  userPreferences,
  bookings,
  conversations,
  messages,
  reviews,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Room,
  type InsertRoom,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, lt, gt, inArray, sql, or, not } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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

  // Room operations
  getRoomsByProperty(propertyId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;

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
  getPropertyAmenities(propertyId: string): Promise<Amenity[]>;
  setPropertyAmenities(propertyId: string, amenityIds: string[]): Promise<void>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByProperty(propertyId: string): Promise<Booking[]>;
  getBookingsByGuest(guestId: string): Promise<Booking[]>;
  getPropertyBookedDates(propertyId: string, startDate: Date, endDate: Date): Promise<{ checkIn: Date; checkOut: Date }[]>;
  updateBookingStatus(id: string, status: "pending" | "confirmed" | "cancelled" | "completed"): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  // Conversation operations
  getConversationsByUser(userId: string): Promise<(Conversation & { property: Property; guest: User; owner: User; unreadCount: number })[]>;
  getOrCreateConversation(propertyId: string, guestId: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: string, limit?: number): Promise<(Message & { sender: User })[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByProperty(propertyId: string): Promise<(Review & { guest: User })[]>;
  getReview(id: string): Promise<Review | undefined>;
  updateOwnerResponse(reviewId: string, response: string): Promise<Review | undefined>;
  getAverageRating(propertyId: string): Promise<number>;
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

  // Property operations
  async getProperties(filters?: {
    destination?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minGuests?: number;
    ownerId?: string;
  }): Promise<Property[]> {
    let query = db.select().from(properties);

    const conditions = [];
    if (filters?.destination) {
      conditions.push(sql`${properties.destination} ILIKE ${`%${filters.destination}%`}`);
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
    const [property] = await db
      .insert(properties)
      .values(propertyData)
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
    const [booking] = await db.insert(bookings).values(bookingData).returning();
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
    status: "pending" | "confirmed" | "cancelled" | "completed"
  ): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
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
        p.id as property_id, p.title as property_title, p.destination as property_destination, 
        p.price_per_night as property_price_per_night, p.images as property_images,
        p.property_type as property_type, p.max_guests as property_max_guests,
        p.owner_id as property_owner_id, p.status as property_status, p.rating as property_rating,
        p.review_count as property_review_count, p.description as property_description,
        p.bedrooms as property_bedrooms, p.bathrooms as property_bathrooms, p.beds as property_beds,
        p.address as property_address, p.latitude as property_latitude, p.longitude as property_longitude,
        p.policies as property_policies, p.created_at as property_created_at, p.updated_at as property_updated_at,
        gu.id as guest_id, gu.email as guest_email, gu.first_name as guest_first_name,
        gu.last_name as guest_last_name, gu.profile_image_url as guest_profile_image_url,
        gu.user_role as guest_user_role, gu.created_at as guest_created_at, gu.updated_at as guest_updated_at,
        ou.id as owner_id, ou.email as owner_email, ou.first_name as owner_first_name,
        ou.last_name as owner_last_name, ou.profile_image_url as owner_profile_image_url,
        ou.user_role as owner_user_role, ou.created_at as owner_created_at, ou.updated_at as owner_updated_at,
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
        title: row.property_title,
        destination: row.property_destination,
        pricePerNight: row.property_price_per_night,
        images: row.property_images,
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
      },
      guest: {
        id: row.guest_id,
        email: row.guest_email,
        firstName: row.guest_first_name,
        lastName: row.guest_last_name,
        profileImageUrl: row.guest_profile_image_url,
        userRole: row.guest_user_role,
        createdAt: row.guest_created_at,
        updatedAt: row.guest_updated_at,
      },
      owner: {
        id: row.owner_id,
        email: row.owner_email,
        firstName: row.owner_first_name,
        lastName: row.owner_last_name,
        profileImageUrl: row.owner_profile_image_url,
        userRole: row.owner_user_role,
        createdAt: row.owner_created_at,
        updatedAt: row.owner_updated_at,
      },
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
    const [message] = await db.insert(messages).values(messageData).returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, messageData.conversationId));

    return message;
  }

  async getMessagesByConversation(conversationId: string, limit: number = 50): Promise<(Message & { sender: User })[]> {
    const results = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(limit);

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

  async getAverageRating(propertyId: string): Promise<number> {
    const result = await db
      .select({ avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)` })
      .from(reviews)
      .where(eq(reviews.propertyId, propertyId));

    return Math.round((result[0]?.avg || 0) * 10) / 10;
  }
}

export const storage = new DatabaseStorage();
