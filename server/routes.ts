// Referenced from blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPropertySchema, insertRoomSchema, insertWishlistSchema, insertUserPreferencesSchema, insertBookingSchema, insertMessageSchema, insertReviewSchema } from "@shared/schema";

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

      const validatedData = insertPropertySchema.parse(req.body);
      const { amenityIds, ...propertyData } = validatedData;
      
      const property = await storage.createProperty({
        ...propertyData,
        ownerId: userId,
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

  const httpServer = createServer(app);
  return httpServer;
}
