import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET_NAME = "message-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "audio/mpeg",
  "audio/ogg",
  "video/mp4",
];

export interface UploadedFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado");
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!validateFile(file)) return null;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const timestamp = Date.now();
      const extension = file.name.split(".").pop();
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      setUploadProgress(100);

      return {
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      };
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar arquivo");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const getFileType = (mimeType: string): "image" | "audio" | "video" | "document" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    return "document";
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress,
    getFileType,
    allowedTypes: ALLOWED_TYPES,
    maxFileSize: MAX_FILE_SIZE,
  };
};
