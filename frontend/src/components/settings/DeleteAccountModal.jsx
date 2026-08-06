import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";

export default function DeleteAccountModal({
  deletePassword,
  setDeletePassword,
  deleteError,
  setDeleteError,
  isDeleting,
  handleDeleteAccount,
  onClose,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <form
        onSubmit={handleDeleteAccount}
        className="w-full max-w-md surface-card border border-border rounded-3xl shadow-2xl p-6"
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-red-500">Delete Account</h2>
          <button
            type="button"
            onClick={() => {
              onClose();
              setDeletePassword("");
              setDeleteError("");
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground -mt-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mb-5">
          This is permanent. Enter your password to confirm.
        </p>
        <div className="relative mb-4">
          <input
            required
            type={showPassword ? "text" : "password"}
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Your password"
            className="w-full px-4 pr-11 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 text-xs sm:text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors focus:outline-none flex items-center justify-center"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        </div>
        {deleteError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500 mb-4">
            {deleteError}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              setDeletePassword("");
              setDeleteError("");
            }}
            className="flex-1 py-2.5 border border-border bg-card text-foreground font-semibold rounded-xl hover:bg-muted text-xs sm:text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isDeleting}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs sm:text-sm transition-all disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete Forever"}
          </button>
        </div>
      </form>
    </div>
  );
}
