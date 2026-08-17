export default function TopicAccuracyList({ topicAccuracy }) {
  if (topicAccuracy.length === 0) {
    return (
      <div className="surface-card rounded-2xl border border-border p-6 text-center text-xs text-muted-foreground">
        No topic-tagged questions answered yet.
      </div>
    );
  }

  return (
    <div className="surface-card rounded-2xl border border-border p-4 sm:p-5 space-y-3">
      {topicAccuracy.map((t) => (
        <div key={t.topic}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-foreground truncate">
              {t.topic}
            </span>
            <span className="text-muted-foreground font-medium shrink-0 ml-2">
              {t.correctCount}/{t.questionsAnswered} · {t.accuracy}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${t.accuracy}%`,
                background:
                  t.accuracy >= 80
                    ? "#10B981"
                    : t.accuracy >= 60
                      ? "#F59E0B"
                      : "#EF4444",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
