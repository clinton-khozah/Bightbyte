"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";

interface CreateNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recruiterId: string;
  companyId?: string;
}

export function CreateNewsModal({
  isOpen,
  onClose,
  onSuccess,
  recruiterId,
  companyId,
}: CreateNewsModalProps) {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      setUploading(true);
      const fileExt = imageFile.name.split(".").pop();
      const sanitizedRecruiterId = String(recruiterId).replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );
      const fileName = `${sanitizedRecruiterId}_${Date.now()}.${fileExt}`;
      const filePath = `news/${sanitizedRecruiterId}/${fileName}`;

      // Upload to course-media bucket (same as other uploads in the app)
      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: imageFile.type || "image/jpeg",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image. Please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter content");
      return;
    }

    try {
      setSaving(true);

      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
        if (!imageUrl && imageFile) {
          toast.error("Failed to upload image. Please try again.");
          return;
        }
      }

      // Calculate expiration date (10 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);

      // Create news post
      const { error } = await supabase.from("news").insert({
        recruiter_id: recruiterId,
        company_id: companyId || null,
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

      if (error) throw error;

      toast.success("News posted successfully!");

      // Reset form
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview(null);

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating news:", error);
      toast.error(error.message || "Failed to post news");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving && !uploading) {
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader className="pb-2 md:pb-4">
          <DialogTitle className="text-lg md:text-2xl font-bold">Post News</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Create a news post that will be visible for 10 days. Add an image to
            make it more engaging.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="title" className="text-xs md:text-sm">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter news title"
              required
              disabled={saving || uploading}
              className="h-8 md:h-10 text-xs md:text-sm"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="content" className="text-xs md:text-sm">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter news content"
              rows={4}
              required
              disabled={saving || uploading}
              className="text-xs md:text-sm resize-none"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <Label htmlFor="image" className="text-xs md:text-sm">Image (Optional)</Label>
            {imagePreview ? (
              <div className="relative">
                <div className="relative w-full h-32 md:h-48 rounded-lg overflow-hidden border-2 border-gray-200">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={removeImage}
                  className="mt-1.5 md:mt-2 h-7 md:h-9 text-xs md:text-sm px-2 md:px-3"
                  disabled={saving || uploading}
                >
                  <X className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  Remove Image
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 md:p-6 text-center">
                <Upload className="w-5 h-5 md:w-8 md:h-8 mx-auto text-gray-400 mb-1.5 md:mb-2" />
                <Label htmlFor="image" className="cursor-pointer">
                  <span className="text-xs md:text-sm text-gray-600">
                    Click to upload image
                  </span>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={saving || uploading}
                  />
                </Label>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">Max size: 5MB</p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-3">
            <p className="text-xs md:text-sm text-blue-700">
              <strong>Note:</strong> Your news will be visible for 10 days from
              the posting date.
            </p>
          </div>

          <div className="flex gap-2 md:gap-3 pt-2 md:pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving || uploading}
              className="flex-1 h-8 md:h-10 text-xs md:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 h-8 md:h-10 text-xs md:text-sm"
            >
              {saving || uploading ? (
                <>
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                  <span className="hidden sm:inline">{uploading ? "Uploading..." : "Posting..."}</span>
                  <span className="sm:hidden">{uploading ? "Upload..." : "Post..."}</span>
                </>
              ) : (
                "Post News"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
