import { useState, useEffect, useMemo } from "react";
import { X, Trash2, RotateCcw, Laptop, Search, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { api, type Profile } from "../lib/api";

interface RecycleBinDialogProps {
  onCancel: () => void;
  onRefreshProfiles: () => void;
  showFeedback?: (msg: string) => void;
}

// ─── Internal Toast ───────────────────────────────────────────────────────────
function InternalToast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed top-4 right-4 z-[9999] px-4 py-2.5 rounded-lg shadow-xl text-white text-xs font-medium flex items-center gap-2 animate-bounce border ${
        type === "success"
          ? "bg-emerald-600 border-emerald-500"
          : "bg-rose-600 border-rose-500"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      )}
      {message}
    </div>
  );
}

// ─── Internal Confirm Dialog State ───────────────────────────────────────────
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  warning: string;
  confirmLabel: string;
  confirmColor: "rose" | "amber";
  onConfirm: () => void;
}

const defaultConfirm: ConfirmState = {
  open: false,
  title: "",
  message: "",
  warning: "",
  confirmLabel: "Xác nhận",
  confirmColor: "rose",
  onConfirm: () => {},
};

export function RecycleBinDialog({ onCancel, onRefreshProfiles, showFeedback }: RecycleBinDialogProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Internal toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Internal confirm dialog state
  const [confirmState, setConfirmState] = useState<ConfirmState>(defaultConfirm);

  // Drag to select states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Show toast helper
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (type === "success" && showFeedback) {
      showFeedback(message);
    }
    setTimeout(() => setToast(null), 2500);
  };

  // Open confirm dialog helper
  const openConfirm = (opts: Omit<ConfirmState, "open">) => {
    setConfirmState({ ...opts, open: true });
  };

  const closeConfirm = () => setConfirmState(defaultConfirm);

  // Load deleted profiles
  const fetchDeleted = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDeletedProfiles();
      setProfiles(data);
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách thùng rác.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  const filtered = useMemo(() => {
    return profiles.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.proxy && p.proxy.toLowerCase().includes(search.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()))
    );
  }, [profiles, search]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStartIndex(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleRowMouseDown = (e: React.MouseEvent, id: string, idx: number) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) return;
    if (e.button !== 0) return;

    if (e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
      setLastClickedIndex(idx);
    } else if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, idx);
      const end = Math.max(lastClickedIndex, idx);
      setSelectedIds(filtered.slice(start, end + 1).map((p) => p.id));
    } else {
      setSelectedIds([id]);
      setLastClickedIndex(idx);
      setIsDragging(true);
      setDragStartIndex(idx);
    }
  };

  const handleRowMouseEnter = (idx: number) => {
    if (!isDragging || dragStartIndex === null) return;
    const start = Math.min(dragStartIndex, idx);
    const end = Math.max(dragStartIndex, idx);
    setSelectedIds(filtered.slice(start, end + 1).map((p) => p.id));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filtered.map((p) => p.id) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleRestore = (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    openConfirm({
      title: "Khôi phục Profile",
      message: `Bạn có chắc chắn muốn khôi phục profile "${profile?.name}" không?`,
      warning: "ℹ️ Profile sẽ được khôi phục về danh sách quản lý bình thường.",
      confirmLabel: "Khôi phục",
      confirmColor: "amber",
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.restoreProfile(id);
          setProfiles((prev) => prev.filter((p) => p.id !== id));
          setSelectedIds((prev) => prev.filter((x) => x !== id));
          onRefreshProfiles();
          showToast(`Đã khôi phục profile "${profile?.name}" thành công!`, "success");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Khôi phục profile thất bại.", "error");
        }
      },
    });
  };

  const handleForceDelete = (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    openConfirm({
      title: "Xóa vĩnh viễn Profile",
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn profile "${profile?.name}" không?`,
      warning: "⚠️ Hành động này sẽ xóa hoàn toàn dữ liệu trình duyệt trên ổ đĩa và KHÔNG THỂ hoàn tác!",
      confirmLabel: "Xóa vĩnh viễn",
      confirmColor: "rose",
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.forceDeleteProfile(id);
          setProfiles((prev) => prev.filter((p) => p.id !== id));
          setSelectedIds((prev) => prev.filter((x) => x !== id));
          onRefreshProfiles();
          showToast(`Đã xóa vĩnh viễn profile "${profile?.name}"!`, "success");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Xóa vĩnh viễn thất bại.", "error");
        }
      },
    });
  };

  const handleBulkRestore = () => {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: "Khôi phục hàng loạt",
      message: `Bạn có chắc chắn muốn khôi phục ${selectedIds.length} profile đã chọn không?`,
      warning: "Các profile sẽ được khôi phục về danh sách quản lý bình thường.",
      confirmLabel: "Khôi phục tất cả",
      confirmColor: "amber",
      onConfirm: async () => {
        closeConfirm();
        try {
          const res = await api.bulkRestoreProfiles(selectedIds);
          const restored = res.success;
          setProfiles((prev) => prev.filter((p) => !restored.includes(p.id)));
          setSelectedIds((prev) => prev.filter((x) => !restored.includes(x)));
          onRefreshProfiles();
          const failCount = Object.keys(res.failed).length;
          if (failCount > 0) {
            showToast(`Khôi phục ${restored.length} profile thành công. ${failCount} thất bại.`, "error");
          } else {
            showToast(`Đã khôi phục thành công ${restored.length} profile!`, "success");
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Khôi phục hàng loạt thất bại.", "error");
        }
      },
    });
  };

  const handleBulkForceDelete = () => {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: "Xóa vĩnh viễn hàng loạt",
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} profile đã chọn không?`,
      warning: "⚠️ Mọi dữ liệu trình duyệt sẽ bị xóa hoàn toàn và KHÔNG THỂ hoàn tác!",
      confirmLabel: "Xóa vĩnh viễn tất cả",
      confirmColor: "rose",
      onConfirm: async () => {
        closeConfirm();
        try {
          const res = await api.bulkForceDeleteProfiles(selectedIds);
          const deleted = res.success;
          setProfiles((prev) => prev.filter((p) => !deleted.includes(p.id)));
          setSelectedIds((prev) => prev.filter((x) => !deleted.includes(x)));
          onRefreshProfiles();
          const failCount = Object.keys(res.failed).length;
          if (failCount > 0) {
            showToast(`Đã xóa ${deleted.length} profile. ${failCount} thất bại.`, "error");
          } else {
            showToast(`Đã xóa vĩnh viễn ${deleted.length} profile!`, "success");
          }
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Xóa vĩnh viễn hàng loạt thất bại.", "error");
        }
      },
    });
  };

  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  return (
    <>
      {toast && <InternalToast message={toast.message} type={toast.type} />}

      {confirmState.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[9998] animate-fade-in backdrop-blur-xs">
          <div className="bg-surface-1 border border-border rounded-lg shadow-2xl w-full max-w-md flex flex-col relative animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-border/60">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {confirmState.confirmColor === "rose" ? (
                  <Trash2 className="h-4 w-4 text-rose-500" />
                ) : (
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                )}
                {confirmState.title}
              </h3>
              <button
                onClick={closeConfirm}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-surface-3 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-gray-300 text-xs leading-relaxed">
              <p>{confirmState.message}</p>
              <p className={`mt-2 font-medium ${confirmState.confirmColor === "rose" ? "text-rose-400" : "text-amber-400"}`}>
                {confirmState.warning}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-surface-2/40 border-t border-border/60 rounded-b-lg">
              <button
                onClick={closeConfirm}
                className="px-4 py-1.5 rounded bg-surface-3 hover:bg-surface-4 border border-border text-gray-300 font-medium transition-colors text-xs"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmState.onConfirm}
                className={`px-4 py-1.5 rounded text-white font-medium transition-colors text-xs flex items-center gap-1.5 shadow-md ${
                  confirmState.confirmColor === "rose"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-950/20"
                    : "bg-amber-600 hover:bg-amber-700 shadow-amber-950/20"
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
        <div className="bg-surface-1 border border-border rounded-lg shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col relative animate-scale-up overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-2 relative">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-white">Thùng Rác Profile</h2>
              {profiles.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-400 text-[10px] font-semibold">
                  {profiles.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded hover:bg-surface-3 transition-colors z-20"
              title="Đóng cửa sổ"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 border-b border-border bg-surface-1 flex items-center justify-between gap-4 flex-wrap text-xs">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm kiếm profile trong thùng rác..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 h-8 bg-surface-2 border border-border rounded text-white text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 placeholder-gray-500"
              />
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 ? (
                <>
                  <span className="text-gray-400 mr-2 font-medium">
                    Đã chọn <strong className="text-accent">{selectedIds.length}</strong> dòng
                  </span>
                  <button onClick={handleBulkRestore} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors flex items-center gap-1">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Khôi phục đã chọn</span>
                  </button>
                  <button onClick={handleBulkForceDelete} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded transition-colors flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xóa vĩnh viễn đã chọn</span>
                  </button>
                </>
              ) : (
                <span className="text-gray-500 italic text-[11px]">Tích chọn profile để thao tác hàng loạt</span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px] relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 bg-surface-1/50">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span>Đang tải dữ liệu thùng rác...</span>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-rose-400 p-6 text-center">
                <AlertCircle className="h-10 w-10 text-rose-500" />
                <p className="font-semibold">Lỗi tải dữ liệu</p>
                <p className="text-xs text-gray-400 max-w-md">{error}</p>
                <button onClick={fetchDeleted} className="mt-2 px-3 py-1 bg-surface-3 hover:bg-surface-4 border border-border text-white text-xs rounded transition-colors">
                  Tải lại
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2 p-6 text-center">
                <Trash2 className="h-12 w-12 text-gray-600" />
                <p className="font-medium text-gray-400">Thùng rác trống</p>
                <p className="text-[11px] text-gray-500 max-w-xs">
                  {search ? "Không tìm thấy profile nào khớp với từ khóa." : "Không tìm thấy profile nào bị xóa tạm thời."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse select-none">
                <thead className="bg-surface-2 text-gray-400 sticky top-0 border-b border-border z-10">
                  <tr>
                    <th className="py-2.5 px-4 w-12">
                      <input type="checkbox" checked={isAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} className="rounded border-gray-600 bg-surface-3 text-accent focus:ring-accent" />
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-gray-300">Tên Profile</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-300 w-24">OS</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-300">Proxy</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-300 w-40">Ngày Xóa</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-300">Ghi chú</th>
                    <th className="py-2.5 px-4 font-semibold text-gray-300 w-28 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface-1">
                  {filtered.map((profile, idx) => {
                    const isSelected = selectedIds.includes(profile.id);
                    return (
                      <tr
                        key={profile.id}
                        onMouseDown={(e) => handleRowMouseDown(e, profile.id, idx)}
                        onMouseEnter={() => handleRowMouseEnter(idx)}
                        className={`hover:bg-surface-2 transition-colors cursor-pointer ${isSelected ? "bg-accent/10 hover:bg-accent/15" : ""}`}
                      >
                        <td className="py-2.5 px-4">
                          <input type="checkbox" checked={isSelected} onChange={(e) => handleSelectOne(profile.id, e.target.checked)} className="rounded border-gray-600 bg-surface-3 text-accent focus:ring-accent" />
                        </td>
                        <td className="py-2.5 px-4 font-medium text-white max-w-[200px] truncate">{profile.name}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <Laptop className="h-3.5 w-3.5 text-gray-500" />
                            <span className="capitalize text-[11px]">{profile.platform || "Windows"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 max-w-[200px] truncate text-gray-400 font-mono text-[11px]">
                          {profile.proxy || <span className="text-gray-600 italic">Direct</span>}
                        </td>
                        <td className="py-2.5 px-4 text-gray-400 text-[11px]">
                          {profile.updated_at ? new Date(profile.updated_at).toLocaleString("vi-VN") : "N/A"}
                        </td>
                        <td className="py-2.5 px-4 text-gray-500 text-[11px] max-w-[150px] truncate">{profile.notes || "-"}</td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRestore(profile.id)}
                              className="p-1 rounded bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                              title="Khôi phục profile này"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleForceDelete(profile.id)}
                              className="p-1 rounded bg-rose-600/15 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                              title="Xóa vĩnh viễn"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
