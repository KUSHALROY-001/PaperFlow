import { AlertTriangle, Trash2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
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
  onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-6 max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              destructive
                ? "bg-red-500/15 text-red-500 border border-red-500/20"
                : warning
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                  : "bg-orange-500/15 text-orange-500 border border-orange-500/20"
            }`}
          >
            {destructive ? (
              <Trash2 className="w-6 h-6" />
            ) : warning ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              {title}
            </AlertDialogTitle>
            {description ? (
              <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {description}
              </AlertDialogDescription>
            ) : null}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <AlertDialogCancel className="rounded-xl border border-border px-4 py-2.5 text-xs sm:text-sm font-semibold text-muted-foreground transition-all hover:bg-muted">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-all shadow-sm ${
              destructive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : warning
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDialog };
