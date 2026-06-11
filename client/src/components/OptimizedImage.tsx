import { ImgHTMLAttributes, useState, useEffect, useRef, type MouseEvent } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

export function OptimizedImage({
  src,
  alt,
  priority = false,
  className = "",
  sizes,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle cached images: onLoad won't fire if the browser already has the image cached
  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [src]);

  const imgAttributes: any = {
    ref: imgRef,
    src,
    alt,
    loading: priority ? "eager" : "lazy",
    decoding: priority ? "sync" : "async",
    onLoad: () => setIsLoaded(true),
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
    draggable: false,
    className: `transition-opacity duration-300 select-none ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`,
    ...props
  };

  // Add sizes attribute for responsive images (LCP optimization)
  if (sizes) {
    imgAttributes.sizes = sizes;
  } else if (priority) {
    // Default sizes for priority images (hero images typically full width)
    imgAttributes.sizes = '100vw';
  }

  // fetchpriority is a valid HTML attribute but not yet in React's types (LCP optimization)
  if (priority) {
    imgAttributes.fetchpriority = "high";
  }

  return <img {...imgAttributes} />;
}
