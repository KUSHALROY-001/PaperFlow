import { useEffect, useId, useState } from "react";
import { Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function MockTestDurationPanel({ mocktest, isViewer }) {
  const uid = useId();
  const queryClient = useQueryClient();
  const currentDuration =
    mocktest?.duration_minutes ?? mocktest?.durationMinutes ?? 120;
  const [duration, setDuration] = useState(String(currentDuration));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDuration(String(currentDuration));
  }, [currentDuration]);

  const handleSave = async () => {
    const durationMinutes = Number(duration);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
      setError("Enter a whole number of at least 1 minute");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.updateMockTest(mocktest.id, { durationMinutes });
      await queryClient.invalidateQueries({ queryKey: ["mock-test"] });
      await queryClient.invalidateQueries({ queryKey: ["mock-tests"] });
      setMessage("Duration saved");
      setTimeout(() => setMessage(""), 2000);
    } catch (saveError) {
      setError(saveError.message || "Could not save duration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Exam Duration
        </h3>
        {message && (
          <span className="text-xs font-semibold text-emerald-500">
            {message}
          </span>
        )}
        {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label
            htmlFor={`${uid}-duration`}
            className="block text-[11px] font-semibold text-muted-foreground mb-1"
          >
            Duration (minutes)
          </label>
          <input
            id={`${uid}-duration`}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            disabled={isViewer || saving}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50"
          />
        </div>
        {!isViewer && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save duration"}
          </button>
        )}
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Changes apply to new exam attempts.
      </p>
    </section>
  );
}
