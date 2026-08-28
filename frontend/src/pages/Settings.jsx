import { useSettings } from "@/hooks/useSettings";
import SettingsHeader from "../components/settings/SettingsHeader";
import ProfileSection from "../components/settings/ProfileSection";
import PasswordSection from "../components/settings/PasswordSection";
import DangerZoneCard from "../components/settings/DangerZoneCard";
import DeleteAccountModal from "../components/settings/DeleteAccountModal";

export default function Settings() {
  const {
    isLoading,
    profileLoadError,
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
    showDeleteModal,
    setShowDeleteModal,
    deletePassword,
    setDeletePassword,
    deleteError,
    setDeleteError,
    isDeleting,
    handleDeleteAccount,
  } = useSettings();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <SettingsHeader
        isLoading={isLoading}
        profileLoadError={profileLoadError}
      />

      <ProfileSection
        email={email}
        avatarUrl={avatarUrl}
        hasCustomAvatar={hasCustomAvatar}
        avatarError={avatarError}
        isSavingAvatar={isSavingAvatar}
        handleUploadAvatar={handleUploadAvatar}
        handleRemoveAvatar={handleRemoveAvatar}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        profileError={profileError}
        isSavingProfile={isSavingProfile}
        handleSaveProfile={handleSaveProfile}
        saved={saved}
      />

      <PasswordSection
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        showCurrentPwd={showCurrentPwd}
        setShowCurrentPwd={setShowCurrentPwd}
        showNewPwd={showNewPwd}
        setShowNewPwd={setShowNewPwd}
        passwordError={passwordError}
        isSavingPassword={isSavingPassword}
        handleSavePassword={handleSavePassword}
        saved={saved}
      />

      <DangerZoneCard onOpenDeleteModal={() => setShowDeleteModal(true)} />

      {showDeleteModal && (
        <DeleteAccountModal
          deletePassword={deletePassword}
          setDeletePassword={setDeletePassword}
          deleteError={deleteError}
          setDeleteError={setDeleteError}
          isDeleting={isDeleting}
          handleDeleteAccount={handleDeleteAccount}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
