// Referenced from blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPropertySchema, insertRoomSchema, insertWishlistSchema, insertUserPreferencesSchema, insertBookingSchema, insertMessageSchema, insertReviewSchema, insertDestinationSchema, insertSearchHistorySchema, updateKYCSchema, becomeOwnerSchema, insertKycApplicationSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin promotion endpoint - requires email in body
  app.post('/api/admin/promote', async (req: any, res) => {
    try {
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

  // Test/Development admin login endpoint - only for testing admin features
  app.post('/api/test/admin-login', async (req: any, res) => {
    try {
      // This is a development-only endpoint for testing
      // In production, this should not exist
      const user = await storage.getUser('test-admin-user');
      
      if (!user || user.userRole !== 'admin') {
        return res.status(403).json({ message: "Test admin user not found or not admin" });
      }

      // Set up a fake session for testing
      req.user = {
        claims: { sub: 'test-admin-user' },
        access_token: 'test-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      req.session.passport = { user: { claims: { sub: 'test-admin-user' } } };
      
      res.json({ 
        message: "Test admin session created", 
        user: { ...user, testSessionActive: true }
      });
    } catch (error) {
      console.error("Error in test admin login:", error);
      res.status(500).json({ message: "Test admin login failed" });
    }
  });

  // Self-promotion to admin (only works if no admin exists)
  app.post('/api/promote-me-to-admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is already admin
      if (currentUser.userRole === 'admin') {
        return res.json({ 
          message: "You are already an admin", 
          user: currentUser 
        });
      }

      // Check if any admin exists in the system
      const allUsers = await db.select().from(users);
      const existingAdmin = allUsers.find(u => u.userRole === 'admin');

      if (existingAdmin) {
        return res.status(403).json({ 
          message: "An admin already exists. Please contact the existing admin for promotion.",
          adminEmail: existingAdmin.email
        });
      }

      // No admin exists - promote this user to be the first admin
      const updatedUser = await storage.upsertUser({
        ...currentUser,
        userRole: 'admin',
      });

      res.json({ 
        message: "Successfully promoted to admin! You are now the first admin of ZECOHO.", 
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error promoting to admin:", error);
      res.status(500).json({ message: "Failed to promote to admin" });
    }
  });

  // KYC Application submission - requires authentication
  app.post('/api/kyc/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has a KYC application
      const existingKyc = await storage.getUserKycApplication(userId);
      if (existingKyc) {
        return res.status(400).json({ 
          message: "You have already submitted a KYC application",
          status: existingKyc.status 
        });
      }
      
      // Validate mandatory documents
      const { propertyOwnershipDocs, identityProofDocs } = req.body;
      const missingDocs: string[] = [];
      
      if (!propertyOwnershipDocs || !Array.isArray(propertyOwnershipDocs) || propertyOwnershipDocs.length === 0) {
        missingDocs.push("Property Ownership Proof");
      }
      
      if (!identityProofDocs || !Array.isArray(identityProofDocs) || identityProofDocs.length === 0) {
        missingDocs.push("Owner Identity Proof");
      }
      
      if (missingDocs.length > 0) {
        return res.status(400).json({
          message: `Missing required documents: ${missingDocs.join(", ")}`
        });
      }
      
      const validatedData = insertKycApplicationSchema.parse(req.body);
      const application = await storage.createKycApplication(userId, validatedData);
      
      res.json({ 
        message: "KYC application submitted successfully", 
        applicationId: application.id,
        status: application.status
      });
    } catch (error) {
      console.error("Error submitting KYC application:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid application data", error: error.message });
      }
      res.status(500).json({ message: "Failed to submit KYC application" });
    }
  });

  app.patch('/api/user/kyc', isAuthenticated, async (req: any, res) => {
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
      if (validatedData.firstName) updateData.firstName = validatedData.firstName;
      if (validatedData.lastName) updateData.lastName = validatedData.lastName;
      if (validatedData.phone) updateData.phone = validatedData.phone;
      if (validatedData.kycAddress) updateData.kycAddress = validatedData.kycAddress;
      if (validatedData.governmentIdType) updateData.governmentIdType = validatedData.governmentIdType;
      if (validatedData.governmentIdNumber) {
        updateData.governmentIdNumber = validatedData.governmentIdNumber;
        updateData.kycStatus = "pending";
      }

      const updatedUser = await storage.upsertUser(updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user KYC:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid KYC data", error: error.message });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin KYC routes
  app.get("/api/admin/kyc", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can view KYC applications" });
      }

      const applications = await storage.getAllKycApplications();
      res.json(applications);
    } catch (error) {
      console.error("Error fetching KYC applications:", error);
      res.status(500).json({ message: "Failed to fetch KYC applications" });
    }
  });

  app.patch("/api/admin/kyc/:id/verified", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can verify KYC applications" });
      }

      const { reviewNotes } = req.body;
      const application = await storage.updateKycApplicationStatus(
        req.params.id,
        "verified",
        reviewNotes
      );

      res.json(application);
    } catch (error) {
      console.error("Error verifying KYC application:", error);
      res.status(500).json({ message: "Failed to verify KYC application" });
    }
  });

  app.patch("/api/admin/kyc/:id/rejected", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can reject KYC applications" });
      }

      const { reviewNotes } = req.body;
      const application = await storage.updateKycApplicationStatus(
        req.params.id,
        "rejected",
        reviewNotes
      );

      res.json(application);
    } catch (error) {
      console.error("Error rejecting KYC application:", error);
      res.status(500).json({ message: "Failed to reject KYC application" });
    }
  });

  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      const { destination, propertyType, minPrice, maxPrice, minGuests } = req.query;
      
      const filters: any = {};
      if (destination) filters.destination = destination as string;
      if (propertyType) filters.propertyType = propertyType as string;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (minGuests) filters.minGuests = Number(minGuests);
      
      const properties = await storage.getProperties(filters);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can create properties" });
      }

      // Require KYC to be at least pending before allowing property creation
      if (!user.kycStatus || user.kycStatus === "not_started" || user.kycStatus === "rejected") {
        return res.status(403).json({ message: "Please complete KYC verification before listing properties" });
      }

      const validatedData = insertPropertySchema.parse(req.body);
      const { amenityIds, status, ...propertyData } = validatedData;
      
      // Always force status to "pending" for new properties - prevent bypass
      const property = await storage.createProperty({
        ...propertyData,
        ownerId: userId,
        status: "pending",
      });

      // Set amenities if provided
      if (amenityIds && amenityIds.length > 0) {
        await storage.setPropertyAmenities(property.id, amenityIds);
      }
      
      res.json(property);
    } catch (error: any) {
      console.error("Error creating property:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can update properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this property" });
      }

      // Validate with partial schema
      const validatedData = insertPropertySchema.partial().parse(req.body);
      const { amenityIds, ...propertyData } = validatedData;
      
      const updated = await storage.updateProperty(req.params.id, propertyData);

      // Update amenities if provided
      if (amenityIds !== undefined) {
        await storage.setPropertyAmenities(req.params.id, amenityIds);
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating property:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can delete properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this property" });
      }

      await storage.deleteProperty(req.params.id);
      res.json({ message: "Property deleted successfully" });
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // Owner properties route
  app.get("/api/owner/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can access this endpoint" });
      }

      const properties = await storage.getProperties({ ownerId: userId });
      res.json(properties);
    } catch (error) {
      console.error("Error fetching owner properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Rooms routes
  app.get("/api/properties/:id/rooms", async (req, res) => {
    try {
      const rooms = await storage.getRoomsByProperty(req.params.id);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/properties/:id/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can add rooms" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to add rooms to this property" });
      }

      // Validate with Zod schema
      const validatedData = insertRoomSchema.parse({
        ...req.body,
        propertyId: req.params.id,
      });

      const room = await storage.createRoom(validatedData);
      
      res.json(room);
    } catch (error: any) {
      console.error("Error creating room:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid room data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  // Wishlists routes
  app.get("/api/wishlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "guest") {
        return res.status(403).json({ message: "Only guests can access wishlists" });
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
      
      if (!user || user.userRole !== "guest") {
        return res.status(403).json({ message: "Only guests can add to wishlists" });
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
        return res.status(400).json({ message: "Invalid wishlist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create wishlist" });
    }
  });

  app.delete("/api/wishlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "guest") {
        return res.status(403).json({ message: "Only guests can remove wishlist items" });
      }

      // Verify ownership before deletion
      const wishlist = await storage.getWishlistById(req.params.id);
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }

      if (wishlist.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this wishlist item" });
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
        return res.status(400).json({ message: "Invalid preferences data", errors: error.errors });
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

  // Booking routes
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "guest") {
        return res.status(403).json({ message: "Only guests can create bookings" });
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
        return res.status(403).json({ message: "You cannot book your own property" });
      }

      // Check for date overlaps
      const checkIn = new Date(validatedData.checkIn);
      const checkOut = new Date(validatedData.checkOut);

      if (checkIn >= checkOut) {
        return res.status(400).json({ message: "Check-out must be after check-in" });
      }

      const bookedDates = await storage.getPropertyBookedDates(
        validatedData.propertyId,
        checkIn,
        checkOut
      );

      if (bookedDates.length > 0) {
        return res.status(400).json({ 
          message: "Selected dates are not available. Please choose different dates." 
        });
      }

      // Calculate total price server-side (don't trust client)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const totalPrice = nights * Number(property.pricePerNight);
      
      const booking = await storage.createBooking({
        ...validatedData,
        totalPrice: totalPrice.toString(),
      });
      res.json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
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
        return res.status(403).json({ message: "Not authorized to view this booking" });
      }
      
      res.json(booking);
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

      let bookings;
      if (user.userRole === "guest") {
        bookings = await storage.getBookingsByGuest(userId);
      } else {
        const properties = await storage.getProperties({ ownerId: userId });
        const propertyIds = properties.map(p => p.id);
        bookings = (await Promise.all(
          propertyIds.map(id => storage.getBookingsByProperty(id))
        )).flat();
      }
      
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/properties/:id/booked-dates", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const bookedDates = await storage.getPropertyBookedDates(
        req.params.id,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(bookedDates);
    } catch (error) {
      console.error("Error fetching booked dates:", error);
      res.status(500).json({ message: "Failed to fetch booked dates" });
    }
  });

  app.patch("/api/bookings/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const property = await storage.getProperty(booking.propertyId);
      
      if (booking.guestId !== userId && property?.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this booking" });
      }

      const { status } = req.body;
      if (!["pending", "confirmed", "cancelled", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.updateBookingStatus(req.params.id, status);
      res.json(updated);
    } catch (error) {
      console.error("Error updating booking status:", error);
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  app.delete("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const property = await storage.getProperty(booking.propertyId);
      
      if (booking.guestId !== userId && property?.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this booking" });
      }

      await storage.deleteBooking(req.params.id);
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "guest") {
        return res.status(403).json({ message: "Only guests can start conversations" });
      }

      const { propertyId } = req.body;
      
      if (!propertyId) {
        return res.status(400).json({ message: "Property ID is required" });
      }

      const conversation = await storage.getOrCreateConversation(propertyId, userId);
      res.json(conversation);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: error.message || "Failed to create conversation" });
    }
  });

  // Message routes
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (conversation.guestId !== userId && conversation.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this conversation" });
      }

      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const messages = await storage.getMessagesByConversation(req.params.id, limit);
      
      await storage.markMessagesAsRead(req.params.id, userId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (conversation.guestId !== userId && conversation.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to send messages in this conversation" });
      }

      const validatedData = insertMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id,
        senderId: userId,
      });

      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

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

  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "guest") {
        return res.status(403).json({ message: "Only guests can leave reviews" });
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
          return res.status(403).json({ message: "You can only review your own bookings" });
        }

        if (booking.status !== "completed") {
          return res.status(400).json({ message: "You can only review completed bookings" });
        }
      }

      const review = await storage.createReview(validatedData);
      res.json(review);
    } catch (error: any) {
      console.error("Error creating review:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.patch("/api/reviews/:id/response", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can respond to reviews" });
      }

      const review = await storage.getReview(req.params.id);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      const property = await storage.getProperty(review.propertyId);
      
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to respond to this review" });
      }

      const { response } = req.body;
      
      if (!response || typeof response !== "string") {
        return res.status(400).json({ message: "Response is required" });
      }

      const updated = await storage.updateOwnerResponse(req.params.id, response);
      res.json(updated);
    } catch (error) {
      console.error("Error updating review response:", error);
      res.status(500).json({ message: "Failed to update review response" });
    }
  });

  app.patch("/api/reviews/:id/helpful", isAuthenticated, async (req: any, res) => {
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
  });

  // Destinations routes
  
  // Lightweight search endpoint - returns only essential fields for autocomplete
  app.get("/api/destinations/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== "string" || q.trim().length === 0) {
        return res.json([]);
      }
      
      const results = await storage.searchDestinations(q.trim(), 10);
      res.json(results);
    } catch (error) {
      console.error("Error searching destinations:", error);
      res.status(500).json({ message: "Failed to search destinations" });
    }
  });
  
  app.get("/api/destinations", async (req, res) => {
    try {
      const { search } = req.query;
      let destinations = await storage.getAllDestinations();
      
      // Filter by search term if provided
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchLower = search.toLowerCase().trim();
        destinations = destinations.filter((dest: any) =>
          dest.name.toLowerCase().includes(searchLower) ||
          dest.state?.toLowerCase().includes(searchLower) ||
          dest.shortDescription?.toLowerCase().includes(searchLower)
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
      res.status(500).json({ message: "Failed to fetch featured destinations" });
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
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can create destinations" });
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
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can update destinations" });
      }

      const destination = await storage.updateDestination(req.params.id, req.body);
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      res.json(destination);
    } catch (error) {
      console.error("Error updating destination:", error);
      res.status(500).json({ message: "Failed to update destination" });
    }
  });

  app.delete("/api/destinations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can delete destinations" });
      }

      await storage.deleteDestination(req.params.id);
      res.json({ message: "Destination deleted successfully" });
    } catch (error) {
      console.error("Error deleting destination:", error);
      res.status(500).json({ message: "Failed to delete destination" });
    }
  });

  app.patch("/api/destinations/:id/feature", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "owner") {
        return res.status(403).json({ message: "Only owners can feature destinations" });
      }

      const { isFeatured } = req.body;
      const destination = await storage.setFeaturedDestination(req.params.id, isFeatured);
      if (!destination) {
        return res.status(404).json({ message: "Destination not found" });
      }
      res.json(destination);
    } catch (error) {
      console.error("Error featuring destination:", error);
      res.status(500).json({ message: "Failed to feature destination" });
    }
  });

  // Admin routes for property management
  app.get("/api/admin/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const properties = await storage.getProperties({ includeAllStatuses: true });
      res.json(properties);
    } catch (error) {
      console.error("Error fetching admin properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.patch("/api/admin/properties/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can approve properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const updated = await storage.updateProperty(req.params.id, { status: "published" });
      res.json(updated);
    } catch (error) {
      console.error("Error approving property:", error);
      res.status(500).json({ message: "Failed to approve property" });
    }
  });

  app.patch("/api/admin/properties/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can reject properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const updated = await storage.updateProperty(req.params.id, { status: "draft" });
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting property:", error);
      res.status(500).json({ message: "Failed to reject property" });
    }
  });

  app.delete("/api/admin/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== "admin") {
        return res.status(403).json({ message: "Only admins can delete properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      await storage.deleteProperty(req.params.id);
      res.json({ message: "Property deleted successfully" });
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

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

  app.delete("/api/search-history/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteSearchHistory(req.params.id);
      res.json({ message: "Search history deleted" });
    } catch (error) {
      console.error("Error deleting search history:", error);
      res.status(500).json({ message: "Failed to delete search history" });
    }
  });

  // Object Storage routes for file uploads
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
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

  const httpServer = createServer(app);
  return httpServer;
}
