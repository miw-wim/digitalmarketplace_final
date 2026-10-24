"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";

const DEFAULTS = { shippingFee: 80, categories: ["Electronics", "Books", "Clothing", "Furniture", "Sports", "Other"] };

interface SettingsCtx {
  shippingFee: number;
  setShippingFee: (fee: number) => Promise<void>;
  categories: string[];
  setCategories: (cats: string[]) => Promise<void>;
  loaded: boolean;
}

const Ctx = createContext<SettingsCtx>({
  shippingFee: DEFAULTS.shippingFee,
  setShippingFee: async () => {},
  categories: DEFAULTS.categories,
  setCategories: async () => {},
  loaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [shippingFee, setShippingFeeState] = useState(DEFAULTS.shippingFee);
  const [categories, setCategoriesState] = useState(DEFAULTS.categories);
  const [loaded, setLoaded] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    const load = () => {
      if (saving.current) return; // don't overwrite while a save is in flight
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data.shippingFee != null) setShippingFeeState(data.shippingFee);
          if (data.categories) setCategoriesState(data.categories);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    };

    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const setShippingFee = async (fee: number) => {
    saving.current = true;
    setShippingFeeState(fee);
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shippingFee: fee }) });
    saving.current = false;
  };

  const setCategories = async (cats: string[]) => {
    saving.current = true;
    setCategoriesState(cats);
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: cats }) });
    saving.current = false;
  };

  return <Ctx.Provider value={{ shippingFee, setShippingFee, categories, setCategories, loaded }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
