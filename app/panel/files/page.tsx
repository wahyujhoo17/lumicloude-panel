"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import Editor from "@monaco-editor/react";
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
  const [editorLanguage, setEditorLanguage] = useState("plaintext");

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
    const isEditable = editableExtensions.some((ext) => fileName.endsWith(ext));

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
          setEditorLanguage(getLanguageFromFilename(file.name));
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

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const res = await fetch(
        `/api/panel/files/download?path=${encodeURIComponent(filePath)}`,
      );

      if (!res.ok) {
        alert("Failed to download file");
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
      alert("Failed to download file");
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
          )}
        </div>

        {/* File List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No files found. Upload some files to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {file.isDirectory ? (
                        <Folder className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <File className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => handleFileClick(file)}
                          className="font-medium text-gray-900 hover:text-blue-600 text-left truncate block w-full"
                        >
                          {file.name}
                        </button>
                        <p className="text-xs text-gray-500">
                          {file.size &&
                            `${(file.size / 1024).toFixed(2)} KB • `}
                          {new Date(file.modified).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {!file.isDirectory && (
                      <div className="flex items-center gap-2 ml-4">
                        {file.name.toLowerCase().endsWith(".zip") && (
                          <button
                            onClick={() => handleExtractZip(file.path)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Extract ZIP"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleFileClick(file)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(file.path, file.name)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.path)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Manager Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            💡 File Manager Tips
          </h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              This file manager is connected to your HestiaCP website directory
            </li>
            <li>
              Files are stored in: /home/[username]/web/[domain]/public_html/
            </li>
            <li>Click on files to edit them directly in the browser</li>
            <li>Upload ZIP files and use the Extract button to unzip them</li>
            <li>Create new folders and files using the buttons above</li>
            <li>
              Editable file types: .txt, .js, .html, .css, .php, .json, .md,
              etc.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
