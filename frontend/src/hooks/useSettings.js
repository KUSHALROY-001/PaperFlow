import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export const accountTypeOptions = [
  { value: "student", label: "Student" },
  { value: "educator", label: "Educator" },
  { value: "coaching_center", label: "Coaching Center" },
];

export const accountTypeLabel = (value) =>
  accountTypeOptions.find((o) => o.value === value)?.label || value;

export function useSettings() {
  const queryClient = useQueryClient();
  const { checkUserAuth, logout } = useAuth();

  const {
    data,
    isLoading,
    error: profileLoadError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
  });
  const profile = data?.profile;

  // Email is intentionally not part of this editable form or the save
  // payload below - it's the account's login identity, and editing it here
  // had no re-authentication/verification step at all (unlike password
  // change and account deletion, both of which require the current
  // password). ProfileSection reads the email straight from `profile` and
  // renders it as read-only.
  const [profileForm, setProfileForm] = useState({
    name: "",
    accountType: "student",
  });
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [saved, setSaved] = useState(null);

  const [avatarError, setAvatarError] = useState("");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Populate the form once the real profile loads - can't default useState
  // to server data that hasn't arrived yet.
  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      name: profile.name,
      accountType: profile.accountType,
    });
  }, [profile]);

  const flashSaved = (section) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setIsSavingProfile(true);

    try {
      await api.updateProfile(profileForm);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Header/sidebar reads the name from AuthContext, not this page's own
      // query - refresh it too so a name change shows up immediately.
      await checkUserAuth();
      flashSaved("profile");
    } catch (error) {
      setProfileError(error.message || "Could not save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // file comes straight from an <input type="file"> onChange - the caller
  // (ProfileSection) doesn't need to know anything about FormData/upload
  // mechanics, same division of responsibility as handleSaveProfile above.
  const handleUploadAvatar = async (file) => {
    if (!file) return;
    setAvatarError("");
    setIsSavingAvatar(true);

    try {
      await api.uploadAvatar(file);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Sidebar/header will read avatarUrl from AuthContext once that's
      // wired up there too - refreshing now keeps this consistent with
      // handleSaveProfile's name-change behavior above rather than only
      // updating on this page.
      await checkUserAuth();
      flashSaved("avatar");
    } catch (error) {
      setAvatarError(error.message || "Could not upload avatar");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError("");
    setIsSavingAvatar(true);

    try {
      await api.deleteAvatar();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await checkUserAuth();
      flashSaved("avatar");
    } catch (error) {
      setAvatarError(error.message || "Could not remove avatar");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation don't match");
      return;
    }

    setIsSavingPassword(true);

    try {
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      flashSaved("password");
    } catch (error) {
      setPasswordError(error.message || "Could not update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError("");
    setIsDeleting(true);

    try {
      await api.deleteAccount(deletePassword);
      logout();
    } catch (error) {
      setDeleteError(error.message || "Could not delete account");
      setIsDeleting(false);
    }
  };

  return {
    isLoading,
    profileLoadError,
    email: profile?.email || "",
    avatarUrl: profile?.avatarUrl || null,
    hasCustomAvatar: profile?.hasCustomAvatar || false,
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
  };
}
