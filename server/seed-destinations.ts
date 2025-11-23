import { storage } from "./storage";

const destinationsData = [
  {
    name: "Goa",
    state: "Goa",
    shortDescription: "Golden beaches, Portuguese heritage, and vibrant nightlife on India's western coast",
    detailedInsight: "Goa offers a perfect blend of sun, sand, and culture. Famous for its pristine beaches like Calangute, Baga, and Palolem, Goa is India's beach paradise. The region's Portuguese colonial past is evident in its baroque architecture, spice plantations, and unique cuisine. Beyond beaches, visitors can explore ancient churches, lush spice plantations, and experience eco-tourism in the monsoon season when the landscape transforms into a verdant paradise.",
    highlights: [
      "Calangute and Baga beaches for water sports",
      "Portuguese colonial architecture in Old Goa",
      "Spice plantation tours",
      "Vibrant nightlife and beach shacks",
      "Dudhsagar Waterfalls"
    ],
    imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800",
    bestSeason: "November to March",
    isFeatured: true,
    featuredDate: new Date(),
  },
  {
    name: "Kerala",
    state: "Kerala",
    shortDescription: "God's Own Country with serene backwaters, lush tea estates, and pristine beaches",
    detailedInsight: "Kerala, known as 'God's Own Country', is a tropical paradise in southern India. The state's famous backwaters offer unique houseboat experiences through tranquil canals lined with coconut palms. Munnar's sprawling tea estates provide breathtaking mountain views, while Varkala and Kovalam offer stunning beaches. Kerala's rich culture includes Kathakali dance, Ayurvedic wellness traditions, and delicious cuisine featuring coconut and spices.",
    highlights: [
      "Alleppey backwater houseboat cruises",
      "Munnar tea plantations and hill station",
      "Varkala and Kovalam beaches",
      "Traditional Ayurvedic treatments",
      "Kochi's colonial heritage"
    ],
    imageUrl: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800",
    bestSeason: "October to March",
    isFeatured: true,
    featuredDate: new Date(),
  },
  {
    name: "Ladakh",
    state: "Ladakh",
    shortDescription: "High-altitude desert with stunning lakes, Buddhist monasteries, and rugged Himalayan landscapes",
    detailedInsight: "Ladakh is a land of high passes and ethereal beauty in the northernmost reaches of India. The region's stark, moon-like landscapes contrast dramatically with azure lakes like Pangong Tso and Tso Moriri. Ancient Buddhist monasteries perch on hillsides, offering spiritual retreats and incredible views. The Nubra Valley's sand dunes, accessible via the world's highest motorable pass, Khardung La, provide a unique desert experience at 18,000 feet.",
    highlights: [
      "Pangong Lake's changing colors",
      "Nubra Valley sand dunes and camels",
      "Ancient Buddhist monasteries",
      "Khardung La - world's highest motorable pass",
      "Adventure biking on mountain roads"
    ],
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    bestSeason: "May to September",
    isFeatured: true,
    featuredDate: new Date(),
  },
  {
    name: "Jaipur",
    state: "Rajasthan",
    shortDescription: "The Pink City featuring magnificent forts, palaces, and royal heritage",
    detailedInsight: "Jaipur, Rajasthan's vibrant capital and part of the Golden Triangle, is a city steeped in royal history. The Pink City's iconic Hawa Mahal (Palace of Winds), the magnificent Amber Fort, and the opulent City Palace showcase Rajput architectural grandeur. Bustling bazaars in Johari and Bapu offer traditional handicrafts, jewelry, and textiles. The city comes alive during the annual Jaipur Literature Festival, attracting intellectuals from around the world.",
    highlights: [
      "Amber Fort's mirror palace",
      "Hawa Mahal (Palace of Winds)",
      "City Palace and royal museums",
      "Johari Bazaar for jewelry and textiles",
      "Jal Mahal (Water Palace)"
    ],
    imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800",
    bestSeason: "October to March",
    isFeatured: false,
  },
  {
    name: "Varanasi",
    state: "Uttar Pradesh",
    shortDescription: "Ancient spiritual city on the Ganges with sacred ghats and timeless rituals",
    detailedInsight: "Varanasi, one of the world's oldest continuously inhabited cities, is the spiritual heart of India. The city's 80-plus ghats along the Ganges River witness daily rituals, cremations, and the mesmerizing Ganga Aarti ceremony at Dashashwamedh Ghat. Narrow winding lanes lead to ancient temples, silk workshops, and traditional sweet shops. Witnessing sunrise from a boat on the Ganges offers a profound spiritual experience that has remained unchanged for millennia.",
    highlights: [
      "Ganga Aarti at Dashashwamedh Ghat",
      "Dawn boat ride on the Ganges",
      "Kashi Vishwanath Temple",
      "Exploring ancient narrow lanes",
      "Sarnath Buddhist site"
    ],
    imageUrl: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800",
    bestSeason: "October to March",
    isFeatured: false,
  },
  {
    name: "Rishikesh",
    state: "Uttarakhand",
    shortDescription: "Yoga capital and adventure hub on the banks of the holy Ganges",
    detailedInsight: "Rishikesh is where spirituality meets adventure on the foothills of the Himalayas. Known as the 'Yoga Capital of the World', the town hosts numerous ashrams offering yoga and meditation retreats. The Beatles' 1968 visit put Rishikesh on the global map. Beyond spirituality, the town offers thrilling activities like white water rafting, bungee jumping (India's highest), and trekking. The iconic Lakshman Jhula and Ram Jhula suspension bridges offer stunning river views.",
    highlights: [
      "White water rafting on the Ganges",
      "Yoga and meditation in ashrams",
      "Bungee jumping and adventure sports",
      "Lakshman Jhula suspension bridge",
      "Evening Ganga Aarti at Parmarth Niketan"
    ],
    imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800",
    bestSeason: "September to November, March to May",
    isFeatured: false,
  },
  {
    name: "Udaipur",
    state: "Rajasthan",
    shortDescription: "The romantic City of Lakes with palaces, gardens, and Rajput charm",
    detailedInsight: "Udaipur, the 'City of Lakes', is Rajasthan's most romantic destination. The stunning City Palace complex overlooks Lake Pichola, where the iconic Lake Palace (now a luxury hotel) appears to float on water. Boat rides at sunset offer magical views of the palaces and surrounding Aravalli hills. The city's gardens, including Saheliyon ki Bari, showcase Mughal horticultural design. Udaipur's charm lies in its blend of royal heritage, artistic traditions, and lakeside tranquility.",
    highlights: [
      "City Palace overlooking Lake Pichola",
      "Lake Palace (Jag Niwas) boat tour",
      "Saheliyon ki Bari gardens",
      "Sunset boat rides on Lake Pichola",
      "Traditional miniature painting workshops"
    ],
    imageUrl: "https://images.unsplash.com/photo-1609920658906-8223bd289001?w=800",
    bestSeason: "September to March",
    isFeatured: false,
  },
  {
    name: "Agra",
    state: "Uttar Pradesh",
    shortDescription: "Home to the iconic Taj Mahal, a timeless symbol of love",
    detailedInsight: "Agra is synonymous with the Taj Mahal, one of the Seven Wonders of the World and UNESCO World Heritage Site. Built by Mughal Emperor Shah Jahan in memory of his wife Mumtaz Mahal, this white marble mausoleum is an architectural masterpiece. Beyond the Taj, Agra Fort's red sandstone ramparts house palaces and mosques, while Mehtab Bagh offers stunning sunset views of the Taj across the Yamuna River. Agra is part of India's famous Golden Triangle tourist circuit.",
    highlights: [
      "Taj Mahal at sunrise or sunset",
      "Agra Fort's Mughal architecture",
      "Mehtab Bagh for Taj views",
      "Fatehpur Sikri ghost city nearby",
      "Mughal cuisine and petha sweets"
    ],
    imageUrl: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800",
    bestSeason: "October to March",
    isFeatured: false,
  },
  {
    name: "Manali",
    state: "Himachal Pradesh",
    shortDescription: "Himalayan hill station perfect for adventure, snow, and scenic beauty",
    detailedInsight: "Manali is a year-round destination in the Himalayas, offering different experiences each season. Summer brings pleasant weather perfect for trekking in Solang Valley and exploring Rohtang Pass. Winter transforms Manali into a snow-covered wonderland ideal for skiing and snowboarding. The nearby Spiti Valley offers stark, dramatic landscapes for adventure enthusiasts. Old Manali's cafes and markets provide a relaxed atmosphere, while ancient Hidimba Temple showcases unique pagoda architecture.",
    highlights: [
      "Rohtang Pass for snow activities",
      "Solang Valley adventure sports",
      "Hidimba Devi Temple",
      "Trekking to Hampta Pass",
      "Old Manali cafes and culture"
    ],
    imageUrl: "https://images.unsplash.com/photo-1626621341517-4bdc2f337b15?w=800",
    bestSeason: "April to June (summer), December to February (snow)",
    isFeatured: false,
  },
  {
    name: "Andaman & Nicobar Islands",
    state: "Andaman & Nicobar Islands",
    shortDescription: "Tropical paradise with pristine white beaches and vibrant marine life",
    detailedInsight: "The Andaman & Nicobar Islands are India's best-kept secret for beach lovers and water sports enthusiasts. Havelock Island (Swaraj Dweep) features Radhanagar Beach, consistently rated among Asia's best beaches. The crystal-clear waters offer world-class scuba diving and snorkeling opportunities to explore colorful coral reefs. Neil Island's bioluminescent beaches create a magical nighttime spectacle. The islands' indigenous tribes, colonial history (Cellular Jail), and unspoiled nature make them a unique destination.",
    highlights: [
      "Scuba diving and snorkeling at Havelock",
      "Radhanagar Beach's white sands",
      "Bioluminescent beaches at Neil Island",
      "Cellular Jail's light and sound show",
      "Ross Island ruins"
    ],
    imageUrl: "https://images.unsplash.com/photo-1589197331516-5c71164cf8d9?w=800",
    bestSeason: "October to May",
    isFeatured: false,
  }
];

async function seedDestinations() {
  console.log("Seeding destinations...");
  
  try {
    // Check if destinations already exist
    const existing = await storage.getAllDestinations();
    if (existing.length > 0) {
      console.log(`Found ${existing.length} existing destinations, skipping seed.`);
      return;
    }

    // Create destinations
    for (const destination of destinationsData) {
      await storage.createDestination(destination);
    }
    
    console.log(`Successfully seeded ${destinationsData.length} destinations!`);
  } catch (error) {
    console.error("Error seeding destinations:", error);
    throw error;
  }
}

export { seedDestinations };
