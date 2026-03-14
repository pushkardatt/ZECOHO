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
  siteSettings,
  contactInteractions,
  adminAuditLogs,
  supportConversations,
  supportMessages,
  supportTickets,
  pushSubscriptions,
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
  type SiteSettings,
  type InsertSiteSettings,
  type ContactInteraction,
  type InsertContactInteraction,
  type AdminAuditLog,
  type InsertAdminAuditLogData,
  type SupportConversation,
  type InsertSupportConversation,
  type SupportMessage,
  type InsertSupportMessage,
  type SupportTicket,
  type InsertSupportTicket,
  notificationLogs,
  type NotificationLog,
  type InsertNotificationLog,
  waitlist,
  type Waitlist,
  type InsertWaitlist,
  testerWhitelist,
  type TesterWhitelist,
  type InsertTesterWhitelist,
  roomPriceOverrides,
  mealPlanPriceOverrides,
  subscriptionPlans,
  ownerSubscriptions,
  type RoomPriceOverride,
  type InsertRoomPriceOverride,
  type MealPlanPriceOverride,
  type InsertMealPlanPriceOverride,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type OwnerSubscription,
  type InsertOwnerSubscription,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  and,
  gte,
  lte,
  lt,
  gt,
  inArray,
  sql,
  or,
  not,
  desc,
  count,
} from "drizzle-orm";

