import { db } from "./db";
import { ownerAgreements } from "@shared/schema";
import { eq } from "drizzle-orm";

const initialOwnerAgreement = `ZECOHO – PROPERTY OWNER AGREEMENT

This Property Owner Agreement ("Agreement") is entered into between ZECOHO Technologies Pvt. Ltd. ("ZECOHO", "we", "us", or "our") and the property owner/hotelier ("Owner", "you", or "your") who registers on the ZECOHO platform.

1. DEFINITIONS

1.1 "Platform" means the ZECOHO website, mobile application, and related services.
1.2 "Property" means any hotel, resort, homestay, or accommodation listed by the Owner on the Platform.
1.3 "Guest" means any person who makes a booking through the Platform.
1.4 "Booking" means a reservation made by a Guest for accommodation at a Property.

2. ZERO COMMISSION MODEL

2.1 ZECOHO operates on a ZERO COMMISSION model. We do not charge any commission on bookings made through our Platform.
2.2 All payments received from Guests are transferred to the Owner after deducting only applicable payment gateway charges.
2.3 ZECOHO reserves the right to introduce optional premium services for Owners in the future, which will be separately communicated.

3. OWNER OBLIGATIONS

3.1 Accurate Information: Owner agrees to provide accurate, complete, and up-to-date information about the Property, including but not limited to:
   - Property description and amenities
   - Room types, availability, and pricing
   - Images and photographs
   - Location and contact details
   - Policies (check-in/check-out times, cancellation policy, house rules)

3.2 Compliance with Laws: Owner shall ensure that the Property complies with all applicable local, state, and national laws, including but not limited to:
   - Licensing and registration requirements
   - Fire safety regulations
   - Health and hygiene standards
   - Tax obligations

3.3 Guest Treatment: Owner shall treat all Guests fairly and without discrimination based on race, religion, gender, nationality, or any other protected characteristic.

3.4 Booking Fulfillment: Owner agrees to honor all confirmed bookings and provide the accommodation as described on the Platform.

3.5 KYC Compliance: Owner must complete the Know Your Customer (KYC) verification process before listing Properties on the Platform.

4. ZECOHO'S ROLE

4.1 Platform Provider: ZECOHO provides a technology platform that connects Owners with Guests. ZECOHO is not a party to any booking transaction.

4.2 No Liability for Guest Actions: ZECOHO is not liable for any damage caused by Guests to the Property or any disputes between Owner and Guest.

4.3 Content Moderation: ZECOHO reserves the right to review, modify, or remove any Property listing that violates our policies or applicable laws.

5. PRICING AND PAYMENTS

5.1 Owner shall set their own prices for accommodations listed on the Platform.
5.2 ZECOHO displays the prices set by the Owner without any markup.
5.3 Payment processing is handled through secure third-party payment gateways.
5.4 Settlement of payments to Owners will be done as per the payment terms communicated separately.

6. CANCELLATION AND REFUNDS

6.1 Owner shall define clear cancellation policies for their Property.
6.2 In case of cancellation by the Guest, refunds will be processed as per the Owner's stated cancellation policy.
6.3 In case of cancellation by the Owner, a full refund will be provided to the Guest.

7. INTELLECTUAL PROPERTY

7.1 Owner grants ZECOHO a non-exclusive, royalty-free license to use Property images, descriptions, and other content for the purpose of listing and promoting the Property on the Platform.
7.2 ZECOHO's trademarks, logos, and branding remain the exclusive property of ZECOHO.

8. CONFIDENTIALITY

8.1 Both parties agree to keep confidential any proprietary or sensitive information shared during the course of this Agreement.

9. TERMINATION

9.1 Either party may terminate this Agreement with written notice.
9.2 Upon termination, all pending bookings must be honored by the Owner.
9.3 ZECOHO may suspend or terminate an Owner's account for violation of this Agreement or Platform policies.

10. LIMITATION OF LIABILITY

10.1 ZECOHO shall not be liable for any indirect, incidental, or consequential damages arising from the use of the Platform.
10.2 ZECOHO's total liability shall not exceed the amount of payments processed through the Platform in the last 12 months.

11. INDEMNIFICATION

11.1 Owner agrees to indemnify and hold harmless ZECOHO from any claims, damages, or expenses arising from the Owner's breach of this Agreement or violation of applicable laws.

12. DISPUTE RESOLUTION

12.1 Any disputes arising from this Agreement shall be resolved through arbitration in accordance with the Arbitration and Conciliation Act, 1996.
12.2 The seat of arbitration shall be [City], India.

13. GOVERNING LAW

13.1 This Agreement shall be governed by and construed in accordance with the laws of India.

14. AMENDMENTS

14.1 ZECOHO reserves the right to amend this Agreement at any time. Owners will be notified of any changes and continued use of the Platform constitutes acceptance of the amended terms.

15. CONTACT

For any questions regarding this Agreement, please contact:
Email: owners@zecoho.com

By accepting this Agreement, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.`;

export async function seedOwnerAgreement() {
  try {
    // Check if any owner agreement exists
    const existing = await db.select().from(ownerAgreements).limit(1);
    
    if (existing.length > 0) {
      console.log("Owner agreement already exists, skipping seed");
      return null;
    }

    // Create the initial owner agreement
    const [agreement] = await db
      .insert(ownerAgreements)
      .values({
        version: 1,
        title: "ZECOHO – Property Owner Agreement",
        content: initialOwnerAgreement,
        status: "published",
        publishedAt: new Date(),
        createdBy: "system",
      })
      .returning();

    console.log("Seeded initial owner agreement, version:", agreement.version);
    return agreement;
  } catch (error) {
    console.error("Error seeding owner agreement:", error);
    throw error;
  }
}
