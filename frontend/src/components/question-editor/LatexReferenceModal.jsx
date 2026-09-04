import { useMemo, useState } from "react";
import {
  X,
  Copy,
  Check,
  Search,
  Divide,
  Superscript,
  Pi,
  Sigma,
  Calculator,
  Infinity as InfinityIcon,
  Waves,
  Equal,
  Layers,
  Grid3x3,
  ArrowRight,
  Asterisk,
  Type,
} from "lucide-react";
import MathText from "../shared/MathText";

// Every command here is one MathText.jsx (via katex) already knows how to
// render, and one worker/ai/provider.py's SYSTEM_PROMPT already teaches the
// extraction pipeline to emit - this is a cheat sheet for the same LaTeX
// dialect the rest of the app speaks, not a generic LaTeX tutorial.
const CATEGORIES = [
  {
    id: "fractions",
    label: "Fractions",
    icon: Divide,
    accent: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    rows: [
      { command: String.raw`\frac{3}{4}`, description: "Fraction" },
      { command: String.raw`\dfrac{a}{b}`, description: "Display style fraction" },
      { command: String.raw`\tfrac{x}{y}`, description: "Text style fraction" },
      { command: String.raw`\binom{n}{k}`, description: "Binomial coefficient" },
      { command: String.raw`\cfrac{a}{b+c}`, description: "Continued fraction" },
    ],
  },
  {
    id: "roots",
    label: "Roots",
    icon: Calculator,
    accent: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    rows: [
      { command: String.raw`\sqrt{x}`, description: "Square root" },
      { command: String.raw`\sqrt[n]{x}`, description: "n-th root" },
      { command: String.raw`\sqrt[3]{27}`, description: "Cube root" },
    ],
  },
  {
    id: "powers",
    label: "Powers & Subscripts",
    icon: Superscript,
    accent: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    rows: [
      { command: "x^2", description: "Superscript (power)" },
      { command: "x_1", description: "Subscript" },
      { command: "x_i^2", description: "Subscript with power" },
      { command: "x^{a+b}", description: "Multi-character exponent" },
      { command: "e^{-x}", description: "Negative exponent" },
    ],
  },
  {
    id: "greek",
    label: "Greek Letters",
    icon: Pi,
    accent: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    rows: [
      { command: String.raw`\alpha`, description: "Alpha" },
      { command: String.raw`\beta`, description: "Beta" },
      { command: String.raw`\gamma`, description: "Gamma" },
      { command: String.raw`\delta`, description: "Delta" },
      { command: String.raw`\theta`, description: "Theta" },
      { command: String.raw`\lambda`, description: "Lambda" },
      { command: String.raw`\mu`, description: "Mu" },
      { command: String.raw`\pi`, description: "Pi" },
      { command: String.raw`\sigma`, description: "Sigma" },
      { command: String.raw`\phi`, description: "Phi" },
      { command: String.raw`\omega`, description: "Omega" },
      { command: String.raw`\Delta`, description: "Capital Delta" },
      { command: String.raw`\Sigma`, description: "Capital Sigma" },
      { command: String.raw`\Omega`, description: "Capital Omega" },
    ],
  },
  {
    id: "sums",
    label: "Summations & Products",
    icon: Sigma,
    accent: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    rows: [
      { command: String.raw`\sum_{i=1}^{n} i`, description: "Summation" },
      { command: String.raw`\prod_{i=1}^{n} i`, description: "Product" },
      { command: String.raw`\bigcup_{i=1}^{n} A_i`, description: "Big union" },
      { command: String.raw`\bigcap_{i=1}^{n} A_i`, description: "Big intersection" },
    ],
  },
  {
    id: "calculus",
    label: "Integrals & Limits",
    icon: InfinityIcon,
    accent: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
    rows: [
      { command: String.raw`\int_0^1 x\,dx`, description: "Definite integral" },
      { command: String.raw`\int x\,dx`, description: "Indefinite integral" },
      { command: String.raw`\iint f(x,y)\,dA`, description: "Double integral" },
      { command: String.raw`\oint`, description: "Contour integral" },
      { command: String.raw`\lim_{x \to 0} f(x)`, description: "Limit" },
      { command: String.raw`\to`, description: "Approaches / maps to" },
      { command: String.raw`\infty`, description: "Infinity" },
    ],
  },
  {
    id: "operators",
    label: "Operators & Brackets",
    icon: Divide,
    accent: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    rows: [
      { command: String.raw`\times`, description: "Multiplication" },
      { command: String.raw`\div`, description: "Division" },
      { command: String.raw`\cdot`, description: "Dot product / multiply" },
      { command: String.raw`\pm`, description: "Plus-minus" },
      { command: String.raw`\mp`, description: "Minus-plus" },
      { command: String.raw`\left( \right)`, description: "Auto-sized parentheses" },
      { command: String.raw`\left[ \right]`, description: "Auto-sized brackets" },
      { command: String.raw`\left\{ \right\}`, description: "Auto-sized braces" },
      { command: String.raw`\left| x \right|`, description: "Absolute value" },
    ],
  },
  {
    id: "trig-log",
    label: "Trig & Log Functions",
    icon: Waves,
    accent: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20",
    rows: [
      { command: String.raw`\sin(x)`, description: "Sine" },
      { command: String.raw`\cos(x)`, description: "Cosine" },
      { command: String.raw`\tan(x)`, description: "Tangent" },
      { command: String.raw`\log_2 x`, description: "Log, given base" },
      { command: String.raw`\ln x`, description: "Natural log" },
      { command: "e^x", description: "Exponential function" },
    ],
  },
  {
    id: "relations",
    label: "Relations & Comparisons",
    icon: Equal,
    accent: "bg-lime-500/15 text-lime-500 border-lime-500/20",
    rows: [
      { command: String.raw`\neq`, description: "Not equal" },
      { command: String.raw`\leq`, description: "Less than or equal" },
      { command: String.raw`\geq`, description: "Greater than or equal" },
      { command: String.raw`\approx`, description: "Approximately equal" },
      { command: String.raw`\equiv`, description: "Equivalent / identical" },
      { command: String.raw`\propto`, description: "Proportional to" },
    ],
  },
  {
    id: "sets-logic",
    label: "Set Theory & Logic",
    icon: Layers,
    accent: "bg-teal-500/15 text-teal-400 border-teal-500/20",
    rows: [
      { command: String.raw`\in`, description: "Element of" },
      { command: String.raw`\notin`, description: "Not an element of" },
      { command: String.raw`\subset`, description: "Subset" },
      { command: String.raw`\subseteq`, description: "Subset or equal" },
      { command: String.raw`\cup`, description: "Union" },
      { command: String.raw`\cap`, description: "Intersection" },
      { command: String.raw`\emptyset`, description: "Empty set" },
      { command: String.raw`\forall`, description: "For all" },
      { command: String.raw`\exists`, description: "There exists" },
      { command: String.raw`\neg`, description: "Logical not" },
      { command: String.raw`\land`, description: "Logical and" },
      { command: String.raw`\lor`, description: "Logical or" },
      { command: String.raw`\implies`, description: "Implies" },
      { command: String.raw`\iff`, description: "If and only if" },
    ],
  },
  {
    id: "matrices",
    label: "Matrices & Vectors",
    icon: Grid3x3,
    accent: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
    rows: [
      {
        command: String.raw`\begin{pmatrix} a & b \\ c & d \end{pmatrix}`,
        description: "Matrix, round brackets",
      },
      {
        command: String.raw`\begin{bmatrix} a & b \\ c & d \end{bmatrix}`,
        description: "Matrix, square brackets",
      },
      { command: String.raw`\vec{v}`, description: "Vector" },
      { command: String.raw`\overrightarrow{AB}`, description: "Vector from A to B" },
    ],
  },
  {
    id: "arrows",
    label: "Arrows",
    icon: ArrowRight,
    accent: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    rows: [
      { command: String.raw`\rightarrow`, description: "Right arrow" },
      { command: String.raw`\leftarrow`, description: "Left arrow" },
      { command: String.raw`\Rightarrow`, description: "Implies (double arrow)" },
      { command: String.raw`\Leftrightarrow`, description: "If and only if (arrow)" },
      { command: String.raw`\mapsto`, description: "Maps to" },
    ],
  },
  {
    id: "accents",
    label: "Accents & Decorations",
    icon: Asterisk,
    accent: "bg-pink-500/15 text-pink-400 border-pink-500/20",
    rows: [
      { command: String.raw`\hat{x}`, description: "Hat accent" },
      { command: String.raw`\bar{x}`, description: "Bar accent" },
      { command: String.raw`\dot{x}`, description: "Dot accent (derivative)" },
      { command: String.raw`\tilde{x}`, description: "Tilde accent" },
      { command: String.raw`\overline{AB}`, description: "Overline (line segment)" },
    ],
  },
  {
    id: "text-spacing",
    label: "Text & Spacing",
    icon: Type,
    accent: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    rows: [
      { command: String.raw`\text{if } x > 0`, description: "Plain text inside math" },
      { command: String.raw`a \quad b`, description: "Medium space" },
      { command: String.raw`a \qquad b`, description: "Large space" },
    ],
  },
];

