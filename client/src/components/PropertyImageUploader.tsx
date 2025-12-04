import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  X, 
  Building2, 
  Users, 
  Bed, 
  Bath, 
  Dumbbell, 
  Utensils,
  Info,
  Camera,
  Lightbulb
} from "lucide-react";
import type { PropertyImageCategory, CategorizedImage, CategorizedPropertyImages } from "@shared/schema";

interface CategoryConfig {
  id: PropertyImageCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tips: string[];
  minRecommended: number;
}

const IMAGE_CATEGORIES: CategoryConfig[] = [
  {
    id: "exterior",
    label: "Exterior",
    icon: Building2,
    description: "Showcase your property's exterior and surroundings",
    tips: [
      "Front view of the building (main facade)",
      "Entrance / main gate with clear signage",
      "Parking area (if available)",
      "Garden / outdoor sitting area",
      "Night view with lighting (if possible)",
    ],
    minRecommended: 3,
  },
  {
    id: "reception",
    label: "Reception & Lobby",
    icon: Users,
    description: "First impressions matter - show your welcoming spaces",
    tips: [
      "Reception counter with staff area",
      "Lobby seating and waiting area",
      "Information desk / notice boards",
      "Decorative elements and ambiance",
    ],
    minRecommended: 2,
  },
  {
    id: "room",
    label: "Room Photos",
    icon: Bed,
    description: "For each room category, capture these essential shots",
    tips: [
      "Bed (full view with clean linens)",
      "Room interior (wide-angle shot)",
      "Window / balcony view",
      "Wardrobe / cupboard",
      "TV / AC / other room facilities",
      "Desk / work area (if available)",
    ],
    minRecommended: 5,
  },
  {
    id: "bathroom",
    label: "Bathroom",
    icon: Bath,
    description: "Clean, well-lit bathroom photos build trust",
    tips: [
      "Washbasin and mirror area",
      "Shower area / bathtub",
      "Toilet (clean and well-maintained)",
      "Towels and toiletries arrangement",
      "Overall bathroom view",
    ],
    minRecommended: 2,
  },
  {
    id: "amenities",
    label: "Amenities",
    icon: Dumbbell,
    description: "Highlight your property's special features",
    tips: [
      "Swimming pool (if available)",
      "Gym / fitness center",
      "Restaurant / dining area",
      "Banquet / conference hall",
      "Rooftop area / terrace",
      "Kitchen (for homestays/apartments)",
      "Spa / wellness center",
    ],
    minRecommended: 3,
  },
  {
    id: "food",
    label: "Food & Dining",
    icon: Utensils,
    description: "Showcase your culinary offerings",
    tips: [
      "Breakfast spread / buffet",
      "Restaurant interior",
      "Signature dishes",
      "Room service setup",
      "Bar area (if available)",
    ],
    minRecommended: 2,
  },
];

const PHOTO_TIPS = [
  "Use landscape mode for all photos",
  "Ensure bright, natural lighting",
  "Wide-angle shots work best",
  "Avoid watermarks or text overlays",
  "Rooms must look clean and well-arranged",
  "Consider 20-30 second room walkthrough videos",
];

interface PropertyImageUploaderProps {
  value: CategorizedPropertyImages;
  onChange: (images: CategorizedPropertyImages) => void;
  onVideosChange?: (videos: string[]) => void;
  videos?: string[];
}

