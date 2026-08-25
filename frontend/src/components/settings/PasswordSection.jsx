import { Lock, Eye, EyeOff, Save } from "lucide-react";

export default function PasswordSection({
  passwordForm,
  setPasswordForm,
  showCurrentPwd,
  setShowCurrentPwd,
  showNewPwd,
  setShowNewPwd,
  passwordError,
  isSavingPassword,
  handleSavePassword,
  saved,
}) {
  return (
    <form
      onSubmit={handleSavePassword}
      className="surface-card rounded-2xl p-5 sm:p-6 border border-border"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-md flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Password</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              required
              type={showCurrentPwd ? "text" : "password"}
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((p) => ({
                  ...p,
                  currentPassword: e.target.value,
                }))
              }
              placeholder="Enter current password"
              className="w-full px-4 py-2.5 pr-12 rounded-full border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPwd(!showCurrentPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showCurrentPwd ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              required
              minLength={8}
              type={showNewPwd ? "text" : "password"}
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((p) => ({
                  ...p,
                  newPassword: e.target.value,
                }))
              }
              placeholder="At least 8 characters"
              className="w-full px-4 py-2.5 pr-12 rounded-full border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowNewPwd(!showNewPwd)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showNewPwd ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
            Confirm New Password
          </label>
          <input
            required
            type={showNewPwd ? "text" : "password"}
            autoComplete="new-password"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm((p) => ({
                ...p,
                confirmPassword: e.target.value,
              }))
            }
            placeholder="Re-enter new password"
            className="w-full px-4 py-2.5 rounded-full border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
          />
        </div>

        {passwordError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {passwordError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSavingPassword}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-md transition-all text-xs sm:text-sm disabled:opacity-60 ${saved === "password" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"}`}
        >
          <Save className="w-4 h-4" />{" "}
          {isSavingPassword
            ? "Updating..."
            : saved === "password"
              ? "Saved!"
              : "Update Password"}
        </button>
      </div>
    </form>
  );
}
