export default function CreateMockTestStepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-4 py-3 shrink-0 sm:px-6">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = step.id < currentStep;
        return (
          <div key={step.id} className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                isActive
                  ? "bg-orange-500 text-white"
                  : isComplete
                    ? "bg-orange-500/20 text-orange-500"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step.id}
            </div>
            <span
              className={`whitespace-nowrap text-xs font-semibold ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className="mx-1.5 h-px w-4 shrink-0 bg-border sm:w-6" />
            )}
          </div>
        );
      })}
    </div>
  );
}