export function PropertyImageUploader({ 
  value, 
  onChange, 
  onVideosChange,
  videos = []
}: PropertyImageUploaderProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<PropertyImageCategory>("exterior");
  const [editingCaption, setEditingCaption] = useState<string | null>(null);

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      accessPath: data.accessPath,
    };
  };

  const handleImageUpload = (category: PropertyImageCategory, result: any) => {
    if (result.successful && result.successful.length > 0) {
      const accessPath = result.successful[0].accessPath;
      const newImage: CategorizedImage = {
        url: accessPath,
        category,
      };
      onChange({
        ...value,
        [category]: [...(value[category] || []), newImage],
      });
      toast({
        title: "Image uploaded",
        description: `Photo added to ${IMAGE_CATEGORIES.find(c => c.id === category)?.label}`,
      });
    }
  };

  const handleRemoveImage = (category: PropertyImageCategory, index: number) => {
    const newImages = [...(value[category] || [])];
    newImages.splice(index, 1);
    onChange({
      ...value,
      [category]: newImages,
    });
  };

  const handleCaptionChange = (category: PropertyImageCategory, index: number, caption: string) => {
    const newImages = [...(value[category] || [])];
    newImages[index] = { ...newImages[index], caption };
    onChange({
      ...value,
      [category]: newImages,
    });
  };

  const handleVideoUpload = (result: any) => {
    if (result.successful && result.successful.length > 0 && onVideosChange) {
      const uploadedUrl = result.successful[0].uploadURL;
      onVideosChange([...videos, uploadedUrl]);
      toast({
        title: "Video uploaded",
        description: "Room walkthrough video added successfully",
      });
    }
  };

  const handleRemoveVideo = (index: number) => {
    if (onVideosChange) {
      const newVideos = [...videos];
      newVideos.splice(index, 1);
      onVideosChange(newVideos);
    }
  };

  const getTotalImages = () => {
    return Object.values(value).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  };

  const getCategoryCount = (category: PropertyImageCategory) => {
    return value[category]?.length || 0;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg text-blue-900 dark:text-blue-100">Photo Tips for Best Results</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
            {PHOTO_TIPS.map((tip, i) => (
              <li key={i} className="flex items-center gap-2">
                <Camera className="h-4 w-4 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Property Photos</h3>
          <p className="text-sm text-muted-foreground">
            Total: {getTotalImages()} photos uploaded
          </p>
        </div>
        <Badge variant={getTotalImages() >= 10 ? "default" : "secondary"}>
          {getTotalImages() >= 10 ? "Good coverage" : "Add more photos"}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PropertyImageCategory)}>
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto">
          {IMAGE_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const count = getCategoryCount(category.id);
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex flex-col gap-1 py-2 px-1 text-xs"
                data-testid={`tab-images-${category.id}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{category.label}</span>
                <Badge variant={count > 0 ? "default" : "outline"} className="text-xs px-1.5">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {IMAGE_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <category.icon className="h-5 w-5" />
                      {category.label} Photos
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                  <Badge variant="outline">
                    Recommended: {category.minRecommended}+ photos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">What to capture:</span>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
                    {category.tips.map((tip, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-3">
                  <ObjectUploader
                    maxNumberOfFiles={10}
                    maxFileSize={5242880}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleImageUpload(category.id, result)}
                    accept={{ 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {category.label} Photos
                  </ObjectUploader>
                  <span className="text-sm text-muted-foreground">
                    Max 5MB per image. JPEG, PNG, or WebP.
                  </span>
                </div>

                {(value[category.id]?.length || 0) > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {value[category.id]?.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                          <img
                            src={img.url}
                            alt={img.caption || `${category.label} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(category.id, idx)}
                          data-testid={`button-remove-${category.id}-image-${idx}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="mt-2">
                          {editingCaption === `${category.id}-${idx}` ? (
                            <Input
                              value={img.caption || ""}
                              onChange={(e) => handleCaptionChange(category.id, idx, e.target.value)}
                              onBlur={() => setEditingCaption(null)}
                              onKeyDown={(e) => e.key === "Enter" && setEditingCaption(null)}
                              placeholder="Add a caption..."
                              className="text-sm"
                              autoFocus
                              data-testid={`input-caption-${category.id}-${idx}`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingCaption(`${category.id}-${idx}`)}
                              className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                            >
                              {img.caption || "Click to add caption..."}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {getCategoryCount(category.id) === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    <category.icon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No {category.label.toLowerCase()} photos yet</p>
                    <p className="text-sm mt-1">Upload photos to showcase this area</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {onVideosChange && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Property Videos (Optional but Effective)
            </CardTitle>
            <CardDescription>
              20-30 second room walkthrough videos help guests visualize the space better
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ObjectUploader
              maxNumberOfFiles={3}
              maxFileSize={52428800}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleVideoUpload}
              accept={{ 'video/*': ['.mp4', '.webm', '.mov'] }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Videos
            </ObjectUploader>

            {videos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map((video, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <video src={video} className="w-full h-full object-cover" controls />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => handleRemoveVideo(idx)}
                      data-testid={`button-remove-video-${idx}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function getImagesArrayFromCategorized(categorized: CategorizedPropertyImages): string[] {
  const allImages: string[] = [];
  Object.values(categorized).forEach((images) => {
    if (images) {
      images.forEach((img: CategorizedImage) => allImages.push(img.url));
    }
  });
  return allImages;
}

export const defaultCategorizedImages: CategorizedPropertyImages = {
  exterior: [],
  reception: [],
  room: [],
  bathroom: [],
  amenities: [],
  food: [],
};
