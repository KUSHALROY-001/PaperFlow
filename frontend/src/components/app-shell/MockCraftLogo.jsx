export default function MockCraftLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/PaperFlow_Logo.png"
        alt="PaperFlow logo"
        className="w-8 h-8 object-contain shrink-0"
      />
      <span className="text-xl font-extrabold text-foreground tracking-tight">
        PaperFlow
      </span>
    </div>
  );
}