// NOTE: 'Copy All Commands' feature removed; commands remain
// available individually via the per-row copy buttons.

export default function LatexReferenceModal({ onClose }) {
  const [copiedCommand, setCopiedCommand] = useState(null);
  const [query, setQuery] = useState("");

  // Filters rows by command or description, then drops any category left
  // with nothing matching - so searching "log" surfaces just the one row
  // in Trig & Log Functions instead of leaving 13 empty category headers
  // on screen.
  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((category) => ({
      ...category,
      rows: category.rows.filter(
        (row) =>
          row.command.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q),
      ),
    })).filter((category) => category.rows.length > 0);
  }, [query]);

  const copyCommand = async (command) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    window.setTimeout(() => {
      // Functional update so a fast second click (copying a different
      // command before the first timeout fires) doesn't get its own
      // "copied" flash cleared early by the first timeout.
      setCopiedCommand((current) => (current === command ? null : current));
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8 backdrop-blur-xs sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl surface-card border border-border shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 font-serif italic font-bold">
              Tx
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                LaTeX Command Reference
              </h2>
              <p className="text-xs text-muted-foreground">
                Wrap any of these in <span className="font-mono">$...$</span>{" "}
                when writing question text, options, or explanations
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-border p-4 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands (e.g. matrix, sqrt, greek)"
              className="w-full rounded-xl border border-border bg-muted/40 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
          {filteredCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No commands match "{query}".
            </p>
          )}
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border ${category.accent}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {category.label}
                  </h3>
                </div>
                <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
                  {category.rows.map((row) => {
                    const justCopied = copiedCommand === row.command;
                    return (
                      <button
                        type="button"
                        key={row.command}
                        onClick={() => copyCommand(row.command)}
                        title="Click to copy this command"
                        className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.7fr)_minmax(0,1fr)] items-center gap-2 sm:gap-3 px-4 py-2.5 text-left bg-card hover:bg-muted/60 transition-colors"
                      >
                        <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                          <span className="break-all">{row.command}</span>
                          {justCopied ? (
                            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                          ) : (
                            <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
                          )}
                        </span>

                        <span className="text-sm text-right sm:text-left text-foreground">
                          <MathText text={`$${row.command}$`} />
                        </span>

                        <span className="sm:hidden col-span-2 mt-2 text-xs text-muted-foreground">
                          {row.description}
                        </span>

                        <span className="hidden sm:block text-xs text-muted-foreground">
                          {row.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
