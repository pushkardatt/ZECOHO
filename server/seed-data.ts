import { db } from "./db";
import { users, properties, amenities, propertyAmenities, wishlists, bookings } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedData() {
  console.log("Starting data seeding...");

  try {
    // Create sample users
    console.log("Creating sample users...");
    
    const owner1Id = "owner-1";
    const owner2Id = "owner-2";
    const owner3Id = "owner-3";
    const guest1Id = "guest-1";
    const guest2Id = "guest-2";

    await db.insert(users).values([
      {
        id: owner1Id,
        email: "sarah.owner@example.com",
        firstName: "Sarah",
        lastName: "Anderson",
        userRole: "owner",
        phone: "+91-9876543210",
        kycAddress: "123 Marina Street, Mumbai, Maharashtra 400001, India",
        governmentIdType: "Aadhaar",
        governmentIdNumber: "1234-5678-9012",
        kycStatus: "verified",
        kycVerifiedAt: new Date("2024-01-15"),
      },
      {
        id: owner2Id,
        email: "michael.owner@example.com",
        firstName: "Michael",
        lastName: "Chen",
        userRole: "owner",
        phone: "+91-9876543211",
        kycAddress: "456 Park Avenue, Bangalore, Karnataka 560001, India",
        governmentIdType: "Passport",
        governmentIdNumber: "P1234567",
        kycStatus: "verified",
        kycVerifiedAt: new Date("2024-02-20"),
      },
      {
        id: owner3Id,
        email: "elena.owner@example.com",
        firstName: "Elena",
        lastName: "Rodriguez",
        userRole: "owner",
        phone: "+91-9876543212",
        kycAddress: "789 Lake Road, Delhi, Delhi 110001, India",
        governmentIdType: "Aadhaar",
        governmentIdNumber: "9876-5432-1098",
        kycStatus: "verified",
        kycVerifiedAt: new Date("2024-03-10"),
      },
      {
        id: guest1Id,
        email: "john.guest@example.com",
        firstName: "John",
        lastName: "Smith",
        userRole: "guest",
      },
      {
        id: guest2Id,
        email: "emma.guest@example.com",
        firstName: "Emma",
        lastName: "Wilson",
        userRole: "guest",
      },
    ]).onConflictDoNothing();

    console.log("Users created successfully");

    // Get all amenities
    const allAmenities = await db.select().from(amenities);
    const amenityMap = Object.fromEntries(allAmenities.map(a => [a.name, a.id]));

    // Create sample properties
    console.log("Creating sample properties...");

    const propertiesData = [
      {
        title: "Beachfront Villa in Goa",
        description: "Stunning beachfront villa in North Goa with direct access to pristine beaches. Features a private pool, modern amenities, and panoramic ocean views. Perfect for families or groups looking for a luxurious beach getaway. Walking distance to beach shacks, restaurants, and water sports activities.",
        propertyType: "villa",
        destination: "Goa",
        pricePerNight: "35550", // ₹35,550/night (~$400)
        maxGuests: 8,
        bedrooms: 4,
        bathrooms: 3,
        images: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9"],
        ownerId: owner1Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Pool"], amenityMap["Air conditioning"], amenityMap["Beach access"], amenityMap["Kitchen"]],
      },
      {
        title: "Traditional Houseboat in Kerala",
        description: "Experience Kerala's backwaters aboard a traditional houseboat with all modern comforts. Private chef prepares authentic Kerala cuisine, air-conditioned bedrooms, and sundeck for panoramic views. Cruise through serene backwaters, witness village life, and enjoy unforgettable sunsets.",
        propertyType: "cottage",
        destination: "Kerala",
        pricePerNight: "26775", // ₹26,775/night (~$300)
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 2,
        images: ["https://images.unsplash.com/photo-1602002418082-a4443e081dd1"],
        ownerId: owner2Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Air conditioning"], amenityMap["Washer"]],
      },
      {
        title: "Mountain Resort in Ladakh",
        description: "Eco-friendly mountain resort offering breathtaking views of the Himalayas and Indus Valley. Spacious rooms with traditional Ladakhi architecture, modern heating systems, and organic farm-to-table dining. Perfect base for exploring monasteries, trekking, and experiencing high-altitude desert landscapes.",
        propertyType: "resort",
        destination: "Ladakh",
        pricePerNight: "22240", // ₹22,240/night (~$250)
        maxGuests: 6,
        bedrooms: 3,
        bathrooms: 2,
        images: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d"],
        ownerId: owner3Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Heating"], amenityMap["Gym"], amenityMap["Dedicated workspace"]],
      },
      {
        title: "Charming Parisian Loft",
        description: "Experience authentic Parisian living in this beautifully renovated loft in the heart of Le Marais. Features exposed brick walls, original wooden beams, and floor-to-ceiling windows overlooking a quiet courtyard. Walking distance to Notre-Dame, the Louvre, and countless cafes and bistros.",
        propertyType: "apartment",
        destination: "Paris, France",
        pricePerNight: "16465",
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800"],
        ownerId: owner1Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Heating"]],
      },
      {
        title: "Modern Tokyo Studio",
        description: "Sleek and minimalist studio apartment in vibrant Shibuya district. Perfect for solo travelers or couples. Enjoy city views from the 15th floor, lightning-fast WiFi, and easy access to metro stations. Walking distance to Shibuya Crossing, trendy restaurants, and shopping.",
        propertyType: "apartment",
        destination: "Tokyo, Japan",
        pricePerNight: "10680",
        maxGuests: 2,
        bedrooms: 1,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800"],
        ownerId: owner2Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Air conditioning"], amenityMap["TV"], amenityMap["Washer"]],
      },
      {
        title: "Luxury Bali Villa with Pool",
        description: "Stunning private villa nestled in the rice terraces of Ubud. Features infinity pool, outdoor shower, traditional Balinese architecture with modern amenities. Includes daily housekeeping and optional breakfast service. Perfect for couples seeking tranquility and luxury.",
        propertyType: "villa",
        destination: "Ubud, Bali",
        pricePerNight: "26255",
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 2,
        images: ["https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800"],
        ownerId: owner1Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Pool"], amenityMap["Air conditioning"], amenityMap["Kitchen"], amenityMap["Free parking"]],
      },
      {
        title: "Brooklyn Industrial Loft",
        description: "Spacious converted warehouse loft in trendy Williamsburg. High ceilings, exposed brick, modern kitchen with stainless steel appliances. Great for families or groups. Easy subway access to Manhattan. Rooftop terrace with Manhattan skyline views.",
        propertyType: "apartment",
        destination: "New York, USA",
        pricePerNight: "20025",
        maxGuests: 6,
        bedrooms: 3,
        bathrooms: 2,
        images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"],
        ownerId: owner3Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Heating"], amenityMap["Washer"], amenityMap["TV"]],
      },
      {
        title: "Beachfront Hostel in Malibu",
        description: "Wake up to ocean views in this cozy beachfront hostel. Direct beach access, outdoor deck perfect for sunset watching, fully equipped kitchen. Ideal for couples or small families. Surfboards available. Close to Malibu Pier and celebrity restaurants.",
        propertyType: "hostel",
        destination: "Malibu, California",
        pricePerNight: "28480",
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800"],
        ownerId: owner2Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Free parking"], amenityMap["Heating"], amenityMap["Beach access"]],
      },
      {
        title: "Barcelona Gothic Quarter Apartment",
        description: "Historic apartment in the heart of Barcelona's Gothic Quarter. Original mosaic floors, high ceilings, balcony overlooking narrow medieval streets. Walking distance to Las Ramblas, the beach, and countless tapas bars. Experience authentic Barcelona living.",
        propertyType: "apartment",
        destination: "Barcelona, Spain",
        pricePerNight: "14685",
        maxGuests: 3,
        bedrooms: 1,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1562438668-bcf0ca6578f0?w=800"],
        ownerId: owner1Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Air conditioning"], amenityMap["Heating"]],
      },
      {
        title: "Swiss Alpine Chalet",
        description: "Traditional wooden chalet with breathtaking mountain views in Zermatt. Ski-in/ski-out access, wood-burning fireplace, sauna. Sleeps up to 8 guests across 4 bedrooms. Perfect for winter ski trips or summer hiking adventures. Minutes from Matterhorn viewpoints.",
        propertyType: "lodge",
        destination: "Zermatt, Switzerland",
        pricePerNight: "40050",
        maxGuests: 8,
        bedrooms: 4,
        bathrooms: 3,
        images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"],
        ownerId: owner3Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Heating"], amenityMap["Free parking"]],
      },
      {
        title: "Santorini Cave House",
        description: "Authentic whitewashed cave house carved into the caldera cliffs of Oia. Private terrace with hot tub and sunset views over the Aegean Sea. Traditional Cycladic architecture meets modern comfort. Includes welcome basket with local wine and cheese.",
        propertyType: "villa",
        destination: "Santorini, Greece",
        pricePerNight: "33820",
        maxGuests: 2,
        bedrooms: 1,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"],
        ownerId: owner2Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Air conditioning"], amenityMap["Hot tub"]],
      },
      {
        title: "Dubai Marina Penthouse",
        description: "Ultra-modern penthouse with panoramic views of Dubai Marina and the Persian Gulf. Floor-to-ceiling windows, designer furniture, state-of-the-art kitchen. Building amenities include pool, gym, and 24/7 concierge. Minutes from JBR Beach and Dubai Mall.",
        propertyType: "apartment",
        destination: "Dubai, UAE",
        pricePerNight: "46280",
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 2,
        images: ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800"],
        ownerId: owner1Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Air conditioning"], amenityMap["Pool"], amenityMap["Gym"], amenityMap["Kitchen"]],
      },
      {
        title: "Scottish Highland Cottage",
        description: "Remote stone cottage on the shores of Loch Ness. Complete privacy surrounded by heather-covered hills. Wood-burning stove, traditional decor, modern kitchen. Perfect for writers, artists, or anyone seeking peaceful retreat. Wildlife spotting opportunities.",
        propertyType: "cottage",
        destination: "Scottish Highlands, UK",
        pricePerNight: "12905",
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1505916349660-8d91a99c3e23?w=800"],
        ownerId: owner3Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Heating"], amenityMap["Free parking"]],
      },
      {
        title: "Thai Beachfront Resort Villa",
        description: "Luxurious villa in exclusive resort on Phuket's pristine Kata Beach. Private pool, direct beach access, daily housekeeping. Resort amenities include spa, restaurants, water sports. Perfect for families or groups seeking tropical paradise with 5-star service.",
        propertyType: "resort",
        destination: "Phuket, Thailand",
        pricePerNight: "37825",
        maxGuests: 6,
        bedrooms: 3,
        bathrooms: 3,
        images: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800"],
        ownerId: owner2Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Pool"], amenityMap["Air conditioning"], amenityMap["Beach access"], amenityMap["Gym"]],
      },
      {
        title: "Amsterdam Canal House",
        description: "Historic 17th-century canal house with original features including steep Dutch stairs and large windows overlooking Prinsengracht. Modern renovations maintain authentic charm. Central location near Anne Frank House and Jordaan neighborhood. Bikes included.",
        propertyType: "apartment",
        destination: "Amsterdam, Netherlands",
        pricePerNight: "17355",
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800"],
        ownerId: owner1Id,
        status: "published",
        amenityIds: [amenityMap["Wifi"], amenityMap["Kitchen"], amenityMap["Heating"], amenityMap["Washer"]],
      },
    ];

    const createdProperties = [];
    for (const propData of propertiesData) {
      const { amenityIds, ...propertyData } = propData;
      const [property] = await db.insert(properties).values(propertyData).returning();
      createdProperties.push(property);

      // Add amenities to property
      if (amenityIds && amenityIds.length > 0) {
        const propertyAmenityValues = amenityIds.map(amenityId => ({
          propertyId: property.id,
          amenityId,
        }));
        await db.insert(propertyAmenities).values(propertyAmenityValues).onConflictDoNothing();
      }
    }

    console.log(`Created ${createdProperties.length} properties with amenities`);

    // Create sample wishlists
    console.log("Creating sample wishlists...");
    await db.insert(wishlists).values([
      {
        userId: guest1Id,
        propertyId: createdProperties[0].id, // Parisian Loft
      },
      {
        userId: guest1Id,
        propertyId: createdProperties[2].id, // Bali Villa
      },
      {
        userId: guest1Id,
        propertyId: createdProperties[7].id, // Santorini Cave House
      },
      {
        userId: guest2Id,
        propertyId: createdProperties[1].id, // Tokyo Studio
      },
      {
        userId: guest2Id,
        propertyId: createdProperties[4].id, // Malibu Cabin
      },
    ]).onConflictDoNothing();

    console.log("Wishlists created successfully");

    // Create sample bookings
    console.log("Creating sample bookings...");
    
    // Past booking (completed)
    const pastCheckIn = new Date();
    pastCheckIn.setDate(pastCheckIn.getDate() - 20);
    const pastCheckOut = new Date();
    pastCheckOut.setDate(pastCheckOut.getDate() - 15);

    // Upcoming booking (confirmed)
    const upcomingCheckIn = new Date();
    upcomingCheckIn.setDate(upcomingCheckIn.getDate() + 10);
    const upcomingCheckOut = new Date();
    upcomingCheckOut.setDate(upcomingCheckOut.getDate() + 15);

    // Another upcoming booking (pending)
    const upcoming2CheckIn = new Date();
    upcoming2CheckIn.setDate(upcoming2CheckIn.getDate() + 25);
    const upcoming2CheckOut = new Date();
    upcoming2CheckOut.setDate(upcoming2CheckOut.getDate() + 30);

    await db.insert(bookings).values([
      {
        propertyId: createdProperties[0].id, // Parisian Loft
        guestId: guest1Id,
        checkIn: pastCheckIn,
        checkOut: pastCheckOut,
        guests: 2,
        totalPrice: "82325", // 5 nights * ₹16,465
        status: "completed",
      },
      {
        propertyId: createdProperties[2].id, // Bali Villa
        guestId: guest1Id,
        checkIn: upcomingCheckIn,
        checkOut: upcomingCheckOut,
        guests: 2,
        totalPrice: "131275", // 5 nights * ₹26,255
        status: "confirmed",
      },
      {
        propertyId: createdProperties[4].id, // Malibu Cabin
        guestId: guest2Id,
        checkIn: upcoming2CheckIn,
        checkOut: upcoming2CheckOut,
        guests: 3,
        totalPrice: "142400", // 5 nights * ₹28,480
        status: "pending",
      },
    ]).onConflictDoNothing();

    console.log("Bookings created successfully");

    console.log("\n✅ Data seeding completed successfully!");
    console.log("\nSample accounts:");
    console.log("Owners:");
    console.log("  - sarah.owner@example.com (owns Parisian Loft, Bali Villa, etc.)");
    console.log("  - michael.owner@example.com (owns Tokyo Studio, Malibu Cabin, etc.)");
    console.log("  - elena.owner@example.com (owns Brooklyn Loft, Swiss Chalet, etc.)");
    console.log("\nGuests:");
    console.log("  - john.guest@example.com (has wishlists and bookings)");
    console.log("  - emma.guest@example.com (has wishlists and bookings)");

  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
}

export { seedData };
