import { User, Save } from "lucide-react";
import { accountTypeOptions, accountTypeLabel } from "@/hooks/useSettings";

export default function ProfileSection({
  email,
  profileForm,
  setProfileForm,
  profileError,
  isSavingProfile,
  handleSaveProfile,
  saved,
}) {
  return (
    <form
      onSubmit={handleSaveProfile}
      className="surface-card rounded-2xl p-5 sm:p-6 border border-border"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-full flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Profile</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 bg-[#ea580c] rounded-full flex items-center justify-center shadow-xs shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate">
              {profileForm.name}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {email}
            </p>
            <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2.5 py-0.5 rounded-lg font-bold mt-1 inline-block">
              {accountTypeLabel(profileForm.accountType)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
              Full Name
            </label>
            <input
              required
              type="text"
              autoComplete="name"
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, name: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
              Email
            </label>
            <input
              disabled
              type="email"
              value={email}
              className="w-full px-4 py-2.5 rounded-md border border-border bg-muted text-muted-foreground cursor-not-allowed text-xs sm:text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Your email is your login and can't be changed here. Contact
              support if you need it updated.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
            Account Type
          </label>
          <select
            value={profileForm.accountType}
            onChange={(e) =>
              setProfileForm((p) => ({ ...p, accountType: e.target.value }))
            }
            className="w-full px-4 py-2.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
          >
            {accountTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {profileError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {profileError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSavingProfile}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-full transition-all text-xs sm:text-sm disabled:opacity-60 ${saved === "profile" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"}`}
        >
          <Save className="w-4 h-4" />{" "}
          {isSavingProfile
            ? "Saving..."
            : saved === "profile"
              ? "Saved!"
              : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
