import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export function ImageLightbox({ 
  images, 
  initialIndex = 0, 
  isOpen, 
  onClose,
  alt = "Property image"
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, goToNext, goToPrevious]);

  if (!isOpen || images.length === 0) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={handleBackdropClick}
      data-testid="lightbox-backdrop"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
        data-testid="button-lightbox-close"
      >
        <X className="h-6 w-6" />
      </Button>

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            data-testid="button-lightbox-prev"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            data-testid="button-lightbox-next"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        <img
          src={images[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
          data-testid="lightbox-image"
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full" data-testid="text-lightbox-counter">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-all ${
                idx === currentIndex ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              data-testid={`button-lightbox-thumbnail-${idx}`}
            >
              <img
                src={img}
                alt={`${alt} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
