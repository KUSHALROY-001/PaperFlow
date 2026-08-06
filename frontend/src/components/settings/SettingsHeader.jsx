export default function SettingsHeader({ isLoading, profileLoadError }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
        Settings
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
        Manage your account and preferences
      </p>
      {isLoading && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading your account...
        </p>
      )}
      {profileLoadError && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-500">
          Couldn't load your profile: {profileLoadError.message}
        </div>
      )}
    </div>
  );
}
