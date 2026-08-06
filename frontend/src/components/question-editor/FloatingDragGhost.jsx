export default function FloatingDragGhost({ draggingQuestion, mousePos }) {
  if (!draggingQuestion) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: mousePos.x,
        top: mousePos.y,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 9999,
        width: "16.5rem",
      }}
      className="rounded-2xl p-4 border-2 border-orange-500 bg-card/95 backdrop-blur-md shadow-2xl scale-[1.03] select-none pointer-events-none"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs bg-orange-500/20 text-orange-500 font-bold px-2 py-0.5 rounded-lg border border-orange-500/30">
          Q{draggingQuestion.questionNo}
        </span>
        <p className="text-xs font-bold text-foreground truncate flex-1">
          {draggingQuestion.text}
        </p>
      </div>
    </div>
  );
}
