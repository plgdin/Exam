'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, FileText, Terminal, Copy, Loader2, Check, LogOut, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FileItem = {
  name: string;
  created_at: string;
};

export default function Dashboard() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [origin, setOrigin] = useState('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        await fetchFiles();
      } else {
        alert('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyCommand = (filename: string, index: number) => {
    const command = `curl -OJ ${origin}/d/${filename}`;
    navigator.clipboard.writeText(command);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDeleteFile = async (filename: string) => {
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return;

    setDeletingFile(filename);
    try {
      const res = await fetch('/api/files', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: filename }),
      });
      if (!res.ok) {
        alert('Failed to delete file. Please try again.');
        return;
      }
      setFiles((currentFiles) => currentFiles.filter((file) => file.name !== filename));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleLogout = () => {
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/';
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            Vault Dashboard
          </h1>
          <p className="text-white/50 mt-1">Manage your terminal-accessible files</p>
        </div>
        <button 
          onClick={handleLogout}
          className="glass-button flex items-center gap-2 px-4 py-2 rounded-xl text-sm hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="md:col-span-1">
          <div className="glass-panel rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10 hover:border-blue-500/50 transition-colors relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full min-h-[200px] z-10">
              {isUploading ? (
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              ) : (
                <UploadCloud className="w-12 h-12 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
              )}
              <h3 className="text-lg font-semibold text-white mb-1">
                {isUploading ? 'Uploading...' : 'Upload File'}
              </h3>
              <p className="text-white/50 text-sm px-4">
                Click to browse or drag and drop your text file here.
              </p>
            </label>
          </div>
        </div>

        {/* Files List */}
        <div className="md:col-span-2">
          <div className="glass-panel rounded-2xl p-6 h-full min-h-[300px]">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Your Files
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-white/40">
                <FileText className="w-10 h-10 mb-2 opacity-50" />
                <p>No files uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {files.map((file, i) => (
                    <motion.div
                      key={file.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-panel bg-white/5 border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                          <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="truncate">
                          <p className="text-white font-medium truncate">{file.name}</p>
                          <p className="text-xs text-white/40">
                            {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 flex items-center gap-2 flex-1 sm:flex-initial overflow-hidden group-hover:border-white/10 transition-colors">
                          <span className="text-xs text-green-400 font-mono whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px]">
                            curl -OJ {origin}/d/{file.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyCommand(file.name, i)}
                          className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/30 shrink-0"
                          title="Copy command"
                        >
                          {copiedIndex === i ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.name)}
                          disabled={deletingFile === file.name}
                          className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors border border-red-500/30 shrink-0 disabled:opacity-50"
                          title={`Delete ${file.name}`}
                          aria-label={`Delete ${file.name}`}
                        >
                          {deletingFile === file.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
