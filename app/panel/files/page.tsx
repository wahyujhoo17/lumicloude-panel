"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import Editor from "@monaco-editor/react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import {
  Upload,
  File,
  Folder,
  Trash2,
  Download,
  ArrowLeft,
  Loader2,
  Edit,
  Archive,
  FolderPlus,
  FilePlus,
  Save,
  X,
  Home,
  RotateCcw,
  Search,
  ChevronRight,
  Grid3x3,
  List,
  RefreshCw,
  FileEdit,
  MoreVertical,
  Globe,
} from "lucide-react";

interface Website {
  id: string;
  subdomain: string;
  customDomain: string | null;
  status: string;
}

function FileManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainParam = searchParams.get("domain");
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [editorLanguage, setEditorLanguage] = useState("plaintext");
  const [settingDocRoot, setSettingDocRoot] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [includeSubdir, setIncludeSubdir] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showFileOpsMenu, setShowFileOpsMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImageName, setPreviewImageName] = useState<string>("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingItem, setRenamingItem] = useState<{
    path: string;
    name: string;
    isDirectory: boolean;
  } | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [extracting, setExtracting] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: any;
  } | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    variant?: "danger" | "warning";
    confirmText?: string;
    loading?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Website selection
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [loadingWebsites, setLoadingWebsites] = useState(true);

  // Load user's websites
  useEffect(() => {
    const loadWebsites = async () => {
      try {
        setLoadingWebsites(true);
        const res = await fetch("/api/customers/me");
        const data = await res.json();
        if (data.success && data.data.websites) {
          setWebsites(data.data.websites);

          // Check if domain parameter is provided in URL
          if (domainParam) {
            // Find website by subdomain
            const matchedWebsite = data.data.websites.find(
              (w: Website) =>
                w.subdomain === domainParam || w.customDomain === domainParam,
            );
            if (matchedWebsite) {
              setSelectedWebsite(matchedWebsite.id);
            } else if (data.data.websites.length > 0) {
              setSelectedWebsite(data.data.websites[0].id);
            }
          } else if (!selectedWebsite && data.data.websites.length > 0) {
            // Set first website as default if not already selected
            setSelectedWebsite(data.data.websites[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading websites:", error);
      } finally {
        setLoadingWebsites(false);
      }
    };
    loadWebsites();
  }, [domainParam]);

  // Handle rename file/folder
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !newItemName.trim()) return;

    try {
      const response = await fetch("/api/panel/files/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPath: renamingItem.path,
          newName: newItemName.trim(),
          isDirectory: renamingItem.isDirectory,
          websiteId: selectedWebsite,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to rename");
      }

      toast({
        title: "Success",
        description: `${renamingItem.isDirectory ? "Folder" : "File"} renamed successfully`,
      });

      setShowRenameModal(false);
      setRenamingItem(null);
      setNewItemName("");
      loadFiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    }
  };

  // Check if file is an image
  const isImageFile = (filename: string): boolean => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const imageExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "svg",
      "webp",
      "bmp",
      "ico",
    ];
    return imageExtensions.includes(ext || "");
  };

  // Get file icon based on extension
  const getFileIcon = (filename: string, isDirectory: boolean): string => {
    if (isDirectory) return "/file-manager/folder.png";

    const ext = filename.split(".").pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      html: "/file-manager/html.png",
      htm: "/file-manager/html.png",
      php: "/file-manager/php.png",
      json: "/file-manager/json.png",
      css: "/file-manager/css.png",
      js: "/file-manager/js.png",
      jsx: "/file-manager/js.png",
      ts: "/file-manager/js.png",
      tsx: "/file-manager/js.png",
      txt: "/file-manager/txt.png",
      zip: "/file-manager/zip.png",
      rar: "/file-manager/zip.png",
      "7z": "/file-manager/zip.png",
      jpg: "/file-manager/image.png",
      jpeg: "/file-manager/image.png",
      png: "/file-manager/image.png",
      gif: "/file-manager/image.png",
      svg: "/file-manager/image.png",
      webp: "/file-manager/image.png",
    };
    return iconMap[ext || ""] || "/file-manager/file.png";
  };

  // Detect language from file extension
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      html: "html",
      htm: "html",
      css: "css",
      scss: "scss",
      less: "less",
      php: "php",
      py: "python",
      java: "java",
      xml: "xml",
      md: "markdown",
      sql: "sql",
      sh: "shell",
      yaml: "yaml",
      yml: "yaml",
      env: "plaintext",
      txt: "plaintext",
      htaccess: "apache",
    };
    return languageMap[ext || ""] || "plaintext";
  };

  useEffect(() => {
    if (selectedWebsite) {
      loadFiles();
      setSelectedFiles([]); // Clear selection when path changes
      setSearchQuery(""); // Clear search when path changes
    }
  }, [currentPath, selectedWebsite]);

  // Reset path when website changes
  useEffect(() => {
    setCurrentPath("");
  }, [selectedWebsite]);

  // Close dropdown and context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Small delay to allow the button click to register first
      setTimeout(() => {
        const target = e.target as HTMLElement;
        if (!target.closest(".dropdown-container")) {
          setActiveDropdown(null);
        }
        if (!target.closest(".context-menu")) {
          setContextMenu(null);
        }
      }, 0);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setContextMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, file: any) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
    });
    setActiveDropdown(null);
  };

  // Filter files based on search query
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFiles(filteredFiles.map((f) => f.path));
    } else {
      setSelectedFiles([]);
    }
  };

  // Handle individual checkbox
  const handleSelectFile = (path: string) => {
    setSelectedFiles((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedFiles.length === 0) return;
    const count = selectedFiles.length;
    setConfirmAction({
      title: "Delete Selected Items",
      message: `Are you sure you want to delete ${count} selected item(s)? This action cannot be undone.`,
      variant: "danger",
      confirmText: `Delete ${count} Item(s)`,
      onConfirm: async () => {
        try {
          for (const filePath of selectedFiles) {
            const isDirectory =
              files.find((f) => f.path === filePath)?.isDirectory ?? false;
            await fetch(
              `/api/panel/files?path=${encodeURIComponent(filePath)}&isDirectory=${isDirectory}&websiteId=${selectedWebsite}`,
              { method: "DELETE" },
            );
          }
          setSelectedFiles([]);
          loadFiles();
          toast({
            variant: "success",
            title: "Deleted",
            description: `${count} item(s) deleted successfully`,
          });
        } catch (error) {
          console.error("Error deleting files:", error);
          toast({
            variant: "error",
            title: "Error",
            description: "Failed to delete some files",
          });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  };

  const loadFiles = async () => {
    if (!selectedWebsite) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/panel/files?path=${encodeURIComponent(currentPath)}&websiteId=${selectedWebsite}`,
      );
      const data = await res.json();
      if (data.success) {
        setFiles(data.data.files);
      }
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);
      formData.append("websiteId", selectedWebsite);

      const res = await fetch("/api/panel/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        loadFiles();
        toast({
          variant: "success",
          title: "Success",
          description: "File uploaded successfully",
        });
      } else {
        toast({
          variant: "error",
          title: "Upload failed",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to upload file",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (path: string, isDir?: boolean) => {
    const fileName = path.split("/").pop() || path;
    // Auto-detect if it's a directory from files list
    const isDirectory =
      isDir ?? files.find((f) => f.path === path)?.isDirectory ?? false;
    setConfirmAction({
      title: isDirectory ? "Delete Folder" : "Delete File",
      message: isDirectory
        ? `Are you sure you want to delete folder "${fileName}" and all its contents? This action cannot be undone.`
        : `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      variant: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/panel/files?path=${encodeURIComponent(path)}&isDirectory=${isDirectory}&websiteId=${selectedWebsite}`,
            { method: "DELETE" },
          );
          const data = await res.json();
          if (data.success) {
            loadFiles();
            toast({
              variant: "success",
              title: "Deleted",
              description: `"${fileName}" deleted successfully`,
            });
          } else {
            toast({
              variant: "error",
              title: "Delete failed",
              description: data.error,
            });
          }
        } catch (error) {
          console.error("Error deleting file:", error);
          toast({
            variant: "error",
            title: "Error",
            description: "Failed to delete file",
          });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  };

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const handleImagePreview = async (file: any) => {
    try {
      // Get image URL from download endpoint
      const imageUrl = `/api/panel/files/download?path=${encodeURIComponent(file.path)}&websiteId=${selectedWebsite}`;
      setPreviewImage(imageUrl);
      setPreviewImageName(file.name);
    } catch (error) {
      console.error("Error previewing image:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to preview image",
      });
    }
  };

  const handleFileClick = async (file: any) => {
    if (file.isDirectory) {
      navigateToFolder(file.path);
      return;
    }

    // Check if file is an image
    if (isImageFile(file.name)) {
      handleImagePreview(file);
      return;
    }

    // Check if file is editable text file
    const editableExtensions = [
      ".txt",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".json",
      ".css",
      ".html",
      ".php",
      ".py",
      ".md",
      ".yml",
      ".yaml",
      ".xml",
      ".env",
      ".htaccess",
    ];
    const fileName = file.name.toLowerCase();
    const isEditable = editableExtensions.some((ext) => fileName.endsWith(ext));

    if (isEditable) {
      // Load file content for editing
      try {
        const res = await fetch(
          `/api/panel/files?path=${encodeURIComponent(file.path)}&action=read&websiteId=${selectedWebsite}`,
        );
        const data = await res.json();
        if (data.success) {
          setEditingFile(file.path);
          setFileContent(data.content);
          setEditorLanguage(getLanguageFromFilename(file.name));
        }
      } catch (error) {
        console.error("Error reading file:", error);
        toast({
          variant: "error",
          title: "Error",
          description: "Failed to read file",
        });
      }
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;

    try {
      setSaving(true);
      const res = await fetch("/api/panel/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: editingFile,
          content: fileContent,
          action: "update",
          websiteId: selectedWebsite,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingFile(null);
        setFileContent("");
        loadFiles();
        toast({
          variant: "success",
          title: "Saved",
          description: "File saved successfully",
        });
      } else {
        toast({
          variant: "error",
          title: "Save failed",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error saving file:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to save file",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExtractZip = (filePath: string) => {
    const fileName = filePath.split("/").pop() || filePath;
    setConfirmAction({
      title: "Extract ZIP Archive",
      message: `Extract "${fileName}" to the current directory? Existing files with the same name will be overwritten.`,
      variant: "warning",
      confirmText: "Extract",
      onConfirm: async () => {
        setExtracting(filePath);
        try {
          const res = await fetch("/api/panel/files", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: filePath,
              action: "extract",
              websiteId: selectedWebsite,
            }),
          });
          const data = await res.json();
          if (data.success) {
            loadFiles();
            toast({
              variant: "success",
              title: "Extracted",
              description: `"${fileName}" extracted successfully`,
            });
          } else {
            toast({
              variant: "error",
              title: "Extract failed",
              description: data.error,
            });
          }
        } catch (error) {
          console.error("Error extracting ZIP:", error);
          toast({
            variant: "error",
            title: "Error",
            description: "Failed to extract ZIP file",
          });
        } finally {
          setExtracting(null);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const folderPath = currentPath
        ? `${currentPath}/${newFolderName}`
        : newFolderName;

      const res = await fetch("/api/panel/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: folderPath,
          action: "mkdir",
          websiteId: selectedWebsite,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowNewFolder(false);
        setNewFolderName("");
        loadFiles();
        toast({
          variant: "success",
          title: "Created",
          description: "Folder created successfully",
        });
      } else {
        toast({
          variant: "error",
          title: "Create failed",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to create folder",
      });
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      const filePath = currentPath
        ? `${currentPath}/${newFileName}`
        : newFileName;

      const res = await fetch("/api/panel/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: filePath,
          action: "create",
          websiteId: selectedWebsite,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowNewFile(false);
        setNewFileName("");
        loadFiles();
        toast({
          variant: "success",
          title: "Created",
          description: "Folder created successfully",
        });
      } else {
        toast({
          variant: "error",
          title: "Create failed",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to create folder",
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const res = await fetch(
        `/api/panel/files/download?path=${encodeURIComponent(filePath)}&websiteId=${selectedWebsite}`,
      );

      if (!res.ok) {
        toast({
          variant: "error",
          title: "Download failed",
          description: "Failed to download file",
        });
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to download file",
      });
    }
  };

  const handleSetDocumentRoot = () => {
    if (!currentPath) {
      toast({
        variant: "warning",
        title: "No folder selected",
        description: "Please navigate to a folder first",
      });
      return;
    }

    setConfirmAction({
      title: "Set Document Root",
      message: `Set website root to folder: "${currentPath}"? This will change where your website serves files from.`,
      variant: "warning",
      confirmText: "Set as Root",
      onConfirm: async () => {
        try {
          setSettingDocRoot(true);
          const res = await fetch("/api/websites/document-root", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ directory: currentPath }),
          });
          const data = await res.json();
          if (data.success) {
            toast({
              variant: "success",
              title: "Document Root Updated",
              description: `Document root changed to: ${currentPath}`,
            });
          } else {
            toast({
              variant: "error",
              title: "Error",
              description: data.error,
            });
          }
        } catch (error) {
          console.error("Error setting document root:", error);
          toast({
            variant: "error",
            title: "Error",
            description: "Failed to set document root",
          });
        } finally {
          setSettingDocRoot(false);
          setConfirmAction(null);
        }
      },
    });
  };

  const handleResetDocumentRoot = () => {
    setConfirmAction({
      title: "Reset Document Root",
      message: `Reset document root to default (public_html)? Your website will serve files from the default directory.`,
      variant: "warning",
      confirmText: "Reset Root",
      onConfirm: async () => {
        try {
          setSettingDocRoot(true);
          const res = await fetch("/api/websites/document-root", {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.success) {
            toast({
              variant: "success",
              title: "Document Root Reset",
              description: "Document root has been reset to default",
            });
          } else {
            toast({
              variant: "error",
              title: "Error",
              description: data.error,
            });
          }
        } catch (error) {
          console.error("Error resetting document root:", error);
          toast({
            variant: "error",
            title: "Error",
            description: "Failed to reset document root",
          });
        } finally {
          setSettingDocRoot(false);
          setConfirmAction(null);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={{ email: "", role: "USER" }} />

      {/* Header Section with Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={() => router.push("/panel")}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Panel
              </button>
              <h1 className="text-2xl font-bold text-gray-900">File Manager</h1>
            </div>

            {/* Website Selector & View Mode */}
            <div className="flex items-center gap-4">
              {/* Website Selector */}
              {websites.length > 1 && (
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <select
                    value={selectedWebsite}
                    onChange={(e) => setSelectedWebsite(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loadingWebsites}
                  >
                    {websites.map((website) => (
                      <option key={website.id} value={website.id}>
                        {website.customDomain || website.subdomain}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current Website Badge (when only 1 website) */}
              {websites.length === 1 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                  <Globe className="w-4 h-4" />
                  {websites[0].customDomain || websites[0].subdomain}
                </div>
              )}

              {/* View Mode & Refresh */}
              <div className="flex items-center gap-2">
                <button
                  onClick={loadFiles}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    title="Grid View"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 ${viewMode === "list" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    title="List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <button
              onClick={() => setCurrentPath("")}
              className="hover:text-blue-600 transition-colors font-medium text-blue-600"
            >
              Root dir
            </button>
            {currentPath
              .split("/")
              .filter(Boolean)
              .map((part, index, arr) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => {
                      const newPath = arr.slice(0, index + 1).join("/");
                      setCurrentPath(newPath);
                    }}
                    className="hover:text-blue-600 transition-colors font-medium"
                  >
                    {part}
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* File Operations Toolbar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* File Operations Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFileOpsMenu(!showFileOpsMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
              >
                <FolderPlus className="w-4 h-4" />
                File Operations
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${showFileOpsMenu ? "rotate-90" : ""}`}
                />
              </button>

              {showFileOpsMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowNewFolder(true);
                        setShowFileOpsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      New Folder
                    </button>
                    <button
                      onClick={() => {
                        setShowNewFile(true);
                        setShowFileOpsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <FilePlus className="w-4 h-4" />
                      New File
                    </button>
                    {currentPath && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => {
                            handleSetDocumentRoot();
                            setShowFileOpsMenu(false);
                          }}
                          disabled={settingDocRoot}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                        >
                          <Home className="w-4 h-4" />
                          Set as Root
                        </button>
                        <button
                          onClick={() => {
                            handleResetDocumentRoot();
                            setShowFileOpsMenu(false);
                          }}
                          disabled={settingDocRoot}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset Root
                        </button>
                      </>
                    )}
                    {selectedFiles.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          onClick={() => {
                            handleBulkDelete();
                            setShowFileOpsMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Selected ({selectedFiles.length})
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Files"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Include subdir checkbox */}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSubdir}
                onChange={(e) => setIncludeSubdir(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Include subdir
            </label>

            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Bulk Delete Button - Shows when files are selected */}
              {selectedFiles.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedFiles.length})
                </button>
              )}

              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-all">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* File Editor Modal */}
        {editingFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">
                    Edit: {editingFile.split("/").pop()}
                  </h3>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {editorLanguage}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveFile}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingFile(null);
                      setFileContent("");
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  width="100%"
                  defaultLanguage={editorLanguage}
                  language={editorLanguage}
                  value={fileContent}
                  onChange={(value) => setFileContent(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    lineNumbers: "on",
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                  }}
                  loading={
                    <div className="flex items-center justify-center h-full bg-gray-900">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex flex-col">
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => {
                    setPreviewImage(null);
                    setPreviewImageName("");
                  }}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 shadow-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {previewImageName}
                  </p>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <Image
                  src={previewImage}
                  alt={previewImageName}
                  width={1920}
                  height={1080}
                  className="max-w-full max-h-full object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {showRenameModal && renamingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">
                  Rename {renamingItem.isDirectory ? "Folder" : "File"}
                </h3>
              </div>
              <form onSubmit={handleRename} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Name
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter new name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRenameModal(false);
                      setRenamingItem(null);
                      setNewItemName("");
                    }}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Rename
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Folder Modal */}
        {showNewFolder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Create New Folder</h3>
              </div>
              <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewFolder(false);
                      setNewFolderName("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New File Modal */}
        {showNewFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Create New File</h3>
              </div>
              <form onSubmit={handleCreateFile} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Name
                  </label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g., index.html"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewFile(false);
                      setNewFileName("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* File List Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-500">Loading files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-16">
              <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {searchQuery
                  ? `No files found matching "${searchQuery}"`
                  : "No files found. Upload some files to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left w-8">
                      <input
                        type="checkbox"
                        checked={
                          filteredFiles.length > 0 &&
                          selectedFiles.length === filteredFiles.length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Protected
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      PMSN/Owner
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Modified Time
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ps
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Operation
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file, index) => (
                    <tr
                      key={index}
                      className="hover:bg-blue-50/50 transition-colors"
                      onContextMenu={(e) => handleContextMenu(e, file)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.path)}
                          onChange={() => handleSelectFile(file.path)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative w-5 h-5 flex-shrink-0">
                            <Image
                              src={getFileIcon(file.name, file.isDirectory)}
                              alt={file.isDirectory ? "folder" : "file"}
                              width={20}
                              height={20}
                              className="object-contain"
                            />
                          </div>
                          <button
                            onClick={() => handleFileClick(file)}
                            className="font-medium text-gray-900 hover:text-blue-600 text-left truncate max-w-xs"
                            title={file.name}
                          >
                            {file.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-600">
                          Unprotected
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">755 / www</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {file.isDirectory ? (
                          <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                            Calculate
                          </button>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {(file.size / 1024).toFixed(2)} KB
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {new Date(file.modified).toLocaleString("id-ID", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-600">
                          {file.permissions || "644"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="relative dropdown-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(
                                activeDropdown === index ? null : index,
                              );
                            }}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="More options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeDropdown === index && (
                            <div
                              className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setRenamingItem({
                                      path: file.path,
                                      name: file.name,
                                      isDirectory: file.isDirectory,
                                    });
                                    setNewItemName(file.name);
                                    setShowRenameModal(true);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  title="Rename this item"
                                >
                                  <FileEdit className="w-4 h-4 text-orange-600" />
                                  <span>Rename</span>
                                </button>

                                {!file.isDirectory && (
                                  <>
                                    <button
                                      onClick={() => {
                                        handleFileClick(file);
                                        setActiveDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                      title="Edit file content"
                                    >
                                      <Edit className="w-4 h-4 text-blue-600" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDownload(file.path, file.name);
                                        setActiveDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                      title="Download file"
                                    >
                                      <Download className="w-4 h-4 text-blue-600" />
                                      <span>Download</span>
                                    </button>
                                  </>
                                )}

                                {!file.isDirectory &&
                                  file.name.toLowerCase().endsWith(".zip") && (
                                    <button
                                      onClick={() => {
                                        handleExtractZip(file.path);
                                        setActiveDropdown(null);
                                      }}
                                      disabled={extracting === file.path}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                                      title="Extract ZIP archive"
                                    >
                                      {extracting === file.path ? (
                                        <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                                      ) : (
                                        <Archive className="w-4 h-4 text-green-600" />
                                      )}
                                      <span>
                                        {extracting === file.path
                                          ? "Extracting..."
                                          : "Extract"}
                                      </span>
                                    </button>
                                  )}

                                <div className="border-t border-gray-200 my-1"></div>

                                <button
                                  onClick={() => {
                                    handleDelete(file.path);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                  title="Delete permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Footer with Stats */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Total{" "}
                  <span className="font-medium text-gray-900">
                    {filteredFiles.filter((f) => f.isDirectory).length}
                  </span>{" "}
                  directories,{" "}
                  <span className="font-medium text-gray-900">
                    {filteredFiles.filter((f) => !f.isDirectory).length}
                  </span>{" "}
                  files, File size:{" "}
                  <button className="text-green-600 hover:text-green-700 font-medium">
                    Calculate
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                      &lt;
                    </button>
                    <button className="px-3 py-1 bg-blue-600 text-white rounded">
                      1
                    </button>
                    <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                      &gt;
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                      <option>100 / page</option>
                      <option>50 / page</option>
                      <option>25 / page</option>
                    </select>
                    <span>Goto</span>
                    <input
                      type="number"
                      min="1"
                      defaultValue="1"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    Total{" "}
                    <span className="font-medium text-gray-900">
                      {filteredFiles.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 context-menu"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setRenamingItem({
                  path: contextMenu.file.path,
                  name: contextMenu.file.name,
                  isDirectory: contextMenu.file.isDirectory,
                });
                setNewItemName(contextMenu.file.name);
                setShowRenameModal(true);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              title="Rename this item"
            >
              <FileEdit className="w-4 h-4 text-orange-600" />
              <span>Rename</span>
            </button>

            {!contextMenu.file.isDirectory && (
              <>
                <button
                  onClick={() => {
                    handleFileClick(contextMenu.file);
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  title="Edit file content"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    handleDownload(
                      contextMenu.file.path,
                      contextMenu.file.name,
                    );
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  title="Download file"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Download</span>
                </button>
              </>
            )}

            {!contextMenu.file.isDirectory &&
              contextMenu.file.name.toLowerCase().endsWith(".zip") && (
                <button
                  onClick={() => {
                    handleExtractZip(contextMenu.file.path);
                    setContextMenu(null);
                  }}
                  disabled={extracting === contextMenu.file.path}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  title="Extract ZIP archive"
                >
                  {extracting === contextMenu.file.path ? (
                    <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4 text-green-600" />
                  )}
                  <span>
                    {extracting === contextMenu.file.path
                      ? "Extracting..."
                      : "Extract"}
                  </span>
                </button>
              )}

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={() => {
                handleDelete(contextMenu.file.path);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
              title="Delete permanently"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        )}

        {/* Confirmation Dialog */}
        {confirmAction && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !confirmAction.loading)
                setConfirmAction(null);
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              {/* Icon */}
              <div className="pt-6 pb-2 flex justify-center">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    confirmAction.variant === "danger"
                      ? "bg-red-100"
                      : "bg-yellow-100"
                  }`}
                >
                  {confirmAction.variant === "danger" ? (
                    <Trash2 className="w-7 h-7 text-red-600" />
                  ) : (
                    <Archive className="w-7 h-7 text-yellow-600" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-2 text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {confirmAction.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {confirmAction.message}
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 pt-4 flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={confirmAction.loading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setConfirmAction((prev) =>
                      prev ? { ...prev, loading: true } : null,
                    );
                    await confirmAction.onConfirm();
                  }}
                  disabled={confirmAction.loading}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg transition font-medium text-sm flex items-center justify-center disabled:opacity-70 ${
                    confirmAction.variant === "danger"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-yellow-600 hover:bg-yellow-700"
                  }`}
                >
                  {confirmAction.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    confirmAction.confirmText || "Confirm"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FileManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <FileManagerContent />
    </Suspense>
  );
}
