import { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';

const API_URL = process.env.REACT_APP_API_URL || '';
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const MAX_SIZE = 50 * 1024 * 1024;
const MAX_TITLE = 200;

function UploadForm({ onResult, onError }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const { getToken } = useAuth();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const validateFile = useCallback((selected) => {
    if (!selected) return 'No file selected.';
    if (!ALLOWED_TYPES.includes(selected.type)) {
      return 'Unsupported format. Use MP4, WebM, OGG, or MOV.';
    }
    if (selected.size > MAX_SIZE) {
      return 'File too large. Maximum 50MB.';
    }
    if (selected.size === 0) {
      return 'File is empty.';
    }
    return null;
  }, []);

  const handleFileChange = useCallback((e) => {
    const selected = e.target.files[0];
    onError('');
    if (!selected) {
      setFile(null);
      setPreview(null);
      return;
    }
    const err = validateFile(selected);
    if (err) {
      onError(err);
      setFile(null);
      setPreview(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }, [onError, validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      const err = validateFile(dropped);
      if (err) {
        onError(err);
        return;
      }
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
    }
  }, [onError, validateFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    onError('');

    if (!file) {
      onError('Please select a video file.');
      return;
    }
    if (!title.trim()) {
      onError('Please enter a video title.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title.trim());
    setLoading(true);
    setUploadProgress(0);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      const data = await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || 'Upload failed'));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
        xhr.open('POST', `${API_URL}/api/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
        xhr.send(formData);
      });

      onResult(data);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      <div
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? 'border-indigo-500 bg-indigo-500/5'
            : 'border-slate-600 hover:border-slate-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload video area"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
      >
        {preview ? (
          <div>
            <video
              src={preview}
              className="mx-auto max-h-64 rounded-lg"
              controls
              aria-label="Video preview"
            />
            <p className="mt-3 text-sm text-slate-400">
              {file && formatSize(file.size)}
            </p>
            <button
              type="button"
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
              onClick={() => {
                if (preview) URL.revokeObjectURL(preview);
                setFile(null);
                setPreview(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              aria-label="Remove video"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-400">
              Drag & drop or{' '}
              <button
                type="button"
                className="text-indigo-400 hover:text-indigo-300 underline"
                onClick={() => fileRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              MP4, WebM, OGG, MOV up to 50MB
            </p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-300">
          Video Title
          <span className="ml-2 text-xs text-slate-500">({title.length}/{MAX_TITLE})</span>
        </label>
        <input
          id="title"
          type="text"
          maxLength={MAX_TITLE}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 10 Minutes of Calm Ocean Waves"
          required
          aria-required="true"
          className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 outline-none transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !file || !title.trim()}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </span>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <span className="w-full max-w-xs bg-slate-700 rounded-full h-1.5">
                <span
                  className="bg-indigo-500 h-1.5 rounded-full block transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </span>
            )}
          </span>
        ) : (
          'Generate Metadata'
        )}
      </button>
    </form>
  );
}

function ResultView({ result, onReset }) {
  const [copied, setCopied] = useState({ description: false, tags: false });

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [field]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [field]: false })), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied((prev) => ({ ...prev, [field]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [field]: false })), 2000);
    }
  };

  const copyAll = () => {
    const text = `Title: ${result.title}\nDescription: ${result.description}\nTags: ${result.tags.join(' ')}`;
    copyToClipboard(text, 'all');
  };

  return (
    <div className="mt-8 space-y-6">
      {result.videoUrl && (
        <video
          src={`${API_URL}${result.videoUrl}`}
          className="w-full max-h-80 rounded-xl shadow-lg"
          controls
          aria-label="Uploaded video"
        />
      )}

      <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Title
          </h2>
        </div>
        <p className="text-lg font-medium text-white">{result.title}</p>

        {result.description && (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Description
              </h2>
              <button
                onClick={() => copyToClipboard(result.description, 'description')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                aria-label={copied.description ? 'Description copied' : 'Copy description'}
              >
                {copied.description ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-1 text-slate-300">{result.description}</p>
          </div>
        )}

        {result.tags && result.tags.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hashtags
              </h2>
              <button
                onClick={() => copyToClipboard(result.tags.join(' '), 'tags')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                aria-label={copied.tags ? 'Tags copied' : 'Copy tags'}
              >
                {copied.tags ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-sm text-indigo-300 border border-indigo-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Generate Another
        </button>
        <button
          onClick={copyAll}
          className="flex-1 rounded-lg bg-slate-700 px-4 py-3 text-sm font-medium text-white hover:bg-slate-600 transition-colors"
          aria-label="Copy all metadata"
        >
          Copy All
        </button>
      </div>
    </div>
  );
}

function HomePage() {
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const resetForm = () => {
    setResult(null);
    setError('');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight sm:text-5xl">
          Shorts AI
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Upload your video, get AI-generated descriptions and hashtags
        </p>
      </header>

      {error && (
        <div
          className="mt-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {!result ? (
        <UploadForm onResult={setResult} onError={setError} />
      ) : (
        <ResultView result={result} onReset={resetForm} />
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithBoundary;
