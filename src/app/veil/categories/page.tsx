"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import { CATEGORY_COLORS, type Category, generateCategoryId, loadCategories, saveCategories } from "@/lib/categoryData";
import { notifyUpdate } from "@/lib/store";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  useEffect(() => {
    setCategories(loadCategories());
  }, []);

  function persist(next: Category[]) {
    setCategories(next);
    saveCategories(next);
    notifyUpdate();
  }

  function addCategory() {
    if (!name.trim()) return;
    persist([...categories, { id: generateCategoryId(), name: name.trim(), color }]);
    setName("");
    setColor(CATEGORY_COLORS[0]);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="border-b border-white/[0.06] pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Categories</h1>
        <p className="mt-0.5 text-[12px] text-white/30">Color-code your habits and routines.</p>
      </div>

      <Panel>
        <SectionTitle title="New Category" />
        <div className="mt-3 flex flex-col gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addCategory()}
            placeholder="Category name"
            className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500/50"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setColor(item)}
                className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: item, outline: color === item ? `2px solid ${item}` : "none", outlineOffset: "2px" }}
                aria-label={`Use color ${item}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addCategory}
            className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Add category
          </button>
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Your Categories" />
        <div className="mt-3 divide-y divide-white/[0.05]">
          {categories.length === 0 ? (
            <p className="py-3 text-[12px] text-white/25">No categories yet.</p>
          ) : categories.map((category) => (
            <div key={category.id} className="flex items-center gap-3 py-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? "#8b5cf6" }} />
              <span className="flex-1 text-sm text-white/80">{category.name}</span>
              <button
                type="button"
                onClick={() => persist(categories.filter((item) => item.id !== category.id))}
                className="rounded-md bg-rose-500/10 px-2.5 py-1 text-[10px] text-rose-400/70 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
