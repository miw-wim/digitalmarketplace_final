"use client";
import { useState, useEffect } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/lib/settings-store";

const inputCls = (err?: string) =>
  `w-full text-sm border rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:border-violet-400 ${err ? "border-red-400" : "border-slate-200"}`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const { shippingFee: storedFee, setShippingFee: saveShippingFee, categories: storedCats, setCategories: saveCategories, loaded } = useSettings();

  const [shippingFeeInput, setShippingFeeInput] = useState("");
  const [shippingError, setShippingError] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [newCatError, setNewCatError] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

  useEffect(() => { if (loaded) setShippingFeeInput(String(storedFee)); }, [loaded]);

  const handleSaveShipping = async () => {
    const val = parseFloat(shippingFeeInput);
    if (isNaN(val) || val < 0) { setShippingError("Enter a valid fee (≥ 0)."); return; }
    setSavingShipping(true);
    await saveShippingFee(val);
    setSavingShipping(false);
    showToast("Shipping fee saved.", "success");
  };

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) { setNewCatError("Category name is required."); return; }
    if (storedCats.some((c) => c.toLowerCase() === name.toLowerCase())) { setNewCatError("Category already exists."); return; }
    await saveCategories([...storedCats, name]);
    setNewCatName("");
    setNewCatError("");
    showToast("Category added.", "success");
  };

  const handleEditSave = async () => {
    const name = editName.trim();
    if (!name) { setEditError("Name is required."); return; }
    if (storedCats.some((c) => c !== editingCat && c.toLowerCase() === name.toLowerCase())) { setEditError("Category already exists."); return; }
    await saveCategories(storedCats.map((c) => c === editingCat ? name : c));
    setEditingCat(null);
    setEditName("");
    setEditError("");
    showToast("Category updated.", "success");
  };

  const handleDeleteCategory = async () => {
    if (!deletingCat) return;
    await saveCategories(storedCats.filter((c) => c !== deletingCat));
    setDeletingCat(null);
    showToast("Category deleted.", "success");
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <Section title="Shipping Defaults">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Default Shipping Fee (₱)</label>
          <input
            type="number"
            min="0"
            value={shippingFeeInput}
            onChange={(e) => { setShippingFeeInput(e.target.value); setShippingError(""); }}
            className={inputCls(shippingError)}
          />
          {shippingError && <p className="text-xs text-red-500 mt-1">{shippingError}</p>}
        </div>
        <button onClick={handleSaveShipping} disabled={savingShipping}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {savingShipping ? "Saving..." : "Save"}
        </button>
      </Section>

      <Section title="Category Management">
        <div className="flex gap-2">
          <div className="flex-1">
            <input value={newCatName} onChange={(e) => { setNewCatName(e.target.value); setNewCatError(""); }}
              placeholder="New category name..." className={inputCls(newCatError)} />
            {newCatError && <p className="text-xs text-red-500 mt-1">{newCatError}</p>}
          </div>
          <button onClick={handleAddCategory}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0">
            Add
          </button>
        </div>
        <div className="space-y-2">
          {storedCats.map((cat) => (
            <div key={cat} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
              {editingCat === cat ? (
                <div className="flex-1 flex gap-2 mr-2">
                  <input value={editName} onChange={(e) => { setEditName(e.target.value); setEditError(""); }}
                    className={`flex-1 text-sm border rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:border-violet-400 ${editError ? "border-red-400" : "border-slate-200"}`} />
                  {editError && <p className="text-xs text-red-500 self-center">{editError}</p>}
                </div>
              ) : (
                <span className="flex-1 text-sm font-medium text-slate-700">{cat}</span>
              )}
              <div className="flex gap-1.5 shrink-0">
                {editingCat === cat ? (
                  <>
                    <button onClick={handleEditSave} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-medium transition-colors">Save</button>
                    <button onClick={() => { setEditingCat(null); setEditError(""); }} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingCat(cat); setEditName(cat); setEditError(""); }} className="text-xs px-2.5 py-1 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 font-medium transition-colors">Edit</button>
                    <button onClick={() => setDeletingCat(cat)} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <ConfirmDialog open={!!deletingCat} title="Delete Category"
        message={`Delete "${deletingCat}"? This cannot be undone.`}
        confirmLabel="Delete" confirmClass="bg-red-600 hover:bg-red-500"
        onConfirm={handleDeleteCategory} onCancel={() => setDeletingCat(null)} />
    </div>
  );
}
