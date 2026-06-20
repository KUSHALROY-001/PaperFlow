import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Sparkles, X } from "lucide-react";

export default function CreateClusterModal({ onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onClose();
    navigate("/cluster/new");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl card-lavender">
        <div className="flex items-center justify-between border-b border-violet-100 p-6 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-violet">
              <FolderOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Create New Cluster
              </h2>
              <p className="text-xs text-muted-foreground">
                Create a workspace for related mock tests
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-violet-100 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Cluster Name *
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value,
                }))
              }
              placeholder="e.g. JECA"
              className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-300 dark:bg-white/5"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              A cluster is just a container, like JECA, GATE, or Class 10 Science.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value,
                }))
              }
              placeholder="e.g. MCA entrance preparation workspace for PYQs and practice mocks"
              rows={3}
              className="w-full resize-none rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-300 dark:bg-white/5"
            />
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Mock tests are created inside the cluster.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  After creating this cluster, open it to add JECA PYQ 2024,
                  JECA PYQ 2023, JECA Mock Test 1, and more.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-violet-200 py-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-violet-50 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 gradient-violet"
            >
              Create Cluster
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
