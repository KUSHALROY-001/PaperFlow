import { useId, useRef, useState } from "react";
import { User, Save, Camera, X, Loader2 } from "lucide-react";
import { accountTypeOptions, accountTypeLabel } from "@/hooks/useSettings";

export default function ProfileSection({
  email,
  avatarUrl,
  hasCustomAvatar,
  avatarError,
  isSavingAvatar,
  handleUploadAvatar,
  handleRemoveAvatar,
  profileForm,
  setProfileForm,
  profileError,
  isSavingProfile,
  handleSaveProfile,
  saved,
}) {
  const uid = useId();
  let profileSubmitLabel;
  if (isSavingProfile) {
    profileSubmitLabel = "Saving...";
  } else if (saved === "profile") {
    profileSubmitLabel = "Saved!";
  } else {
    profileSubmitLabel = "Save Profile";
  }

  const fileInputRef = useRef(null);
  // Client-side only, so the picture the user just chose shows up
  // immediately instead of waiting on the upload round trip - cleared
  // once the real avatarUrl from the server reflects it (see the
  // onChange handler below).
  const [localPreview, setLocalPreview] = useState(null);

  const displayedAvatar = localPreview || avatarUrl;

  const onFileChosen = (e) => {
    const file = e.target.files?.[0];
    // Always clear the input's own value, chosen or not, so picking the
    // exact same file again still fires a fresh onChange next time.
    e.target.value = "";
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    handleUploadAvatar(file).finally(() => {
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
    });
  };

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
          <div className="relative shrink-0">
            {displayedAvatar ? (
              <img
                src={displayedAvatar}
                alt=""
                className="w-16 h-16 rounded-full object-cover shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 bg-[#ea580c] rounded-full flex items-center justify-center shadow-xs">
                <User className="w-8 h-8 text-white" />
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSavingAvatar}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center border-2 border-card hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              {isSavingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onFileChosen}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground truncate">
              {profileForm.name}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {email}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2.5 py-0.5 rounded-lg font-bold inline-block">
                {accountTypeLabel(profileForm.accountType)}
              </span>
              {hasCustomAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isSavingAvatar}
                  className="text-xs text-muted-foreground hover:text-red-500 inline-flex items-center gap-1 disabled:opacity-60 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Remove avatar
                </button>
              )}
              {saved === "avatar" && (
                <span className="text-xs text-emerald-500 font-medium">
                  Saved!
                </span>
              )}
            </div>
          </div>
        </div>

        {avatarError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
            {avatarError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`${uid}-full-name`}
              className="block text-xs sm:text-sm font-bold text-foreground mb-2"
            >
              Full Name
            </label>
            <input
              id={`${uid}-full-name`}
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
            <label
              htmlFor={`${uid}-email`}
              className="block text-xs sm:text-sm font-bold text-foreground mb-2"
            >
              Email
            </label>
            <input
              id={`${uid}-email`}
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
          <label
            htmlFor={`${uid}-account-type`}
            className="block text-xs sm:text-sm font-bold text-foreground mb-2"
          >
            Account Type
          </label>
          <select
            id={`${uid}-account-type`}
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
          <Save className="w-4 h-4" /> {profileSubmitLabel}
        </button>
      </div>
    </form>
  );
}
