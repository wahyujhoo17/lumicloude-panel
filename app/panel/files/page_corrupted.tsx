"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
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
} from "lucide-react";

export default function FileManagerPage() {
  const router = useRouter();
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

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/panel/files?path=${encodeURIComponent(currentPath)}`,
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

      const res = await fetch("/api/panel/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const res = await fetch(
        `/api/panel/files?path=${encodeURIComponent(path)}`,
        {
          method: "DELETE",
        },
      );

      const data = await res.json();
      if (data.success) {
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const handleFileClick = async (file: any) => {
    if (file.isDirectory) {
      navigateToFolder(file.path);
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
    const isEditable = editableExtensions.some((ext) =>
      fileName.endsWith(ext),
    );

    if (isEditable) {
      // Load file content for editing
      try {
        const res = await fetch(
          `/api/panel/files?path=${encodeURIComponent(file.path)}&action=read`,
        );
        const data = await res.json();
        if (data.success) {
          setEditingFile(file.path);
          setFileContent(data.content);
        }
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Failed to read file");
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingFile(null);
        setFileContent("");
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error saving file:", error);
      alert("Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const handleExtractZip = async (filePath: string) => {
    if (!confirm("Extract this ZIP file to the current directory?")) return;

    try {
      const res = await fetch("/api/panel/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: filePath,
          action: "extract",
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("ZIP file extracted successfully");
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error extracting ZIP:", error);
      alert("Failed to extract ZIP file");
    }
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowNewFolder(false);
        setNewFolderName("");
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder");
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowNewFile(false);
        setNewFileName("");
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar user={{ email: "", role: "USER" }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">File Manager</h1>
            <p className="text-gray-600 mt-2">Manage your website files</p>
          </div>
          <button
            onClick={() => router.push("/panel")}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Panel
          </button>
        </div>

        {/* File Editor Modal */}
        {editingFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Edit: {editingFile.split("/").pop()}
                </h3>
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
              <div className="flex-1 overflow-hidden">
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-full p-4 font-mono text-sm border-0 focus:ring-0 resize-none"
                  style={{ minHeight: "500px" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              <Upload className="w-5 h-5" />
              {uploading ? "Uploading..." : "Upload File"}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FolderPlus className="w-5 h-5" />
              New Folder
            </button>

            <button
              onClick={() => setShowNewFile(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <FilePlus className="w-5 h-5" />
              New File
            </button>

            {currentPath && (
              <button
                onClick={navigateUp}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Parent Folder
              </button>
            )}
            <div className="text-sm text-gray-600">
              Current: /{currentPath || "root"}
            </div>
          </div>

          {/* New Folder Form */}
          {showNewFolder && (
            <form onSubmit={handleCreateFolder} className="mt-4 flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create
              </button>
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
            </form>
          )}

          {/* New File Form */}
          {showNewFile && (
            <form onSubmit={handleCreateFile} className="mt-4 flex gap-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="File name (e.g., index.html)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create
              </button>
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
            </form>
          )} { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          path: editingFile,
          content: fileContent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("File saved successfully!");
        setEditingFile(null);
        setFileContent("");
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error saving file:", error);
      alert("Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const handleExtractZip = async (filePath: string) => {
    if (!confirm("Extract this ZIP file?")) return;

    try {
      const res = await fetch("/api/panel/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extract",
          path: filePath,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("ZIP file extracted successfully!");
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error extracting ZIP:", error);
      alert("Failed to extract ZIP file");
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName) return;

    try {
      const res = await fetch("/api/panel/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mkdir",
          path: currentPath,
          folderName: newFolderName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowNewFolder(false);
        setNewFolderName("");
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Errobutton
                          onClick={() => handleFileClick(file)}
                          className="font-medium text-gray-900 hover:text-blue-600 text-left"
                        >
                          {file.name}
                        </button>
                      )}
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB •{" "}
                        {new Date(file.modified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {!file.isDirectory && (
                    <div className="flex items-center gap-2">
                      {file.name.toLowerCase().endsWith(".zip") && (
                        <button
                          onClick={() => handleExtractZip(file.path)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Extract ZIP"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleFileClick(file)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

        {/* File Manager Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 File Manager Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Click on files to edit them directly in the browser</li>
            <li>Upload ZIP files and use the Extract button to unzip them</li>
            <li>Create new folders and files using the buttons above</li>
            <li>Editable file types: .txt, .js, .html, .css, .php, .json, .md, etc.</li>
          </ul>
        </div>
                      <a
                        href={`/uploads/customers/${file.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(file.path)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete
        setNewFileName("");
        loadFiles();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">File Manager</h1>
            <p className="text-gray-600 mt-2">Manage your website files</p>
          </div>
          <button
            onClick={() => router.push("/panel")}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Panel
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              <Upload className="w-5 h-5" />
              {uploading ? "Uploading..." : "Upload File"}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            {currentPath && (
              <button
                onClick={navigateUp}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Parent Folder
              </button>
            )}
            <div className="text-sm text-gray-600">
              Current: /{currentPath || "root"}
            </div>
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Files & Folders
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600 mt-3">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No files in this directory</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="px-6 py-4 hover:bg-gray-50 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {file.isDirectory ? (
                      <Folder className="w-6 h-6 text-blue-500" />
                    ) : (
                      <File className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                      {file.isDirectory ? (
                        <button
                          onClick={() => navigateToFolder(file.path)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {file.name}
                        </button>
                      ) : (
                        <p className="font-medium text-gray-900">{file.name}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB •{" "}
                        {new Date(file.modified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {!file.isDirectory && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`/uploads/customers/${file.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(file.path)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