function generateRandomCode(length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generatePropertyCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `PROP-${generateRandomCode(6)}`;
    const [existing] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.propertyCode, code));
    if (!existing) return code;
  }
  return `PROP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

async function generateBookingCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `BKG-${generateRandomCode(6)}`;
    const [existing] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.bookingCode, code));
    if (!existing) return code;
  }
  return `BKG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  promoteUserToAdmin(email: string): Promise<User | undefined>;
  getAdminUsers(): Promise<User[]>;

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
    status?: string;
    includeAllStatuses?: boolean;
    search?: string;
    adminView?: boolean;
  }): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(
    id: string,
    property: Partial<InsertProperty>,
  ): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<void>;

  getRoomsByProperty(propertyId: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room | undefined>;
  deleteRoom(id: string): Promise<void>;
  getRoomType(id: string): Promise<RoomType | undefined>;
  getRoomTypes(propertyId: string): Promise<RoomType[]>;

  getRoomOptions(roomTypeId: string): Promise<RoomOption[]>;
  getRoomOption(id: string): Promise<RoomOption | undefined>;
  createRoomOption(option: InsertRoomOption): Promise<RoomOption>;
  updateRoomOption(
    id: string,
    option: Partial<InsertRoomOption>,
  ): Promise<RoomOption | undefined>;
  deleteRoomOption(id: string): Promise<void>;

  getWishlists(userId: string): Promise<Wishlist[]>;
  createWishlist(wishlist: InsertWishlist): Promise<Wishlist>;
  deleteWishlist(id: string): Promise<void>;

  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(
    preferences: InsertUserPreferences,
  ): Promise<UserPreferences>;

  getAllAmenities(): Promise<Amenity[]>;
  createAmenity(amenity: InsertAmenity): Promise<Amenity>;
  createAmenitiesIgnoreDuplicates(amenities: InsertAmenity[]): Promise<void>;
  getPropertyAmenities(propertyId: string): Promise<Amenity[]>;
  setPropertyAmenities(propertyId: string, amenityIds: string[]): Promise<void>;

  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByProperty(propertyId: string): Promise<Booking[]>;
  getBookingsByGuest(guestId: string): Promise<Booking[]>;
  getPropertyBookedDates(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    roomTypeId?: string | null,
  ): Promise<{ checkIn: Date; checkOut: Date }[]>;
  updateBookingStatus(
    id: string,
    status:
      | "pending"
      | "confirmed"
      | "customer_confirmed"
      | "rejected"
      | "cancelled"
      | "checked_in"
      | "checked_out"
      | "completed"
      | "no_show",
    responseMessage?: string,
  ): Promise<Booking | undefined>;
  markCheckedIn(
    bookingId: string,
    userId: string,
  ): Promise<Booking | undefined>;
  markCheckedOut(
    bookingId: string,
    userId: string,
    isEarlyCheckout?: boolean,
  ): Promise<Booking | undefined>;
  markNoShow(
    bookingId: string,
    userId: string,
    markedBy: "owner" | "admin",
    reason?: string,
  ): Promise<Booking | undefined>;
  adminUnmarkNoShow(
    bookingId: string,
    userId: string,
  ): Promise<Booking | undefined>;
  cancelBooking(
    bookingId: string,
    cancelledBy: "guest" | "owner" | "admin",
    reason?: string,
  ): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  getConversationsByUser(userId: string): Promise<
    (Conversation & {
      property: Property;
      guest: User;
      owner: User;
      unreadCount: number;
    })[]
  >;
  getOrCreateConversation(
    propertyId: string,
    guestId: string,
  ): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;

  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(
    conversationId: string,
  ): Promise<(Message & { sender: User })[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;

  createReview(review: InsertReview): Promise<Review>;
  getReviewsByProperty(
    propertyId: string,
  ): Promise<(Review & { guest: User })[]>;
  getReview(id: string): Promise<Review | undefined>;
  getReviewByBookingId(bookingId: string): Promise<Review | undefined>;
  updateOwnerResponse(
    reviewId: string,
    response: string,
  ): Promise<Review | undefined>;
  getAverageRating(propertyId: string): Promise<number>;

  getAllDestinations(): Promise<Destination[]>;
  getFeaturedDestinations(): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | undefined>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  updateDestination(
    id: string,
    destination: Partial<InsertDestination>,
  ): Promise<Destination | undefined>;
  deleteDestination(id: string): Promise<void>;
  clearAllDestinations(): Promise<void>;
  setFeaturedDestination(
    id: string,
    isFeatured: boolean,
  ): Promise<Destination | undefined>;
  searchDestinations(
    query: string,
    limit?: number,
  ): Promise<{ id: string; name: string; state: string }[]>;

  createSearchHistory(
    userId: string,
    search: InsertSearchHistory,
  ): Promise<SearchHistory>;
  getUserSearchHistory(
    userId: string,
    limit?: number,
  ): Promise<SearchHistory[]>;
  deleteSearchHistory(id: string): Promise<void>;

  createKycApplication(
    userId: string,
    application: KycApplicationFormData,
  ): Promise<KycApplication>;
  getAllKycApplications(): Promise<KycApplication[]>;
  getKycApplicationsByStatus(
    status: "pending" | "verified" | "rejected",
  ): Promise<KycApplication[]>;
  getUserKycApplication(userId: string): Promise<KycApplication | undefined>;
  getKycApplication(id: string): Promise<KycApplication | undefined>;
  updateKycApplicationStatus(
    id: string,
    status: "verified" | "rejected",
    reviewNotes?: string,
    rejectionDetails?: any,
  ): Promise<KycApplication | undefined>;
  updateKycApplication(
    id: string,
    updates: KycApplicationFormData,
  ): Promise<KycApplication | undefined>;
  deleteKycApplication(id: string): Promise<void>;

  createOtpCode(email: string, code: string, expiresAt: Date): Promise<OtpCode>;
  getValidOtpCode(email: string, code: string): Promise<OtpCode | undefined>;
  incrementOtpAttempts(id: string): Promise<void>;
  markOtpVerified(id: string): Promise<void>;
  deleteExpiredOtpCodes(): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserFromEmail(email: string): Promise<User>;

  createLocalUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    consentCommunication?: boolean;
    termsAcceptedVersion?: number;
    privacyAcceptedVersion?: number;
  }): Promise<User>;
  updateUserEmailVerified(userId: string): Promise<User | undefined>;
  updateUserPassword(
    userId: string,
    passwordHash: string,
  ): Promise<User | undefined>;

  getOwnerProperties(userId: string): Promise<Property[]>;
  getBookingsForProperties(propertyIds: string[]): Promise<Booking[]>;
  getReviewsForProperties(
    propertyIds: string[],
  ): Promise<(Review & { guest: User })[]>;
  getRoomUtilization(
    propertyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      roomTypeId: string;
      roomTypeName: string;
      totalRooms: number;
      confirmedRooms: number;
      pendingRooms: number;
      availableRooms: number;
    }[]
  >;
  getRoomUtilizationByDate(
    propertyId: string,
    roomTypeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      date: string;
      confirmedRooms: number;
      pendingRooms: number;
      availableRooms: number;
      totalRooms: number;
    }[]
  >;

  getAvailabilityOverrides(propertyId: string): Promise<AvailabilityOverride[]>;
  createAvailabilityOverride(
    override: InsertAvailabilityOverride,
  ): Promise<AvailabilityOverride>;
  deleteAvailabilityOverride(id: string): Promise<void>;
  getPropertyBlockedDates(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    roomTypeId?: string | null,
  ): Promise<
    {
      startDate: Date;
      endDate: Date;
      type: string;
      roomTypeId: string | null;
    }[]
  >;

  getRoomPriceOverrides(
    roomTypeId: string,
    startDate: string,
    endDate: string,
  ): Promise<RoomPriceOverride[]>;
  upsertRoomPriceOverride(
    propertyId: string,
    roomTypeId: string,
    date: string,
    price: number,
  ): Promise<RoomPriceOverride>;
  deleteRoomPriceOverride(id: string): Promise<void>;
  getMealPlanPriceOverrides(
    roomOptionIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<MealPlanPriceOverride[]>;
  upsertMealPlanPriceOverride(
    roomOptionId: string,
    date: string,
    price: number,
  ): Promise<MealPlanPriceOverride>;
  deleteMealPlanPriceOverride(id: string): Promise<void>;

  createDeactivationRequest(
    propertyId: string,
    ownerId: string,
    reason: string,
    requestType?: "deactivate" | "delete" | "reactivate",
  ): Promise<PropertyDeactivationRequest>;
  getDeactivationRequest(
    id: string,
  ): Promise<PropertyDeactivationRequest | undefined>;
  getDeactivationRequestByProperty(
    propertyId: string,
  ): Promise<PropertyDeactivationRequest | undefined>;
  getDeactivationRequestsByOwner(
    ownerId: string,
  ): Promise<PropertyDeactivationRequest[]>;
  getAllPendingDeactivationRequests(): Promise<
    (PropertyDeactivationRequest & { property: Property; owner: User })[]
  >;
  processDeactivationRequest(
    id: string,
    adminId: string,
    status: "approved" | "rejected",
    adminNotes?: string,
  ): Promise<PropertyDeactivationRequest | undefined>;
  cancelDeactivationRequest(id: string): Promise<void>;
  fixMisclassifiedReactivationRequests(): Promise<number>;

  getAllPolicies(): Promise<Policy[]>;
  getPolicy(id: string): Promise<Policy | undefined>;
  getPolicyByTypeAndVersion(
    type: "terms" | "privacy",
    version: number,
  ): Promise<Policy | undefined>;
  getPublishedPolicy(type: "terms" | "privacy"): Promise<Policy | undefined>;
  getLatestPolicyVersion(type: "terms" | "privacy"): Promise<number>;
  createPolicy(
    policy: Omit<InsertPolicy, "id" | "createdAt" | "updatedAt">,
  ): Promise<Policy>;
  updatePolicy(
    id: string,
    updates: Partial<Pick<Policy, "title" | "content">>,
  ): Promise<Policy | undefined>;
  publishPolicy(id: string): Promise<Policy | undefined>;
  archivePolicy(id: string): Promise<Policy | undefined>;
  updateUserPolicyConsent(
    userId: string,
    termsVersion: number,
    privacyVersion: number,
    consentCommunication?: boolean,
  ): Promise<User | undefined>;

  getAllOwnerAgreements(): Promise<OwnerAgreement[]>;
  getOwnerAgreement(id: string): Promise<OwnerAgreement | undefined>;
  getOwnerAgreementByVersion(
    version: number,
  ): Promise<OwnerAgreement | undefined>;
  getPublishedOwnerAgreement(): Promise<OwnerAgreement | undefined>;
  getLatestOwnerAgreementVersion(): Promise<number>;
  createOwnerAgreement(
    agreement: Omit<InsertOwnerAgreement, "id" | "createdAt" | "updatedAt">,
  ): Promise<OwnerAgreement>;
  updateOwnerAgreement(
    id: string,
    updates: Partial<Pick<OwnerAgreement, "title" | "content">>,
  ): Promise<OwnerAgreement | undefined>;
  publishOwnerAgreement(id: string): Promise<OwnerAgreement | undefined>;
  archiveOwnerAgreement(id: string): Promise<OwnerAgreement | undefined>;
  updateUserOwnerAgreementConsent(
    userId: string,
    version: number,
  ): Promise<User | undefined>;

  getAllAboutUs(): Promise<AboutUs[]>;
  getAboutUs(id: string): Promise<AboutUs | undefined>;
  getAboutUsByVersion(version: number): Promise<AboutUs | undefined>;
  getPublishedAboutUs(): Promise<AboutUs | undefined>;
  getLatestAboutUsVersion(): Promise<number>;
  createAboutUs(
    about: Omit<InsertAboutUs, "id" | "createdAt" | "updatedAt">,
  ): Promise<AboutUs>;
  updateAboutUs(
    id: string,
    updates: Partial<Pick<AboutUs, "title" | "content">>,
  ): Promise<AboutUs | undefined>;
  publishAboutUs(id: string): Promise<AboutUs | undefined>;
  archiveAboutUs(id: string): Promise<AboutUs | undefined>;

  getContactSettings(): Promise<ContactSettings | undefined>;
  upsertContactSettings(
    settings: Partial<InsertContactSettings>,
  ): Promise<ContactSettings>;

  getSiteSettings(): Promise<SiteSettings | undefined>;
  upsertSiteSettings(
    settings: Partial<InsertSiteSettings>,
  ): Promise<SiteSettings>;

  logContactInteraction(
    data: InsertContactInteraction,
  ): Promise<ContactInteraction>;

  createAdminAuditLog(data: InsertAdminAuditLogData): Promise<AdminAuditLog>;
  getAdminAuditLogs(filters?: {
    adminId?: string;
    action?: string;
    limit?: number;
  }): Promise<AdminAuditLog[]>;

  suspendOwner(
    ownerId: string,
    adminId: string,
    reason: string,
  ): Promise<User | undefined>;
  reinstateOwner(ownerId: string, adminId: string): Promise<User | undefined>;
  getSuspendedOwners(): Promise<User[]>;
  suspendOwnerProperties(ownerId: string): Promise<void>;
  reinstateOwnerProperties(ownerId: string): Promise<void>;

  deactivateUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<User | undefined>;
  restoreUser(userId: string, adminId: string): Promise<User | undefined>;
  deleteUser(userId: string, adminId: string): Promise<void>;
  getDeactivatedUsers(): Promise<User[]>;
  getAllUsersForAdmin(filters?: {
    search?: string;
    status?: "active" | "deactivated" | "all";
    limit?: number;
  }): Promise<User[]>;

  adminCancelBooking(
    bookingId: string,
    adminId: string,
    reason?: string,
  ): Promise<Booking | undefined>;
  adminMarkNoShow(
    bookingId: string,
    adminId: string,
    reason: string,
  ): Promise<Booking | undefined>;
  adminForceCheckIn(
    bookingId: string,
    adminId: string,
  ): Promise<Booking | undefined>;
  adminForceCheckOut(
    bookingId: string,
    adminId: string,
  ): Promise<Booking | undefined>;

  getInventoryHealth(propertyId?: string): Promise<
    {
      propertyId: string;
      propertyTitle: string;
      roomTypeId: string;
      roomTypeName: string;
      totalRooms: number;
      bookedRooms: number;
      availableRooms: number;
      hasNegativeInventory: boolean;
    }[]
  >;
  fixInventory(
    propertyId: string,
    roomTypeId?: string,
    startDate?: Date,
    endDate?: Date,
    dryRun?: boolean,
  ): Promise<{ fixed: number; details: string[] }>;

  getBookingManagementStats(): Promise<{
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    noShowBookings: number;
  }>;
  getOwnerComplianceStats(): Promise<{
    totalOwners: number;
    activeOwners: number;
    suspendedOwners: number;
    pendingKyc: number;
  }>;
  getAllBookingsForAdmin(filters?: {
    status?: string;
    propertyId?: string;
    limit?: number;
  }): Promise<(Booking & { property: Property; guest: User })[]>;

  createPushSubscription(subscription: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }): Promise<void>;
  getPushSubscriptions(
    userId: string,
  ): Promise<{ endpoint: string; p256dh: string; auth: string }[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionsByUser(userId: string): Promise<void>;

  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  updateNotificationLog(
    id: string,
    updates: Partial<InsertNotificationLog>,
  ): Promise<void>;
  getNotificationLogsByBooking(bookingId: string): Promise<NotificationLog[]>;

  addToWaitlist(entry: InsertWaitlist): Promise<Waitlist>;
  getWaitlist(): Promise<Waitlist[]>;
  deleteWaitlistEntry(id: string): Promise<void>;
  isEmailInWaitlist(email: string): Promise<boolean>;

  addToTesterWhitelist(entry: InsertTesterWhitelist): Promise<TesterWhitelist>;
  getTesterWhitelist(): Promise<TesterWhitelist[]>;
  removeTesterWhitelistEntry(id: string): Promise<void>;
  isEmailWhitelisted(email: string): Promise<boolean>;

  // Subscription Plan operations
  getAllSubscriptionPlans(
    includeInactive?: boolean,
  ): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(
    plan: InsertSubscriptionPlan,
  ): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(
    id: string,
    updates: Partial<InsertSubscriptionPlan>,
  ): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<void>;

  // Owner Subscription operations
  getOwnerActiveSubscription(
    ownerId: string,
  ): Promise<OwnerSubscription | undefined>;
  getOwnerSubscriptionHistory(ownerId: string): Promise<OwnerSubscription[]>;
  createOwnerSubscription(
    data: InsertOwnerSubscription,
  ): Promise<OwnerSubscription>;
  activateOwnerSubscription(
    id: string,
    adminId: string,
    note?: string,
  ): Promise<OwnerSubscription | undefined>;
  cancelOwnerSubscription(
    id: string,
    reason?: string,
  ): Promise<OwnerSubscription | undefined>;
  waiveOwnerSubscription(
    id: string,
    adminId: string,
    note: string,
  ): Promise<OwnerSubscription | undefined>;
  getAllOwnerSubscriptionsForAdmin(): Promise<
    (OwnerSubscription & { owner: User; plan: SubscriptionPlan })[]
  >;
  checkOwnerSubscriptionStatus(ownerId: string): Promise<{
    isActive: boolean;
    tier: string | null;
    expiresAt: Date | null;
    daysLeft: number | null;
  }>;
  expireStaleSubscriptions(): Promise<number>;
  updateOwnerSubscriptionDates(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OwnerSubscription | undefined>;
  canOwnerAddProperty(ownerId: string): Promise<{
    allowed: boolean;
    reason?: string;
    currentCount: number;
    maxAllowed: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.email) {
      const existingUserByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email.toLowerCase()))
        .limit(1);
      if (
        existingUserByEmail.length > 0 &&
        existingUserByEmail[0].id !== userData.id
      ) {
        const [updatedUser] = await db
          .update(users)
          .set({
            firstName: userData.firstName || existingUserByEmail[0].firstName,
            lastName: userData.lastName || existingUserByEmail[0].lastName,
            profileImageUrl:
              userData.profileImageUrl ||
              existingUserByEmail[0].profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUserByEmail[0].id))
          .returning();
        return updatedUser;
      }
    }
    const [user] = await db
      .insert(users)
      .values({ ...userData, email: userData.email?.toLowerCase() })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          email: userData.email?.toLowerCase(),
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
    return await db.select().from(users).where(eq(users.userRole, "admin"));
  }

  // ── UPDATED: getProperties with subscription gating ──
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
    adminView?: boolean;
  }): Promise<Property[]> {
    let query = db.select().from(properties);
    const conditions: any[] = [];

    if (!filters?.includeAllStatuses) {
      if (filters?.status) {
        conditions.push(eq(properties.status, filters.status as any));
      } else if (!filters?.ownerId) {
        conditions.push(eq(properties.status, "published"));
      }
    }

    if (filters?.search) {
      conditions.push(
        or(
          sql`${properties.title} ILIKE ${`%${filters.search}%`}`,
          sql`${properties.destination} ILIKE ${`%${filters.search}%`}`,
          sql`${properties.propCity} ILIKE ${`%${filters.search}%`}`,
          sql`${properties.propState} ILIKE ${`%${filters.search}%`}`,
        ),
      );
    } else if (filters?.destination) {
      conditions.push(
        or(
          sql`${properties.destination} ILIKE ${`%${filters.destination}%`}`,
          sql`${properties.title} ILIKE ${`%${filters.destination}%`}`,
        ),
      );
    }
    if (filters?.propertyType)
      conditions.push(eq(properties.propertyType, filters.propertyType as any));
    if (filters?.minPrice !== undefined)
      conditions.push(
        gte(properties.pricePerNight, filters.minPrice.toString()),
      );
    if (filters?.maxPrice !== undefined)
      conditions.push(
        lte(properties.pricePerNight, filters.maxPrice.toString()),
      );
    if (filters?.minGuests !== undefined)
      conditions.push(gte(properties.maxGuests, filters.minGuests));
    if (filters?.ownerId)
      conditions.push(eq(properties.ownerId, filters.ownerId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    let allProps = await query;

    // Skip subscription gating for admin views or owner's own properties
    if (filters?.adminView || filters?.ownerId) {
      return allProps;
    }

    // For public listing: only show properties whose owner has an active subscription
    const now = new Date();
    const ownerIds = [...new Set(allProps.map((p) => p.ownerId))];
    if (ownerIds.length === 0) return [];

    const activeSubs = await db
      .select({ ownerId: ownerSubscriptions.ownerId })
      .from(ownerSubscriptions)
      .where(
        and(
          inArray(ownerSubscriptions.ownerId, ownerIds),
          eq(ownerSubscriptions.status, "active"),
          or(
            sql`${ownerSubscriptions.endDate} IS NULL`,
            gt(ownerSubscriptions.endDate, now),
          ),
        ),
      );

    const subscribedOwnerIds = new Set(activeSubs.map((s) => s.ownerId));
    return allProps.filter((p) => subscribedOwnerIds.has(p.ownerId));
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));
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

  async updateProperty(
    id: string,
    propertyData: Partial<InsertProperty>,
  ): Promise<Property | undefined> {
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

  async getRoomsByProperty(propertyId: string): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(eq(rooms.propertyId, propertyId));
  }

  async createRoom(roomData: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(roomData).returning();
    return room;
  }

  async updateRoom(
    id: string,
    roomData: Partial<InsertRoom>,
  ): Promise<Room | undefined> {
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
    const [room] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, id));
    return room;
  }

  async getRoomTypes(propertyId: string): Promise<RoomType[]> {
    return await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.propertyId, propertyId));
  }

  async getRoomOptions(roomTypeId: string): Promise<RoomOption[]> {
    return await db
      .select()
      .from(roomOptions)
      .where(eq(roomOptions.roomTypeId, roomTypeId))
      .orderBy(roomOptions.createdAt);
  }

  async getRoomOption(id: string): Promise<RoomOption | undefined> {
    const [option] = await db
      .select()
      .from(roomOptions)
      .where(eq(roomOptions.id, id));
    return option;
  }

  async createRoomOption(optionData: InsertRoomOption): Promise<RoomOption> {
    const [option] = await db
      .insert(roomOptions)
      .values(optionData)
      .returning();
    return option;
  }

  async updateRoomOption(
    id: string,
    optionData: Partial<InsertRoomOption>,
  ): Promise<RoomOption | undefined> {
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

  async getWishlists(userId: string): Promise<Wishlist[]> {
    return await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.userId, userId));
  }

  async getWishlistById(id: string): Promise<Wishlist | undefined> {
    const [wishlist] = await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.id, id));
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

  async getUserPreferences(
    userId: string,
  ): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async upsertUserPreferences(
    preferencesData: InsertUserPreferences,
  ): Promise<UserPreferences> {
    const [prefs] = await db
      .insert(userPreferences)
      .values(preferencesData)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { ...preferencesData, updatedAt: new Date() },
      })
      .returning();
    return prefs;
  }

  async getAllAmenities(): Promise<Amenity[]> {
    return await db.select().from(amenities);
  }

  async createAmenity(amenityData: InsertAmenity): Promise<Amenity> {
    const [amenity] = await db
      .insert(amenities)
      .values(amenityData)
      .returning();
    return amenity;
  }

  async createAmenitiesIgnoreDuplicates(
    amenitiesData: InsertAmenity[],
  ): Promise<void> {
    if (amenitiesData.length === 0) return;
    await db
      .insert(amenities)
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

  async setPropertyAmenities(
    propertyId: string,
    amenityIds: string[],
  ): Promise<void> {
    await db
      .delete(propertyAmenities)
      .where(eq(propertyAmenities.propertyId, propertyId));
    if (amenityIds.length > 0) {
      await db
        .insert(propertyAmenities)
        .values(amenityIds.map((amenityId) => ({ propertyId, amenityId })));
    }
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const bookingCode = await generateBookingCode();
    const [booking] = await db
      .insert(bookings)
      .values({ ...bookingData, bookingCode, bookingCreatedAt: new Date() })
      .returning();
    return booking;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
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
    roomTypeId?: string | null,
  ): Promise<{ checkIn: Date; checkOut: Date }[]> {
    const ACTIVE_BOOKING_STATUSES: (
      | "confirmed"
      | "customer_confirmed"
      | "checked_in"
    )[] = ["confirmed", "customer_confirmed", "checked_in"];
    const conditions: any[] = [
      eq(bookings.propertyId, propertyId),
      inArray(bookings.status, ACTIVE_BOOKING_STATUSES),
      gt(bookings.checkOut, startDate),
      lt(bookings.checkIn, endDate),
    ];
    if (roomTypeId) conditions.push(eq(bookings.roomTypeId, roomTypeId));
    const results = await db
      .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
      .from(bookings)
      .where(and(...conditions));
    return results.map((r) => ({
      checkIn: new Date(r.checkIn),
      checkOut: new Date(r.checkOut),
    }));
  }

  async updateBookingStatus(
    id: string,
    status:
      | "pending"
      | "confirmed"
      | "customer_confirmed"
      | "rejected"
      | "cancelled"
      | "checked_in"
      | "checked_out"
      | "completed",
    responseMessage?: string,
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

  async markCheckedIn(
    bookingId: string,
    userId: string,
  ): Promise<Booking | undefined> {
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

  async markCheckedOut(
    bookingId: string,
    userId: string,
    isEarlyCheckout?: boolean,
  ): Promise<Booking | undefined> {
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

  async markNoShow(
    bookingId: string,
    userId: string,
    markedBy: "owner" | "admin",
    reason?: string,
  ): Promise<Booking | undefined> {
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

  async cancelBooking(
    bookingId: string,
    cancelledBy: "guest" | "owner" | "admin",
    reason?: string,
  ): Promise<Booking | undefined> {
    const now = new Date();
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });
    if (!booking) return undefined;
    const property = await db.query.properties.findFirst({
      where: eq(properties.id, booking.propertyId),
    });
    if (!property) return undefined;

    let refundPercentage = 0;
    const totalPrice = parseFloat(booking.totalPrice);
    const hoursUntilCheckIn =
      (new Date(booking.checkIn).getTime() - now.getTime()) / (1000 * 60 * 60);
    const freeCancellationHours = property.freeCancellationHours || 24;
    const partialRefundPercent = property.partialRefundPercent || 50;

    if (cancelledBy === "owner" || cancelledBy === "admin") {
      refundPercentage = 100;
    } else {
      const policyType = property.cancellationPolicyType || "flexible";
      if (policyType === "flexible") {
        refundPercentage =
          hoursUntilCheckIn >= freeCancellationHours
            ? 100
            : partialRefundPercent;
      } else if (policyType === "moderate") {
        if (hoursUntilCheckIn >= freeCancellationHours) refundPercentage = 100;
        else if (hoursUntilCheckIn >= freeCancellationHours / 2)
          refundPercentage = partialRefundPercent;
        else refundPercentage = 0;
      } else if (policyType === "strict") {
        refundPercentage =
          hoursUntilCheckIn >= freeCancellationHours * 2
            ? partialRefundPercent
            : 0;
      }
    }

    const refundAmount = ((totalPrice * refundPercentage) / 100).toFixed(2);
    const [updated] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancelledBy,
        cancellationReason: reason || null,
        refundAmount,
        refundPercentage,
        updatedAt: now,
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  async adminUnmarkNoShow(
    bookingId: string,
    userId: string,
  ): Promise<Booking | undefined> {
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

  async getConversationsByUser(userId: string): Promise<
    (Conversation & {
      property: Property;
      guest: User;
      owner: User;
      unreadCount: number;
    })[]
  > {
    const userConversations = await db.execute(sql`
      SELECT c.*,
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

  async getOrCreateConversation(
    propertyId: string,
    guestId: string,
  ): Promise<Conversation> {
    const property = await this.getProperty(propertyId);
    if (!property) throw new Error("Property not found");
    const [existing] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.propertyId, propertyId),
          eq(conversations.guestId, guestId),
        ),
      );
    if (existing) return existing;
    const [conversation] = await db
      .insert(conversations)
      .values({ propertyId, guestId, ownerId: property.ownerId })
      .returning();
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    console.log(
      "[MESSAGE CREATE] Starting message creation:",
      JSON.stringify(messageData),
    );
    const [message] = await db.insert(messages).values(messageData).returning();
    console.log("[MESSAGE CREATE] Message inserted with ID:", message.id);
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, messageData.conversationId));
    console.log("[MESSAGE CREATE] Conversation lastMessageAt updated");
    const [verifyMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, message.id));
    console.log(
      "[MESSAGE CREATE] Verification - message exists:",
      !!verifyMessage,
    );
    return message;
  }

  async getMessagesByConversation(
    conversationId: string,
  ): Promise<(Message & { sender: User })[]> {
    const results = await db
      .select({ message: messages, sender: users })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    return results.map((r) => ({ ...r.message, sender: r.sender! }));
  }

  async markMessagesAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return;
    const otherParticipantId =
      conversation.guestId === userId
        ? conversation.ownerId
        : conversation.guestId;
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.senderId, otherParticipantId),
          eq(messages.read, false),
        ),
      );
  }

  async createReview(reviewData: InsertReview): Promise<Review> {
    if (reviewData.bookingId) {
      const [existingReview] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.bookingId, reviewData.bookingId))
        .limit(1);
      if (existingReview)
        throw new Error("A review already exists for this booking");
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
    await db
      .update(properties)
      .set({ rating: avgRating.toString(), reviewCount: stats[0]?.count || 0 })
      .where(eq(properties.id, reviewData.propertyId));
    return review;
  }

  async getReviewsByProperty(
    propertyId: string,
  ): Promise<(Review & { guest: User })[]> {
    const results = await db
      .select({ review: reviews, guest: users })
      .from(reviews)
      .leftJoin(users, eq(reviews.guestId, users.id))
      .where(eq(reviews.propertyId, propertyId))
      .orderBy(sql`${reviews.createdAt} DESC`);
    return results.map((r) => ({ ...r.review, guest: r.guest! }));
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

  async updateOwnerResponse(
    reviewId: string,
    response: string,
  ): Promise<Review | undefined> {
    const [updated] = await db
      .update(reviews)
      .set({ ownerResponse: response, ownerResponseAt: new Date() })
      .where(eq(reviews.id, reviewId))
      .returning();
    return updated;
  }

  async incrementReviewHelpful(
    reviewId: string,
  ): Promise<(Review & { guest: User }) | undefined> {
    await db
      .update(reviews)
      .set({ helpful: sql`${reviews.helpful} + 1` })
      .where(eq(reviews.id, reviewId));
    const result = await db
      .select({ review: reviews, guest: users })
      .from(reviews)
      .leftJoin(users, eq(reviews.guestId, users.id))
      .where(eq(reviews.id, reviewId))
      .limit(1);
    if (result.length === 0) return undefined;
    return { ...result[0].review, guest: result[0].guest! };
  }

  async getAverageRating(propertyId: string): Promise<number> {
    const result = await db
      .select({ avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)` })
      .from(reviews)
      .where(eq(reviews.propertyId, propertyId));
    return Math.round((result[0]?.avg || 0) * 10) / 10;
  }

  async getAllDestinations(): Promise<Destination[]> {
    return await db
      .select()
      .from(destinations)
      .orderBy(sql`${destinations.createdAt} DESC`);
  }

  async getFeaturedDestinations(): Promise<Destination[]> {
    return await db
      .select()
      .from(destinations)
      .where(eq(destinations.isFeatured, true))
      .orderBy(sql`${destinations.featuredDate} DESC`)
      .limit(3);
  }

  async getDestination(id: string): Promise<Destination | undefined> {
    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, id));
    return destination;
  }

  async createDestination(
    destinationData: InsertDestination,
  ): Promise<Destination> {
    const [destination] = await db
      .insert(destinations)
      .values(destinationData)
      .returning();
    return destination;
  }

  async updateDestination(
    id: string,
    destinationData: Partial<InsertDestination>,
  ): Promise<Destination | undefined> {
    const [updated] = await db
      .update(destinations)
      .set({ ...destinationData, updatedAt: new Date() })
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

  async searchDestinations(
    query: string,
    limit: number = 10,
  ): Promise<{ id: string; name: string; state: string }[]> {
    const searchLower = query.toLowerCase();
    return await db
      .select({
        id: destinations.id,
        name: destinations.name,
        state: destinations.state,
      })
      .from(destinations)
      .where(
        or(
          sql`LOWER(${destinations.name}) LIKE ${`%${searchLower}%`}`,
          sql`LOWER(${destinations.state}) LIKE ${`%${searchLower}%`}`,
        ),
      )
      .limit(limit);
  }

  async setFeaturedDestination(
    id: string,
    isFeatured: boolean,
  ): Promise<Destination | undefined> {
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

  async createSearchHistory(
    userId: string,
    search: InsertSearchHistory,
  ): Promise<SearchHistory> {
    const [history] = await db
      .insert(searchHistory)
      .values({ ...search, userId })
      .returning();
    return history;
  }

  async getUserSearchHistory(
    userId: string,
    limit: number = 10,
  ): Promise<SearchHistory[]> {
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

  async createKycApplication(
    userId: string,
    applicationData: KycApplicationFormData,
  ): Promise<KycApplication> {
    const [application] = await db
      .insert(kycApplications)
      .values({ ...applicationData, userId })
      .returning();
    return application;
  }

  async getKycApplicationsByStatus(
    status: "pending" | "verified" | "rejected",
  ): Promise<KycApplication[]> {
    return await db
      .select()
      .from(kycApplications)
      .where(eq(kycApplications.status, status))
      .orderBy(kycApplications.createdAt);
  }

  async getUserKycApplication(
    userId: string,
  ): Promise<KycApplication | undefined> {
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
    return await db
      .select()
      .from(kycApplications)
      .orderBy(desc(kycApplications.createdAt));
  }

  async updateKycApplicationStatus(
    id: string,
    status: "verified" | "rejected",
    reviewNotes?: string,
    rejectionDetails?: any,
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

  async updateKycApplication(
    id: string,
    updates: KycApplicationFormData,
  ): Promise<KycApplication | undefined> {
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

  async createOtpCode(
    email: string,
    code: string,
    expiresAt: Date,
  ): Promise<OtpCode> {
    await db.delete(otpCodes).where(eq(otpCodes.email, email.toLowerCase()));
    const [otp] = await db
      .insert(otpCodes)
      .values({ email: email.toLowerCase(), code, expiresAt })
      .returning();
    return otp;
  }

  async getValidOtpCode(
    email: string,
    code: string,
  ): Promise<OtpCode | undefined> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email.toLowerCase()),
          eq(otpCodes.code, code),
          eq(otpCodes.verified, false),
          gt(otpCodes.expiresAt, new Date()),
          lt(otpCodes.attempts, 5),
        ),
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
      .values({ email: email.toLowerCase(), userRole: "guest" })
      .returning();
    return user;
  }

  async createLocalUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    consentCommunication?: boolean;
    termsAcceptedVersion?: number;
    privacyAcceptedVersion?: number;
  }): Promise<User> {
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
        termsAcceptedVersion: data.termsAcceptedVersion ?? null,
        privacyAccepted: data.privacyAccepted,
        privacyAcceptedAt: data.privacyAccepted ? now : null,
        privacyAcceptedVersion: data.privacyAcceptedVersion ?? null,
        consentCommunication: data.consentCommunication ?? false,
      })
      .returning();
    return user;
  }

  async updateUserEmailVerified(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(
    userId: string,
    passwordHash: string,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

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

  async getReviewsForProperties(
    propertyIds: string[],
  ): Promise<(Review & { guest: User })[]> {
    if (propertyIds.length === 0) return [];
    const results = await db
      .select({ review: reviews, guest: users })
      .from(reviews)
      .leftJoin(users, eq(reviews.guestId, users.id))
      .where(inArray(reviews.propertyId, propertyIds))
      .orderBy(desc(reviews.createdAt));
    return results.map((r) => ({ ...r.review, guest: r.guest as User }));
  }

  async getRoomUtilization(
    propertyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      roomTypeId: string;
      roomTypeName: string;
      totalRooms: number;
      confirmedRooms: number;
      pendingRooms: number;
      availableRooms: number;
    }[]
  > {
    const propertyRoomTypes = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.propertyId, propertyId));
    if (propertyRoomTypes.length === 0) return [];
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          lt(bookings.checkIn, endDate),
          gt(bookings.checkOut, startDate),
        ),
      );
    const CONFIRMED_STATUSES = [
      "confirmed",
      "customer_confirmed",
      "checked_in",
    ];
    const PENDING_STATUSES = ["pending"];
    return propertyRoomTypes.map((rt) => {
      const roomTypeBookings = overlappingBookings.filter(
        (b) => b.roomTypeId === rt.id,
      );
      const confirmedRooms = roomTypeBookings
        .filter((b) => CONFIRMED_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rooms || 1), 0);
      const pendingRooms = roomTypeBookings
        .filter((b) => PENDING_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rooms || 1), 0);
      const totalRooms = rt.totalRooms || 1;
      return {
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        totalRooms,
        confirmedRooms,
        pendingRooms,
        availableRooms: Math.max(0, totalRooms - confirmedRooms),
      };
    });
  }

  async getRoomUtilizationByDate(
    propertyId: string,
    roomTypeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      date: string;
      confirmedRooms: number;
      pendingRooms: number;
      availableRooms: number;
      totalRooms: number;
    }[]
  > {
    const [roomType] = await db
      .select()
      .from(roomTypes)
      .where(
        and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.id, roomTypeId)),
      );
    if (!roomType) return [];
    const totalRooms = roomType.totalRooms || 1;
    const overlappingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          eq(bookings.roomTypeId, roomTypeId),
          lt(bookings.checkIn, endDate),
          gt(bookings.checkOut, startDate),
        ),
      );
    const CONFIRMED_STATUSES = [
      "confirmed",
      "customer_confirmed",
      "checked_in",
    ];
    const PENDING_STATUSES = ["pending"];
    const result: {
      date: string;
      confirmedRooms: number;
      pendingRooms: number;
      availableRooms: number;
      totalRooms: number;
    }[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayBookings = overlappingBookings.filter((b) => {
        const ci = new Date(b.checkIn);
        ci.setHours(0, 0, 0, 0);
        const co = new Date(b.checkOut);
        co.setHours(0, 0, 0, 0);
        return ci < dayEnd && co > dayStart;
      });
      const confirmedRooms = dayBookings
        .filter((b) => CONFIRMED_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rooms || 1), 0);
      const pendingRooms = dayBookings
        .filter((b) => PENDING_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rooms || 1), 0);
      result.push({
        date: dateStr,
        confirmedRooms,
        pendingRooms,
        availableRooms: Math.max(0, totalRooms - confirmedRooms),
        totalRooms,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return result;
  }

  async getAvailabilityOverrides(
    propertyId: string,
  ): Promise<AvailabilityOverride[]> {
    return await db
      .select()
      .from(availabilityOverrides)
      .where(eq(availabilityOverrides.propertyId, propertyId))
      .orderBy(desc(availabilityOverrides.startDate));
  }

  async createAvailabilityOverride(
    override: InsertAvailabilityOverride,
  ): Promise<AvailabilityOverride> {
    const [created] = await db
      .insert(availabilityOverrides)
      .values(override)
      .returning();
    return created;
  }

  async deleteAvailabilityOverride(id: string): Promise<void> {
    await db
      .delete(availabilityOverrides)
      .where(eq(availabilityOverrides.id, id));
  }

  async getPropertyBlockedDates(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
    roomTypeId?: string | null,
  ): Promise<
    {
      startDate: Date;
      endDate: Date;
      type: string;
      roomTypeId: string | null;
    }[]
  > {
    const overrides = await db
      .select()
      .from(availabilityOverrides)
      .where(
        and(
          eq(availabilityOverrides.propertyId, propertyId),
          lt(availabilityOverrides.startDate, checkOut),
          gt(availabilityOverrides.endDate, checkIn),
        ),
      );
    const filteredOverrides = roomTypeId
      ? overrides.filter(
          (o) => o.roomTypeId === null || o.roomTypeId === roomTypeId,
        )
      : overrides;
    return filteredOverrides.map((o) => ({
      startDate: o.startDate,
      endDate: o.endDate,
      type: o.overrideType,
      roomTypeId: o.roomTypeId,
    }));
  }

  async createDeactivationRequest(
    propertyId: string,
    ownerId: string,
    reason: string,
    requestType: "deactivate" | "delete" | "reactivate" = "deactivate",
  ): Promise<PropertyDeactivationRequest> {
    const [created] = await db
      .insert(propertyDeactivationRequests)
      .values({ propertyId, ownerId, reason, requestType, status: "pending" })
      .returning();
    return created;
  }

  async getDeactivationRequest(
    id: string,
  ): Promise<PropertyDeactivationRequest | undefined> {
    const [request] = await db
      .select()
      .from(propertyDeactivationRequests)
      .where(eq(propertyDeactivationRequests.id, id));
    return request;
  }

  async getDeactivationRequestByProperty(
    propertyId: string,
  ): Promise<PropertyDeactivationRequest | undefined> {
    const [request] = await db
      .select()
      .from(propertyDeactivationRequests)
      .where(
        and(
          eq(propertyDeactivationRequests.propertyId, propertyId),
          eq(propertyDeactivationRequests.status, "pending"),
        ),
      );
    return request;
  }

  async getDeactivationRequestsByOwner(
    ownerId: string,
  ): Promise<PropertyDeactivationRequest[]> {
    return await db
      .select()
      .from(propertyDeactivationRequests)
      .where(eq(propertyDeactivationRequests.ownerId, ownerId))
      .orderBy(desc(propertyDeactivationRequests.createdAt));
  }

  async getAllPendingDeactivationRequests(): Promise<
    (PropertyDeactivationRequest & { property: Property; owner: User })[]
  > {
    const requests = await db
      .select()
      .from(propertyDeactivationRequests)
      .where(eq(propertyDeactivationRequests.status, "pending"))
      .orderBy(desc(propertyDeactivationRequests.createdAt));
    const result: (PropertyDeactivationRequest & {
      property: Property;
      owner: User;
    })[] = [];
    for (const request of requests) {
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, request.propertyId));
      const [owner] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.ownerId));
      if (property && owner) result.push({ ...request, property, owner });
    }
    return result;
  }

  async processDeactivationRequest(
    id: string,
    adminId: string,
    status: "approved" | "rejected",
    adminNotes?: string,
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
    await db
      .delete(propertyDeactivationRequests)
      .where(eq(propertyDeactivationRequests.id, id));
  }

  async fixMisclassifiedReactivationRequests(): Promise<number> {
    const misclassifiedRequests = await db
      .select({
        requestId: propertyDeactivationRequests.id,
        propertyId: propertyDeactivationRequests.propertyId,
        propertyStatus: properties.status,
      })
      .from(propertyDeactivationRequests)
      .innerJoin(
        properties,
        eq(propertyDeactivationRequests.propertyId, properties.id),
      )
      .where(
        and(
          eq(propertyDeactivationRequests.status, "pending"),
          eq(propertyDeactivationRequests.requestType, "deactivate"),
          eq(properties.status, "deactivated"),
        ),
      );
    if (misclassifiedRequests.length === 0) return 0;
    const requestIds = misclassifiedRequests.map((r) => r.requestId);
    await db
      .update(propertyDeactivationRequests)
      .set({ requestType: "reactivate" })
      .where(inArray(propertyDeactivationRequests.id, requestIds));
    return misclassifiedRequests.length;
  }

  async getAllPolicies(): Promise<Policy[]> {
    return await db
      .select()
      .from(policies)
      .orderBy(desc(policies.type), desc(policies.version));
  }

  async getPolicy(id: string): Promise<Policy | undefined> {
    const [policy] = await db
      .select()
      .from(policies)
      .where(eq(policies.id, id));
    return policy;
  }

  async getPolicyByTypeAndVersion(
    type: "terms" | "privacy",
    version: number,
  ): Promise<Policy | undefined> {
    const [policy] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.type, type), eq(policies.version, version)));
    return policy;
  }

  async getPublishedPolicy(
    type: "terms" | "privacy",
  ): Promise<Policy | undefined> {
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
      .select({
        maxVersion: sql<number>`COALESCE(MAX(${policies.version}), 0)`,
      })
      .from(policies)
      .where(eq(policies.type, type));
    return result?.maxVersion ?? 0;
  }

  async createPolicy(
    policy: Omit<InsertPolicy, "id" | "createdAt" | "updatedAt">,
  ): Promise<Policy> {
    const [created] = await db.insert(policies).values(policy).returning();
    return created;
  }

  async updatePolicy(
    id: string,
    updates: Partial<Pick<Policy, "title" | "content">>,
  ): Promise<Policy | undefined> {
    const [updated] = await db
      .update(policies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(policies.id, id))
      .returning();
    return updated;
  }

  async publishPolicy(id: string): Promise<Policy | undefined> {
    const policy = await this.getPolicy(id);
    if (!policy) return undefined;
    await db
      .update(policies)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        and(eq(policies.type, policy.type), eq(policies.status, "published")),
      );
    const [updated] = await db
      .update(policies)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
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
    consentCommunication?: boolean,
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
    if (consentCommunication !== undefined)
      updateData.consentCommunication = consentCommunication;
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

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

  async getOwnerAgreementByVersion(
    version: number,
  ): Promise<OwnerAgreement | undefined> {
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
      .select({
        maxVersion: sql<number>`COALESCE(MAX(${ownerAgreements.version}), 0)`,
      })
      .from(ownerAgreements);
    return result?.maxVersion || 0;
  }

  async createOwnerAgreement(
    agreement: Omit<InsertOwnerAgreement, "id" | "createdAt" | "updatedAt">,
  ): Promise<OwnerAgreement> {
    const [created] = await db
      .insert(ownerAgreements)
      .values(agreement)
      .returning();
    return created;
  }

  async updateOwnerAgreement(
    id: string,
    updates: Partial<Pick<OwnerAgreement, "title" | "content">>,
  ): Promise<OwnerAgreement | undefined> {
    const [updated] = await db
      .update(ownerAgreements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ownerAgreements.id, id))
      .returning();
    return updated;
  }

  async publishOwnerAgreement(id: string): Promise<OwnerAgreement | undefined> {
    await db
      .update(ownerAgreements)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(ownerAgreements.status, "published"));
    const [updated] = await db
      .update(ownerAgreements)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
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

  async updateUserOwnerAgreementConsent(
    userId: string,
    version: number,
  ): Promise<User | undefined> {
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

  async getOwnerAgreementAcceptances(): Promise<
    Array<{
      userId: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      ownerAgreementAcceptedAt: Date | null;
      ownerAgreementAcceptedVersion: number | null;
    }>
  > {
    return await db
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
  }

  async getAllAboutUs(): Promise<AboutUs[]> {
    return await db.select().from(aboutUs).orderBy(desc(aboutUs.version));
  }

  async getAboutUs(id: string): Promise<AboutUs | undefined> {
    const [about] = await db.select().from(aboutUs).where(eq(aboutUs.id, id));
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

  async createAboutUs(
    about: Omit<InsertAboutUs, "id" | "createdAt" | "updatedAt">,
  ): Promise<AboutUs> {
    const [created] = await db.insert(aboutUs).values(about).returning();
    return created;
  }

  async updateAboutUs(
    id: string,
    updates: Partial<Pick<AboutUs, "title" | "content">>,
  ): Promise<AboutUs | undefined> {
    const [updated] = await db
      .update(aboutUs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aboutUs.id, id))
      .returning();
    return updated;
  }

  async publishAboutUs(id: string): Promise<AboutUs | undefined> {
    await db
      .update(aboutUs)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(aboutUs.status, "published"));
    const [updated] = await db
      .update(aboutUs)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
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

  async getContactSettings(): Promise<ContactSettings | undefined> {
    const [settings] = await db.select().from(contactSettings).limit(1);
    return settings;
  }

  async upsertContactSettings(
    settings: Partial<InsertContactSettings>,
  ): Promise<ContactSettings> {
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

  async getSiteSettings(): Promise<SiteSettings | undefined> {
    const [settings] = await db.select().from(siteSettings).limit(1);
    return settings;
  }

  async upsertSiteSettings(
    settings: Partial<InsertSiteSettings>,
  ): Promise<SiteSettings> {
    const existing = await this.getSiteSettings();
    if (existing) {
      const [updated] = await db
        .update(siteSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(siteSettings)
        .values({ ...settings })
        .returning();
      return created;
    }
  }

  async logContactInteraction(
    data: InsertContactInteraction,
  ): Promise<ContactInteraction> {
    const [interaction] = await db
      .insert(contactInteractions)
      .values(data)
      .returning();
    return interaction;
  }

  async createAdminAuditLog(
    data: InsertAdminAuditLogData,
  ): Promise<AdminAuditLog> {
    const [log] = await db.insert(adminAuditLogs).values(data).returning();
    return log;
  }

  async getAdminAuditLogs(filters?: {
    adminId?: string;
    action?: string;
    limit?: number;
  }): Promise<AdminAuditLog[]> {
    let query = db.select().from(adminAuditLogs);
    const conditions: any[] = [];
    if (filters?.adminId)
      conditions.push(eq(adminAuditLogs.adminId, filters.adminId));
    if (filters?.action)
      conditions.push(eq(adminAuditLogs.action, filters.action as any));
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    return await query
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(filters?.limit || 100);
  }

  async suspendOwner(
    ownerId: string,
    adminId: string,
    reason: string,
  ): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        suspensionStatus: "suspended",
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspensionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ownerId))
      .returning();
    if (updated) {
      await this.suspendOwnerProperties(ownerId);
      await this.createAdminAuditLog({
        adminId,
        action: "suspend_owner",
        ownerId,
        reason,
      });
    }
    return updated;
  }

  async reinstateOwner(
    ownerId: string,
    adminId: string,
  ): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        suspensionStatus: "active",
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ownerId))
      .returning();
    if (updated) {
      await this.reinstateOwnerProperties(ownerId);
      await this.createAdminAuditLog({
        adminId,
        action: "reinstate_owner",
        ownerId,
      });
    }
    return updated;
  }

  async getSuspendedOwners(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.suspensionStatus, "suspended"));
  }

  async suspendOwnerProperties(ownerId: string): Promise<void> {
    await db
      .update(properties)
      .set({ suspended: true, suspendedAt: new Date(), updatedAt: new Date() })
      .where(eq(properties.ownerId, ownerId));
  }

  async reinstateOwnerProperties(ownerId: string): Promise<void> {
    await db
      .update(properties)
      .set({ suspended: false, suspendedAt: null, updatedAt: new Date() })
      .where(eq(properties.ownerId, ownerId));
  }

  async deactivateUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<User | undefined> {
    const targetUser = await this.getUser(userId);
    if (!targetUser || targetUser.userRole === "admin") return undefined;
    const [updated] = await db
      .update(users)
      .set({
        isDeactivated: true,
        deactivatedAt: new Date(),
        deactivatedBy: adminId,
        deactivationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    if (updated)
      await this.createAdminAuditLog({
        adminId,
        action: "deactivate_user",
        ownerId: userId,
        reason,
        metadata: {
          userEmail: updated.email,
          userName: `${updated.firstName} ${updated.lastName}`,
          userRole: updated.userRole,
        },
      });
    return updated;
  }

  async restoreUser(
    userId: string,
    adminId: string,
  ): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        isDeactivated: false,
        deactivatedAt: null,
        deactivatedBy: null,
        deactivationReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    if (updated)
      await this.createAdminAuditLog({
        adminId,
        action: "restore_user",
        ownerId: userId,
        metadata: {
          userEmail: updated.email,
          userName: `${updated.firstName} ${updated.lastName}`,
          userRole: updated.userRole,
        },
      });
    return updated;
  }

  async deleteUser(userId: string, adminId: string): Promise<void> {
    const targetUser = await this.getUser(userId);
    await db.delete(users).where(eq(users.id, userId));
    await this.createAdminAuditLog({
      adminId,
      action: "delete_user",
      ownerId: userId,
      metadata: {
        userEmail: targetUser?.email,
        userName: targetUser
          ? `${targetUser.firstName} ${targetUser.lastName}`
          : "Unknown",
        userRole: targetUser?.userRole,
        deletedAt: new Date().toISOString(),
      },
    });
  }

  async getDeactivatedUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isDeactivated, true))
      .orderBy(desc(users.deactivatedAt));
  }

  async getAllUsersForAdmin(filters?: {
    search?: string;
    status?: "active" | "deactivated" | "all";
    limit?: number;
  }): Promise<User[]> {
    const conditions: any[] = [sql`${users.userRole} != 'admin'`];
    if (filters?.status === "active")
      conditions.push(eq(users.isDeactivated, false));
    else if (filters?.status === "deactivated")
      conditions.push(eq(users.isDeactivated, true));
    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${users.firstName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.lastName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.email}) LIKE ${searchTerm}`,
        ),
      );
    }
    let query = db.select().from(users);
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    return await query
      .orderBy(desc(users.createdAt))
      .limit(filters?.limit || 100);
  }

  async adminCancelBooking(
    bookingId: string,
    adminId: string,
    reason?: string,
  ): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking || booking.status === "completed") return undefined;
    const [updated] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledBy: "admin",
        cancellationReason: reason || "Cancelled by administrator",
        cancelledAt: new Date(),
        refundAmount: booking.totalPrice,
        refundPercentage: 100,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    if (updated)
      await this.createAdminAuditLog({
        adminId,
        action: "cancel_booking",
        bookingId,
        reason,
      });
    return updated;
  }

  async adminMarkNoShow(
    bookingId: string,
    adminId: string,
    reason: string,
  ): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;
    const [updated] = await db
      .update(bookings)
      .set({
        status: "no_show",
        noShowMarkedBy: "admin",
        noShowReason: reason,
        noShowMarkedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    if (updated)
      await this.createAdminAuditLog({
        adminId,
        action: "mark_no_show",
        bookingId,
        reason,
      });
    return updated;
  }

  async adminForceCheckIn(
    bookingId: string,
    adminId: string,
  ): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;
    const [updated] = await db
      .update(bookings)
      .set({
        status: "checked_in",
        actualCheckIn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    if (updated)
      await this.createAdminAuditLog({
        adminId,
        action: "force_check_in",
        bookingId,
      });
    return updated;
  }

  async adminForceCheckOut(
    bookingId: string,
    adminId: string,
  ): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;
    const [updated] = await db
      .update(bookings)
      .set({
        status: "checked_out",
        actualCheckOut: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    if (updated)
      await this.createAdminAuditLog({
        adminId,
        action: "force_check_out",
        bookingId,
      });
    return updated;
  }

  async getInventoryHealth(propertyId?: string): Promise<
    {
      propertyId: string;
      propertyTitle: string;
      roomTypeId: string;
      roomTypeName: string;
      totalRooms: number;
      bookedRooms: number;
      availableRooms: number;
      hasNegativeInventory: boolean;
    }[]
  > {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    let propsQuery = db.select().from(properties);
    if (propertyId)
      propsQuery = propsQuery.where(eq(properties.id, propertyId)) as any;
    const allProperties = await propsQuery;
    const results: {
      propertyId: string;
      propertyTitle: string;
      roomTypeId: string;
      roomTypeName: string;
      totalRooms: number;
      bookedRooms: number;
      availableRooms: number;
      hasNegativeInventory: boolean;
    }[] = [];
    for (const prop of allProperties) {
      const roomTypesList = await db
        .select()
        .from(roomTypes)
        .where(eq(roomTypes.propertyId, prop.id));
      for (const rt of roomTypesList) {
        const activeBookings = await db
          .select({ count: count() })
          .from(bookings)
          .where(
            and(
              eq(bookings.roomTypeId, rt.id),
              inArray(bookings.status, [
                "confirmed",
                "customer_confirmed",
                "checked_in",
              ]),
              gte(bookings.checkOut, today),
              lte(bookings.checkIn, endDate),
            ),
          );
        const bookedRooms = Number(activeBookings[0]?.count || 0);
        const totalRooms = rt.totalRooms || 0;
        const availableRooms = totalRooms - bookedRooms;
        results.push({
          propertyId: prop.id,
          propertyTitle: prop.title,
          roomTypeId: rt.id,
          roomTypeName: rt.name,
          totalRooms,
          bookedRooms,
          availableRooms,
          hasNegativeInventory: availableRooms < 0,
        });
      }
    }
    return results;
  }

  async fixInventory(
    propertyId: string,
    roomTypeId?: string,
    startDate?: Date,
    endDate?: Date,
    dryRun: boolean = false,
  ): Promise<{ fixed: number; details: string[] }> {
    const details: string[] = [];
    let fixed = 0;
    let roomTypesQuery = db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.propertyId, propertyId));
    if (roomTypeId)
      roomTypesQuery = roomTypesQuery.where(
        eq(roomTypes.id, roomTypeId),
      ) as any;
    const roomTypesList = await roomTypesQuery;
    const checkStartDate = startDate || new Date();
    const checkEndDate =
      endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    for (const rt of roomTypesList) {
      const overlappingBookings = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.roomTypeId, rt.id),
            inArray(bookings.status, [
              "confirmed",
              "customer_confirmed",
              "checked_in",
            ]),
            lt(bookings.checkIn, checkEndDate),
            gt(bookings.checkOut, checkStartDate),
          ),
        );
      const totalRooms = rt.totalRooms || 0;
      if (overlappingBookings.length > totalRooms) {
        details.push(
          `Room type "${rt.name}" has ${overlappingBookings.length} active bookings but only ${totalRooms} rooms`,
        );
        if (!dryRun) fixed++;
      }
    }
    if (details.length === 0) details.push("No inventory issues found");
    return { fixed, details };
  }

  async getBookingManagementStats(): Promise<{
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    noShowBookings: number;
  }> {
    const [stats] = await db
      .select({
        totalBookings: count(),
        pendingBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'pending')`,
        confirmedBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} IN ('confirmed', 'customer_confirmed'))`,
        cancelledBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`,
        noShowBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')`,
      })
      .from(bookings);
    return {
      totalBookings: Number(stats?.totalBookings || 0),
      pendingBookings: Number(stats?.pendingBookings || 0),
      confirmedBookings: Number(stats?.confirmedBookings || 0),
      cancelledBookings: Number(stats?.cancelledBookings || 0),
      noShowBookings: Number(stats?.noShowBookings || 0),
    };
  }

  async getOwnerComplianceStats(): Promise<{
    totalOwners: number;
    activeOwners: number;
    suspendedOwners: number;
    pendingKyc: number;
  }> {
    const [stats] = await db
      .select({
        totalOwners: sql<number>`COUNT(*) FILTER (WHERE ${users.userRole} = 'owner')`,
        activeOwners: sql<number>`COUNT(*) FILTER (WHERE ${users.userRole} = 'owner' AND ${users.suspensionStatus} = 'active')`,
        suspendedOwners: sql<number>`COUNT(*) FILTER (WHERE ${users.userRole} = 'owner' AND ${users.suspensionStatus} = 'suspended')`,
        pendingKyc: sql<number>`COUNT(*) FILTER (WHERE ${users.userRole} = 'owner' AND ${users.kycStatus} = 'pending')`,
      })
      .from(users);
    return {
      totalOwners: Number(stats?.totalOwners || 0),
      activeOwners: Number(stats?.activeOwners || 0),
      suspendedOwners: Number(stats?.suspendedOwners || 0),
      pendingKyc: Number(stats?.pendingKyc || 0),
    };
  }

  async getAllBookingsForAdmin(filters?: {
    status?: string;
    propertyId?: string;
    limit?: number;
  }): Promise<(Booking & { property: Property; guest: User })[]> {
    const conditions: any[] = [];
    if (filters?.status)
      conditions.push(eq(bookings.status, filters.status as any));
    if (filters?.propertyId)
      conditions.push(eq(bookings.propertyId, filters.propertyId));
    let query = db
      .select({ booking: bookings, property: properties, guest: users })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .innerJoin(users, eq(bookings.guestId, users.id));
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    const results = await query
      .orderBy(desc(bookings.createdAt))
      .limit(filters?.limit || 100);
    return results.map((r) => ({
      ...r.booking,
      property: r.property,
      guest: r.guest,
    }));
  }

  async createSupportConversation(data: {
    userId: string;
    userRole: string;
    subject?: string;
  }): Promise<SupportConversation> {
    const [conversation] = await db
      .insert(supportConversations)
      .values({
        userId: data.userId,
        userRole: data.userRole,
        subject: data.subject,
      })
      .returning();
    return conversation;
  }

  async getSupportConversation(
    id: string,
  ): Promise<SupportConversation | null> {
    const [conversation] = await db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id));
    return conversation || null;
  }

  async getSupportConversationsByUser(
    userId: string,
  ): Promise<SupportConversation[]> {
    return db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.userId, userId))
      .orderBy(desc(supportConversations.lastActivityAt));
  }

  async getActiveSupportConversation(
    userId: string,
  ): Promise<SupportConversation | null> {
    const [conversation] = await db
      .select()
      .from(supportConversations)
      .where(
        and(
          eq(supportConversations.userId, userId),
          or(
            eq(supportConversations.status, "open"),
            eq(supportConversations.status, "escalated"),
          ),
        ),
      )
      .orderBy(desc(supportConversations.lastActivityAt))
      .limit(1);
    return conversation || null;
  }

  async updateSupportConversation(
    id: string,
    data: Partial<SupportConversation>,
  ): Promise<SupportConversation | null> {
    const [updated] = await db
      .update(supportConversations)
      .set({ ...data, lastActivityAt: new Date() })
      .where(eq(supportConversations.id, id))
      .returning();
    return updated || null;
  }

  async escalateSupportConversation(
    id: string,
    reason: string,
  ): Promise<{
    conversation: SupportConversation;
    ticket: SupportTicket;
  } | null> {
    const conversation = await this.updateSupportConversation(id, {
      status: "escalated",
      escalatedAt: new Date(),
    });
    if (!conversation) return null;
    const ticketNumber = `ZS${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        conversationId: id,
        ticketNumber,
        reason,
        autoGenerated: true,
        priority: "medium",
      })
      .returning();
    return { conversation, ticket };
  }

  async closeSupportConversation(
    id: string,
  ): Promise<SupportConversation | null> {
    return this.updateSupportConversation(id, {
      status: "closed",
      closedAt: new Date(),
    });
  }

  async addSupportMessage(data: {
    conversationId: string;
    senderType: "user" | "ai" | "admin";
    senderId?: string;
    content: string;
    metadata?: any;
  }): Promise<SupportMessage> {
    const [message] = await db
      .insert(supportMessages)
      .values({
        conversationId: data.conversationId,
        senderType: data.senderType,
        senderId: data.senderId || null,
        content: data.content,
        metadata: data.metadata || null,
      })
      .returning();
    await db
      .update(supportConversations)
      .set({ lastActivityAt: new Date() })
      .where(eq(supportConversations.id, data.conversationId));
    return message;
  }

  async getSupportMessages(conversationId: string): Promise<SupportMessage[]> {
    return db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.conversationId, conversationId))
      .orderBy(supportMessages.createdAt);
  }

  async markSupportMessagesAsRead(
    conversationId: string,
    senderType?: "user" | "ai" | "admin",
  ): Promise<void> {
    const conditions: any[] = [
      eq(supportMessages.conversationId, conversationId),
    ];
    if (senderType)
      conditions.push(not(eq(supportMessages.senderType, senderType)));
    await db
      .update(supportMessages)
      .set({ isRead: true })
      .where(and(...conditions));
  }

  async getAllSupportConversations(filters?: {
    status?: string;
    assignedTo?: string;
    limit?: number;
  }): Promise<
    (SupportConversation & {
      user: User;
      unreadCount: number;
      lastMessage?: SupportMessage;
    })[]
  > {
    const conditions: any[] = [];
    if (filters?.status)
      conditions.push(eq(supportConversations.status, filters.status as any));
    if (filters?.assignedTo)
      conditions.push(
        eq(supportConversations.assignedAdminId, filters.assignedTo),
      );
    let query = db
      .select({ conversation: supportConversations, user: users })
      .from(supportConversations)
      .innerJoin(users, eq(supportConversations.userId, users.id));
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    const results = await query
      .orderBy(desc(supportConversations.lastActivityAt))
      .limit(filters?.limit || 50);
    return await Promise.all(
      results.map(async (r) => {
        const [countResult] = await db
          .select({ count: count() })
          .from(supportMessages)
          .where(
            and(
              eq(supportMessages.conversationId, r.conversation.id),
              eq(supportMessages.senderType, "user"),
              eq(supportMessages.isRead, false),
            ),
          );
        const [lastMessage] = await db
          .select()
          .from(supportMessages)
          .where(eq(supportMessages.conversationId, r.conversation.id))
          .orderBy(desc(supportMessages.createdAt))
          .limit(1);
        return {
          ...r.conversation,
          user: r.user,
          unreadCount: Number(countResult?.count || 0),
          lastMessage: lastMessage || undefined,
        };
      }),
    );
  }

  async assignSupportConversation(
    conversationId: string,
    adminId: string,
  ): Promise<SupportConversation | null> {
    return this.updateSupportConversation(conversationId, {
      assignedAdminId: adminId,
    });
  }

  async getSupportTickets(filters?: {
    status?: string;
    priority?: string;
  }): Promise<
    (SupportTicket & { conversation: SupportConversation; user: User })[]
  > {
    const conditions: any[] = [];
    if (filters?.status)
      conditions.push(eq(supportTickets.status, filters.status as any));
    if (filters?.priority)
      conditions.push(eq(supportTickets.priority, filters.priority as any));
    let query = db
      .select({
        ticket: supportTickets,
        conversation: supportConversations,
        user: users,
      })
      .from(supportTickets)
      .innerJoin(
        supportConversations,
        eq(supportTickets.conversationId, supportConversations.id),
      )
      .innerJoin(users, eq(supportConversations.userId, users.id));
    if (conditions.length > 0) query = query.where(and(...conditions)) as any;
    const results = await query.orderBy(desc(supportTickets.createdAt));
    return results.map((r) => ({
      ...r.ticket,
      conversation: r.conversation,
      user: r.user,
    }));
  }

  async updateSupportTicket(
    id: string,
    data: Partial<SupportTicket>,
  ): Promise<SupportTicket | null> {
    const [updated] = await db
      .update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated || null;
  }

  async resolveSupportTicket(
    id: string,
    notes: string,
  ): Promise<SupportTicket | null> {
    return this.updateSupportTicket(id, {
      status: "resolved",
      resolvedAt: new Date(),
      resolutionNotes: notes,
    });
  }

  async createPushSubscription(subscription: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }): Promise<void> {
    await db
      .insert(pushSubscriptions)
      .values({
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        userAgent: subscription.userAgent,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: subscription.userId,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          userAgent: subscription.userAgent,
          updatedAt: new Date(),
        },
      });
  }

  async getPushSubscriptions(
    userId: string,
  ): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
    return await db
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async createNotificationLog(
    log: InsertNotificationLog,
  ): Promise<NotificationLog> {
    const [result] = await db.insert(notificationLogs).values(log).returning();
    return result;
  }

  async updateNotificationLog(
    id: string,
    updates: Partial<InsertNotificationLog>,
  ): Promise<void> {
    await db
      .update(notificationLogs)
      .set(updates)
      .where(eq(notificationLogs.id, id));
  }

  async getNotificationLogsByBooking(
    bookingId: string,
  ): Promise<NotificationLog[]> {
    return db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.bookingId, bookingId));
  }

  async addToWaitlist(entry: InsertWaitlist): Promise<Waitlist> {
    const [row] = await db.insert(waitlist).values(entry).returning();
    return row;
  }

  async getWaitlist(): Promise<Waitlist[]> {
    return db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
  }

  async deleteWaitlistEntry(id: string): Promise<void> {
    await db.delete(waitlist).where(eq(waitlist.id, id));
  }

  async isEmailInWaitlist(email: string): Promise<boolean> {
    const [row] = await db
      .select({ id: waitlist.id })
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase()))
      .limit(1);
    return !!row;
  }

  async addToTesterWhitelist(
    entry: InsertTesterWhitelist,
  ): Promise<TesterWhitelist> {
    const [row] = await db
      .insert(testerWhitelist)
      .values({ ...entry, email: entry.email.toLowerCase() })
      .returning();
    return row;
  }

  async getTesterWhitelist(): Promise<TesterWhitelist[]> {
    return db
      .select()
      .from(testerWhitelist)
      .orderBy(desc(testerWhitelist.createdAt));
  }

  async removeTesterWhitelistEntry(id: string): Promise<void> {
    await db.delete(testerWhitelist).where(eq(testerWhitelist.id, id));
  }

  async isEmailWhitelisted(email: string): Promise<boolean> {
    const [row] = await db
      .select({ id: testerWhitelist.id })
      .from(testerWhitelist)
      .where(eq(testerWhitelist.email, email.toLowerCase()))
      .limit(1);
    return !!row;
  }

  async getRoomPriceOverrides(
    roomTypeId: string,
    startDate: string,
    endDate: string,
  ): Promise<RoomPriceOverride[]> {
    return db
      .select()
      .from(roomPriceOverrides)
      .where(
        and(
          eq(roomPriceOverrides.roomTypeId, roomTypeId),
          gte(roomPriceOverrides.date, startDate),
          lte(roomPriceOverrides.date, endDate),
        ),
      )
      .orderBy(roomPriceOverrides.date);
  }

  async upsertRoomPriceOverride(
    propertyId: string,
    roomTypeId: string,
    date: string,
    price: number,
  ): Promise<RoomPriceOverride> {
    const [result] = await db
      .insert(roomPriceOverrides)
      .values({ propertyId, roomTypeId, date, roomPrice: price.toString() })
      .onConflictDoUpdate({
        target: [roomPriceOverrides.roomTypeId, roomPriceOverrides.date],
        set: { roomPrice: price.toString() },
      })
      .returning();
    return result;
  }

  async deleteRoomPriceOverride(id: string): Promise<void> {
    await db.delete(roomPriceOverrides).where(eq(roomPriceOverrides.id, id));
  }

  async getMealPlanPriceOverrides(
    roomOptionIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<MealPlanPriceOverride[]> {
    if (roomOptionIds.length === 0) return [];
    return db
      .select()
      .from(mealPlanPriceOverrides)
      .where(
        and(
          inArray(mealPlanPriceOverrides.roomOptionId, roomOptionIds),
          gte(mealPlanPriceOverrides.date, startDate),
          lte(mealPlanPriceOverrides.date, endDate),
        ),
      )
      .orderBy(mealPlanPriceOverrides.date);
  }

  async upsertMealPlanPriceOverride(
    roomOptionId: string,
    date: string,
    price: number,
  ): Promise<MealPlanPriceOverride> {
    const [result] = await db
      .insert(mealPlanPriceOverrides)
      .values({ roomOptionId, date, price: price.toString() })
      .onConflictDoUpdate({
        target: [
          mealPlanPriceOverrides.roomOptionId,
          mealPlanPriceOverrides.date,
        ],
        set: { price: price.toString() },
      })
      .returning();
    return result;
  }

  async deleteMealPlanPriceOverride(id: string): Promise<void> {
    await db
      .delete(mealPlanPriceOverrides)
      .where(eq(mealPlanPriceOverrides.id, id));
  }

  async getAllSubscriptionPlans(
    includeInactive = false,
  ): Promise<SubscriptionPlan[]> {
    if (includeInactive) return db.select().from(subscriptionPlans);
    return db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async createSubscriptionPlan(
    plan: InsertSubscriptionPlan,
  ): Promise<SubscriptionPlan> {
    const [created] = await db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return created;
  }

  async updateSubscriptionPlan(
    id: string,
    updates: Partial<InsertSubscriptionPlan>,
  ): Promise<SubscriptionPlan | undefined> {
    const [updated] = await db
      .update(subscriptionPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return updated;
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  async getOwnerActiveSubscription(
    ownerId: string,
  ): Promise<OwnerSubscription | undefined> {
    const [sub] = await db
      .select()
      .from(ownerSubscriptions)
      .where(
        and(
          eq(ownerSubscriptions.ownerId, ownerId),
          eq(ownerSubscriptions.status, "active"),
        ),
      )
      .limit(1);
    return sub;
  }

  async getOwnerSubscriptionHistory(
    ownerId: string,
  ): Promise<OwnerSubscription[]> {
    return db
      .select()
      .from(ownerSubscriptions)
      .where(eq(ownerSubscriptions.ownerId, ownerId))
      .orderBy(desc(ownerSubscriptions.createdAt));
  }

  async createOwnerSubscription(
    data: InsertOwnerSubscription,
  ): Promise<OwnerSubscription> {
    const [created] = await db
      .insert(ownerSubscriptions)
      .values(data)
      .returning();
    return created;
  }

  async activateOwnerSubscription(
    id: string,
    adminId: string,
    note?: string,
  ): Promise<OwnerSubscription | undefined> {
    const [updated] = await db
      .update(ownerSubscriptions)
      .set({
        status: "active",
        activatedBy: adminId,
        activationNote: note,
        activatedAt: new Date(),
      })
      .where(eq(ownerSubscriptions.id, id))
      .returning();
    return updated;
  }

  async cancelOwnerSubscription(
    id: string,
    reason?: string,
  ): Promise<OwnerSubscription | undefined> {
    const [updated] = await db
      .update(ownerSubscriptions)
      .set({
        status: "cancelled",
        cancellationReason: reason,
        cancelledAt: new Date(),
      })
      .where(eq(ownerSubscriptions.id, id))
      .returning();
    return updated;
  }

  async waiveOwnerSubscription(
    id: string,
    adminId: string,
    note: string,
  ): Promise<OwnerSubscription | undefined> {
    const [updated] = await db
      .update(ownerSubscriptions)
      .set({
        status: "waived",
        waivedBy: adminId,
        waiverNote: note,
        waivedAt: new Date(),
      })
      .where(eq(ownerSubscriptions.id, id))
      .returning();
    return updated;
  }

  async getAllOwnerSubscriptionsForAdmin(): Promise<
    (OwnerSubscription & { owner: User; plan: SubscriptionPlan })[]
  > {
    const results = await db
      .select({
        sub: ownerSubscriptions,
        owner: users,
        plan: subscriptionPlans,
      })
      .from(ownerSubscriptions)
      .innerJoin(users, eq(ownerSubscriptions.ownerId, users.id))
      .innerJoin(
        subscriptionPlans,
        eq(ownerSubscriptions.planId, subscriptionPlans.id),
      );
    return results.map((r) => ({ ...r.sub, owner: r.owner, plan: r.plan }));
  }

  // ── FIXED: uses endDate (not expiresAt) ──
  async checkOwnerSubscriptionStatus(ownerId: string): Promise<{
    isActive: boolean;
    tier: string | null;
    expiresAt: Date | null;
    daysLeft: number | null;
  }> {
    const sub = await this.getOwnerActiveSubscription(ownerId);
    if (!sub)
      return { isActive: false, tier: null, expiresAt: null, daysLeft: null };
    const now = new Date();
    const expires = sub.endDate ? new Date(sub.endDate) : null;
    if (expires && expires < now) {
      await db
        .update(ownerSubscriptions)
        .set({ status: "expired" })
        .where(eq(ownerSubscriptions.id, sub.id));
      return { isActive: false, tier: null, expiresAt: expires, daysLeft: 0 };
    }
    const daysLeft = expires
      ? Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return { isActive: true, tier: sub.tier, expiresAt: expires, daysLeft };
  }

  // ── FIXED: uses endDate (not expiresAt) ──
  async expireStaleSubscriptions(): Promise<number> {
    const result = await db
      .update(ownerSubscriptions)
      .set({ status: "expired" })
      .where(
        and(
          eq(ownerSubscriptions.status, "active"),
          lt(ownerSubscriptions.endDate, new Date()),
        ),
      )
      .returning();
    return result.length;
  }

  // ── NEW ──
  async updateOwnerSubscriptionDates(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OwnerSubscription | undefined> {
    const [updated] = await db
      .update(ownerSubscriptions)
      .set({ startDate, endDate, updatedAt: new Date() })
      .where(eq(ownerSubscriptions.id, id))
      .returning();
    return updated;
  }

  // ── NEW ──
  async canOwnerAddProperty(ownerId: string): Promise<{
    allowed: boolean;
    reason?: string;
    currentCount: number;
    maxAllowed: number;
  }> {
    const sub = await this.getOwnerActiveSubscription(ownerId);
    if (!sub)
      return {
        allowed: false,
        reason:
          "No active subscription. Please subscribe to a plan to list properties.",
        currentCount: 0,
        maxAllowed: 0,
      };
    if (sub.endDate && new Date(sub.endDate) < new Date())
      return {
        allowed: false,
        reason:
          "Your subscription has expired. Please renew to continue listing.",
        currentCount: 0,
        maxAllowed: 0,
      };
    const plan = await this.getSubscriptionPlan(sub.planId);
    if (!plan)
      return {
        allowed: false,
        reason: "Subscription plan not found.",
        currentCount: 0,
        maxAllowed: 0,
      };
    const [countResult] = await db
      .select({ count: count() })
      .from(properties)
      .where(
        and(
          eq(properties.ownerId, ownerId),
          not(eq(properties.status, "deactivated")),
        ),
      );
    const currentCount = Number(countResult?.count || 0);
    const maxAllowed = plan.maxProperties;
    if (currentCount >= maxAllowed)
      return {
        allowed: false,
        reason: `Your ${plan.name} plan allows up to ${maxAllowed} propert${maxAllowed === 1 ? "y" : "ies"}. Upgrade to add more.`,
        currentCount,
        maxAllowed,
      };
    return { allowed: true, currentCount, maxAllowed };
  }
}

export const storage = new DatabaseStorage();
