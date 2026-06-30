import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Trash2, ArrowUp, ArrowDown, Film, RefreshCw, X, Image as ImageIcon, Video } from "lucide-react";
import { mediaAPI } from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";

const MAX_ITEMS = 3;
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPT    = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

const isVideo = (url) => url && (url.includes(".mp4") || url.includes(".webm") || url.includes(".mov") || url.includes("video"));

function MediaCard({ item, index, total, onDelete, onMoveUp, onMoveDown, moveLoading }) {
  const url  = item.url ?? item.mediaUrl ?? "";
  const vid  = isVideo(url) || item.type?.startsWith("video");
  const busy = moveLoading === item.id;

  return (
    <div className="admin-card overflow-hidden">
      {/* Preview */}
      <div className="relative bg-gray-900" style={{ height: 220 }}>
        {vid
          ? <video src={url} className="w-full h-full object-contain" controls />
          : <img   src={url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
        }
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {vid ? <Video size={11} /> : <ImageIcon size={11} />}
          {vid ? "Video" : "Image"}
        </div>
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-bold">
          #{index + 1}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4">
        <p className="text-xs text-gray-500 truncate mb-3">{url.split("/").pop() || "media-file"}</p>
        <div className="flex gap-2">
          <button
            onClick={() => onMoveUp(item, index)}
            disabled={index === 0 || busy}
            className="btn-secondary p-2 disabled:opacity-30"
            title="Move up"
          >
            {busy ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <ArrowUp size={14} />}
          </button>
          <button
            onClick={() => onMoveDown(item, index)}
            disabled={index === total - 1 || busy}
            className="btn-secondary p-2 disabled:opacity-30"
            title="Move down"
          >
            <ArrowDown size={14} />
          </button>
          <div className="flex-1" />
          <button onClick={() => onDelete(item)} className="btn-danger gap-2 text-xs">
            <Trash2 size={13} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SpecialOfferMedia() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [moveLoading, setMoveLoad]    = useState(null);
  const [delItem,     setDelItem]     = useState(null);
  const [delLoading,  setDelLoading]  = useState(false);
  const [error,       setError]       = useState(null);
  const [uploadErr,   setUploadErr]   = useState(null);
  const [dragOver,    setDragOver]    = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mediaAPI.getAll();
      // Admin uses raw axios (no unwrapping interceptor).
      // Full shape: { success, statusCode, data: { media: [...], total: N } }
      const raw = res.data?.data ?? res.data ?? {};
      const data = Array.isArray(raw) ? raw : (raw.media ?? []);
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Upload ────────────────────────────────────────────────── */
  const handleFile = async (file) => {
    setUploadErr(null);
    if (!file) return;
    if (items.length >= MAX_ITEMS) {
      setUploadErr(`Maximum ${MAX_ITEMS} items allowed. Delete one first.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadErr("File exceeds 50 MB limit.");
      return;
    }
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"];
    if (!allowed.includes(file.type)) {
      setUploadErr("Unsupported file type. Use JPEG, PNG, WEBP, GIF, MP4, WEBM or MOV.");
      return;
    }

    const fd = new FormData();
    fd.append("media", file);
    setUploading(true);
    try {
      await mediaAPI.upload(fd);
      await load();
    } catch (e) {
      setUploadErr(e.message);
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e) => handleFile(e.target.files[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  /* ── Reorder ───────────────────────────────────────────────── */
  const moveItem = async (item, index, dir) => {
    const newItems = [...items];
    const swap     = index + dir;
    [newItems[index], newItems[swap]] = [newItems[swap], newItems[index]];
    setItems(newItems);
    setMoveLoad(item.id);
    try {
      const reordered = newItems.map((it, i) => ({ id: it.id, order: i }));
      await mediaAPI.reorder(reordered);
    } catch {
      // revert
      setItems(items);
    } finally {
      setMoveLoad(null);
    }
  };

  /* ── Delete ─────────────────────────────────────────────────── */
  const handleDeleteConfirm = async () => {
    setDelLoading(true);
    try {
      await mediaAPI.delete(delItem.id);
      setDelItem(null);
      setItems(prev => prev.filter(i => i.id !== delItem.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Special Offer Media</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length}/{MAX_ITEMS} slots used — shown on the user app's Special Offers section
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary gap-2">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Upload zone ── */}
      {items.length < MAX_ITEMS && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all p-10 ${
            dragOver ? "border-primary-400 bg-primary-50" : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onInputChange} />
          {uploading
            ? <>
                <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-primary-600 font-medium">Uploading…</p>
              </>
            : <>
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Upload size={28} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700">Drop a file or click to upload</p>
                <p className="text-sm text-gray-500 mt-1">JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV — max 50 MB</p>
                <p className="text-xs text-gray-400 mt-1">{MAX_ITEMS - items.length} slot{MAX_ITEMS - items.length !== 1 ? "s" : ""} remaining</p>
              </>
          }
        </div>
      )}

      {items.length >= MAX_ITEMS && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <Film size={15} />
          Maximum {MAX_ITEMS} media items reached. Delete an item to upload a new one.
        </div>
      )}

      {uploadErr && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{uploadErr}</span>
          <button onClick={() => setUploadErr(null)} className="text-red-400 hover:text-red-600"><X size={15} /></button>
        </div>
      )}

      {/* ── Media grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="admin-card animate-pulse">
              <div className="w-full bg-gray-200" style={{ height: 220 }} />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="admin-card p-16 text-center text-gray-400">
          <Film size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium text-lg">No media uploaded yet</p>
          <p className="text-sm mt-1">Upload up to {MAX_ITEMS} images or videos to display in the Special Offers section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <MediaCard
              key={item.id}
              item={item}
              index={i}
              total={items.length}
              onDelete={setDelItem}
              onMoveUp={(it, idx) => moveItem(it, idx, -1)}
              onMoveDown={(it, idx) => moveItem(it, idx, +1)}
              moveLoading={moveLoading}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!delItem}
        title="Remove Media"
        message="This will permanently delete the file from storage and remove it from the user app."
        confirmLabel="Remove"
        loading={delLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDelItem(null)}
      />
    </div>
  );
}
