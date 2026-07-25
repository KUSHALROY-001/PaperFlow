import { useState } from "react";
import {
  User,
  Lock,
  Settings as SettingsIcon,
  Save,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "Demo User",
    email: "demo@mockcraft.ai",
    role: "Student",
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [prefs, setPrefs] = useState({
    outputFormat: "Mock Test",
    ocrLanguage: "English",
    autoApprove: false,
    emailNotifs: true,
  });
  const [saved, setSaved] = useState(null);

  const handleSave = (section) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <div className="surface-card rounded-2xl p-5 sm:p-6 border border-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Profile</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 bg-[#ea580c] rounded-2xl flex items-center justify-center shadow-xs">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground">{profile.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{profile.email}</p>
              <span className="text-xs bg-orange-500/15 text-orange-500 border border-orange-500/20 px-2.5 py-0.5 rounded-lg font-bold mt-1 inline-block">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, email: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
              Role
            </label>
            <select
              value={profile.role}
              onChange={(e) =>
                setProfile((p) => ({ ...p, role: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
            >
              <option>Student</option>
              <option>Educator</option>
              <option>Coaching Center</option>
            </select>
          </div>

          <button
            onClick={() => handleSave("profile")}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm ${saved === "profile" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"}`}
          >
            <Save className="w-4 h-4" />{" "}
            {saved === "profile" ? "Saved!" : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="surface-card rounded-2xl p-5 sm:p-6 border border-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
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
                type={showCurrentPwd ? "text" : "password"}
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
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
                type={showNewPwd ? "text" : "password"}
                placeholder="Enter new password"
                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
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

          <button
            onClick={() => handleSave("password")}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm ${saved === "password" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"}`}
          >
            <Save className="w-4 h-4" />{" "}
            {saved === "password" ? "Saved!" : "Update Password"}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="surface-card rounded-2xl p-5 sm:p-6 border border-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-orange-500/15 text-orange-500 rounded-xl flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Preferences</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
              Default Output Type
            </label>
            <select
              value={prefs.outputFormat}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, outputFormat: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
            >
              <option>Mock Test</option>
              <option>Question Bank</option>
              <option>Study Notes Extraction</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
              OCR Language
            </label>
            <select
              value={prefs.ocrLanguage}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, ocrLanguage: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-xs sm:text-sm"
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Bengali</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/60 rounded-xl border border-border">
            <div>
              <p className="text-xs sm:text-sm font-bold text-foreground">
                Email Notifications
              </p>
              <p className="text-xs text-muted-foreground">
                Get notified when processing completes
              </p>
            </div>
            <button
              onClick={() =>
                setPrefs((p) => ({ ...p, emailNotifs: !p.emailNotifs }))
              }
              className={`w-12 h-6 rounded-full transition-all ${prefs.emailNotifs ? "bg-[#ea580c]" : "bg-muted border border-border"}`}
            >
              <div
                className={`w-4 h-4 bg-card rounded-full shadow-md transition-transform mx-1 ${prefs.emailNotifs ? "translate-x-6" : "translate-x-0"}`}
              />
            </button>
          </div>

          <button
            onClick={() => handleSave("prefs")}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all text-xs sm:text-sm ${saved === "prefs" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20"}`}
          >
            <Save className="w-4 h-4" />{" "}
            {saved === "prefs" ? "Saved!" : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-500/30 rounded-2xl p-5 sm:p-6 bg-red-500/5">
        <h2 className="text-lg font-bold text-red-500 mb-3 flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> Danger Zone
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4">
          Deleting your account will remove all clusters, uploads, and generated
          outputs permanently.
        </p>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-card border border-red-500/30 text-red-500 font-semibold rounded-xl hover:bg-red-500/10 transition-all text-xs sm:text-sm">
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      </div>
    </div>
  );
}
