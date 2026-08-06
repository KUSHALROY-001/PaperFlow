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

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
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

  const [prefs, setPrefs] = useState({
    defaultOutputFormat: "Mock Test",
    ocrLanguage: "English",
    autoApprove: false,
    emailNotifications: true,
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const [saved, setSaved] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Populate the forms once the real profile loads - can't default useState
  // to server data that hasn't arrived yet.
  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      name: profile.name,
      email: profile.email,
      accountType: profile.accountType,
    });
    if (profile.preferences) {
      setPrefs((current) => ({ ...current, ...profile.preferences }));
    }
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

  const handleSavePrefs = async () => {
    setIsSavingPrefs(true);

    try {
      await api.updatePreferences(prefs);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      flashSaved("prefs");
    } catch (error) {
      setProfileError(error.message || "Could not save preferences");
    } finally {
      setIsSavingPrefs(false);
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
    prefs,
    setPrefs,
    isSavingPrefs,
    handleSavePrefs,
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
