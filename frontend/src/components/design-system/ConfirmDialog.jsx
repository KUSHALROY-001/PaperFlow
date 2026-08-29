import { useState } from "react";
import { AlertTriangle, Trash2, AlertCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  warning = false,
  loading = false,
  isLoading: propIsLoading,
  onConfirm,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoading = Boolean(loading || propIsLoading || isSubmitting);

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (onConfirm) {
      try {
        const result = onConfirm(e);
        if (result && typeof result.then === "function") {
          setIsSubmitting(true);
          await result;
        }
      } catch (err) {
        console.error("Error during confirmation action:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    if (isLoading) return;
    onOpenChange?.(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(val) => {
        if (isLoading) return;
        onOpenChange?.(val);
      }}
    >
      <AlertDialogContent className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-5 sm:p-6 w-[calc(100%-2rem)] max-w-md">
        <AlertDialogHeader className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:items-start sm:gap-4 text-center sm:text-left">
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 mx-auto sm:mx-0 ${
              destructive
                ? "bg-red-500/15 text-red-500 border border-red-500/20"
                : warning
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                  : "bg-orange-500/15 text-orange-500 border border-orange-500/20"
            }`}
          >
            {destructive ? (
              <Trash2 className="w-5 h-5" />
            ) : warning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {description}
              </AlertDialogDescription>
            ) : null}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleCancel}
            className="w-full sm:w-auto rounded-md border border-border px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed ${
              destructive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : warning
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
            }`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>{confirmLabel}</span>
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDialog };
