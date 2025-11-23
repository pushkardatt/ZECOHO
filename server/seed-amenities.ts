import { storage } from "./storage";

const amenitiesData = [
  // Essential Amenities
  { name: "Wifi", icon: "Wifi", category: "essential" },
  { name: "Free parking", icon: "Car", category: "essential" },
  { name: "Kitchen", icon: "Coffee", category: "essential" },
  { name: "Air conditioning", icon: "Wind", category: "essential" },
  { name: "Heating", icon: "Flame", category: "essential" },
  { name: "TV", icon: "Tv", category: "essential" },
  
  // Bathroom Amenities
  { name: "Washer", icon: "WashingMachine", category: "bathroom" },
  { name: "Dryer", icon: "Wind", category: "bathroom" },
  { name: "Hair dryer", icon: "Zap", category: "bathroom" },
  { name: "Hot water", icon: "Droplets", category: "bathroom" },
  
  // Outdoor & Recreation
  { name: "Pool", icon: "Waves", category: "outdoor" },
  { name: "Hot tub", icon: "Bath", category: "outdoor" },
  { name: "BBQ grill", icon: "Flame", category: "outdoor" },
  { name: "Garden", icon: "Flower", category: "outdoor" },
  { name: "Patio", icon: "Armchair", category: "outdoor" },
  { name: "Balcony", icon: "Building", category: "outdoor" },
  
  // Safety & Security
  { name: "Smoke alarm", icon: "Shield", category: "safety" },
  { name: "Carbon monoxide alarm", icon: "Shield", category: "safety" },
  { name: "Fire extinguisher", icon: "Shield", category: "safety" },
  { name: "First aid kit", icon: "Heart", category: "safety" },
  { name: "Security cameras", icon: "Camera", category: "safety" },
  
  // Family & Accessibility
  { name: "Crib", icon: "Baby", category: "family" },
  { name: "High chair", icon: "Armchair", category: "family" },
  { name: "Wheelchair accessible", icon: "Accessibility", category: "accessibility" },
  { name: "Elevator", icon: "ArrowUp", category: "accessibility" },
  
  // Entertainment
  { name: "Game console", icon: "Gamepad", category: "entertainment" },
  { name: "Board games", icon: "Puzzle", category: "entertainment" },
  { name: "Books", icon: "Book", category: "entertainment" },
  
  // Work & Communication
  { name: "Dedicated workspace", icon: "Laptop", category: "work" },
  { name: "Printer", icon: "Printer", category: "work" },
  
  // Services
  { name: "Gym", icon: "Dumbbell", category: "services" },
  { name: "Beach access", icon: "Waves", category: "services" },
  { name: "Lake access", icon: "Waves", category: "services" },
  { name: "Ski-in/Ski-out", icon: "Mountain", category: "services" },
  { name: "Breakfast included", icon: "Coffee", category: "services" },
  { name: "24/7 reception", icon: "Clock", category: "services" },
  { name: "Room service", icon: "UtensilsCrossed", category: "services" },
  { name: "Pet friendly", icon: "Dog", category: "services" },
];

async function seedAmenities() {
  console.log("Seeding amenities...");
  
  try {
    // Bulk insert with ON CONFLICT DO NOTHING to handle duplicates gracefully
    await storage.createAmenitiesIgnoreDuplicates(amenitiesData);
    
    // Get final count to report
    const existing = await storage.getAllAmenities();
    console.log(`Amenities available: ${existing.length}`);
  } catch (error) {
    console.error("Error seeding amenities:", error);
    // Don't throw - allow app to continue even if seeding fails
  }
}

export { seedAmenities };
