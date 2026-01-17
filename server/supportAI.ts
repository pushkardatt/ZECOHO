// AI Support Service - Rule-based FAQ system with escalation logic
// This provides automated responses for common questions without external AI API

interface FAQEntry {
  keywords: string[];
  intent: string;
  response: string;
  category: 'faq' | 'policy' | 'booking' | 'onboarding' | 'general';
}

interface AIResponse {
  message: string;
  intent: string;
  confidence: number;
  shouldEscalate: boolean;
  escalationReason?: string;
}

// Escalation trigger keywords
const ESCALATION_TRIGGERS = {
  humanRequest: ['talk to human', 'speak to agent', 'real person', 'customer service', 'support agent', 'call me', 'speak to someone'],
  refund: ['refund', 'money back', 'cancel booking', 'get refund', 'refund policy', 'full refund', 'partial refund'],
  legal: ['legal', 'lawyer', 'court', 'sue', 'lawsuit', 'consumer court', 'complaint'],
  fraud: ['fraud', 'scam', 'fake', 'cheated', 'stolen', 'unauthorized'],
  urgent: ['urgent', 'emergency', 'immediately', 'asap', 'right now'],
};

// FAQ knowledge base
const FAQ_DATABASE: FAQEntry[] = [
  // Zero Commission & Pricing
  {
    keywords: ['commission', 'zero commission', 'no commission', 'free', 'fees'],
    intent: 'commission_info',
    category: 'faq',
    response: `ZECOHO is India's first ZERO commission hotel booking platform. We don't charge hotels any commission, which means they can offer you better prices - typically 15-25% lower than other booking platforms. You pay only the room price with no hidden fees or service charges.`
  },
  {
    keywords: ['cheaper', 'price', 'save', 'discount', 'lower price', 'best price'],
    intent: 'pricing_info',
    category: 'faq',
    response: `Because we don't charge hotels any commission (unlike other platforms that charge 15-25%), hotels can offer you their best direct prices. You typically save ₹500-₹1500 per night compared to other booking websites. The price you see is the price you pay - no hidden fees!`
  },
  {
    keywords: ['how does zecoho work', 'how it works', 'what is zecoho', 'about zecoho'],
    intent: 'about_zecoho',
    category: 'faq',
    response: `ZECOHO connects you directly with hotels without any middleman fees. Here's how it works:\n\n1. Search for your destination and dates\n2. Compare verified properties at true prices\n3. Book directly - hotels keep 100% of what you pay\n4. Enjoy your stay with direct hotel support\n\nThis direct connection means better prices for you and fair earnings for hotels.`
  },
  
  // Booking related
  {
    keywords: ['book', 'booking', 'reserve', 'reservation', 'how to book'],
    intent: 'booking_help',
    category: 'booking',
    response: `To make a booking on ZECOHO:\n\n1. Search for your destination and travel dates\n2. Browse available properties and select one you like\n3. Choose your room type and meal plan\n4. Click "Book Now" and fill in guest details\n5. Complete payment to confirm your booking\n\nYou'll receive a confirmation email with all booking details. You can view your bookings anytime in "My Bookings" section.`
  },
  {
    keywords: ['cancel', 'cancellation', 'cancel booking'],
    intent: 'cancellation_info',
    category: 'policy',
    response: `Cancellation policies vary by property. Each property sets their own policy which can be:\n\n• **Flexible**: Full refund if cancelled within the free cancellation window\n• **Moderate**: Partial refund based on timing\n• **Strict**: Limited refund options\n\nYou can view the specific cancellation policy on the property page under "Things to Know" before booking. For cancellation requests, please go to "My Bookings" and click on the booking you want to cancel.`
  },
  {
    keywords: ['check in', 'check out', 'checkin', 'checkout', 'timing'],
    intent: 'checkin_info',
    category: 'booking',
    response: `Check-in and check-out times are set by each property. Typically:\n\n• Check-in: 12:00 PM - 2:00 PM onwards\n• Check-out: 10:00 AM - 12:00 PM\n\nYou can find exact timings on the property details page. For early check-in or late check-out requests, please contact the property directly through our messaging feature.`
  },
  {
    keywords: ['payment', 'pay', 'payment method', 'how to pay'],
    intent: 'payment_info',
    category: 'booking',
    response: `We accept various payment methods including:\n\n• Credit/Debit Cards (Visa, Mastercard, RuPay)\n• UPI payments\n• Net Banking\n• Wallet payments\n\nAll payments are processed securely. Your payment details are encrypted and never stored on our servers.`
  },
  {
    keywords: ['modify', 'change booking', 'change dates', 'update booking'],
    intent: 'modify_booking',
    category: 'booking',
    response: `To modify an existing booking, please follow these steps:\n\n1. Go to "My Bookings" in your account\n2. Find the booking you want to modify\n3. Contact the property directly through the chat feature\n\nModification requests are subject to availability and the property's policies. For significant changes, you may need to cancel and rebook.`
  },
  
  // Owner/Hotelier related
  {
    keywords: ['list property', 'become host', 'register hotel', 'add property', 'hotelier'],
    intent: 'owner_onboarding',
    category: 'onboarding',
    response: `Welcome! To list your property on ZECOHO:\n\n1. Click "Own a Property" in the header\n2. Complete the registration with your details\n3. Submit KYC documents for verification\n4. Add your property details, photos, and pricing\n5. Once verified, your property goes live!\n\nRemember: ZECOHO charges 0% commission - you keep 100% of your earnings. We only provide the platform to connect you with guests.`
  },
  {
    keywords: ['kyc', 'verification', 'documents', 'verify'],
    intent: 'kyc_info',
    category: 'onboarding',
    response: `KYC verification helps us ensure all properties are legitimate and safe. Required documents include:\n\n• Identity Proof (Aadhaar, Passport, etc.)\n• Property Ownership documents\n• Business registration (if applicable)\n• Safety certificates\n\nVerification typically takes 1-3 business days. You can track your KYC status in the Owner Dashboard.`
  },
  
  // Account related
  {
    keywords: ['login', 'sign in', 'account', 'password', 'forgot password'],
    intent: 'account_help',
    category: 'general',
    response: `For account-related help:\n\n• **Login issues**: Use the "Forgot Password" link on the login page\n• **Create account**: Click "Login" and choose to sign up\n• **Update profile**: Go to your Profile page after logging in\n\nIf you're having persistent login issues, please let me know and I can escalate to our support team.`
  },
  
  // Contact & Support
  {
    keywords: ['contact', 'phone', 'email', 'reach', 'support'],
    intent: 'contact_info',
    category: 'general',
    response: `You can reach ZECOHO support through:\n\n• This chat support (available 24/7)\n• Email: support@zecoho.com\n• Visit our Contact Us page for department-specific contacts\n\nFor urgent booking issues, I can escalate your concern to our support team right away. Would you like me to do that?`
  },
  
  // Policies
  {
    keywords: ['terms', 'conditions', 'policy', 'privacy', 'rules'],
    intent: 'policy_info',
    category: 'policy',
    response: `You can find all our policies on our website:\n\n• **Terms & Conditions**: /terms\n• **Privacy Policy**: /privacy\n• **Owner Agreement**: /owner-agreement\n\nThese documents explain how we handle your data, booking terms, and our service agreements. Is there a specific policy question I can help with?`
  },
];

