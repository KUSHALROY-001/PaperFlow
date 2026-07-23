import { StatusBadge } from "@/components/design-system/StatusBadge";

function getConfidenceTone(value) {
  if (value >= 90) return "success";
  if (value >= 70) return "warning";
  return "error";
}

function ConfidenceBadge({ value = 0, label = "confidence", ...props }) {
  const rounded = Math.round(Number(value) || 0);

  return (
    <StatusBadge tone={getConfidenceTone(rounded)} {...props}>
      <span className="number-mono">{rounded}%</span>
      <span className="sr-only">{label}</span>
    </StatusBadge>
  );
}

export { ConfidenceBadge, getConfidenceTone };
