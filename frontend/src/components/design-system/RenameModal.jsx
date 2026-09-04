import { useId, useState } from "react";
import { X, Edit2, Loader2 } from "lucide-react";

export default function RenameModal({
  isOpen,
  title = "Rename Item",
  initialName = "",
  initialDescription = "",
  showDescription = false,
  onClose,
  onSave,
}) {
  const uid = useId();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave(name.trim(), description.trim());
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div className="surface-card w-full max-w-md rounded-2xl p-6 border border-border shadow-xl space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-md bg-orange-500/15 text-orange-500 flex items-center justify-center">
              <Edit2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor={`${uid}-name`}
              className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider"
            >
              Name
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter new name..."
              required
              className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
            />
          </div>

          {showDescription && (
            <div>
              <label
                htmlFor={`${uid}-description`}
                className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider"
              >
                Description (Optional)
              </label>
              <textarea
                id={`${uid}-description`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all resize-none"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 font-semibold">{error}</p>
          )}

          <div className="flex gap-2 pt-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
