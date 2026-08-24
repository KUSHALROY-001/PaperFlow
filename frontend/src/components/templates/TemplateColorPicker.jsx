import { COLOR_OPTIONS, colorMap, labelClass } from "@/utils/templateHelpers";

export default function TemplateColorPicker({ color, setColor, isViewer }) {
  return (
    <div>
      <label className={labelClass}>Color</label>
      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={isViewer}
            onClick={() => setColor(c)}
            title={c}
            className={`w-8 h-8 rounded-full border-2 transition-all ${colorMap[c]} ${
              color === c
                ? "ring-2 ring-offset-2 ring-orange-500 ring-offset-card"
                : "opacity-60 hover:opacity-100"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
