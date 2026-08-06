import { Trash2 } from "lucide-react";

export default function DangerZoneCard({ onOpenDeleteModal }) {
  return (
    <div className="border border-red-500/30 rounded-2xl p-5 sm:p-6 bg-red-500/5">
      <h2 className="text-lg font-bold text-red-500 mb-3 flex items-center gap-2">
        <Trash2 className="w-5 h-5" /> Danger Zone
      </h2>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        Deleting your account will remove all clusters, uploads, and generated
        outputs permanently. You won't be able to do this if you own a
        workspace other people are still part of.
      </p>
      <button
        onClick={onOpenDeleteModal}
        className="flex items-center gap-2 px-5 py-2.5 bg-card border border-red-500/30 text-red-500 font-semibold rounded-xl hover:bg-red-500/10 transition-all text-xs sm:text-sm"
      >
        <Trash2 className="w-4 h-4" /> Delete Account
      </button>
    </div>
  );
}
