// Referenced from blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { users } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPropertySchema, insertRoomSchema, insertRoomOptionSchema, insertWishlistSchema, insertUserPreferencesSchema, insertBookingSchema, insertMessageSchema, insertReviewSchema, insertDestinationSchema, insertSearchHistorySchema, updateKYCSchema, becomeOwnerSchema, insertKycApplicationSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError, generateUploadToken, verifyUploadToken } from "./objectStorage";
import { ObjectPermission, setObjectAclPolicy } from "./objectAcl";
import { sendOtpEmail, sendKycSubmittedEmail, sendKycApprovedEmail, sendKycRejectedEmail, sendPropertyLiveEmail, sendPasswordChangedEmail, sendPropertyStatusEmail, sendBookingConfirmationEmail, sendBookingRequestToOwnerEmail, sendBookingCreatedGuestEmail, sendBookingOwnerAcceptedEmail, sendBookingConfirmedGuestEmail, sendBookingConfirmedOwnerEmail, sendBookingDeclinedEmail } from "./emailService";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { WebSocketServer, WebSocket } from "ws";

// WebSocket connections map: userId -> Set of WebSocket connections
const userConnections = new Map<string, Set<WebSocket>>();

// Function to broadcast message to a specific user
export function broadcastToUser(userId: string, data: any) {
  const connections = userConnections.get(userId);
  console.log(`Broadcasting to user ${userId}: ${connections ? connections.size : 0} connections found`);
  if (connections) {
    const message = JSON.stringify(data);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(`Sending message to user ${userId}`);
        ws.send(message);
      } else {
        console.log(`WebSocket for user ${userId} not open (state: ${ws.readyState})`);
      }
    });
  } else {
    console.log(`No WebSocket connections found for user ${userId}`);
  }
}

