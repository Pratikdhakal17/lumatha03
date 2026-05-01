import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyBlurImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onClick?: () => void;
  priority?: boolean;
}

// Generate a consistent blur placeholder gradient based on image seed
const generateBlurPlaceholder = (src: string): string => {
  // Create a simple hash from the src string
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    const char = src.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Generate colors based on hash
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  
  return `linear-gradient(135deg, hsl(${hue1}, 30%, 70%) 0%, hsl(${hue2}, 40%, 60%) 100%)`;
};

const LazyBlurImage: React.FC<LazyBlurImageProps> = ({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  onClick,
  priority = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const imgPreloadRef = useRef<HTMLImageElement | null>(null);

  // Preload image immediately if priority
  useEffect(() => {
    if (priority && src) {
      setIsInView(true);
      // Preload in background
      imgPreloadRef.current = new Image();
      imgPreloadRef.current.src = src;
    }
  }, [priority, src]);

  useEffect(() => {
    if (priority) return; // Skip observer for priority images
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px',
        threshold: 0
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const blurGradient = generateBlurPlaceholder(src);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div 
      ref={imgRef} 
      className={cn('relative overflow-hidden', className, onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      {/* Blur placeholder with shimmer effect */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          isLoaded ? 'opacity-0' : 'opacity-100',
          placeholderClassName
        )}
        style={{ background: blurGradient }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 shimmer" />
        )}
      </div>

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Fallback for error — styled discovery placeholder */}
      {hasError && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: blurGradient }}
        >
          <div className="text-3xl mb-1 opacity-70">🌍</div>
          <p className="text-[10px] text-white/80 font-medium drop-shadow-sm">Discovering this place</p>
        </div>
      )}
    </div>
  );
};

export default LazyBlurImage;
