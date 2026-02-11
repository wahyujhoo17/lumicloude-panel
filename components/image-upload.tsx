"use client";

import { useState } from "react";

interface UploadResponse {
  success: boolean;
  data?: {
    filename: string;
    url: string;
    size: number;
    type: string;
  };
  error?: string;
}

interface ImageUploadProps {
  type?: "logo" | "image" | "customer";
  onUploadSuccess?: (url: string) => void;
  maxSizeMB?: number;
}

export default function ImageUpload({
  type = "image",
  onUploadSuccess,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File terlalu besar. Maksimal ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError(
        "Format file tidak didukung. Gunakan JPG, PNG, GIF, WebP, atau SVG",
      );
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success && result.data) {
        onUploadSuccess?.(result.data.url);
      } else {
        setError(result.error || "Upload gagal");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor={`file-upload-${type}`}
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 dark:hover:bg-gray-800 dark:bg-gray-900 dark:border-gray-700 dark:hover:border-gray-500"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 max-w-full object-contain"
              />
            ) : (
              <>
                <svg
                  className="w-10 h-10 mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF, WebP, SVG (MAX. {maxSizeMB}MB)
                </p>
              </>
            )}
          </div>
          <input
            id={`file-upload-${type}`}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {uploading && (
        <div className="text-center text-sm text-blue-600 dark:text-blue-400">
          Uploading...
        </div>
      )}

      {error && (
        <div className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