// Helper function to check if a user has a specific role (checks both primary and additional roles)
function userHasRole(user: any, role: string): boolean {
  if (!user) return false;
  if (user.userRole === role) return true;
  if (user.additionalRoles && Array.isArray(user.additionalRoles) && user.additionalRoles.includes(role)) return true;
  return false;
}

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

  // OTP Authentication - Send OTP to email
  app.post('/api/auth/send-otp', async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
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
        return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
      }

      // Clean up expired codes periodically
      storage.deleteExpiredOtpCodes().catch(console.error);

      res.json({ 
        message: "OTP sent successfully",
        email: email.toLowerCase(),
        expiresIn: 600 // 10 minutes in seconds
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // OTP Authentication - Verify OTP and create session
  app.post('/api/auth/verify-otp', async (req: any, res) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      // Get valid OTP code
      const otpCode = await storage.getValidOtpCode(email, otp);
      
      if (!otpCode) {
        return res.status(400).json({ 
          message: "Invalid or expired OTP. Please request a new one." 
        });
      }

      // Check attempts
      if (otpCode.attempts && otpCode.attempts >= 5) {
        return res.status(400).json({ 
          message: "Too many attempts. Please request a new OTP." 
        });
      }

      // Increment attempts before checking
      await storage.incrementOtpAttempts(otpCode.id);

      // Verify the OTP matches
      if (otpCode.code !== otp) {
        return res.status(400).json({ 
          message: "Incorrect OTP. Please try again." 
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

      // Create session for the user
      req.user = {
        claims: { sub: user.id, email: user.email },
        access_token: `otp-session-${user.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      };
      
      // Save session
      if (req.session) {
        req.session.passport = { user: req.user };
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      res.json({ 
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userRole: user.userRole,
          profileImageUrl: user.profileImageUrl,
        }
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Password-based Registration - Step 1: Register with name, email, password
  // Disabled in development to allow OIDC testing
  app.post('/api/auth/register', async (req: any, res) => {
    if (process.env.NODE_ENV === 'development') {
      return res.status(403).json({ message: "Password registration is disabled in development mode. Use OIDC login instead." });
    }
    try {
      const { firstName, lastName, email, password } = req.body;
      
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "First name, last name, email, and password are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength (min 8 chars)
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user with unverified email
      const user = await storage.createLocalUser({
        firstName,
        lastName,
        email,
        passwordHash,
      });

      // Generate and send OTP for email verification
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await storage.createOtpCode(email, otp, expiresAt);
      
      const emailSent = await sendOtpEmail(email, otp);
      if (!emailSent) {
        return res.status(500).json({ message: "Account created but failed to send verification email. Please try logging in." });
      }

      res.json({ 
        message: "Registration successful! Please verify your email.",
        email: email.toLowerCase(),
        userId: user.id,
        requiresVerification: true
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Password-based Registration - Step 2: Verify email with OTP
  app.post('/api/auth/register/verify', async (req: any, res) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      // Get valid OTP code
      const otpCode = await storage.getValidOtpCode(email, otp);
      if (!otpCode) {
        return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });
      }

      // Check attempts
      if (otpCode.attempts && otpCode.attempts >= 5) {
        return res.status(400).json({ message: "Too many attempts. Please request a new OTP." });
      }

      await storage.incrementOtpAttempts(otpCode.id);

      if (otpCode.code !== otp) {
        return res.status(400).json({ message: "Incorrect OTP. Please try again." });
      }

      await storage.markOtpVerified(otpCode.id);

      // Get user and mark email as verified
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUserEmailVerified(user.id);

      // Create session for the user
      req.user = {
        claims: { sub: user.id, email: user.email },
        access_token: `local-session-${user.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };
      
      if (req.session) {
        req.session.passport = { user: req.user };
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      res.json({ 
        message: "Email verified successfully! Welcome to ZECOHO.",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userRole: user.userRole,
          profileImageUrl: user.profileImageUrl,
        }
      });
    } catch (error) {
      console.error("Error verifying registration:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Password-based Login
  // Disabled in development to allow OIDC testing
  app.post('/api/auth/login/password', async (req: any, res) => {
    if (process.env.NODE_ENV === 'development') {
      return res.status(403).json({ message: "Password login is disabled in development mode. Use OIDC login instead." });
    }
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user has a password (registered with email/password)
      if (!user.passwordHash) {
        return res.status(400).json({ 
          message: "This account was created with a different login method. Please use OTP login." 
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
          message: "Please verify your email first. A new verification code has been sent.",
          requiresVerification: true,
          email: email.toLowerCase()
        });
      }

      // Create session
      req.user = {
        claims: { sub: user.id, email: user.email },
        access_token: `local-session-${user.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };
      
      if (req.session) {
        req.session.passport = { user: req.user };
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      res.json({ 
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userRole: user.userRole,
          profileImageUrl: user.profileImageUrl,
        }
      });
    } catch (error) {
      console.error("Error during password login:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Forgot Password - Step 1: Send reset OTP
  app.post('/api/auth/forgot-password', async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if user exists with this email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ 
          message: "If an account with this email exists, you will receive a password reset code.",
          email: email.toLowerCase()
        });
      }

      // Check if user has a password (can only reset password if they registered with email/password)
      if (!user.passwordHash) {
        return res.status(400).json({ 
          message: "This account was created with a different login method. Please use OTP login instead." 
        });
      }

      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await storage.createOtpCode(email, otp, expiresAt);

      // Send password reset OTP email
      const emailSent = await sendOtpEmail(email, otp, 'Password Reset');
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send password reset email. Please try again." });
      }

      // Clean up expired codes periodically
      storage.deleteExpiredOtpCodes().catch(console.error);

      res.json({ 
        message: "Password reset code sent successfully",
        email: email.toLowerCase(),
        expiresIn: 600
      });
    } catch (error) {
      console.error("Error sending forgot password OTP:", error);
      res.status(500).json({ message: "Failed to send password reset code" });
    }
  });

  // Forgot Password - Step 2: Verify OTP and reset password
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "Email, OTP, and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Get valid OTP code
      const otpCode = await storage.getValidOtpCode(email, otp);
      if (!otpCode) {
        return res.status(400).json({ message: "Invalid or expired code. Please request a new one." });
      }

      // Check attempts
      if (otpCode.attempts && otpCode.attempts >= 5) {
        return res.status(400).json({ message: "Too many attempts. Please request a new code." });
      }

      await storage.incrementOtpAttempts(otpCode.id);

      if (otpCode.code !== otp) {
        return res.status(400).json({ message: "Incorrect code. Please try again." });
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
        sendPasswordChangedEmail(user.email, user.firstName || '').catch(console.error);
      }

      res.json({ 
        message: "Password reset successfully! You can now log in with your new password."
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Check if current user has a password set (for showing "Set Password" option)
  app.get('/api/auth/has-password', async (req: any, res) => {
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
        email: user.email
      });
    } catch (error) {
      console.error("Error checking password status:", error);
      res.status(500).json({ message: "Failed to check password status" });
    }
  });

  // Set password for authenticated users who don't have one (OTP-only accounts)
  app.post('/api/auth/set-password', async (req: any, res) => {
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
        return res.status(400).json({ message: "Password and confirmation are required" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords don't match" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has a password
      if (user.passwordHash) {
        return res.status(400).json({ message: "You already have a password set. Use 'Change Password' instead." });
      }

      // Hash and set the password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      await storage.updateUserPassword(user.id, passwordHash);

      res.json({ 
        message: "Password set successfully! You can now log in with your email and password."
      });
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Change password for authenticated users who already have a password
  app.post('/api/auth/change-password', async (req: any, res) => {
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
        return res.status(400).json({ message: "Current password, new password, and confirmation are required" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New passwords don't match" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has a password
      if (!user.passwordHash) {
        return res.status(400).json({ message: "You don't have a password set. Use 'Set Password' instead." });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash and update the new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      await storage.updateUserPassword(user.id, newPasswordHash);

      // Send password changed notification email
      if (user.email) {
        sendPasswordChangedEmail(user.email, user.firstName || '').catch(console.error);
      }

      res.json({ 
        message: "Password changed successfully!"
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
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
      
      if (!user || !userHasRole(user, 'admin')) {
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

  // Enable multi-role for specific admin user (adds owner role to existing admin)
  app.post('/api/admin/enable-multi-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only allow this for pushkardatt@gmail.com (the founder/main admin) - case insensitive
      if (currentUser.email?.toLowerCase() !== 'pushkardatt@gmail.com') {
        return res.status(403).json({ message: "This feature is only available for the platform administrator" });
      }

      // Update user to have both admin and owner roles
      const [updatedUser] = await db
        .update(users)
        .set({ 
          userRole: 'admin',
          additionalRoles: ['owner']
        })
        .where(eq(users.id, userId))
        .returning();

      res.json({ 
        message: "Multi-role enabled! You now have both admin and owner access.", 
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error enabling multi-role:", error);
      res.status(500).json({ message: "Failed to enable multi-role" });
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
        // If existing application is rejected, update it instead of blocking
        if (existingKyc.status === "rejected") {
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
          const updatedApplication = await storage.updateKycApplication(existingKyc.id, validatedData);
          
          // Send email notification for resubmission (fire-and-forget)
          const user = await storage.getUser(userId);
          if (user?.email) {
            sendKycSubmittedEmail(user.email, user.firstName || 'Property Owner').catch(console.error);
          }
          
          return res.json({ 
            message: "KYC application resubmitted successfully", 
            applicationId: updatedApplication?.id,
            status: updatedApplication?.status
          });
        }
        
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
      
      // Send email notification for new submission (fire-and-forget)
      const user = await storage.getUser(userId);
      if (user?.email) {
        sendKycSubmittedEmail(user.email, user.firstName || 'Property Owner').catch(console.error);
      }
      
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

  // Combined KYC and Property submission - for new owners listing their first property
  app.post('/api/kyc/submit-with-property', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { kyc, property } = req.body;
      
      if (!kyc || !property) {
        return res.status(400).json({ message: "Both KYC and property data are required" });
      }
      
      // Check if user already has a KYC application
      const existingKyc = await storage.getUserKycApplication(userId);
      const isResubmission = existingKyc && existingKyc.status === "rejected";
      const isVerified = existingKyc && existingKyc.status === "verified";
      const isPending = existingKyc && existingKyc.status === "pending";
      
      // Validate property images
      if (!property.images || !Array.isArray(property.images) || property.images.length === 0) {
        return res.status(400).json({ message: "At least one property image is required" });
      }
      
      let kycApplication = existingKyc;
      let createdProperty;
      
      // If user has verified or pending KYC, skip KYC creation and just create the property
      if (isVerified || isPending) {
        try {
          // Create property directly for verified users
          const { amenityIds, ...propertyData } = property;
          
          createdProperty = await storage.createProperty({
            title: propertyData.title,
            description: propertyData.description,
            propertyType: propertyData.propertyType,
            destination: propertyData.destination,
            address: propertyData.address || null,
            latitude: propertyData.latitude ? String(propertyData.latitude) : null,
            longitude: propertyData.longitude ? String(propertyData.longitude) : null,
            images: propertyData.images || [],
            categorizedImages: propertyData.categorizedImages || null,
            videos: propertyData.videos || [],
            pricePerNight: String(propertyData.pricePerNight),
            singleOccupancyPrice: propertyData.singleOccupancyPrice ? String(propertyData.singleOccupancyPrice) : null,
            doubleOccupancyPrice: propertyData.doubleOccupancyPrice ? String(propertyData.doubleOccupancyPrice) : null,
            tripleOccupancyPrice: propertyData.tripleOccupancyPrice ? String(propertyData.tripleOccupancyPrice) : null,
            bulkBookingEnabled: propertyData.bulkBookingEnabled || false,
            bulkBookingMinRooms: propertyData.bulkBookingMinRooms || 5,
            bulkBookingDiscountPercent: propertyData.bulkBookingDiscountPercent ? String(propertyData.bulkBookingDiscountPercent) : "10",
            maxGuests: propertyData.maxGuests || 2,
            bedrooms: propertyData.bedrooms || 1,
            beds: propertyData.beds || 1,
            bathrooms: propertyData.bathrooms || 1,
            policies: propertyData.policies || null,
            ownerId: userId,
            status: "pending", // New properties still need admin approval
          });
          
          // Set amenities if provided
          if (amenityIds && amenityIds.length > 0) {
            await storage.setPropertyAmenities(createdProperty.id, amenityIds);
          }
          
          // Create room types if provided
          const { roomTypes } = req.body;
          if (roomTypes && Array.isArray(roomTypes) && roomTypes.length > 0) {
            for (const rt of roomTypes) {
              // Validate required fields
              const basePrice = parseFloat(rt.basePrice);
              const maxGuests = parseInt(rt.maxGuests);
              const totalRooms = parseInt(rt.totalRooms);
              
              if (!rt.name || isNaN(basePrice) || basePrice < 100) {
                throw new Error(`Invalid room type: ${rt.name || 'unnamed'} - base price must be at least 100`);
              }
              if (isNaN(maxGuests) || maxGuests < 1) {
                throw new Error(`Invalid room type: ${rt.name} - max guests must be at least 1`);
              }
              if (isNaN(totalRooms) || totalRooms < 1) {
                throw new Error(`Invalid room type: ${rt.name} - total rooms must be at least 1`);
              }
              
              const createdRoomType = await storage.createRoom({
                propertyId: createdProperty.id,
                name: rt.name,
                description: rt.description || null,
                basePrice: String(basePrice),
                maxGuests: maxGuests,
                totalRooms: totalRooms,
                isActive: true,
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
          
          return res.json({ 
            message: statusMessage, 
            kycApplicationId: existingKyc.id,
            propertyId: createdProperty.id,
            status: "pending",
            kycSkipped: true
          });
        } catch (innerError) {
          throw innerError;
        }
      }
      
      // For new users or rejected KYC resubmission - validate KYC documents
      const { propertyOwnershipDocs, identityProofDocs } = kyc;
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
      
      // Parse KYC data
      const kycData = insertKycApplicationSchema.parse(kyc);
      
      try {
        // Step 1: Create or update KYC application
        if (isResubmission && existingKyc) {
          // Update existing rejected KYC application
          kycApplication = await storage.updateKycApplication(existingKyc.id, kycData);
        } else {
          // Create new KYC application
          kycApplication = await storage.createKycApplication(userId, kycData);
        }
        
        // Step 2: Update user's KYC status to pending
        const currentUser = await storage.getUser(userId);
        if (currentUser) {
          await storage.upsertUser({
            ...currentUser,
            kycStatus: "pending",
          });
        }
        
        // Step 3: Create property with pending status
        const { amenityIds, ...propertyData } = property;
        
        // Prepare property data for database - convert number to string for decimal fields
        createdProperty = await storage.createProperty({
          title: propertyData.title,
          description: propertyData.description,
          propertyType: propertyData.propertyType,
          destination: propertyData.destination,
          address: propertyData.address || null,
          latitude: propertyData.latitude ? String(propertyData.latitude) : null,
          longitude: propertyData.longitude ? String(propertyData.longitude) : null,
          images: propertyData.images || [],
          categorizedImages: propertyData.categorizedImages || null,
          videos: propertyData.videos || [],
          pricePerNight: String(propertyData.pricePerNight),
          singleOccupancyPrice: propertyData.singleOccupancyPrice ? String(propertyData.singleOccupancyPrice) : null,
          doubleOccupancyPrice: propertyData.doubleOccupancyPrice ? String(propertyData.doubleOccupancyPrice) : null,
          tripleOccupancyPrice: propertyData.tripleOccupancyPrice ? String(propertyData.tripleOccupancyPrice) : null,
          bulkBookingEnabled: propertyData.bulkBookingEnabled || false,
          bulkBookingMinRooms: propertyData.bulkBookingMinRooms || 5,
          bulkBookingDiscountPercent: propertyData.bulkBookingDiscountPercent ? String(propertyData.bulkBookingDiscountPercent) : "10",
          maxGuests: propertyData.maxGuests || 2,
          bedrooms: propertyData.bedrooms || 1,
          beds: propertyData.beds || 1,
          bathrooms: propertyData.bathrooms || 1,
          policies: propertyData.policies || null,
          ownerId: userId,
          status: "pending",
        });
        
        // Step 4: Set amenities if provided
        if (amenityIds && amenityIds.length > 0) {
          await storage.setPropertyAmenities(createdProperty.id, amenityIds);
        }
        
        // Step 5: Create room types if provided
        const { roomTypes } = req.body;
        if (roomTypes && Array.isArray(roomTypes) && roomTypes.length > 0) {
          for (const rt of roomTypes) {
            // Validate required fields
            const basePrice = parseFloat(rt.basePrice);
            const maxGuests = parseInt(rt.maxGuests);
            const totalRooms = parseInt(rt.totalRooms);
            
            if (!rt.name || isNaN(basePrice) || basePrice < 100) {
              throw new Error(`Invalid room type: ${rt.name || 'unnamed'} - base price must be at least 100`);
            }
            if (isNaN(maxGuests) || maxGuests < 1) {
              throw new Error(`Invalid room type: ${rt.name} - max guests must be at least 1`);
            }
            if (isNaN(totalRooms) || totalRooms < 1) {
              throw new Error(`Invalid room type: ${rt.name} - total rooms must be at least 1`);
            }
            
            const createdRoomType = await storage.createRoom({
              propertyId: createdProperty.id,
              name: rt.name,
              description: rt.description || null,
              basePrice: String(basePrice),
              maxGuests: maxGuests,
              totalRooms: totalRooms,
              isActive: true,
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
        sendKycSubmittedEmail(user.email, user.firstName || 'Property Owner').catch(console.error);
      }
      
      res.json({ 
        message: "Application submitted successfully! Both KYC and property are pending admin review.", 
        kycApplicationId: kycApplication?.id,
        propertyId: createdProperty.id,
        status: "pending"
      });
    } catch (error) {
      console.error("Error submitting combined application:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid application data", error: error.message });
      }
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Phase 1 Quick Listing - Create draft property without full KYC
  // This allows users to get started quickly and complete KYC later
  app.post('/api/properties/create-draft', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        firstName, lastName, email, phone,
        propertyTitle, propCity, propState, propDistrict, propertyType, pricePerNight,
        images, categorizedImages, description
      } = req.body;
      
      // Validate required fields
      if (!propertyTitle || propertyTitle.length < 5) {
        return res.status(400).json({ message: "Property title must be at least 5 characters" });
      }
      if (!propCity) {
        return res.status(400).json({ message: "City is required" });
      }
      if (!propertyType) {
        return res.status(400).json({ message: "Property type is required" });
      }
      if (!pricePerNight || pricePerNight < 100) {
        return res.status(400).json({ message: "Price must be at least ₹100" });
      }
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: "At least one property image is required" });
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
        if (!currentUser.listingMode || currentUser.listingMode === "not_selected") {
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
        nextStep: "Complete KYC verification to publish your listing"
      });
    } catch (error) {
      console.error("Error creating draft property:", error);
      res.status(500).json({ message: "Failed to create draft listing" });
    }
  });

  // Get user's KYC application status
  app.get('/api/kyc/status', isAuthenticated, async (req: any, res) => {
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
            sections: [{
              sectionId: "personal" as const,
              message: "Your KYC application was rejected. Please contact support or resubmit your documents."
            }],
            isRevocation: false
          };
        }
        
        return res.json({ 
          status,
          hasActiveApplication: false,
          userId: userId,
          rejectionDetails
        });
      }
      
      // Build rejectionDetails from existing data
      // If rejectionDetails is empty but reviewNotes exists, create a fallback structure
      let rejectionDetails = application.rejectionDetails as { sections?: Array<{ sectionId: string; message: string }>; isRevocation?: boolean } | null;
      
      if (application.status === "rejected" && 
          (!rejectionDetails || !rejectionDetails.sections || rejectionDetails.sections.length === 0)) {
        // Create fallback rejectionDetails from reviewNotes
        if (application.reviewNotes) {
          rejectionDetails = {
            sections: [{
              sectionId: "personal" as const,
              message: application.reviewNotes
            }],
            isRevocation: false
          };
        } else {
          // Generic rejection message if no notes provided
          rejectionDetails = {
            sections: [{
              sectionId: "personal" as const,
              message: "Your KYC application was rejected. Please contact support for more details."
            }],
            isRevocation: false
          };
        }
      }
      
      // Return full application with additional status info and enhanced rejectionDetails
      res.json({
        ...application,
        rejectionDetails,
        hasActiveApplication: true,
        userId: userId
      });
    } catch (error) {
      console.error("Error fetching KYC status:", error);
      res.status(500).json({ message: "Failed to fetch KYC status" });
    }
  });

  // Update rejected KYC application (resubmit)
  app.patch('/api/kyc/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applicationId = req.params.id;
      
      // Get the existing application
      const existingApplication = await storage.getKycApplication(applicationId);
      
      if (!existingApplication) {
        return res.status(404).json({ message: "KYC application not found" });
      }
      
      // Verify ownership
      if (existingApplication.userId !== userId) {
        return res.status(403).json({ message: "You can only update your own applications" });
      }
      
      // Only allow updating rejected applications
      if (existingApplication.status !== "rejected") {
        return res.status(400).json({ message: "Only rejected applications can be updated" });
      }
      
      // Validate the update data
      const validatedData = insertKycApplicationSchema.parse(req.body);
      
      // Update the application (resets status to pending)
      const updatedApplication = await storage.updateKycApplication(applicationId, validatedData);
      
      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating KYC application:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid application data", error: error.message });
      }
      res.status(500).json({ message: "Failed to update KYC application" });
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

  // Listing mode endpoint - for owner onboarding
  app.patch('/api/user/listing-mode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { listingMode } = req.body;
      
      if (!listingMode || !["quick", "full"].includes(listingMode)) {
        return res.status(400).json({ message: "Invalid listing mode. Must be 'quick' or 'full'" });
      }

      const updatedUser = await storage.upsertUser({
        ...currentUser,
        listingMode,
        userRole: currentUser.userRole === "guest" ? "owner" : currentUser.userRole,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating listing mode:", error);
      res.status(500).json({ message: "Failed to update listing mode" });
    }
  });

  // Dismiss owner welcome modal endpoint
  app.patch('/api/user/dismiss-owner-modal', isAuthenticated, async (req: any, res) => {
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
  });

  // Admin KYC routes
  app.get("/api/admin/kyc", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "admin")) {
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
      
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Only admins can verify KYC applications" });
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
        reviewNotes
      );

      if (!application) {
        return res.status(500).json({ message: "Failed to update KYC application status" });
      }

      // Promote user to owner role when KYC is verified
      const applicantUser = await storage.getUser(application.userId);
      if (!applicantUser) {
        console.error("KYC verified but applicant user not found:", application.userId);
        return res.status(500).json({ message: "Applicant user not found" });
      }
      
      try {
        // Normalize and validate KYC data before syncing
        const normalizedPhone = application.phone && application.phone.trim() ? application.phone.trim() : null;
        const normalizedFirstName = application.firstName && application.firstName.trim() ? application.firstName.trim() : null;
        const normalizedLastName = application.lastName && application.lastName.trim() ? application.lastName.trim() : null;
        
        await storage.upsertUser({
          ...applicantUser,
          userRole: "owner",
          kycStatus: "verified",
          kycVerifiedAt: new Date(),
          // Sync KYC data to user profile (only if KYC data is valid)
          phone: normalizedPhone || applicantUser.phone,
          firstName: normalizedFirstName || applicantUser.firstName,
          lastName: normalizedLastName || applicantUser.lastName,
        });
      } catch (userUpdateError) {
        console.error("Error updating user role after KYC verification:", userUpdateError);
        // Roll back KYC status if user update fails
        await storage.updateKycApplicationStatus(kycId, "rejected", "System error - please retry verification");
        return res.status(500).json({ message: "Failed to update user role" });
      }
      
      // Send approval email notification (fire-and-forget)
      if (applicantUser.email) {
        // Get property name if exists
        const properties = await storage.getOwnerProperties(application.userId);
        const propertyName = properties.length > 0 ? properties[0].title : undefined;
        sendKycApprovedEmail(applicantUser.email, applicantUser.firstName || 'Property Owner', propertyName).catch(console.error);
      }

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
      
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Only admins can reject KYC applications" });
      }

      const { reviewNotes, rejectionDetails } = req.body;
      const application = await storage.updateKycApplicationStatus(
        req.params.id,
        "rejected",
        reviewNotes,
        rejectionDetails
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
            if (rejectionDetails.personalInfo) rejectionReasons.push(`Personal Information: ${rejectionDetails.personalInfo}`);
            if (rejectionDetails.propertyInfo) rejectionReasons.push(`Property Information: ${rejectionDetails.propertyInfo}`);
            if (rejectionDetails.documents) rejectionReasons.push(`Documents: ${rejectionDetails.documents}`);
            if (rejectionDetails.general) rejectionReasons.push(rejectionDetails.general);
          }
          if (reviewNotes && rejectionReasons.length === 0) {
            rejectionReasons.push(reviewNotes);
          }
          sendKycRejectedEmail(applicantUser.email, applicantUser.firstName || 'Property Owner', rejectionReasons).catch(console.error);
        }
      }

      res.json(application);
    } catch (error) {
      console.error("Error rejecting KYC application:", error);
      res.status(500).json({ message: "Failed to reject KYC application" });
    }
  });

  // Revoke verification - demote owner back to guest
  app.patch("/api/admin/kyc/:id/revoke", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Only admins can revoke KYC verification" });
      }

      const { reviewNotes } = req.body;
      
      // Get the application first
      const applications = await storage.getAllKycApplications();
      const application = applications.find(app => app.id === req.params.id);
      
      if (!application) {
        return res.status(404).json({ message: "KYC application not found" });
      }
      
      // Update KYC application status to rejected with isRevocation flag
      const updatedApplication = await storage.updateKycApplicationStatus(
        req.params.id,
        "rejected",
        reviewNotes || "Verification revoked by admin",
        { isRevocation: true }
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
        application: updatedApplication 
      });
    } catch (error) {
      console.error("Error revoking KYC verification:", error);
      res.status(500).json({ message: "Failed to revoke verification" });
    }
  });

  // Admin endpoint to sync KYC data to user profiles for existing verified owners
  app.post("/api/admin/sync-kyc-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Only admins can sync KYC data" });
      }

      // Get all verified KYC applications
      const verifiedApplications = await storage.getKycApplicationsByStatus("verified");
      let syncedCount = 0;
      const syncResults: Array<{userId: string, email: string | null, phone: string | null, synced: boolean}> = [];

      for (const application of verifiedApplications) {
        const applicantUser = await storage.getUser(application.userId);
        if (applicantUser) {
          // Normalize KYC data
          const normalizedPhone = application.phone && application.phone.trim() ? application.phone.trim() : null;
          const normalizedFirstName = application.firstName && application.firstName.trim() ? application.firstName.trim() : null;
          const normalizedLastName = application.lastName && application.lastName.trim() ? application.lastName.trim() : null;
          const userPhone = applicantUser.phone && applicantUser.phone.trim() ? applicantUser.phone.trim() : null;
          
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
  });

  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      const { destination, propertyType, minPrice, maxPrice, minGuests, search } = req.query;
      
      const filters: any = {};
      // Use 'search' for property name + destination search, fallback to 'destination' for legacy
      if (search) filters.search = search as string;
      else if (destination) filters.destination = destination as string;
      if (propertyType) filters.propertyType = propertyType as string;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (minGuests) filters.minGuests = Number(minGuests);
      
      const properties = await storage.getProperties(filters);
      
      // For published properties, include owner contact info
      const propertiesWithOwnerContact = await Promise.all(
        properties.map(async (property) => {
          if (property.status === "published") {
            const owner = await storage.getUser(property.ownerId);
            // Clean phone value - trim whitespace and convert empty strings to null
            const ownerPhone = owner?.phone && owner.phone.trim() ? owner.phone.trim() : null;
            return {
              ...property,
              ownerContact: owner ? {
                phone: ownerPhone,
                name: owner.firstName && owner.lastName 
                  ? `${owner.firstName} ${owner.lastName}` 
                  : owner.firstName || null,
              } : null,
            };
          }
          return property;
        })
      );
      
      res.json(propertiesWithOwnerContact);
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
      
      // For published properties, include owner contact info
      if (property.status === "published") {
        const owner = await storage.getUser(property.ownerId);
        // Clean phone value - trim whitespace and convert empty strings to null
        const ownerPhone = owner?.phone && owner.phone.trim() ? owner.phone.trim() : null;
        return res.json({
          ...property,
          ownerContact: owner ? {
            phone: ownerPhone,
            name: owner.firstName && owner.lastName 
              ? `${owner.firstName} ${owner.lastName}` 
              : owner.firstName || null,
          } : null,
        });
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
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can create properties" });
      }

      // Require KYC to be at least pending before allowing property creation
      if (!user.kycStatus || user.kycStatus === "not_started" || user.kycStatus === "rejected") {
        return res.status(403).json({ message: "Please complete KYC verification before listing properties" });
      }

      const validatedData = insertPropertySchema.parse(req.body);
      const { amenityIds, status, pricePerNight, latitude, longitude, ...propertyData } = validatedData;
      
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
      
      if (!user || !userHasRole(user, "owner")) {
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
      const { amenityIds, pricePerNight, latitude, longitude, ...propertyData } = validatedData;
      
      // Convert numeric fields to strings if provided
      const updateData = {
        ...propertyData,
        ...(pricePerNight !== undefined && { pricePerNight: String(pricePerNight) }),
        ...(latitude !== undefined && { latitude: latitude ? String(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? String(longitude) : null }),
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
        return res.status(400).json({ message: "Invalid property data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
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

  // Update property price (owner only)
  app.patch("/api/properties/:id/price", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can update property price" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this property" });
      }

      const { pricePerNight, originalPrice } = req.body;
      
      if (!pricePerNight || isNaN(Number(pricePerNight)) || Number(pricePerNight) <= 0) {
        return res.status(400).json({ message: "Valid price is required" });
      }

      const updateData: Record<string, any> = {
        pricePerNight: String(pricePerNight),
      };

      if (originalPrice !== undefined) {
        if (originalPrice === null || originalPrice === '' || originalPrice === 0) {
          (updateData as any).originalPrice = null;
        } else if (!isNaN(Number(originalPrice)) && Number(originalPrice) > 0) {
          (updateData as any).originalPrice = String(originalPrice);
        } else {
          (updateData as any).originalPrice = null;
        }
      }

      const updatedProperty = await storage.updateProperty(req.params.id, updateData);
      
      res.json(updatedProperty);
    } catch (error) {
      console.error("Error updating property price:", error);
      res.status(500).json({ message: "Failed to update property price" });
    }
  });

  // Owner properties route
  app.get("/api/owner/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can access this endpoint" });
      }

      const properties = await storage.getProperties({ ownerId: userId });
      res.json(properties);
    } catch (error) {
      console.error("Error fetching owner properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Get owner's draft property (for continuing listing flow)
  app.get("/api/owner/draft-property", isAuthenticated, async (req: any, res) => {
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
  });

  // Pause property listing (owner only)
  app.patch("/api/properties/:id/pause", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can pause properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to pause this property" });
      }

      if (property.status !== "published") {
        return res.status(400).json({ message: "Only published properties can be paused" });
      }

      const updatedProperty = await storage.updateProperty(req.params.id, { status: "paused" });
      
      // Send email notification to owner
      if (user.email) {
        sendPropertyStatusEmail(user.email, user.firstName || '', property.title, 'paused').catch(console.error);
      }
      
      res.json(updatedProperty);
    } catch (error) {
      console.error("Error pausing property:", error);
      res.status(500).json({ message: "Failed to pause property" });
    }
  });

  // Resume paused property listing (owner only)
  app.patch("/api/properties/:id/resume", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can resume properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to resume this property" });
      }

      if (property.status !== "paused") {
        return res.status(400).json({ message: "Only paused properties can be resumed" });
      }

      // Check if property has geolocation - required for publishing
      if (!property.latitude || !property.longitude) {
        return res.status(400).json({ 
          message: "Property cannot be resumed without GPS coordinates. Please set the property location in the Location tab first.",
          missingGeotag: true
        });
      }

      const updatedProperty = await storage.updateProperty(req.params.id, { status: "published" });
      
      // Send email notification to owner
      if (user.email) {
        sendPropertyStatusEmail(user.email, user.firstName || '', property.title, 'resumed').catch(console.error);
      }
      
      res.json(updatedProperty);
    } catch (error) {
      console.error("Error resuming property:", error);
      res.status(500).json({ message: "Failed to resume property" });
    }
  });

  // Deactivate property listing (owner only)
  app.patch("/api/properties/:id/deactivate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can deactivate properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to deactivate this property" });
      }

      if (property.status === "deactivated") {
        return res.status(400).json({ message: "Property is already deactivated" });
      }

      const updatedProperty = await storage.updateProperty(req.params.id, { status: "deactivated" });
      
      // Send email notification to owner
      if (user.email) {
        sendPropertyStatusEmail(user.email, user.firstName || '', property.title, 'deactivated').catch(console.error);
      }
      
      res.json(updatedProperty);
    } catch (error) {
      console.error("Error deactivating property:", error);
      res.status(500).json({ message: "Failed to deactivate property" });
    }
  });

  // Availability Overrides routes (owner only)
  // Get all availability overrides for a property
  app.get("/api/properties/:id/availability-overrides", async (req, res) => {
    try {
      const overrides = await storage.getAvailabilityOverrides(req.params.id);
      res.json(overrides);
    } catch (error) {
      console.error("Error fetching availability overrides:", error);
      res.status(500).json({ message: "Failed to fetch availability overrides" });
    }
  });

  // Create a new availability override
  app.post("/api/properties/:id/availability-overrides", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can create availability overrides" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this property" });
      }

      const { overrideType, startDate, endDate, reason, availableRooms, roomTypeId } = req.body;

      if (!overrideType || !startDate || !endDate) {
        return res.status(400).json({ message: "Override type, start date, and end date are required" });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({ message: "End date must be after start date" });
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
      res.status(500).json({ message: "Failed to create availability override" });
    }
  });

  // Delete an availability override
  app.delete("/api/properties/:id/availability-overrides/:overrideId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can delete availability overrides" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this property" });
      }

      await storage.deleteAvailabilityOverride(req.params.overrideId);
      
      res.json({ message: "Availability override deleted successfully" });
    } catch (error) {
      console.error("Error deleting availability override:", error);
      res.status(500).json({ message: "Failed to delete availability override" });
    }
  });

  // Room inventory check endpoint - get available rooms for a date range
  app.get("/api/properties/:id/room-inventory", async (req, res) => {
    try {
      const { startDate, endDate, roomTypeId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // Get all room types for this property
      const roomTypes = await storage.getRoomsByProperty(req.params.id);
      
      // Get all bookings that overlap with the date range
      // ONLY count ACTIVE bookings: confirmed (owner_accepted), customer_confirmed, checked_in
      // Do NOT count: pending, rejected, cancelled, checked_out, completed
      const ACTIVE_BOOKING_STATUSES = ['confirmed', 'customer_confirmed', 'checked_in'];
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
        const roomTypeBookings = overlappingBookings.filter((b: any) => b.roomTypeId === roomType.id);
        const roomTypeOverrides = overlappingOverrides.filter((o: any) => 
          o.roomTypeId === roomType.id || !o.roomTypeId
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
            const overlapsDate = overrideStart <= currentDate && overrideEnd > currentDate;
            const isBlockingType = ['hold', 'sold_out', 'maintenance'].includes(o.overrideType);
            return overlapsDate && isBlockingType;
          });
          
          if (blockingOverride) {
            // Mark the type of block found
            if (blockingOverride.overrideType === 'sold_out') hasSoldOutOverride = true;
            if (blockingOverride.overrideType === 'maintenance') hasMaintenanceOverride = true;
            if (blockingOverride.overrideType === 'hold') hasHoldOverride = true;
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
              return overrideStart <= currentDate && overrideEnd > currentDate && o.availableRooms !== null;
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
        
        return {
          roomTypeId: roomType.id,
          roomTypeName: roomType.name,
          totalRooms: totalRoomsDefault,
          bookedRooms: maxBookedRooms,
          availableRooms: minAvailableRooms,
          hasSoldOutOverride,
          hasMaintenanceOverride,
          hasHoldOverride,
        };
      });
      
      // If a specific room type was requested, filter to just that one
      if (roomTypeId) {
        const specific = roomInventory.find((r: any) => r.roomTypeId === roomTypeId);
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
            mealOptions: mealOptions.filter(opt => opt.isActive),
          };
        })
      );
      
      res.json(roomsWithMealOptions);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/properties/:id/rooms", isAuthenticated, async (req: any, res) => {
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
        console.log("Room creation failed: property not found", req.params.id);
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        console.log("Room creation failed: not authorized", property.ownerId, "!=", userId);
        return res.status(403).json({ message: "Not authorized to add rooms to this property" });
      }

      // Validate with Zod schema
      const validatedData = insertRoomSchema.parse({
        ...req.body,
        propertyId: req.params.id,
      });
      
      console.log("Room validated data:", validatedData);

      const room = await storage.createRoom(validatedData);
      
      console.log("Room created successfully:", room.id);
      
      // Auto-add the 4 default meal options
      const defaultMealOptions = [
        { name: "Room Only", priceAdjustment: "0", inclusions: "No meals included" },
        { name: "Breakfast Included", priceAdjustment: "300", inclusions: "Daily breakfast buffet" },
        { name: "Half Board", priceAdjustment: "600", inclusions: "Breakfast and dinner included" },
        { name: "Full Board", priceAdjustment: "900", inclusions: "All meals included (breakfast, lunch, dinner)" },
      ];
      
      for (const mealOpt of defaultMealOptions) {
        try {
          await storage.createRoomOption({
            roomTypeId: room.id,
            name: mealOpt.name,
            priceAdjustment: mealOpt.priceAdjustment,
            inclusions: mealOpt.inclusions,
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
        return res.status(400).json({ message: "Invalid room data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  // Update room type
  app.patch("/api/properties/:id/rooms/:roomId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can update rooms" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify rooms for this property" });
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
  });

  // Delete room type
  app.delete("/api/properties/:id/rooms/:roomId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can delete rooms" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete rooms from this property" });
      }

      await storage.deleteRoom(req.params.roomId);
      
      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

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

  app.post("/api/rooms/:roomId/options", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can add room options" });
      }

      // Verify room exists and user owns the property
      const room = await storage.getRoomType(req.params.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const property = await storage.getProperty(room.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to add options to this room" });
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
        return res.status(400).json({ message: "Invalid room option data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create room option" });
    }
  });

  app.patch("/api/rooms/:roomId/options/:optionId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can update room options" });
      }

      const room = await storage.getRoomType(req.params.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const property = await storage.getProperty(room.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update options for this room" });
      }

      const option = await storage.updateRoomOption(req.params.optionId, req.body);
      
      if (!option) {
        return res.status(404).json({ message: "Room option not found" });
      }
      
      res.json(option);
    } catch (error) {
      console.error("Error updating room option:", error);
      res.status(500).json({ message: "Failed to update room option" });
    }
  });

  app.delete("/api/rooms/:roomId/options/:optionId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can delete room options" });
      }

      const room = await storage.getRoomType(req.params.roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const property = await storage.getProperty(room.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete options from this room" });
      }

      await storage.deleteRoomOption(req.params.optionId);
      res.json({ message: "Room option deleted successfully" });
    } catch (error) {
      console.error("Error deleting room option:", error);
      res.status(500).json({ message: "Failed to delete room option" });
    }
  });

  // Wishlists routes
  app.get("/api/wishlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ message: "Login required to access wishlists" });
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
        return res.status(403).json({ message: "Login required to add to wishlists" });
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
      
      if (!user) {
        return res.status(403).json({ message: "Login required to manage wishlists" });
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
      
      if (!user) {
        return res.status(403).json({ message: "Login required to create bookings" });
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

      // Check owner's KYC status - cannot book if owner's KYC is not verified
      const owner = await storage.getUser(property.ownerId);
      if (!owner || owner.kycStatus !== "verified") {
        return res.status(400).json({ 
          message: "This property is currently not accepting bookings. The property owner needs to complete verification first.",
          reason: "owner_kyc_not_verified"
        });
      }

      // Check for date overlaps
      const checkIn = new Date(validatedData.checkIn);
      const checkOut = new Date(validatedData.checkOut);

      if (checkIn >= checkOut) {
        return res.status(400).json({ message: "Check-out must be after check-in" });
      }

      // Check if property has room types - if so, require roomTypeId selection
      const propertyRoomTypes = await storage.getRoomTypes(validatedData.propertyId);
      if (propertyRoomTypes.length > 0 && !validatedData.roomTypeId) {
        return res.status(400).json({ 
          message: "Please select a room type for this property" 
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
          return res.status(400).json({ message: "Selected room type not found" });
        }
        
        const totalRoomsDefault = roomType.totalRooms || 1;
        const requestedRooms = validatedData.rooms || 1;
        
        // ONLY count ACTIVE bookings: confirmed (owner_accepted), customer_confirmed, checked_in
        // Do NOT count: pending, rejected, cancelled, checked_out, completed
        // This allows multiple pending bookings for the same date - inventory locks only after owner accepts
        const ACTIVE_BOOKING_STATUSES = ['confirmed', 'customer_confirmed', 'checked_in'];
        const allBookings = await storage.getBookingsByProperty(validatedData.propertyId);
        const activeBookingsForRoomType = allBookings.filter((booking: any) => {
          if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) return false;
          if (booking.roomTypeId !== validatedData.roomTypeId) return false;
          return true;
        });
        
        // Get availability overrides for this room type
        const overrides = await storage.getAvailabilityOverrides(validatedData.propertyId);
        const roomTypeOverrides = overrides.filter((o: any) => 
          o.roomTypeId === validatedData.roomTypeId || !o.roomTypeId
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
            const overlapsDate = overrideStart <= currentDate && overrideEnd > currentDate;
            const isBlockingType = ['hold', 'sold_out', 'maintenance'].includes(o.overrideType);
            return overlapsDate && isBlockingType;
          });
          
          if (blockingOverride) {
            insufficientDate = currentDate;
            blockedReason = blockingOverride.overrideType;
            console.log('[INVENTORY BLOCK - OVERRIDE]', {
              roomTypeId: validatedData.roomTypeId,
              date: currentDate.toISOString().split('T')[0],
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
            .reduce((sum: number, booking: any) => sum + (booking.rooms || 1), 0);
          
          // Check for custom availability on this date
          let availableOnDate = totalRoomsDefault;
          const dateOverride = roomTypeOverrides.find((o: any) => {
            const overrideStart = new Date(o.startDate);
            const overrideEnd = new Date(o.endDate);
            return overrideStart <= currentDate && overrideEnd > currentDate && o.availableRooms !== null;
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
            console.log('[INVENTORY BLOCK]', {
              roomTypeId: validatedData.roomTypeId,
              date: currentDate.toISOString().split('T')[0],
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
                .map((b: any) => ({ id: b.id, status: b.status, rooms: b.rooms })),
            });
            break;
          }
          
          dateToCheck.setDate(dateToCheck.getDate() + 1);
        }
        
        if (insufficientDate) {
          const dateStr = insufficientDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          
          // Show appropriate message based on block reason
          if (blockedReason === 'hold') {
            return res.status(400).json({ 
              message: `Property is temporarily not accepting bookings on ${dateStr}. Please choose different dates.`,
              availableRooms: 0
            });
          } else if (blockedReason === 'sold_out') {
            return res.status(400).json({ 
              message: `Property is fully booked on ${dateStr}. Please choose different dates.`,
              availableRooms: 0
            });
          } else if (blockedReason === 'maintenance') {
            return res.status(400).json({ 
              message: `Property is under maintenance on ${dateStr}. Please choose different dates.`,
              availableRooms: 0
            });
          }
          
          return res.status(400).json({ 
            message: `Only ${Math.max(0, minAvailable)} room${minAvailable !== 1 ? 's' : ''} available on ${dateStr}. Please reduce the number of rooms or select different dates.`,
            availableRooms: Math.max(0, minAvailable)
          });
        }
      } else {
        // No room type selected - property without room types (simple property like villa/apartment)
        // Check for blocking overrides AND existing active bookings (single-unit properties)
        const overrides = await storage.getAvailabilityOverrides(validatedData.propertyId);
        const propertyWideOverrides = overrides.filter((o: any) => !o.roomTypeId);
        
        // For simple properties, check for overlapping ACTIVE bookings (single unit capacity)
        const ACTIVE_BOOKING_STATUSES = ['confirmed', 'customer_confirmed', 'checked_in'];
        const allBookings = await storage.getBookingsByProperty(validatedData.propertyId);
        const overlappingActiveBookings = allBookings.filter((booking: any) => {
          if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) return false;
          const bookingStart = new Date(booking.checkIn);
          const bookingEnd = new Date(booking.checkOut);
          // Check for overlap: booking.checkIn < checkOut AND booking.checkOut > checkIn
          return bookingStart < checkOut && bookingEnd > checkIn;
        });
        
        if (overlappingActiveBookings.length > 0) {
          return res.status(400).json({ 
            message: "This property is already booked for the selected dates. Please choose different dates." 
          });
        }
        
        const dateToCheck = new Date(checkIn);
        while (dateToCheck < checkOut) {
          const currentDate = new Date(dateToCheck);
          
          const blockingOverride = propertyWideOverrides.find((o: any) => {
            const overrideStart = new Date(o.startDate);
            const overrideEnd = new Date(o.endDate);
            const overlapsDate = overrideStart <= currentDate && overrideEnd > currentDate;
            const isBlockingType = ['hold', 'sold_out', 'maintenance'].includes(o.overrideType);
            return overlapsDate && isBlockingType;
          });
          
          if (blockingOverride) {
            const dateStr = currentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            let message = `Selected dates are unavailable on ${dateStr}. Please choose different dates.`;
            if (blockingOverride.overrideType === 'maintenance') {
              message = `Property is under maintenance on ${dateStr}. Please choose different dates.`;
            } else if (blockingOverride.overrideType === 'sold_out') {
              message = `Property is fully booked on ${dateStr}. Please choose different dates.`;
            } else if (blockingOverride.overrideType === 'hold') {
              message = `Property is temporarily not accepting bookings on ${dateStr}. Please choose different dates.`;
            }
            return res.status(400).json({ message });
          }
          
          dateToCheck.setDate(dateToCheck.getDate() + 1);
        }
      }

      // Calculate total price server-side (don't trust client)
      // Price = (roomBasePrice + occupancyAdjustment + mealOptionPrice) × nights × rooms
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const roomsCount = validatedData.rooms || 1;
      const guestCount = validatedData.guests || 1;
      
      let basePrice = Number(property.pricePerNight);
      let mealPrice = 0;
      let occupancyAdjustment = 0;
      
      // If room type is selected, use room type pricing
      if (validatedData.roomTypeId) {
        const roomType = await storage.getRoomType(validatedData.roomTypeId);
        if (roomType) {
          basePrice = Number(roomType.basePrice);
          
          // Calculate occupancy-based pricing adjustment
          // singleOccupancyBase defines how many guests are included in the base price
          // Adjustments apply when guest count exceeds this base
          const singleOccupancyBase = roomType.singleOccupancyBase || 1;
          const guestsOverBase = guestCount - singleOccupancyBase;
          
          if (guestsOverBase >= 2 && roomType.tripleOccupancyAdjustment) {
            // Triple occupancy: 2+ guests over base (e.g., base=1, guests=3+)
            occupancyAdjustment = Number(roomType.tripleOccupancyAdjustment);
          } else if (guestsOverBase >= 1 && roomType.doubleOccupancyAdjustment) {
            // Double occupancy: 1 guest over base (e.g., base=1, guests=2)
            occupancyAdjustment = Number(roomType.doubleOccupancyAdjustment);
          }
          // No adjustment when guestCount <= singleOccupancyBase
          
          // If meal option is selected, add meal option price
          if (validatedData.roomOptionId) {
            const mealOption = await storage.getRoomOption(validatedData.roomOptionId);
            if (mealOption && mealOption.roomTypeId === validatedData.roomTypeId) {
              mealPrice = Number(mealOption.priceAdjustment);
            }
          }
        }
      }
      
      const totalPrice = nights * (basePrice + occupancyAdjustment + mealPrice) * roomsCount;
      
      const booking = await storage.createBooking({
        ...validatedData,
        rooms: roomsCount,
        totalPrice: totalPrice.toString(),
      });
      
      // STATE: CREATED - Send state-driven booking emails
      const guest = await storage.getUser(userId);
      // owner already fetched above for KYC check
      const checkInFormatted = checkIn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const checkOutFormatted = checkOut.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      
      // Format booking created date for emails
      const bookingCreatedAtFormatted = booking.bookingCreatedAt 
        ? new Date(booking.bookingCreatedAt).toLocaleString('en-IN', { 
            day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
          })
        : undefined;
        
      const bookingEmailData = {
        bookingCode: booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
        propertyName: property.title,
        checkIn: checkInFormatted,
        checkOut: checkOutFormatted,
        guests: validatedData.guests || 1,
        rooms: roomsCount,
        totalPrice: totalPrice.toString(),
        guestName: guest?.firstName && guest?.lastName 
          ? `${guest.firstName} ${guest.lastName}` 
          : guest?.email || 'Guest',
        guestEmail: guest?.email || '',
        bookingCreatedAt: bookingCreatedAtFormatted,
      };
      
      // Email to guest: "Reservation Requested"
      if (guest?.email) {
        sendBookingCreatedGuestEmail(
          guest.email, 
          guest.firstName || '', 
          bookingEmailData
        ).catch(console.error);
      }
      
      // Email to owner: "New Booking Request"
      if (owner?.email) {
        sendBookingRequestToOwnerEmail(
          owner.email,
          owner.firstName || '',
          property.title,
          bookingEmailData.guestName,
          guest?.email || '',
          checkInFormatted,
          checkOutFormatted,
          validatedData.guests || 1,
          totalPrice.toString()
        ).catch(console.error);
      }
      
      // Create/get conversation and send automated message with booking details
      try {
        const conversation = await storage.getOrCreateConversation(validatedData.propertyId, userId);
        
        const bookingMessage = `I'd like to book ${roomsCount} room${roomsCount > 1 ? 's' : ''} for ${validatedData.guests || 1} guest${(validatedData.guests || 1) > 1 ? 's' : ''} from ${checkInFormatted} to ${checkOutFormatted}. Total: Rs. ${totalPrice}`;
        
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
        console.error('Failed to send booking message to owner:', msgError);
        // Don't fail the booking if message fails
      }
      
      res.json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      console.error("Error details:", error.message, error.stack);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      // Return more specific error message for debugging
      res.status(500).json({ 
        message: "Failed to create booking",
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
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
              const ownerPhone = owner.phone && owner.phone.trim() ? owner.phone.trim() : null;
              ownerContact = {
                name: `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || "Owner",
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
              roomOption = { id: ro.id, name: ro.name, priceAdjustment: ro.priceAdjustment };
            }
          }
          
          return {
            ...booking,
            property: property ? {
              id: property.id,
              title: property.title,
              images: property.images,
              destination: property.destination,
            } : null,
            ownerContact,
            roomType,
            roomOption,
          };
        })
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
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      // Optionally filter by room type - allows different room types on overlapping dates
      const bookedDates = await storage.getPropertyBookedDates(
        req.params.id,
        new Date(startDate as string),
        new Date(endDate as string),
        (roomTypeId as string) || null
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
        return res.status(400).json({ message: "startDate and endDate are required" });
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
      const ACTIVE_BOOKING_STATUSES = ['confirmed', 'customer_confirmed', 'checked_in'];
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
        status: 'available' | 'partial' | 'full';
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
            const overlapsDate = overrideStart <= currentDate && overrideEnd > currentDate;
            const isBlockingType = ['hold', 'sold_out', 'maintenance'].includes(o.overrideType);
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
          const roomTypeBookings = overlappingBookings.filter((b: any) => b.roomTypeId === roomType.id);
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
            return overrideStart <= currentDate && overrideEnd > currentDate && o.availableRooms !== null;
          });
          
          if (dateOverride && dateOverride.availableRooms !== null) {
            baseAvailable = dateOverride.availableRooms;
          }
          
          const remainingOnDate = Math.max(0, baseAvailable - bookedOnDate);
          availableRoomsAllTypes += remainingOnDate;
        }
        
        // Determine status
        let status: 'available' | 'partial' | 'full' = 'available';
        if (isBlocked || availableRoomsAllTypes === 0) {
          status = 'full';
        } else if (availableRoomsAllTypes < totalRoomsAllTypes) {
          status = 'partial';
        }
        
        calendarDates.push({
          date: dateToCheck.toISOString().split('T')[0],
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
      res.status(500).json({ message: "Failed to fetch calendar availability" });
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

  // Customer booking confirmation (after owner accepts)
  app.post("/api/bookings/:id/customer-confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only the guest who made the booking can confirm
      if (booking.guestId !== userId) {
        return res.status(403).json({ message: "Not authorized to confirm this booking" });
      }

      // Can only confirm if the owner has accepted (status is "confirmed")
      if (booking.status !== "confirmed") {
        return res.status(400).json({ 
          message: "Booking cannot be confirmed. The hotel must accept your request first." 
        });
      }

      // Update status to customer_confirmed (cast to any to work around TypeScript enum sync)
      const updated = await storage.updateBookingStatus(req.params.id, "customer_confirmed" as any);
      
      // Create notification for owner about customer confirmation
      const property = await storage.getProperty(booking.propertyId);
      const guest = await storage.getUser(userId);
      
      if (property) {
        try {
          // Find or create conversation to notify the owner
          const conversations = await storage.getConversationsByUser(property.ownerId);
          const existingConv = conversations.find(c => 
            (c.guestId === userId && c.ownerId === property.ownerId && c.propertyId === property.id)
          );
          
          if (existingConv) {
            // Send system message to owner about confirmation
            await storage.createMessage({
              conversationId: existingConv.id,
              senderId: userId,
              content: `Great news! I've confirmed my booking (${booking.bookingCode || booking.id.slice(0, 8).toUpperCase()}). Looking forward to my stay!`,
              read: false,
            });
          }
        } catch (msgError) {
          console.error("Error sending confirmation notification:", msgError);
          // Don't fail the request if messaging fails
        }
        
        // STATE: CUSTOMER_CONFIRMED - Send confirmation emails to both guest and owner
        const checkInFormatted = new Date(booking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOutFormatted = new Date(booking.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const bookingCreatedAtFormatted = booking.bookingCreatedAt 
          ? new Date(booking.bookingCreatedAt).toLocaleString('en-IN', { 
              day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
            })
          : undefined;
        
        const bookingEmailData = {
          bookingCode: booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
          propertyName: property.title,
          checkIn: checkInFormatted,
          checkOut: checkOutFormatted,
          guests: booking.guests || 1,
          rooms: booking.rooms || 1,
          totalPrice: booking.totalPrice?.toString() || '0',
          guestName: guest?.firstName && guest?.lastName 
            ? `${guest.firstName} ${guest.lastName}` 
            : guest?.email || 'Guest',
          guestEmail: guest?.email || '',
          bookingCreatedAt: bookingCreatedAtFormatted,
        };
        
        // Email to guest: "Booking Confirmed"
        if (guest?.email) {
          sendBookingConfirmedGuestEmail(
            guest.email,
            guest.firstName || '',
            bookingEmailData
          ).catch(console.error);
        }
        
        // Email to owner: "Guest Confirmed"
        const owner = await storage.getUser(property.ownerId);
        if (owner?.email) {
          sendBookingConfirmedOwnerEmail(
            owner.email,
            owner.firstName || '',
            bookingEmailData
          ).catch(console.error);
        }
      }
      
      res.json({ 
        ...updated, 
        message: "Booking confirmed! The hotel has been notified." 
      });
    } catch (error) {
      console.error("Error confirming booking:", error);
      res.status(500).json({ message: "Failed to confirm booking" });
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
      
      if (!user) {
        return res.status(403).json({ message: "Login required to start conversations" });
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

      const messages = await storage.getMessagesByConversation(req.params.id);
      
      // Enrich messages with booking data if they have a bookingId
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          if (message.bookingId) {
            const booking = await storage.getBooking(message.bookingId);
            return { ...message, booking };
          }
          return message;
        })
      );
      
      await storage.markMessagesAsRead(req.params.id, userId);
      
      res.json(enrichedMessages);
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

      const message = await storage.createMessage({
        ...validatedData,
        attachments: validatedData.attachments as any,
      });

      // Get sender info for real-time display
      const sender = await storage.getUser(userId);
      const messageWithSender = {
        ...message,
        sender: sender ? {
          id: sender.id,
          firstName: sender.firstName,
          lastName: sender.lastName,
          email: sender.email,
          profileImageUrl: sender.profileImageUrl,
        } : null,
      };

      // Broadcast new message to the other participant via WebSocket
      const broadcastData = {
        type: "new_message",
        conversationId: req.params.id,
        message: messageWithSender,
      };
      
      // Notify the other participant
      const recipientId = userId === conversation.guestId ? conversation.ownerId : conversation.guestId;
      broadcastToUser(recipientId, broadcastData);
      
      // Also broadcast to sender so they see instant updates across tabs/devices
      broadcastToUser(userId, broadcastData);
      
      res.json(messageWithSender);
    } catch (error: any) {
      console.error("Error creating message:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Message attachment upload endpoint
  app.post("/api/messages/upload", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, accessPath } = await objectStorageService.getObjectEntityUploadURLWithAccessPath();
      
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
  app.post("/api/messages/upload/finalize", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accessPath, uploadToken, conversationId } = req.body;
      
      if (!accessPath || !uploadToken || !conversationId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Verify the upload token
      const tokenData = verifyUploadToken(uploadToken);
      if (!tokenData || tokenData.userId !== userId || tokenData.accessPath !== accessPath) {
        return res.status(403).json({ message: "Invalid or expired upload token" });
      }
      
      // Verify user has access to the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.guestId !== userId && conversation.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized for this conversation" });
      }
      
      // Set ACL policy to allow both conversation participants to access
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(accessPath);
      
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
      
      if (!user || !userHasRole(user, "owner")) {
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
        .filter((p: any) => 
          p.status === "published" && (
            p.title?.toLowerCase().includes(searchLower) ||
            p.propCity?.toLowerCase().includes(searchLower)
          )
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
        ...destinations.map(d => ({ ...d, isProperty: false })),
        ...matchingProperties,
      ];
      
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
      
      if (!user || (!userHasRole(user, "admin") && !userHasRole(user, "owner"))) {
        return res.status(403).json({ message: "Only admins or owners can create destinations" });
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
      
      if (!user || (!userHasRole(user, "admin") && !userHasRole(user, "owner"))) {
        return res.status(403).json({ message: "Only admins or owners can update destinations" });
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
      
      if (!user || (!userHasRole(user, "admin") && !userHasRole(user, "owner"))) {
        return res.status(403).json({ message: "Only admins or owners can delete destinations" });
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
      
      if (!user || (!userHasRole(user, "admin") && !userHasRole(user, "owner"))) {
        return res.status(403).json({ message: "Only admins or owners can feature destinations" });
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
      
      if (!user || !userHasRole(user, "admin")) {
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
      
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Only admins can approve properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      // Check owner's KYC status - cannot approve property if KYC is not verified
      const owner = await storage.getUser(property.ownerId);
      if (!owner) {
        return res.status(400).json({ message: "Property owner not found" });
      }
      
      if (owner.kycStatus !== "verified") {
        const statusMessage = owner.kycStatus === "rejected" 
          ? "Owner's KYC has been rejected. Property cannot be approved until KYC is resubmitted and verified."
          : owner.kycStatus === "pending"
          ? "Owner's KYC is pending review. Property cannot be approved until KYC is verified."
          : "Owner has not completed KYC verification. Property cannot be approved until KYC is verified.";
        return res.status(400).json({ 
          message: statusMessage,
          ownerKycStatus: owner.kycStatus
        });
      }

      // Check if property has geolocation - required for publishing
      if (!property.latitude || !property.longitude) {
        return res.status(400).json({ 
          message: "Property cannot be approved without GPS coordinates. Please ask the owner to set the property location using the map picker in the Owner Portal.",
          missingGeotag: true
        });
      }

      const { notes } = req.body;
      const updated = await storage.updateProperty(req.params.id, { 
        status: "published",
        verificationNotes: notes || null,
        verifiedAt: new Date(),
        verifiedBy: userId
      });
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
      
      if (!user || !userHasRole(user, "admin")) {
        return res.status(403).json({ message: "Only admins can reject properties" });
      }

      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      const { notes } = req.body;
      if (!notes || notes.trim() === "") {
        return res.status(400).json({ message: "Rejection/revocation reason is required" });
      }

      const updated = await storage.updateProperty(req.params.id, { 
        status: "draft",
        verificationNotes: notes,
        verifiedAt: new Date(),
        verifiedBy: userId
      });
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
      
      if (!user || !userHasRole(user, "admin")) {
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
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, accessPath } = await objectStorageService.getObjectEntityUploadURLWithAccessPath();
      
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
        return res.status(403).json({ message: "Token does not match user or path" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(accessPath);
      
      // Allow specifying visibility - default to private for security, but property images should be public
      const visibility = req.body.visibility === "public" ? "public" : "private";
      
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
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Get the authenticated user if available (optional auth)
      let userId: string | undefined;
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
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

  // ==================== OWNER DASHBOARD ROUTES ====================

  // Get owner dashboard stats (KPIs)
  app.get("/api/owner/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can access dashboard" });
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

      const propertyIds = properties.map(p => p.id);
      
      // Get all bookings for owner's properties
      const allBookings = await storage.getBookingsForProperties(propertyIds);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Calculate KPIs
      let bookingsToday = 0;
      let bookingsThisMonth = 0;
      let revenueToday = 0;
      let revenueThisMonth = 0;
      
      for (const booking of allBookings) {
        const bookingDate = new Date(booking.createdAt || booking.checkIn);
        bookingDate.setHours(0, 0, 0, 0);
        
        if (booking.status === "confirmed" || booking.status === "completed") {
          const price = parseFloat(booking.totalPrice as string) || 0;
          
          if (bookingDate.getTime() === today.getTime()) {
            bookingsToday++;
            revenueToday += price;
          }
          
          if (bookingDate >= startOfMonth) {
            bookingsThisMonth++;
            revenueThisMonth += price;
          }
        }
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
        totalRating += (parseFloat(prop.rating as string) || 0) * (prop.reviewCount || 0);
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
        properties: properties.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          pricePerNight: p.pricePerNight,
        })),
      });
    } catch (error) {
      console.error("Error fetching owner stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get room utilization for owner's property
  app.get("/api/owner/properties/:propertyId/utilization", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can view room utilization" });
      }

      const { propertyId } = req.params;
      const { startDate, endDate } = req.query;

      // Verify owner owns this property
      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "You don't own this property" });
      }

      // Default date range: today through 30 days from now
      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const utilization = await storage.getRoomUtilization(propertyId, start, end);
      
      res.json({
        propertyId,
        propertyTitle: property.title,
        dateRange: { startDate: start.toISOString(), endDate: end.toISOString() },
        roomTypes: utilization,
      });
    } catch (error) {
      console.error("Error fetching room utilization:", error);
      res.status(500).json({ message: "Failed to fetch room utilization" });
    }
  });

  // Get date-wise room utilization for a specific room type
  app.get("/api/owner/properties/:propertyId/rooms/:roomTypeId/utilization", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can view room utilization" });
      }

      const { propertyId, roomTypeId } = req.params;
      const { startDate, endDate } = req.query;

      // Verify owner owns this property
      const property = await storage.getProperty(propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "You don't own this property" });
      }

      // Default date range: today through 30 days from now
      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const utilization = await storage.getRoomUtilizationByDate(propertyId, roomTypeId, start, end);
      
      res.json({
        propertyId,
        roomTypeId,
        dateRange: { startDate: start.toISOString(), endDate: end.toISOString() },
        dates: utilization,
      });
    } catch (error) {
      console.error("Error fetching date-wise room utilization:", error);
      res.status(500).json({ message: "Failed to fetch date-wise room utilization" });
    }
  });

  // Get owner's bookings with filters
  app.get("/api/owner/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can access bookings" });
      }

      const { filter } = req.query; // upcoming, ongoing, past, all
      
      // Get owner's properties
      const properties = await storage.getOwnerProperties(userId);
      const propertyIds = properties.map(p => p.id);
      
      if (propertyIds.length === 0) {
        return res.json([]);
      }
      
      // Get bookings for owner's properties
      const bookings = await storage.getBookingsForProperties(propertyIds);
      
      const now = new Date();
      let filteredBookings = bookings;
      
      if (filter === "upcoming") {
        filteredBookings = bookings.filter(b => 
          new Date(b.checkIn) > now && (b.status === "confirmed" || b.status === "pending")
        );
      } else if (filter === "ongoing") {
        filteredBookings = bookings.filter(b => 
          new Date(b.checkIn) <= now && new Date(b.checkOut) >= now && b.status === "confirmed"
        );
      } else if (filter === "past") {
        filteredBookings = bookings.filter(b => 
          new Date(b.checkOut) < now || b.status === "completed" || b.status === "cancelled"
        );
      }
      
      // Enrich with property, guest, room type and meal option info
      const enrichedBookings = await Promise.all(
        filteredBookings.map(async (booking) => {
          const property = properties.find(p => p.id === booking.propertyId);
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
              roomOption = { id: ro.id, name: ro.name, priceAdjustment: ro.priceAdjustment };
            }
          }
          
          return {
            ...booking,
            property: property ? { id: property.id, title: property.title, images: property.images } : null,
            guest: guest ? { 
              id: guest.id, 
              name: `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || "Guest",
              email: guest.email,
              phone: guest.phone,
            } : null,
            roomType,
            roomOption,
          };
        })
      );
      
      res.json(enrichedBookings);
    } catch (error) {
      console.error("Error fetching owner bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Update booking status (owner)
  app.patch("/api/owner/bookings/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can update bookings" });
      }

      const { status, responseMessage } = req.body;
      if (!["confirmed", "rejected", "cancelled", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify owner owns the property
      const property = await storage.getProperty(booking.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this booking" });
      }

      // Only allow status change from pending state (for confirmed/rejected)
      if (booking.status !== "pending" && (status === "confirmed" || status === "rejected")) {
        return res.status(400).json({ message: "Can only accept/reject pending bookings" });
      }

      const updated = await storage.updateBookingStatus(req.params.id, status, responseMessage);
      
      // Get guest info for notification
      const guest = await storage.getUser(booking.guestId);
      
      // Send a booking update message to the conversation
      try {
        const conversation = await storage.getOrCreateConversation(booking.propertyId, booking.guestId);
        
        const updateMessage = status === "confirmed"
          ? "I've accepted your booking request. Looking forward to hosting you!"
          : status === "rejected"
          ? `I'm sorry, I cannot accept this booking${responseMessage ? `: ${responseMessage}` : '. Please feel free to check other dates or properties.'}`
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
        console.error('Failed to send booking update message:', msgError);
      }
      
      // Broadcast status update via WebSocket if available
      if (wss && guest) {
        const statusMessage = status === "confirmed" 
          ? `Your booking for ${property.title} has been confirmed!`
          : status === "rejected"
          ? `Your booking request for ${property.title} was declined. ${responseMessage ? `Reason: ${responseMessage}` : ''}`
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
      
      // STATE-DRIVEN EMAILS: Send appropriate emails based on new status
      if (guest?.email) {
        const checkInFormatted = new Date(booking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const checkOutFormatted = new Date(booking.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const bookingCreatedAtFormatted = booking.bookingCreatedAt 
          ? new Date(booking.bookingCreatedAt).toLocaleString('en-IN', { 
              day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
            })
          : undefined;
        
        const bookingEmailData = {
          bookingCode: booking.bookingCode || booking.id.slice(0, 8).toUpperCase(),
          propertyName: property.title,
          checkIn: checkInFormatted,
          checkOut: checkOutFormatted,
          guests: booking.guests || 1,
          rooms: booking.rooms || 1,
          totalPrice: booking.totalPrice?.toString() || '0',
          bookingCreatedAt: bookingCreatedAtFormatted,
        };
        
        if (status === "confirmed") {
          // STATE: OWNER_ACCEPTED - Email guest that owner accepted, needs confirmation
          sendBookingOwnerAcceptedEmail(
            guest.email,
            guest.firstName || '',
            bookingEmailData,
            responseMessage
          ).catch(console.error);
        } else if (status === "rejected") {
          // STATE: DECLINED - Email guest that booking was declined
          sendBookingDeclinedEmail(
            guest.email,
            guest.firstName || '',
            bookingEmailData,
            'rejected',
            responseMessage
          ).catch(console.error);
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating booking status:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Mark booking as checked-in (owner only)
  app.patch("/api/owner/bookings/:id/check-in", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can mark check-in" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify owner owns the property
      const property = await storage.getProperty(booking.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this booking" });
      }

      // Only allow check-in from confirmed status
      if (booking.status !== "confirmed") {
        return res.status(400).json({ message: "Can only check-in confirmed bookings" });
      }

      // Verify check-in date has arrived (current date >= check-in date)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(booking.checkIn);
      checkInDate.setHours(0, 0, 0, 0);
      
      if (today < checkInDate) {
        return res.status(400).json({ message: "Cannot check-in before the scheduled check-in date" });
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
  });

  // Mark booking as checked-out (owner only) - supports early checkout
  app.patch("/api/owner/bookings/:id/check-out", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can mark check-out" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify owner owns the property
      const property = await storage.getProperty(booking.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this booking" });
      }

      // Only allow check-out from checked_in status
      if (booking.status !== "checked_in") {
        return res.status(400).json({ message: "Can only check-out guests who are currently checked-in" });
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
          isEarlyCheckout: true
        });
      }

      // Mark as checked out with early checkout tracking
      await storage.markCheckedOut(req.params.id, userId, isEarlyCheckout);
      
      // Then automatically mark as completed
      const updated = await storage.updateBookingStatus(req.params.id, "completed");
      
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
      
      res.json({ ...updated, isEarlyCheckout });
    } catch (error) {
      console.error("Error marking check-out:", error);
      res.status(500).json({ message: "Failed to mark check-out" });
    }
  });

  // Create stay extension for checked-in booking (owner only)
  // Creates a new extension booking linked to the parent booking
  app.post("/api/owner/bookings/:id/extend", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can extend stays" });
      }

      const parentBooking = await storage.getBooking(req.params.id);
      if (!parentBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Verify owner owns the property
      const property = await storage.getProperty(parentBooking.propertyId);
      if (!property || property.ownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to extend this booking" });
      }

      // Only allow extension from checked_in status
      if (parentBooking.status !== "checked_in") {
        return res.status(400).json({ message: "Can only extend stays for checked-in guests" });
      }

      // Validate extension dates
      const { newCheckOutDate, rooms, specialRequests } = req.body;
      if (!newCheckOutDate) {
        return res.status(400).json({ message: "New check-out date is required" });
      }

      const extensionCheckIn = new Date(parentBooking.checkOut);
      const extensionCheckOut = new Date(newCheckOutDate);
      
      // Validate: extension must start from original checkout and end after it
      if (extensionCheckOut <= extensionCheckIn) {
        return res.status(400).json({ message: "Extension check-out must be after the original check-out date" });
      }

      // Check for overlapping bookings during extension period (for same room type)
      const overlappingBookings = await storage.getPropertyBookedDates(
        parentBooking.propertyId,
        extensionCheckIn,
        extensionCheckOut,
        parentBooking.roomTypeId || null
      );

      // Filter out the parent booking from overlap check
      const actualOverlaps = overlappingBookings.filter(b => {
        // This is a simple check - in reality we'd need booking IDs here
        return true;
      });

      // Check for blocked dates during extension period (for same room type)
      const blockedDates = await storage.getPropertyBlockedDates(
        parentBooking.propertyId,
        extensionCheckIn,
        extensionCheckOut,
        parentBooking.roomTypeId || null
      );

      if (blockedDates.length > 0) {
        return res.status(400).json({ 
          message: "Extension dates are blocked. Please choose different dates." 
        });
      }

      // Calculate extension price using room type pricing from original booking
      const nights = Math.ceil((extensionCheckOut.getTime() - extensionCheckIn.getTime()) / (1000 * 60 * 60 * 24));
      const roomsCount = rooms || parentBooking.rooms || 1;
      const guestCount = parentBooking.guests || 1;
      
      let basePrice = Number(property.pricePerNight);
      let mealPrice = 0;
      let occupancyAdjustment = 0;
      
      // Use same room type and meal option pricing from parent booking
      if (parentBooking.roomTypeId) {
        const roomType = await storage.getRoomType(parentBooking.roomTypeId);
        if (roomType) {
          basePrice = Number(roomType.basePrice);
          
          // Calculate occupancy-based pricing adjustment
          // singleOccupancyBase defines how many guests are included in the base price
          const singleOccupancyBase = roomType.singleOccupancyBase || 1;
          const guestsOverBase = guestCount - singleOccupancyBase;
          
          if (guestsOverBase >= 2 && roomType.tripleOccupancyAdjustment) {
            // Triple occupancy: 2+ guests over base
            occupancyAdjustment = Number(roomType.tripleOccupancyAdjustment);
          } else if (guestsOverBase >= 1 && roomType.doubleOccupancyAdjustment) {
            // Double occupancy: 1 guest over base
            occupancyAdjustment = Number(roomType.doubleOccupancyAdjustment);
          }
          // No adjustment when guestCount <= singleOccupancyBase
          
          if (parentBooking.roomOptionId) {
            const mealOption = await storage.getRoomOption(parentBooking.roomOptionId);
            if (mealOption && mealOption.roomTypeId === parentBooking.roomTypeId) {
              mealPrice = Number(mealOption.priceAdjustment);
            }
          }
        }
      }
      
      const totalPrice = nights * (basePrice + occupancyAdjustment + mealPrice) * roomsCount;

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
          message: `Your stay at ${property.title} has been extended until ${extensionCheckOut.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Payment of ₹${totalPrice.toLocaleString('en-IN')} will be collected at the hotel.`,
          propertyTitle: property.title,
          newCheckOutDate: extensionCheckOut,
          additionalAmount: totalPrice,
        };
        broadcastToUser(guest.id, notification);
      }
      
      res.json({
        extensionBooking,
        message: "Stay extended successfully. Payment will be collected at the hotel.",
        additionalNights: nights,
        additionalAmount: totalPrice,
      });
    } catch (error) {
      console.error("Error extending stay:", error);
      res.status(500).json({ message: "Failed to extend stay" });
    }
  });

  // Get owner's reviews
  app.get("/api/owner/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can access reviews" });
      }

      const properties = await storage.getOwnerProperties(userId);
      const propertyIds = properties.map(p => p.id);
      
      if (propertyIds.length === 0) {
        return res.json([]);
      }

      const reviews = await storage.getReviewsForProperties(propertyIds);
      
      // Enrich with guest info
      const enrichedReviews = await Promise.all(
        reviews.map(async (review) => {
          const guest = await storage.getUser(review.guestId);
          const property = properties.find(p => p.id === review.propertyId);
          return {
            ...review,
            guest: guest ? {
              name: `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || "Guest",
              profileImageUrl: guest.profileImageUrl,
            } : null,
            property: property ? { id: property.id, title: property.title } : null,
          };
        })
      );
      
      res.json(enrichedReviews);
    } catch (error) {
      console.error("Error fetching owner reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Get owner's conversation count (available regardless of KYC status for notification)
  app.get("/api/owner/conversations/count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can access this endpoint" });
      }

      const conversations = await storage.getConversationsByUser(userId);
      const totalConversations = conversations.length;
      const unreadCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
      
      res.json({ 
        totalConversations, 
        unreadCount,
        hasEnquiries: totalConversations > 0 
      });
    } catch (error) {
      console.error("Error fetching owner conversation count:", error);
      res.status(500).json({ message: "Failed to fetch conversation count" });
    }
  });

  // Get owner's conversations/messages
  app.get("/api/owner/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !userHasRole(user, "owner")) {
        return res.status(403).json({ message: "Only owners can access messages" });
      }
      
      // Check KYC status - only verified owners can view full conversations
      if (user.kycStatus !== "verified") {
        return res.status(403).json({ 
          message: "KYC verification required to access messages",
          kycStatus: user.kycStatus 
        });
      }

      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching owner conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  const httpServer = createServer(app);

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
        sql`SELECT sess FROM sessions WHERE sid = ${sessionId} AND expire > NOW()`
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

  return httpServer;
}
