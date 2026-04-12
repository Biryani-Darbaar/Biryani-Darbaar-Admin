import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw,
  UtensilsCrossed, Upload, X, FolderPlus, ChevronDown,
} from "lucide-react";
import { dishesAPI } from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";

/* ── helpers ─────────────────────────────────────────────────── */
const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const EMPTY_FORM = { name: "", description: "", price: "", category: "" };

/* ── DishForm modal ──────────────────────────────────────────── */
function DishForm({ categories, dish, onSave, onClose }) {
  const isEdit = !!dish;
  const [form, setForm]       = useState(() => isEdit
    ? { name: dish.name ?? dish.dishName ?? "", description: dish.description ?? "", price: String(dish.price ?? ""), category: dish.category ?? "" }
    : { ...EMPTY_FORM });
  const [imageFile, setImage] = useState(null);
  const [preview, setPreview] = useState(isEdit ? (dish.image ?? null) : null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState(null);
  const fileRef               = useRef();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const pickFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const validate = () => {
    if (!form.name.trim())         return "Dish name is required.";
    if (!form.category.trim())     return "Category is required.";
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      return "A valid price is required.";
    if (!isEdit && !imageFile)     return "An image is required for new dishes.";
    return null;
  };

  const submit = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setSaving(true);
    setErr(null);

    try {
      if (isEdit) {
        if (imageFile) {
          // With file → multipart
          const fd = new FormData();
          fd.append("image", imageFile);
          // Send other fields as JSON string so updateDishAdmin can parse
          const fields = { name: form.name, description: form.description, price: Number(form.price) };
          Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)));
          await dishesAPI.update(dish.category ?? form.category, dish.dishId, fd, true);
        } else {
          // No file → plain JSON update
          await dishesAPI.update(dish.category ?? form.category, dish.dishId, {
            name: form.name,
            description: form.description,
            price: Number(form.price),
          });
        }
      } else {
        const fd = new FormData();
        const dishData = {
          name: form.name,
          dishName: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
        };
        fd.append("dishData", JSON.stringify(dishData));
        fd.append("image", imageFile);
        await dishesAPI.add(fd);
      }
      onSave();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={saving ? undefined : onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Dish" : "Add New Dish"}</h2>
          {!saving && <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
        </div>
        <div className="p-6 space-y-4">
          {/* Image upload */}
          <div>
            <label className="form-label">Image {!isEdit && <span className="text-red-500">*</span>}</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-colors overflow-hidden"
              style={{ minHeight: 120 }}
            >
              {preview
                ? <img src={preview} alt="preview" className="w-full h-48 object-cover" />
                : <div className="py-8 text-center">
                    <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Click to upload image</p>
                  </div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
            {preview && (
              <button onClick={() => { setImage(null); setPreview(isEdit ? (dish.image ?? null) : null); }}
                className="mt-1 text-xs text-red-500 hover:text-red-700">Remove image</button>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="form-label">Dish Name <span className="text-red-500">*</span></label>
            <input className="form-input" placeholder="e.g. Chicken Biryani" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          {/* Category */}
          {!isEdit && (
            <div>
              <label className="form-label">Category <span className="text-red-500">*</span></label>
              <select className="form-select" value={form.category} onChange={e => set("category", e.target.value)}>
                <option value="">Select a category…</option>
                {categories.map(c => (
                  <option key={c.id ?? c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Price */}
          <div>
            <label className="form-label">Price (AUD) <span className="text-red-500">*</span></label>
            <input className="form-input" type="number" min="0" step="0.01" placeholder="e.g. 18.90"
              value={form.price} onChange={e => set("price", e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} placeholder="Brief description…"
              value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</span>
                : isEdit ? "Save Changes" : "Add Dish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AddCategoryForm ──────────────────────────────────────────── */
function AddCategoryModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!name.trim()) { setErr("Category name is required."); return; }
    setSaving(true);
    try {
      await dishesAPI.createCategory(name.trim());
      onSave();
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={saving ? undefined : onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">New Category</h2>
          {!saving && <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
        </div>
        <div>
          <label className="form-label">Category Name</label>
          <input className="form-input" placeholder="e.g. Breads" value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── DishCard ─────────────────────────────────────────────────── */
function DishCard({ dish, onEdit, onToggle, onDelete, actionLoading }) {
  const name  = dish.name ?? dish.dishName ?? "Unnamed Dish";
  const avail = dish.available !== false;
  const busy  = actionLoading === dish.dishId;

  return (
    <div className={`admin-card overflow-hidden transition-opacity ${avail ? "" : "opacity-60"}`}>
      <div className="relative">
        {dish.image
          ? <img src={dish.image} alt={name} className="w-full h-36 object-cover" />
          : <div className="w-full h-36 bg-gray-100 flex items-center justify-center"><UtensilsCrossed size={32} className="text-gray-300" /></div>
        }
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${avail ? "bg-green-500 text-white" : "bg-gray-400 text-white"}`}>
          {avail ? "Available" : "Hidden"}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{name}</h3>
        {dish.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dish.description}</p>}
        <p className="text-primary-600 font-bold mt-2">{AUD.format(parseFloat(dish.price ?? 0))}</p>
        <div className="flex gap-2 mt-3">
          <button onClick={() => onToggle(dish)} disabled={busy} title={avail ? "Hide dish" : "Show dish"}
            className="flex-1 btn-secondary justify-center py-1.5 text-xs gap-1">
            {busy ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : avail ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
          </button>
          <button onClick={() => onEdit(dish)} className="flex-1 btn-secondary justify-center py-1.5 text-xs gap-1">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={() => onDelete(dish)} className="btn-danger justify-center py-1.5 px-3 text-xs gap-1">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function Dishes() {
  const [categories, setCategories] = useState([]);
  const [dishes,     setDishes]     = useState([]);
  const [activeTab,  setActiveTab]  = useState(null);
  const [catLoading, setCatLoading] = useState(true);
  const [dishLoad,   setDishLoad]   = useState(false);
  const [actionLoad, setActionLoad] = useState(null);  // dishId being toggled/deleted
  const [error,      setError]      = useState(null);

  const [showDishForm,  setDishForm]  = useState(false);
  const [editDish,      setEditDish]  = useState(null);
  const [showCatModal,  setCatModal]  = useState(false);
  const [deleteDish,    setDelDish]   = useState(null);  // dish to confirm delete
  const [delCat,        setDelCat]    = useState(null);  // category name to confirm delete
  const [confirmLoad,   setConfLoad]  = useState(false);

  /* ── Load categories ─────────────── */
  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    setError(null);
    try {
      const res = await dishesAPI.getCategories();
      const cats = res.data?.data ?? res.data ?? [];
      const arr  = Array.isArray(cats) ? cats : [];
      // Backend returns plain strings (e.g. ["Biryani", "Chicken"]).
      // Normalise to {id, name} objects so the rest of the UI can use c.name uniformly.
      const normalized = arr.map((c) =>
        typeof c === "string" ? { id: c, name: c } : c,
      );
      setCategories(normalized);
      if (!activeTab && normalized.length > 0) setActiveTab(normalized[0].name);
    } catch (e) {
      setError(e.message);
    } finally {
      setCatLoading(false);
    }
  }, [activeTab]);

  /* ── Load dishes for active category ─────────────── */
  const loadDishes = useCallback(async (cat) => {
    if (!cat) return;
    setDishLoad(true);
    setError(null);
    try {
      const res = await dishesAPI.getByCategory(cat);
      setDishes(res.data?.data ?? res.data ?? []);
    } catch (e) {
      setError(e.message);
      setDishes([]);
    } finally {
      setDishLoad(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { if (activeTab) loadDishes(activeTab); }, [activeTab, loadDishes]);

  /* ── Toggle availability ─────────────── */
  const handleToggle = async (dish) => {
    setActionLoad(dish.dishId);
    const newVal = !(dish.available !== false);
    // Optimistic
    setDishes(prev => prev.map(d => d.dishId === dish.dishId ? { ...d, available: newVal } : d));
    try {
      await dishesAPI.toggleAvailability(activeTab, dish.dishId, newVal);
    } catch {
      // Revert
      setDishes(prev => prev.map(d => d.dishId === dish.dishId ? { ...d, available: !newVal } : d));
    } finally {
      setActionLoad(null);
    }
  };

  /* ── Delete dish ─────────────── */
  const handleDeleteConfirm = async () => {
    setConfLoad(true);
    try {
      await dishesAPI.delete(activeTab, deleteDish.dishId);
      setDelDish(null);
      setDishes(prev => prev.filter(d => d.dishId !== deleteDish.dishId));
    } catch (e) {
      setError(e.message);
    } finally {
      setConfLoad(false);
    }
  };

  /* ── Delete category ─────────────── */
  const handleDelCatConfirm = async () => {
    setConfLoad(true);
    try {
      await dishesAPI.deleteCategory(delCat);
      setDelCat(null);
      const next = categories.filter(c => c.name !== delCat);
      setCategories(next);
      if (activeTab === delCat) {
        const first = next[0]?.name ?? null;
        setActiveTab(first);
        if (first) loadDishes(first); else setDishes([]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setConfLoad(false);
    }
  };

  /* ── After save (add/edit) ─────────────── */
  const handleSaved = () => {
    setDishForm(false);
    setEditDish(null);
    loadDishes(activeTab);
    // If we added a new category via the form, refresh category list
    loadCategories();
  };

  /* ── Render ─────────────── */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dishes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your menu items</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCatModal(true)} className="btn-secondary gap-2">
            <FolderPlus size={15} /> New Category
          </button>
          <button onClick={() => { setEditDish(null); setDishForm(true); }} className="btn-primary gap-2">
            <Plus size={15} /> Add Dish
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Category tabs ── */}
      {catLoading ? (
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="admin-card p-12 text-center text-gray-400">
          <UtensilsCrossed size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No categories yet.</p>
          <button onClick={() => setCatModal(true)} className="btn-primary mt-4 gap-2">
            <FolderPlus size={15} /> Create First Category
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            {categories.map((c) => {
              const nm = c.name ?? c.id;
              return (
                <div key={nm} className="flex items-center">
                  <button
                    onClick={() => setActiveTab(nm)}
                    className={`px-4 py-2 rounded-l-lg text-sm font-medium border transition-colors ${
                      activeTab === nm
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {nm}
                  </button>
                  <button
                    onClick={() => setDelCat(nm)}
                    title="Delete category"
                    className={`px-2 py-2 rounded-r-lg text-sm border-y border-r transition-colors ${
                      activeTab === nm
                        ? "bg-primary-700 text-white border-primary-600 hover:bg-red-600"
                        : "bg-white text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-500"
                    }`}
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Dishes grid ── */}
          {dishLoad ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="admin-card animate-pulse">
                  <div className="w-full h-36 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : dishes.length === 0 ? (
            <div className="admin-card p-12 text-center text-gray-400">
              <UtensilsCrossed size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No dishes in "{activeTab}" yet.</p>
              <button onClick={() => { setEditDish(null); setDishForm(true); }} className="btn-primary mt-4 gap-2">
                <Plus size={15} /> Add First Dish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {dishes.map((d) => (
                <DishCard
                  key={d.dishId}
                  dish={{ ...d, category: activeTab }}
                  onEdit={(dish) => { setEditDish(dish); setDishForm(true); }}
                  onToggle={handleToggle}
                  onDelete={setDelDish}
                  actionLoading={actionLoad}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {showDishForm && (
        <DishForm
          categories={categories}
          dish={editDish}
          onSave={handleSaved}
          onClose={() => { setDishForm(false); setEditDish(null); }}
        />
      )}
      {showCatModal && (
        <AddCategoryModal
          onSave={() => { setCatModal(false); loadCategories(); }}
          onClose={() => setCatModal(false)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteDish}
        title="Delete Dish"
        message={`Are you sure you want to delete "${deleteDish?.name ?? deleteDish?.dishName}"? This will also remove the image from storage.`}
        confirmLabel="Delete"
        loading={confirmLoad}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDelDish(null)}
      />

      <ConfirmDialog
        isOpen={!!delCat}
        title="Delete Category"
        message={`Delete the "${delCat}" category? All dishes inside will be permanently removed.`}
        confirmLabel="Delete Category"
        loading={confirmLoad}
        onConfirm={handleDelCatConfirm}
        onCancel={() => setDelCat(null)}
      />
    </div>
  );
}
