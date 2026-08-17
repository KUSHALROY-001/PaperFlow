import { Sparkles } from "lucide-react";

export default function SharedMockIntro({
  mockTestInfo,
  name,
  setName,
  email,
  setEmail,
  starting,
  startError,
  handleStart,
}) {
  const info = mockTestInfo?.mockTest || {};

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#ea580c] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="text-xs font-bold text-orange-500 mb-1 uppercase tracking-wider">
            Powered by MockCraft
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            {info.name}
          </h1>
          {info.description && (
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              {info.description}
            </p>
          )}
        </div>

        <div className="surface-card rounded-3xl p-6 border border-border mb-6">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Questions", value: mockTestInfo?.questionCount },
              { label: "Duration", value: `${info.durationMinutes} min` },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-muted border border-border rounded-xl p-3 text-center"
              >
                <div className="text-sm font-bold text-foreground">
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-5">
            <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
              Your Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name to start"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs sm:text-sm font-bold text-foreground mb-2">
              Your Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email to start"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all"
            />
          </div>

          {startError && (
            <p className="text-xs text-red-500 font-semibold mb-3">
              {startError}
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={!name.trim() || !email.trim() || starting}
            className="w-full py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold rounded-xl shadow-xs transition-all text-xs sm:text-sm disabled:opacity-40"
          >
            {starting ? "Starting…" : "Start Test →"}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          No account required. Your email is only used to track your test
          history.
        </p>
      </div>
    </div>
  );
}
