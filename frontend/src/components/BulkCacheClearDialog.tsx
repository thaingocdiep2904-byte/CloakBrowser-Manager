import { useState } from "react";
import { X, AlertTriangle, Save, Loader2 } from "lucide-react";

interface BulkCacheClearDialogProps {
  profileIds: string[];
  onSave: (ids: string[]) => Promise<any>;
  onCancel: () => void;
}

export function BulkCacheClearDialog({ profileIds, onSave, onCancel }: BulkCacheClearDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave(profileIds);
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa cache thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="bg-surface-1 border border-border rounded-lg shadow-2xl w-full max-w-md flex flex-col relative animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2 rounded-t-lg relative">
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span>Xóa Cache Hàng Loạt</span>
          </h2>
          <div className="flex items-center gap-2 mr-8">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/20 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Xác nhận xóa</span>
            </button>
          </div>
          <button type="button" onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded hover:bg-surface-3 transition-colors z-20" title="Đóng không lưu">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-rose-600/15 border border-rose-600/30 text-rose-400 text-xs rounded">
            {error}
          </div>
        )}

        <div className="p-5 space-y-4 text-xs text-gray-300">
          <div className="space-y-3">
            <p className="leading-relaxed text-gray-200">
              Bạn có chắc chắn muốn xóa Cache dữ liệu tạm thời cho <strong className="text-accent text-sm">{profileIds.length}</strong> profile đã chọn?
            </p>
            <div className="bg-yellow-600/10 border border-yellow-600/25 rounded p-3 text-yellow-500 space-y-1">
              <span className="font-semibold block text-[11px]">Lưu ý quan trọng:</span>
              <ul className="list-disc pl-4 space-y-1 text-[10px] opacity-90 leading-relaxed">
                <li>Hành động này sẽ xóa các file đệm tạm thời (GPU cache, Code cache, Storage tạm).</li>
                <li>Lịch sử duyệt web, Cookie và tài khoản đã đăng nhập của bạn **SẼ ĐƯỢC GIỮ LẠI**.</li>
                <li>Chỉ có thể xóa Cache khi các profile này **ĐÃ ĐƯỢC ĐÓNG** (Không chạy).</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
