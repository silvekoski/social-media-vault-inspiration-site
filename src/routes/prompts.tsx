import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { type Prompt } from "../lib/mock-data";
import { useScopedPrompts } from "../lib/org-scope";

export const Route = createFileRoute("/prompts")({
  head: () => ({
    meta: [
      { title: "Prompts · Vault" },
      { name: "description", content: "Manage AI analysis prompts" },
    ],
  }),
  component: PromptsPage,
});

type ResponseFormat = "text" | "json" | "json_schema";
type RunTrigger = "manual" | "on_capture" | "on_revision" | "scheduled";

interface PromptConfig {
  systemPrompt: string;
  userTemplate: string;
  variables: { key: string; description: string; example: string }[];
  temperature: number;
  topP: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
  responseFormat: ResponseFormat;
  jsonSchema: string;
  trigger: RunTrigger;
  retryCount: number;
  timeoutMs: number;
  costCapUsd: number;
  enabled: boolean;
  fallbackProvider: string;
  notes: string;
  versions: { version: number; note: string; date: string; author: string }[];
}

const DEFAULT_VARS = [
  { key: "caption", description: "Post caption text", example: "The grid system behind..." },
  { key: "hashtags", description: "Hashtag list, comma separated", example: "uidesign, figma" },
  { key: "creator", description: "Creator handle", example: "design_daily" },
  { key: "platform", description: "tiktok | instagram | youtube", example: "youtube" },
];

function defaultConfig(p: Prompt): PromptConfig {
  return {
    systemPrompt:
      "You are an expert media analyst. Be concise, structured, and avoid speculation. Return only the requested format.",
    userTemplate:
      p.promptText +
      "\n\n---\nCaption: {{caption}}\nHashtags: {{hashtags}}\nCreator: @{{creator}} ({{platform}})",
    variables: DEFAULT_VARS,
    temperature: p.provider === "openai" ? 0.2 : 0.4,
    topP: 0.95,
    maxTokens: 1024,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    responseFormat: p.name.toLowerCase().includes("extract") ? "json" : "text",
    jsonSchema:
      '{\n  "type": "object",\n  "properties": {\n    "result": { "type": "string" }\n  }\n}',
    trigger: "on_capture",
    retryCount: 2,
    timeoutMs: 30000,
    costCapUsd: 0.25,
    enabled: true,
    fallbackProvider: "none",
    notes: "",
    versions: Array.from({ length: p.versionCount }, (_, i) => ({
      version: i + 1,
      note:
        i + 1 === p.currentVersion
          ? "tightened phrasing, added schema hint"
          : i === 0
            ? "initial draft"
            : `iteration v${i + 1}`,
      date: `2024-0${Math.min(6, i + 1)}-${String(10 + i).padStart(2, "0")}`,
      author: i % 2 ? "operator_2" : "operator_1",
    })),
  };
}

