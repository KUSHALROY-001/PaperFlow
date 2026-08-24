export default function QuestionTopicSelect({
  topic,
  extractedTopics = [],
  isCustomTopic,
  setIsCustomTopic,
  updateSelected,
  isViewer,
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
        Topic
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          disabled={isViewer}
          value={
            extractedTopics.includes(topic) && !isCustomTopic
              ? topic
              : "custom"
          }
          onChange={(e) => {
            if (isViewer) return;
            const val = e.target.value;
            if (val === "custom") {
              setIsCustomTopic(true);
            } else {
              setIsCustomTopic(false);
              updateSelected("topic", val);
            }
          }}
          className={`flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
            isViewer ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          {extractedTopics.length === 0 ? (
            <option value="General">General</option>
          ) : (
            extractedTopics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))
          )}
          <option value="custom">✍️ Custom Topic...</option>
        </select>

        {(!extractedTopics.includes(topic) || isCustomTopic) && (
          <input
            type="text"
            disabled={isViewer}
            value={topic || ""}
            onChange={(e) =>
              !isViewer && updateSelected("topic", e.target.value)
            }
            placeholder="Enter topic name..."
            className={`flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 ${
              isViewer ? "cursor-not-allowed opacity-60" : ""
            }`}
          />
        )}
      </div>
    </div>
  );
}