// Quick action buttons for the chat
export const QUICK_ACTIONS = [
  { id: 'booking_help', label: 'Help with Booking', icon: 'Calendar' },
  { id: 'pricing_info', label: 'Why are prices lower?', icon: 'BadgePercent' },
  { id: 'cancellation_info', label: 'Cancellation Policy', icon: 'XCircle' },
  { id: 'contact_info', label: 'Contact Support', icon: 'Phone' },
];

// Generate AI greeting message
export function getGreetingMessage(userName?: string): string {
  const greeting = userName ? `Hello ${userName}!` : 'Hello!';
  return `${greeting} Welcome to ZECOHO Support. I'm here to help you with:\n\n• Booking questions\n• Understanding our zero-commission model\n• Cancellation policies\n• Account help\n\nHow can I assist you today?`;
}

// Check if message should trigger escalation
function checkEscalationTriggers(message: string): { shouldEscalate: boolean; reason?: string } {
  const lowerMessage = message.toLowerCase();
  
  for (const [category, keywords] of Object.entries(ESCALATION_TRIGGERS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          shouldEscalate: true,
          reason: `User mentioned: "${keyword}" (${category})`,
        };
      }
    }
  }
  
  return { shouldEscalate: false };
}

// Find best matching FAQ entry
function findBestMatch(message: string): { entry: FAQEntry | null; confidence: number } {
  const lowerMessage = message.toLowerCase();
  let bestMatch: FAQEntry | null = null;
  let highestScore = 0;
  
  for (const entry of FAQ_DATABASE) {
    let score = 0;
    let matchedKeywords = 0;
    
    for (const keyword of entry.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matchedKeywords++;
        // Longer keyword matches are more specific
        score += keyword.length;
      }
    }
    
    if (matchedKeywords > 0) {
      // Normalize score based on how many keywords matched
      const normalizedScore = (matchedKeywords / entry.keywords.length) * score;
      if (normalizedScore > highestScore) {
        highestScore = normalizedScore;
        bestMatch = entry;
      }
    }
  }
  
  // Calculate confidence (0-1)
  const confidence = bestMatch ? Math.min(highestScore / 50, 1) : 0;
  
  return { entry: bestMatch, confidence };
}

// Process user message and generate AI response
export function processMessage(message: string): AIResponse {
  // First check for escalation triggers
  const escalationCheck = checkEscalationTriggers(message);
  if (escalationCheck.shouldEscalate) {
    return {
      message: `I understand this is an important matter. Let me connect you with our support team who can better assist you with this.\n\nA support ticket has been created and a team member will join this conversation shortly. In the meantime, please provide any additional details that might help us resolve your concern faster.`,
      intent: 'escalation',
      confidence: 1,
      shouldEscalate: true,
      escalationReason: escalationCheck.reason,
    };
  }
  
  // Find matching FAQ
  const { entry, confidence } = findBestMatch(message);
  
  // Low confidence - offer to escalate
  if (confidence < 0.3 || !entry) {
    return {
      message: `I'm not quite sure I understand your question. Here are some things I can help with:\n\n• Booking and reservation help\n• Understanding our zero-commission pricing\n• Cancellation and refund policies\n• Property listing for hoteliers\n• Account and login issues\n\nCould you please rephrase your question, or would you like me to connect you with a support agent?`,
      intent: 'unclear',
      confidence: confidence,
      shouldEscalate: false,
    };
  }
  
  return {
    message: entry.response,
    intent: entry.intent,
    confidence: confidence,
    shouldEscalate: false,
  };
}

// Get response for quick action
export function processQuickAction(actionId: string): AIResponse {
  const entry = FAQ_DATABASE.find(e => e.intent === actionId);
  
  if (entry) {
    return {
      message: entry.response,
      intent: entry.intent,
      confidence: 1,
      shouldEscalate: false,
    };
  }
  
  return {
    message: "I'll help you with that. Could you please provide more details about what you need?",
    intent: 'unknown_action',
    confidence: 0.5,
    shouldEscalate: false,
  };
}

// Generate ticket number
export function generateTicketNumber(): string {
  const prefix = 'ZS';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, 12);
}
