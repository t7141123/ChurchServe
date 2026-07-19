"use client";

import { useState, useEffect, useCallback, startTransition } from "react";

interface Icebreaker {
  id: number;
  name: string;
  description: string;
  category: string;
  duration: string;
  people_min: number;
  people_max: number;
  materials: string;
  is_active: number;
}

export default function IcebreakersPage() {
  const [items, setItems] = useState<Icebreaker[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState("");
  const [peopleMin, setPeopleMin] = useState(0);
  const [peopleMax, setPeopleMax] = useState(0);
  const [materials, setMaterials] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editPeopleMin, setEditPeopleMin] = useState(0);
  const [editPeopleMax, setEditPeopleMax] = useState(0);
  const [editMaterials, setEditMaterials] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const authHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const refetch = useCallback(() => {
    fetch("/api/icebreakers?all=1")
      .then((res) => { if (!res.ok) throw new Error("載入失敗"); return res.json(); })
      .then((d) => setItems(d))
      .catch(() => setErrorMsg("載入推薦清單失敗"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { startTransition(() => { refetch(); }); }, [refetch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/icebreakers", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          description,
          category,
          duration,
          people_min: peopleMin,
          people_max: peopleMax,
          materials,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "建立失敗");
      }
      setName(""); setDescription(""); setCategory(""); setDuration(""); setPeopleMin(0); setPeopleMax(0); setMaterials("");
      refetch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "建立失敗");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/icebreakers/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription,
          category: editCategory,
          duration: editDuration,
          people_min: editPeopleMin,
          people_max: editPeopleMax,
          materials: editMaterials,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }
      setEditingId(null);
      refetch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新失敗");
    }
  };

  const handleDelete = async (item: Icebreaker) => {
    if (!confirm(`確定要刪除「${item.name}」嗎？`)) return;
    try {
      const res = await fetch(`/api/icebreakers/${item.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "刪除失敗");
      }
      refetch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const startEdit = (item: Icebreaker) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description);
    setEditCategory(item.category);
    setEditDuration(item.duration);
    setEditPeopleMin(item.people_min);
    setEditPeopleMax(item.people_max);
    setEditMaterials(item.materials);
  };

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateClick = (e: React.FormEvent) => {
    handleCreate(e).then(() => setShowCreateModal(false));
  };

  return (
    <>
      <div className="mb-8 animate-fadeIn">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div>
            <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)]">破冰遊戲推薦</h1>
            <p className="text-sm text-[var(--color-muted)]">{items.length} 個遊戲</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] shadow-md shadow-[var(--color-primary)]/20 transition-all duration-200 hover:shadow-lg hover:translate-y-[-1px]">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              新增推薦
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-lg shadow-modal animate-scaleIn max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold font-serif text-[var(--color-primary-dark)] mb-4">新增推薦</h3>
            <form onSubmit={handleCreateClick}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="遊戲名稱 *" className="px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="類別（如：自我介紹、團隊合作）" list="category-list" className="px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                <datalist id="category-list">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
                <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="所需時間（如：5-10 分鐘）" className="px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                <div className="flex gap-2">
                  <input type="number" value={peopleMin} onChange={(e) => setPeopleMin(Number(e.target.value))} placeholder="最少人數" className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                  <input type="number" value={peopleMax} onChange={(e) => setPeopleMax(Number(e.target.value))} placeholder="最多人數" className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                </div>
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="遊戲說明" rows={3} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
              <input type="text" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="所需器材" className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]">取消</button>
                <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] shadow-sm transition-all disabled:opacity-50">新增</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: "var(--color-surface)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div className="h-5 w-48 rounded bg-[var(--color-border-light)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">尚無推薦的破冰遊戲</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="glass rounded-2xl p-4 transition-all duration-200 hover:shadow-elevated animate-slideUp" style={{ animationDelay: `${idx * 40}ms` }}>
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                    <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                    <input type="text" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                    <div className="flex gap-2">
                      <input type="number" value={editPeopleMin} onChange={(e) => setEditPeopleMin(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                      <input type="number" value={editPeopleMax} onChange={(e) => setEditPeopleMax(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                    </div>
                  </div>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                  <input type="text" value={editMaterials} onChange={(e) => setEditMaterials(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(item.id)} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-secondary-dark)] shadow-sm transition-all hover:shadow-md">儲存</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]">取消</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--color-text)]">{item.name}</span>
                      {item.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]">{item.category}</span>
                      )}
                      {!item.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-border-light)] text-[var(--color-muted)]">停用</span>}
                    </div>
                    {item.description && <p className="text-sm text-[var(--color-text-light)] mb-1 whitespace-pre-line">{item.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                      {item.duration && <span>⏱ {item.duration}</span>}
                      {(item.people_min > 0 || item.people_max > 0) && (
                        <span>👥 {item.people_min}{item.people_max > item.people_min ? `-${item.people_max}` : ""} 人</span>
                      )}
                      {item.materials && <span>📦 {item.materials}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(item)} className="px-3 py-1.5 rounded-xl text-xs border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]">編輯</button>
                    <button onClick={() => handleDelete(item)} className="px-3 py-1.5 rounded-xl text-xs text-[var(--color-danger)] border border-[var(--color-danger)]/20 transition-all hover:bg-[var(--color-danger)]/5">刪除</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
