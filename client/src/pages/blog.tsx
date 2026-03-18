import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  audience: "hotelier" | "traveler" | "both";
  coverEmoji: string;
}

const blogPosts: BlogPost[] = [
  {
    slug: "stop-paying-ota-commission",
    title:
      "Why Hotel Owners Are Losing Lakhs to OTAs Every Year (And How to Stop It)",
    excerpt:
      "MakeMyTrip, Goibibo, and Booking.com charge 15-30% commission on every booking. For a hotel doing ₹10 lakh/month, that's ₹1.5-3 lakh going to middlemen. Here's how zero-commission platforms are changing the game.",
    category: "For Hoteliers",
    readTime: "5 min read",
    date: "March 15, 2026",
    audience: "hotelier",
    coverEmoji: "🏨",
  },
  {
    slug: "list-hotel-online-free",
    title:
      "How to List Your Hotel Online for FREE and Start Getting Direct Bookings",
    excerpt:
      "Getting your hotel listed online doesn't have to cost a fortune. In this step-by-step guide, we show you exactly how to list your property on ZECOHO in under 10 minutes and start receiving direct bookings with zero commission.",
    category: "For Hoteliers",
    readTime: "7 min read",
    date: "March 10, 2026",
    audience: "hotelier",
    coverEmoji: "📋",
  },
  {
    slug: "save-money-booking-hotels-india",
    title: "How to Save 15-25% on Every Hotel Booking in India",
    excerpt:
      "Most travelers don't realize that OTA platforms mark up hotel prices to cover their commission costs. By booking directly, you can save significantly on every stay. Here's exactly how to do it.",
    category: "For Travelers",
    readTime: "4 min read",
    date: "March 8, 2026",
    audience: "traveler",
    coverEmoji: "✈️",
  },
  {
    slug: "direct-hotel-bookings-vs-ota",
    title:
      "Direct Hotel Booking vs OTA: What Every Indian Traveler Should Know",
    excerpt:
      "Should you book directly with the hotel or through platforms like MakeMyTrip? We break down the pros, cons, pricing differences, and the hidden costs most travelers never see.",
    category: "For Travelers",
    readTime: "6 min read",
    date: "March 5, 2026",
    audience: "traveler",
    coverEmoji: "⚖️",
  },
  {
    slug: "increase-hotel-bookings-tier2-cities",
    title:
      "How Small Hotels in Tier 2 Cities Can Compete with Big OTA-Listed Properties",
    excerpt:
      "Hotels in cities like Indore, Varanasi, Jaipur, and Coimbatore often struggle to compete with large chains on OTA platforms. Here's a practical playbook for getting more bookings without paying commission.",
    category: "For Hoteliers",
    readTime: "8 min read",
    date: "March 1, 2026",
    audience: "hotelier",
    coverEmoji: "📈",
  },
  {
    slug: "zero-commission-hotel-platform-india",
    title:
      "ZECOHO: India's First Zero Commission Hotel Booking Platform Explained",
    excerpt:
      "What does zero commission actually mean for hotel owners and travelers? We break down exactly how ZECOHO works, who benefits, and why this model is the future of hotel bookings in India.",
    category: "About ZECOHO",
    readTime: "5 min read",
    date: "February 25, 2026",
    audience: "both",
    coverEmoji: "🚀",
  },
];

const categoryColors: Record<string, string> = {
  "For Hoteliers":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "For Travelers":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "About ZECOHO":
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function BlogPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-b">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-primary font-semibold">ZECOHO Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Insights for Hoteliers &<br />
            Smart Travelers
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tips on getting direct bookings, saving on hotel stays, and
            understanding India's zero-commission hotel ecosystem.
          </p>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="container mx-auto px-4 py-12">
        {/* Featured Post */}
        <div
          className="group cursor-pointer mb-12 rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-300"
          onClick={() => setLocation(`/blog/${blogPosts[0].slug}`)}
        >
          <div className="md:flex">
            <div className="md:w-2/5 bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center p-16">
              <span className="text-8xl">{blogPosts[0].coverEmoji}</span>
            </div>
            <div className="md:w-3/5 p-8 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <Badge className={categoryColors[blogPosts[0].category]}>
                  {blogPosts[0].category}
                </Badge>
                <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  Featured
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                {blogPosts[0].title}
              </h2>
              <p className="text-muted-foreground mb-4 line-clamp-3">
                {blogPosts[0].excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {blogPosts[0].date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {blogPosts[0].readTime}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 group-hover:gap-2 transition-all"
                >
                  Read More <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of posts */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.slice(1).map((post) => (
            <div
              key={post.slug}
              className="group cursor-pointer rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all duration-300"
              onClick={() => setLocation(`/blog/${post.slug}`)}
            >
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 flex items-center justify-center py-10">
                <span className="text-6xl">{post.coverEmoji}</span>
              </div>
              <div className="p-5">
                <Badge className={`${categoryColors[post.category]} mb-3`}>
                  {post.category}
                </Badge>
                <h3 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Are You a Hotel Owner?</h2>
          <p className="mb-6 opacity-90">
            List your property for FREE and start receiving direct bookings with
            zero commission.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setLocation("/list-property")}
            className="font-semibold"
          >
            List Your Hotel for Free →
          </Button>
        </div>
      </div>
    </div>
  );
}