function PromptsPage() {
  const seedPrompts = useScopedPrompts();
  const [selectedId, setSelectedId] = useState<string>(seedPrompts[0]?.id ?? "");
  const [configs, setConfigs] = useState<Record<string, PromptConfig>>(() =>
    Object.fromEntries(seedPrompts.map((p) => [p.id, defaultConfig(p)])),
  );
  const update = (id: string, patch: Partial<PromptConfig>) =>
    setConfigs((c) => ({ ...c, [id]: { ...c[id], ...patch } }));

  const selected = seedPrompts.find((p) => p.id === selectedId)!;
  const cfg = configs[selectedId];

  return (
    <section className="h-full">
      <div className="grid grid-cols-[260px_minmax(0,1fr)_320px] h-full">
        {/* Left rail — prompt list */}
        <aside className="border-r border-border overflow-y-auto">
          <div className="flex items-center justify-between px-4 h-12 border-b border-border sticky top-0 bg-background">
            <h1 className="text-sm font-medium text-foreground">
              Prompts{" "}
              <span className="text-muted-foreground font-normal">{seedPrompts.length}</span>
            </h1>
            <button
              className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-accent"
              title="New prompt"
            >
              New
            </button>
          </div>
          <div className="py-1">
            {seedPrompts.map((p) => {
              const c = configs[p.id];
              const active = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={
                    "w-full text-left px-4 py-3 border-l-2 transition-colors " +
                    (active
                      ? "border-foreground bg-accent"
                      : "border-transparent hover:bg-accent/50")
                  }
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm text-foreground truncate">{p.name}</span>
                    <span
                      className={
                        "h-1.5 w-1.5 shrink-0 rounded-full " +
                        (c.enabled ? "bg-foreground" : "bg-muted-foreground/40")
                      }
                      title={c.enabled ? "running" : "paused"}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {p.provider} · {p.model}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                    v{p.currentVersion}/{p.versionCount} · {c.trigger} · {p.appliesTo}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center — prompt content */}
        <Editor
          prompt={selected}
          cfg={cfg}
          onChange={(patch) => update(selectedId, patch)}
        />
      </div>
    </section>
  );
}

function Editor({
  prompt,
  cfg,
  onChange,
}: {
  prompt: Prompt;
  cfg: PromptConfig;
  onChange: (p: Partial<PromptConfig>) => void;
}) {
  return (
    <>
      <div className="overflow-y-auto">
        {/* Sticky header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 h-12 px-6 border-b border-border bg-background">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground truncate">
              {prompt.name}
              <span className="ml-2 font-normal text-muted-foreground">
                {prompt.id} · v{prompt.currentVersion}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="text-xs text-muted-foreground hover:text-foreground">
              History
            </button>
            <button className="text-xs text-muted-foreground hover:text-foreground">
              Revert
            </button>
            <button className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent">
              Save v{prompt.versionCount + 1}
            </button>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="text-[11px] text-muted-foreground mb-6">
            {prompt.provider} / {prompt.model} · applies to {prompt.appliesTo}
          </div>

          {/* Instructions */}
          <Section label="Instructions" hint="The system message and templated user prompt.">
            <Field label="System message">
              <textarea
                value={cfg.systemPrompt}
                onChange={(e) => onChange({ systemPrompt: e.target.value })}
                rows={3}
                className={taCls}
              />
            </Field>
            <Field
              label="User template"
              hint="Supports {{variables}} from the table below."
            >
              <textarea
                value={cfg.userTemplate}
                onChange={(e) => onChange({ userTemplate: e.target.value })}
                rows={7}
                className={taCls + " font-mono"}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cfg.variables.map((v) => (
                  <span
                    key={v.key}
                    className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    {`{{${v.key}}}`}
                  </span>
                ))}
              </div>
            </Field>
          </Section>

          {/* Response */}
          <Section label="Response" hint="How the model output is parsed.">
            <Field label="Format">
              <Segmented
                value={cfg.responseFormat}
                options={["text", "json", "json_schema"]}
                onChange={(v) => onChange({ responseFormat: v as ResponseFormat })}
              />
            </Field>
            {cfg.responseFormat === "json_schema" && (
              <Field label="JSON schema">
                <textarea
                  value={cfg.jsonSchema}
                  onChange={(e) => onChange({ jsonSchema: e.target.value })}
                  rows={8}
                  className={taCls + " font-mono"}
                />
              </Field>
            )}
          </Section>

          {/* Variables */}
          <Section label="Variables" hint="Injected into the template at run time.">
            <div className="space-y-2">
              {cfg.variables.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded border border-border px-2.5 py-1.5 text-xs"
                >
                  <input
                    value={v.key}
                    onChange={(e) => {
                      const next = [...cfg.variables];
                      next[i] = { ...v, key: e.target.value };
                      onChange({ variables: next });
                    }}
                    className="w-32 shrink-0 bg-transparent font-mono text-foreground focus:outline-none"
                  />
                  <input
                    value={v.description}
                    placeholder="description"
                    onChange={(e) => {
                      const next = [...cfg.variables];
                      next[i] = { ...v, description: e.target.value };
                      onChange({ variables: next });
                    }}
                    className="flex-1 min-w-0 bg-transparent text-muted-foreground focus:outline-none"
                  />
                  <input
                    value={v.example}
                    placeholder="example value"
                    onChange={(e) => {
                      const next = [...cfg.variables];
                      next[i] = { ...v, example: e.target.value };
                      onChange({ variables: next });
                    }}
                    className="flex-1 min-w-0 bg-transparent text-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={() =>
                      onChange({ variables: cfg.variables.filter((_, j) => j !== i) })
                    }
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    title="Remove variable"
                  >
                    Del
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                onChange({
                  variables: [
                    ...cfg.variables,
                    { key: "new_var", description: "", example: "" },
                  ],
                })
              }
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              + Add variable
            </button>
          </Section>

          {/* History */}
          <Section label="Version history">
            <div className="rounded border border-border divide-y divide-border text-xs">
              {cfg.versions
                .slice()
                .reverse()
                .map((v) => (
                  <div key={v.version} className="flex items-center gap-3 px-3 py-2">
                    <span
                      className={
                        "w-8 shrink-0 " +
                        (v.version === prompt.currentVersion
                          ? "text-foreground font-medium"
                          : "text-muted-foreground")
                      }
                    >
                      v{v.version}
                    </span>
                    <span className="flex-1 min-w-0 text-muted-foreground truncate">{v.note}</span>
                    <span className="hidden sm:block w-24 shrink-0 text-muted-foreground truncate">{v.author}</span>
                    <span className="w-20 shrink-0 text-muted-foreground">{v.date}</span>
                    <div className="flex gap-3 shrink-0 text-muted-foreground">
                      <button className="hover:text-foreground">Diff</button>
                      <button className="hover:text-foreground">Restore</button>
                    </div>
                  </div>
                ))}
            </div>
          </Section>

          {/* Notes */}
          <Section label="Notes">
            <textarea
              value={cfg.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              placeholder="Why this prompt exists, known edge cases, who to ping..."
              className={taCls}
            />
          </Section>

          <TestRun cfg={cfg} />
        </div>
      </div>

      {/* Right rail — model configuration */}
      <aside className="border-l border-border overflow-y-auto">
        <div className="flex items-center h-12 px-4 border-b border-border sticky top-0 bg-background">
          <h3 className="text-sm font-medium text-foreground">Configuration</h3>
        </div>
        <div className="px-4 py-4">
          <PanelGroup label="Model">
            <PanelRow label="Provider" value={prompt.provider} />
            <PanelRow label="Model" value={prompt.model} />
            <PanelRow
              label="Fallback"
              control={
                <select
                  value={cfg.fallbackProvider}
                  onChange={(e) => onChange({ fallbackProvider: e.target.value })}
                  className={selCls}
                >
                  <option value="none">none</option>
                  <option value="gemini">gemini</option>
                  <option value="openai">openai</option>
                  <option value="openrouter">openrouter</option>
                </select>
              }
            />
          </PanelGroup>

          <PanelGroup label="Sampling">
            <ParamSlider label="Temperature" value={cfg.temperature} step={0.05} min={0} max={2} onChange={(v) => onChange({ temperature: v })} />
            <ParamSlider label="Top P" value={cfg.topP} step={0.05} min={0} max={1} onChange={(v) => onChange({ topP: v })} />
            <ParamSlider label="Max tokens" value={cfg.maxTokens} step={64} min={64} max={8192} onChange={(v) => onChange({ maxTokens: v })} integer />
            <ParamSlider label="Frequency penalty" value={cfg.frequencyPenalty} step={0.1} min={-2} max={2} onChange={(v) => onChange({ frequencyPenalty: v })} />
            <ParamSlider label="Presence penalty" value={cfg.presencePenalty} step={0.1} min={-2} max={2} onChange={(v) => onChange({ presencePenalty: v })} />
            <div className="pt-1">
              <label className="block text-xs text-muted-foreground mb-1.5">Stop sequences</label>
              <input
                type="text"
                value={cfg.stopSequences.join(", ")}
                onChange={(e) =>
                  onChange({
                    stopSequences: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="comma separated"
                className="w-full rounded border border-border bg-muted px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground/40"
              />
            </div>
          </PanelGroup>

          <PanelGroup label="Execution">
            <PanelRow
              label="Trigger"
              control={
                <select
                  value={cfg.trigger}
                  onChange={(e) => onChange({ trigger: e.target.value as RunTrigger })}
                  className={selCls}
                >
                  <option value="manual">manual</option>
                  <option value="on_capture">on capture</option>
                  <option value="on_revision">on revision</option>
                  <option value="scheduled">scheduled</option>
                </select>
              }
            />
            <PanelRow
              label="Status"
              control={
                <button
                  onClick={() => onChange({ enabled: !cfg.enabled })}
                  className="inline-flex items-center gap-1.5 text-xs text-foreground"
                >
                  <span
                    className={
                      "h-2 w-2 rounded-full " +
                      (cfg.enabled ? "bg-foreground" : "bg-muted-foreground/40")
                    }
                  />
                  {cfg.enabled ? "Running" : "Paused"}
                </button>
              }
            />
            <ParamSlider label="Retry count" value={cfg.retryCount} step={1} min={0} max={5} onChange={(v) => onChange({ retryCount: v })} integer />
            <ParamSlider label="Timeout (ms)" value={cfg.timeoutMs} step={1000} min={5000} max={120000} onChange={(v) => onChange({ timeoutMs: v })} integer />
            <ParamSlider label="Cost cap ($)" value={cfg.costCapUsd} step={0.01} min={0} max={10} onChange={(v) => onChange({ costCapUsd: v })} />
          </PanelGroup>
        </div>
      </aside>
    </>
  );
}

const taCls =
  "w-full bg-muted border border-border rounded px-3 py-2 text-xs leading-relaxed text-foreground focus:outline-none focus:border-foreground/40 resize-y";
const selCls =
  "rounded border border-border bg-muted px-2 py-1 text-xs text-foreground focus:outline-none focus:border-foreground/40";

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-5 border-t border-border first:border-t-0 first:pt-0">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">
        {label}
        {hint && <span className="text-muted-foreground/70"> · {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function PanelGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-4 border-t border-border first:border-t-0 first:pt-0">
      <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
        {label}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PanelRow({
  label,
  value,
  control,
}: {
  label: string;
  value?: string;
  control?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      {control ?? <span className="text-xs text-foreground truncate">{value}</span>}
    </div>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  integer,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  integer?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-muted-foreground">{label}</label>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-16 bg-transparent border-b border-border text-xs text-foreground px-0 py-0.5 text-right tabular-nums focus:outline-none focus:border-foreground/60"
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-foreground h-1"
        aria-label={label}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5 tabular-nums">
        <span>{integer ? min : min.toFixed(2)}</span>
        <span>{integer ? max : max.toFixed(2)}</span>
      </div>
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex border border-border rounded-lg overflow-hidden">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={
            "px-3 py-1.5 text-xs border-r border-border last:border-r-0 " +
            (value === o
              ? "bg-accent text-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50")
          }
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function TestRun({ cfg }: { cfg: PromptConfig }) {
  const [input, setInput] = useState(
    "caption: The grid system behind every great UI, a 60-second breakdown.\nhashtags: uidesign, figma\ncreator: design_daily\nplatform: tiktok",
  );
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const mockOutput = useMemo(
    () =>
      cfg.responseFormat === "text"
        ? "Identified 3 design primitives: 8px grid baseline, monochrome palette, sans-serif typography. Confidence 0.91."
        : '{\n  "primitives": ["8px grid", "monochrome", "sans-serif"],\n  "confidence": 0.91\n}',
    [cfg.responseFormat],
  );
  const run = () => {
    setRunning(true);
    setOutput(null);
    setTimeout(() => {
      setOutput(mockOutput);
      setRunning(false);
    }, 500);
  };
  return (
    <section className="py-5 border-t border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Test run</h3>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          temp {cfg.temperature.toFixed(2)} · {cfg.maxTokens}t · est $0.003
        </span>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        className={taCls + " font-mono"}
      />
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-50"
        >
          {running ? "Running…" : "Run"}
        </button>
        {output && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            completed in 487ms · $0.0028
          </span>
        )}
      </div>
      {output && (
        <pre className="mt-3 bg-muted border border-border rounded p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono">
          {output}
        </pre>
      )}
    </section>
  );
}
