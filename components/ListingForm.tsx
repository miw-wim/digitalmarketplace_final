"use client";
import { useState, useRef } from "react";
import type { Listing, ListingStatus } from "@/lib/types";
import { useSettings } from "@/lib/settings-store";

interface ListingFormProps {
  initial?: Partial<Listing>;
  onSubmit: (data: Partial<Listing>) => Promise<void>;
  onCancel: () => void;
}

interface Errors { title?: string; price?: string; description?: string; category?: string; stock?: string }

export default function ListingForm({ initial, onSubmit, onCancel }: ListingFormProps) {
  const { categories } = useSettings();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [category, setCategory] = useState<string>(initial?.category ?? "Other");
  const [status, setStatus] = useState<ListingStatus>(initial?.status ?? "pending");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [stock, setStock] = useState(String(initial?.stock ?? ""));
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = "Title is required";
    if (!description.trim()) e.description = "Description is required";
    if (!price || isNaN(Number(price)) || Number(price) <= 0) e.price = "Valid price required";
    if (!stock || isNaN(Number(stock)) || Number(stock) < 0) e.stock = "Valid stock required";
    return e;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    const { supabase } = await import("@/lib/supabase");
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("products").upload(path, file, { upsert: true });
      if (error) { console.error("Upload error:", error.message); continue; }
      const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(path);
      setImages((prev) => [...prev, publicUrl]);
    }
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await onSubmit({ title, description, price: Number(price), category, status, images, stock: Number(stock) });
    setLoading(false);
  };

  const inp = (hasError: boolean) =>
    `w-full px-4 py-3 bg-white/5 border ${hasError ? "border-red-500" : "border-white/15"} rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-sm`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setErrors((er) => ({ ...er, title: undefined })); }}
          placeholder="What are you selling?" className={inp(!!errors.title)} />
        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
        <textarea value={description} onChange={(e) => { setDescription(e.target.value); setErrors((er) => ({ ...er, description: undefined })); }}
          placeholder="Describe the item, condition, etc." rows={3}
          className={`${inp(!!errors.description)} resize-none`} />
        {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Price (₱)</label>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => { setPrice(e.target.value); setErrors((er) => ({ ...er, price: undefined })); }}
            placeholder="0.00" className={inp(!!errors.price)} />
          {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Stock</label>
          <input type="number" min="0" step="1" value={stock} onChange={(e) => { setStock(e.target.value); setErrors((er) => ({ ...er, stock: undefined })); }}
            placeholder="0" className={inp(!!errors.stock)} />
          {errors.stock && <p className="text-xs text-red-400 mt-1">{errors.stock}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all text-sm">
            {categories.map((c) => <option key={c} value={c} className="bg-[#0f0f1a]">{c}</option>)}
          </select>
        </div>
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Images</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-8 border-2 border-dashed border-white/20 hover:border-violet-500/60 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-violet-400 transition-all bg-white/3 hover:bg-violet-500/5 disabled:opacity-60"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">{uploading ? "Uploading…" : "Click to choose images"}</span>
          <span className="text-xs text-gray-600">PNG, JPG, WEBP — multiple allowed</span>
        </button>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {images.map((src, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-white/5">
                <img src={src} alt={`preview ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {initial && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)}
            className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all text-sm">
            {["active", "sold", "pending", "removed"].map((s) => <option key={s} value={s} className="bg-[#0f0f1a]">{s}</option>)}
          </select>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl transition-colors text-sm">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm">
          {loading ? "Saving…" : initial ? "Save changes" : "Create listing"}
        </button>
      </div>
    </form>
  );
}
