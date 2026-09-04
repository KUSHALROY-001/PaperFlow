import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Compact scoring settings for a mock test — paper defaults + student
 * visibility. Publisher/editor only; viewers see read-only values.
 */
export default function MockTestScoringPanel({ mocktest, isViewer }) {
  const uid = useId();
  const queryClient = useQueryClient();
  const settings = mocktest?.settings || {};
  const [marks, setMarks] = useState(
    mocktest?.marks_per_correct ?? mocktest?.marksPerCorrect ?? 1,
  );
  const [negative, setNegative] = useState(
    mocktest?.negative_marks_per_wrong ?? mocktest?.negativeMarksPerWrong ?? 0,
  );
  const [showToStudents, setShowToStudents] = useState(
    Boolean(settings.showMarksToStudents),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (isViewer) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.updateMockTest(mocktest.id, {
        marksPerCorrect: Number(marks),
        negativeMarksPerWrong: Number(negative),
        settings: { showMarksToStudents: Boolean(showToStudents) },
      });
      await queryClient.invalidateQueries({ queryKey: ["mock-test"] });
      await queryClient.invalidateQueries({ queryKey: ["mock-tests"] });
      setMessage("Scoring settings saved");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err.message || "Could not save scoring settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Global Scoring
        </h3>
        {message && (
          <span className="text-xs font-semibold text-emerald-500">
            {message}
          </span>
        )}
        {error && (
          <span className="text-xs font-semibold text-red-500">{error}</span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label
            htmlFor={`${uid}-marks-per-correct`}
            className="block text-[11px] font-semibold text-muted-foreground mb-1"
          >
            Marks / correct
          </label>
          <input
            id={`${uid}-marks-per-correct`}
            type="number"
            min="0"
            step="any"
            disabled={isViewer || saving}
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor={`${uid}-negative-marks`}
            className="block text-[11px] font-semibold text-muted-foreground mb-1"
          >
            −ve / wrong
          </label>
          <input
            id={`${uid}-negative-marks`}
            type="number"
            min="0"
            step="any"
            disabled={isViewer || saving}
            value={negative}
            onChange={(e) => setNegative(e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50"
          />
        </div>
        <label className="flex items-center gap-2 col-span-2 sm:col-span-1 cursor-pointer">
          <input
            type="checkbox"
            disabled={isViewer || saving}
            checked={showToStudents}
            onChange={(e) => setShowToStudents(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-xs font-semibold text-foreground leading-snug">
            Show marks to students
          </span>
        </label>
        {!isViewer && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save scoring"}
          </button>
        )}
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Paper defaults apply when a question has no individual marks. Student
        visibility is off by default.
      </p>
    </div>
  );
}
