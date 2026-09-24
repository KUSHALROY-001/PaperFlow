export default function CreateMockTestBasicsStep({
  uid,
  isBatchMode,
  form,
  updateForm,
}) {
  return (
    <>
      <div>
        <label
          htmlFor={`${uid}-name`}
          className="mb-1.5 sm:mb-2 block text-xs sm:text-sm font-semibold text-foreground"
        >
          {isBatchMode ? "Name Prefix (optional)" : "Mock Test Name *"}
        </label>
        <input
          id={`${uid}-name`}
          required={!isBatchMode}
          value={form.name}
          onChange={(event) => updateForm({ name: event.target.value })}
          placeholder={
            isBatchMode
              ? 'e.g. JECA PYQ (each test is named "prefix - filename")'
              : "e.g. JECA PYQ 2024"
          }
          className="w-full rounded-md border border-border bg-card px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
        />
      </div>

      <div>
        <label
          htmlFor={`${uid}-description`}
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Description
        </label>
        <textarea
          id={`${uid}-description`}
          value={form.description}
          onChange={(event) =>
            updateForm({ description: event.target.value })
          }
          rows={3}
          placeholder="Optional notes for this mock test"
          className="w-full resize-none rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/40"
        />
      </div>
    </>
  );
}
