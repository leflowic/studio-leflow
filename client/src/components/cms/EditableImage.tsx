import { useState, useRef, useEffect } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EditableImageProps {
  page: string;
  section: string;
  contentKey: string;
  currentImageUrl?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackSrc?: string | undefined;
}

export function EditableImage({
  page,
  section,
  contentKey,
  currentImageUrl,
  alt,
  className,
  containerClassName,
  fallbackSrc
}: EditableImageProps) {
  const { isEditMode } = useEditMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || fallbackSrc);
  const [errored, setErrored] = useState(false);

  // Sync when the CMS data loads asynchronously after initial render
  useEffect(() => {
    setErrored(false);
    setPreviewUrl(currentImageUrl || fallbackSrc);
  }, [currentImageUrl, fallbackSrc]);

  const updateImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiRequest("PUT", "/api/cms/content/single", {
        page,
        section,
        contentKey,
        contentValue: imageUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/content"] });
      toast({
        title: "Slika ažurirana",
        description: "Slika je uspešno promenjena",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri ažuriranju slike",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Greška",
        description: "Izabrani fajl nije slika",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      toast({
        title: "Greška",
        description: "Slika je prevelika (max 4MB)",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getAuthToken();
      const uploadResponse = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: "include",
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      const { url } = await uploadResponse.json();
      setPreviewUrl(url);
      await updateImageMutation.mutateAsync(url);
    } catch (error) {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri upload-u slike",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (isEditMode && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("relative group", containerClassName)}>
      <img
        src={errored ? fallbackSrc : (previewUrl || fallbackSrc)}
        alt={alt}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onError={() => { if (!errored && fallbackSrc) setErrored(true); }}
        className={cn(
          "select-none",
          className,
          isEditMode && "cursor-pointer hover:opacity-80 transition-opacity"
        )}
        onClick={handleClick}
      />

      {isEditMode && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded",
              isUploading && "opacity-100"
            )}
            onClick={handleClick}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white">
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Promeni Sliku</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
