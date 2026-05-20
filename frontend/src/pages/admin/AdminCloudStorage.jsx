import { useState, useEffect, useMemo, useCallback } from 'react';
import { Cloud, UploadCloud, FolderPlus, Search, Grid, List, Sparkles, Trash2, Star, ArrowUpDown, DownloadCloud, Eye, ArrowRight, FileText, Play, Music, File } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const fileTypeIcon = (type) => {
  if (type === 'image') return <FileText size={18} style={{ transform: 'rotate(0deg)' }} />;
  if (type === 'video') return <Play size={18} />;
  if (type === 'audio') return <Music size={18} />;
  return <File size={18} />;
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const Badge = ({ label, color }) => (
  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color, background: 'rgba(255,255,255,0.8)', borderRadius: 999, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>{label}</span>
);

const FilePreviewModal = ({ file, onClose, onAction }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) return;
    setPreviewUrl(null);
    setTextContent('');
    if (file.resource_type === 'image' || file.resource_type === 'video' || file.resource_type === 'audio') {
      setPreviewUrl(file.preview_url || file.secure_url);
      return;
    }
    const fetchText = async () => {
      setLoading(true);
      try {
        const secure = await api.get(`/admin/cloud/files/${file.id}/secure-url`);
        const res = await fetch(secure.data.url);
        const text = await res.text();
        setTextContent(text.slice(0, 12000));
      } catch (err) {
        setTextContent('Preview unavailable for this file type.');
      } finally {
        setLoading(false);
      }
    };
    fetchText();
  }, [file]);

  if (!file) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(15,23,42,0.75)', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 960, maxHeight: '90vh', overflowY: 'auto', background: 'rgba(15,23,42,0.96)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', padding: 20, color: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Badge label={file.resource_type || 'file'} color='#f97316' />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{file.human_size}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{file.display_name}</h2>
            <p style={{ margin: '8px 0 0', color: '#cbd5e1', fontSize: 13 }}>{file.description || 'Private admin cloud asset'}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onAction('download', file)} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.04)', color: '#fff', padding: '10px 14px', borderRadius: 14, cursor: 'pointer' }}>
              <DownloadCloud size={16} style={{ marginRight: 6 }} /> Download
            </button>
            <button onClick={onClose} style={{ border: 'none', background: 'rgba(248,250,252,0.08)', color: '#f8fafc', padding: '10px 14px', borderRadius: 14, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>

        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a' }}>
          {file.resource_type === 'image' && previewUrl && (
            <img src={previewUrl} alt={file.display_name} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', background: '#0f172a' }} />
          )}
          {file.resource_type === 'video' && previewUrl && (
            <video controls src={previewUrl} style={{ width: '100%', height: 'auto', display: 'block', background: '#000' }} />
          )}
          {file.resource_type === 'audio' && previewUrl && (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Music size={48} color='#f97316' />
              <p style={{ margin: '16px 0 0', color: '#cbd5e1' }}>Audio preview is ready.</p>
              <audio controls src={previewUrl} style={{ width: '100%', marginTop: 14 }} />
            </div>
          )}
          {file.resource_type === 'raw' && (
            <div style={{ padding: 24, minHeight: 260, color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: 520 }}>
              {loading ? 'Loading file preview…' : textContent || 'Preview unavailable for this file type.'}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 18 }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Location</div>
            <div style={{ marginTop: 10, color: '#fff', fontWeight: 700 }}>{file.folder_id ? `Folder #${file.folder_id}` : 'Root'}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Uploaded</div>
            <div style={{ marginTop: 10, color: '#fff', fontWeight: 700 }}>{new Date(file.uploaded_at).toLocaleString()}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Type</div>
            <div style={{ marginTop: 10, color: '#fff', fontWeight: 700 }}>{file.resource_type}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const folderTree = (folders = []) => {
  const roots = folders.filter((folder) => folder.parent_id === null);
  const childrenByParent = folders.reduce((acc, folder) => {
    const parent = folder.parent_id || null;
    acc[parent] = [...(acc[parent] || []), folder];
    return acc;
  }, {});

  const build = (items) => items.map((folder) => ({
    ...folder,
    children: build(childrenByParent[folder.id] || []),
  }));

  return build(roots);
};

const renderFolderItem = (folder, activeFolder, onSelect, level = 0) => (
  <div key={folder.id} style={{ marginLeft: level * 14, marginBottom: 6 }}>
    <button onClick={() => onSelect(folder.id)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(148,163,184,0.15)', background: activeFolder === folder.id ? 'rgba(249,115,22,0.15)' : 'rgba(15,23,42,0.72)', color: activeFolder === folder.id ? '#fff' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <FolderPlus size={14} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>{folder.name}</span>
    </button>
    {folder.children?.length > 0 && folder.children.map((child) => renderFolderItem(child, activeFolder, onSelect, level + 1))}
  </div>
);

export default function AdminCloudStorage() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sort, setSort] = useState('uploaded_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newFolderName, setNewFolderName] = useState('');
  const [trashView, setTrashView] = useState(false);

  const fetchCloudAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/admin/cloud/analytics');
      setAnalytics(res.data);
    } catch (err) {
      toast.error('Unable to fetch storage analytics');
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await api.get('/admin/cloud/folders');
      setFolders(res.data.folders || []);
      const rootFolder = res.data.folders?.find((item) => item.path === '/');
      if (!selectedFolder && rootFolder) setSelectedFolder(rootFolder.id);
    } catch (err) {
      toast.error('Failed to load folders');
    }
  }, [selectedFolder]);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, sort, order });
      if (selectedFolder) params.set('folder_id', selectedFolder);
      if (query) params.set('search', query);
      if (trashView) params.set('trashed', 'true');
      const res = await api.get(`/admin/cloud/files?${params.toString()}`);
      setFiles(res.data.files || []);
    } catch (err) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, query, page, limit, sort, order, trashView]);

  useEffect(() => {
    fetchFolders();
    fetchCloudAnalytics();
  }, [fetchFolders, fetchCloudAnalytics]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (event) => {
    const items = Array.from(event.target.files || []);
    if (!items.length) return;
    const form = new FormData();
    items.forEach((file) => form.append('files', file));
    if (selectedFolder) form.append('folder_id', selectedFolder);
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await api.post('/admin/cloud/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        },
      });
      if (res.data.files?.length) {
        toast.success('Files uploaded to Cloud Vault');
        fetchFiles();
        fetchCloudAnalytics();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.post('/admin/cloud/folders', { name: newFolderName, parent_id: selectedFolder });
      setNewFolderName('');
      fetchFolders();
      toast.success('Folder created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create folder');
    }
  };

  const handleFileAction = async (action, file) => {
    if (action === 'download') {
      try {
        const result = await api.get(`/admin/cloud/files/${file.id}/secure-url`);
        const link = document.createElement('a');
        link.href = result.data.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        toast.error('Failed to generate secure download');
      }
    }
  };

  const handleTrashToggle = async (file, restore = false) => {
    try {
      if (restore) {
        await api.put(`/admin/cloud/files/${file.id}/restore`);
        toast.success('File restored');
      } else {
        await api.delete(`/admin/cloud/files/${file.id}`);
        toast.success('Moved to trash');
      }
      fetchFiles();
      fetchCloudAnalytics();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const folderList = useMemo(() => folderTree(folders), [folders]);
  const selectedFolderName = useMemo(() => folders.find((item) => item.id === selectedFolder)?.name || 'Root', [folders, selectedFolder]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, rgba(249,115,22,0.16), rgba(255,255,255,0.04))' }}>
              <Cloud size={22} color='#fb923c' />
            </div>
            <div>
              <div style={{ color: '#f8fafc', fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>Private Cloud Vault</div>
              <h1 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, color: '#fff' }}>Admin Cloud Storage</h1>
            </div>
          </div>
          <p style={{ maxWidth: 720, color: '#cbd5e1', fontSize: 14, lineHeight: 1.8 }}>Secure, private, Cloudinary-powered file storage for admins only. Upload images, docs, videos, design assets and manage them inside a premium admin drive.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <label htmlFor='cloud-upload-input' style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 16, background: '#111827', color: '#fff', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)' }}>
            <UploadCloud size={16} /> Quick Upload
          </label>
          <input id='cloud-upload-input' type='file' multiple hidden onChange={handleUpload} />
          <button onClick={() => setTrashView((prev) => !prev)} style={{ padding: '12px 18px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', background: trashView ? '#f97316' : 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}>
            {trashView ? 'Back to Drive' : 'Open Trash'}
          </button>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        <div style={{ padding: 20, borderRadius: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ color: '#cbd5e1', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Storage used</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{analytics ? formatBytes(analytics.total_bytes) : '—'}</div>
            </div>
            <Sparkles size={24} color='#f97316' />
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ width: analytics ? `${Math.min(100, (analytics.total_bytes / (1024 * 1024 * 1024)) * 10)}%` : '0%', height: '100%', background: '#f97316', borderRadius: 999, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <div style={{ padding: 20, borderRadius: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ color: '#cbd5e1', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Files stored</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{analytics ? analytics.total_files : '—'}</div>
            </div>
            <FolderPlus size={24} color='#38bdf8' />
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Latest file: {analytics?.recent_files?.[0]?.display_name || '—'}</div>
        </div>
        <div style={{ padding: 20, borderRadius: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ color: '#cbd5e1', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Favorite items</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{analytics ? analytics.favorites : '—'}</div>
            </div>
            <Star size={24} color='#facc15' />
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Secure metadata and private access</div>
        </div>
        <div style={{ padding: 20, borderRadius: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ color: '#cbd5e1', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Trash</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{analytics ? analytics.trashed_files : '—'}</div>
            </div>
            <Trash2 size={24} color='#f87171' />
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>Recover files any time from the private trash</div>
        </div>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: 280 }}>
            <Search size={16} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search filename, type, tags…'
              style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', outline: 'none' }}
            />
          </div>
          <button onClick={() => setViewMode('grid')} style={{ padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: viewMode === 'grid' ? '#f97316' : 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer' }}><Grid size={16} /></button>
          <button onClick={() => setViewMode('list')} style={{ padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: viewMode === 'list' ? '#f97316' : 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer' }}><List size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', outline: 'none' }}>
            <option value='uploaded_at'>Newest</option>
            <option value='size_bytes'>Size</option>
            <option value='display_name'>Name</option>
          </select>
          <button onClick={() => setOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))} style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', cursor: 'pointer' }}>
            <ArrowUpDown size={16} /> {order === 'desc' ? 'Descending' : 'Ascending'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18, alignItems: 'start' }}>
        <aside style={{ borderRadius: 24, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: 20 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Cloud size={18} color='#38bdf8' />
              <h2 style={{ margin: 0, fontSize: 15, color: '#fff' }}>Folders</h2>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Navigate your private drive with nested folders.</div>
          </div>
          <div style={{ marginBottom: 18, maxHeight: 360, overflowY: 'auto', paddingRight: 6 }}>
            {folderList.length ? folderList.map((folder) => renderFolderItem(folder, selectedFolder, setSelectedFolder)) : <div style={{ color: '#94a3b8', fontSize: 13 }}>No folders yet.</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder='New folder name'
              style={{ flex: 1, padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f8fafc', outline: 'none' }}
            />
            <button onClick={createFolder} style={{ padding: '12px 14px', borderRadius: 14, background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer' }}><FolderPlus size={18} /></button>
          </div>
          <div style={{ marginTop: 20, padding: 16, borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Current location</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{selectedFolderName}</div>
          </div>
        </aside>

        <main>
          {uploading && (
            <div style={{ marginBottom: 18, padding: 16, borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ color: '#fff', fontWeight: 700 }}>Uploading files</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{uploadProgress}%</div>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.1)' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', borderRadius: 999, background: '#f97316', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fit,minmax(240px,1fr))' : '1fr', gap: 16 }}>
            {loading ? Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} style={{ minHeight: 180, borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            )) : files.length ? files.map((file) => (
              <div key={file.id} style={{ borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 220 }}>
                <button onClick={() => setActiveFile(file)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ minHeight: 168, position: 'relative', display: 'grid', placeItems: 'center', background: 'rgba(15,23,42,0.9)' }}>
                    {file.preview_url ? (
                      file.resource_type === 'image' ? (
                        <img src={file.preview_url} alt={file.display_name} style={{ width: '100%', height: 168, objectFit: 'cover', display: 'block' }} />
                      ) : file.resource_type === 'video' ? (
                        <div style={{ position: 'relative', width: '100%', height: 168, background: '#000' }}>
                          <video src={file.preview_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload='metadata' />
                          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}><Play size={32} /></div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 168, color: '#cbd5e1' }}>{fileTypeIcon(file.resource_type)}</div>
                      )
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 168, color: '#cbd5e1' }}>{fileTypeIcon(file.resource_type)}</div>
                    )}
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                      {file.is_favorite && <Star size={16} color='#facc15' />}
                      {file.is_trashed && <Trash2 size={16} color='#f87171' />}
                    </div>
                  </div>
                </button>
                <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{file.display_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{file.resource_type.toUpperCase()}</div>
                    </div>
                    <button onClick={() => handleFileAction('download', file)} style={{ border: 'none', background: 'rgba(249,115,22,0.12)', color: '#f97316', borderRadius: 14, padding: '10px 12px', cursor: 'pointer' }}><DownloadCloud size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                    <span>{formatBytes(file.size_bytes)}</span>
                    <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ padding: 40, borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.22)', textAlign: 'center', color: '#cbd5e1' }}>
                <Cloud size={32} color='#94a3b8' style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Your drive is empty</div>
                <div style={{ maxWidth: 420, margin: '0 auto', color: '#94a3b8', lineHeight: 1.8 }}>Upload your first secure file and start building a private admin cloud with folders, previews, and analytics.</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, color: '#94a3b8', fontSize: 13 }}>
            <span>{files.length ? `${files.length} items displayed` : 'No items to display'}</span>
            <span>Folder: {selectedFolderName}</span>
          </div>
        </main>
      </div>

      <button onClick={() => document.getElementById('cloud-upload-input')?.click()} style={{ position: 'fixed', right: 24, bottom: 24, borderRadius: 18, border: 'none', background: '#f97316', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 24px 60px rgba(249,115,22,0.24)', cursor: 'pointer' }}>
        <UploadCloud size={18} /> Quick Upload
      </button>

      {activeFile && <FilePreviewModal file={activeFile} onClose={() => setActiveFile(null)} onAction={handleFileAction} />}
    </div>
  );
}
