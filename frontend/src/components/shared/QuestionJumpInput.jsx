import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function QuestionJumpInput({ onJump }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    const num = Number(trimmed);
    if (!Number.isInteger(num) || num < 1) {
      setError("Enter a valid question number");
      return;
    }

    const found = onJump(num);
    setError(found ? "" : `Q${num} not found`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5">
        <span className="text-xs font-bold text-muted-foreground shrink-0">
          Q
        </span>
        <input
          type="number"
          min="1"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError("");
          }}
          placeholder="Go to..."
          className="w-16 bg-transparent text-xs sm:text-sm font-semibold text-foreground focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Go to question"
          className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-orange-500 shrink-0"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && (
        <span className="text-xs font-bold text-red-500 shrink-0">{error}</span>
      )}
    </form>
  );
}
