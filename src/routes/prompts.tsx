import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { type Prompt } from "../lib/mock-data";
import { useScopedPrompts } from "../lib/org-scope";

export const Route = createFileRoute("/prompts")({
  head: () => ({
    meta: [
      { title: "Prompts , Vault" },
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
      <div className="grid grid-cols-[280px_1fr] h-full">
        {/* Left rail */}
        <aside className="border-r border-black/5 overflow-y-auto">
          <div className="flex items-center justify-between px-5 pt-6 pb-3">
            <h1 className="text-[11px] text-muted-foreground">
              Prompts <span className="text-muted-foreground">/ {seedPrompts.length}</span>
            </h1>
            <button className="text-muted-foreground" title="New prompt">
              Add
            </button>
          </div>
          <div>
            {seedPrompts.map((p) => {
              const c = configs[p.id];
              const active = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left px-5 py-3 border-l-2  ${
                    active
                      ? "border-foreground bg-black/[0.03]"
                      : "border-transparent "
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground truncate">{p.name}</span>
                    <span
                      className={`size-1.5 rounded-sm ${c.enabled ? "bg-primary" : "bg-muted-foreground"}`}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {p.provider} · {p.model}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    v{p.currentVersion}/{p.versionCount} · {c.trigger} · {p.appliesTo}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Editor */}
        <div className="overflow-y-auto">
          <Editor prompt={selected} cfg={cfg} onChange={(patch) => update(selectedId, patch)} />
        </div>
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
    <div className="max-w-3xl mx-auto px-10 py-8">
      {/* Header */}
      <header className="flex items-start justify-between pb-6">
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">
            {prompt.id} · v{prompt.currentVersion}
          </div>
          <h2 className="text-xl font-medium text-foreground">{prompt.name}</h2>
          <div className="text-[11px] text-muted-foreground mt-1">
            {prompt.provider} / {prompt.model} · applies to {prompt.appliesTo}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="px-2.5 py-1.5 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            revert
          </button>
          <button className="px-3 py-1.5 text-[11px] text-foreground border border-black/10">
            save v{prompt.versionCount + 1}
          </button>
        </div>
      </header>

      {/* Sections */}
      <Section label="instructions">
        <Row label="system">
          <textarea
            value={cfg.systemPrompt}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            rows={3}
            className={taCls}
          />
        </Row>
        <Row label="template" hint="supports {{variables}}">
          <textarea
            value={cfg.userTemplate}
            onChange={(e) => onChange({ userTemplate: e.target.value })}
            rows={7}
            className={taCls}
          />
        </Row>
      </Section>

      <Section label="sampling">
        <NumRow label="temperature" value={cfg.temperature} step={0.05} min={0} max={2} onChange={(v) => onChange({ temperature: v })} />
        <NumRow label="top_p" value={cfg.topP} step={0.05} min={0} max={1} onChange={(v) => onChange({ topP: v })} />
        <NumRow label="max_tokens" value={cfg.maxTokens} step={64} min={64} max={8192} onChange={(v) => onChange({ maxTokens: v })} />
        <NumRow label="frequency_penalty" value={cfg.frequencyPenalty} step={0.1} min={-2} max={2} onChange={(v) => onChange({ frequencyPenalty: v })} />
        <NumRow label="presence_penalty" value={cfg.presencePenalty} step={0.1} min={-2} max={2} onChange={(v) => onChange({ presencePenalty: v })} />
        <Row label="stop">
          <input
            type="text"
            value={cfg.stopSequences.join(", ")}
            onChange={(e) =>
              onChange({
                stopSequences: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="comma separated"
            className={inCls}
          />
        </Row>
      </Section>

      <Section label="response">
        <Row label="format">
          <Segmented
            value={cfg.responseFormat}
            options={["text", "json", "json_schema"]}
            onChange={(v) => onChange({ responseFormat: v as ResponseFormat })}
          />
        </Row>
        {cfg.responseFormat === "json_schema" && (
          <Row label="schema">
            <textarea
              value={cfg.jsonSchema}
              onChange={(e) => onChange({ jsonSchema: e.target.value })}
              rows={8}
              className={taCls}
            />
          </Row>
        )}
      </Section>

      <Section label="execution">
        <Row label="trigger">
          <select
            value={cfg.trigger}
            onChange={(e) => onChange({ trigger: e.target.value as RunTrigger })}
            className={inCls}
          >
            <option value="manual">manual, operator only</option>
            <option value="on_capture">on_capture, every new post</option>
            <option value="on_revision">on_revision, when caption changes</option>
            <option value="scheduled">scheduled, fixed interval</option>
          </select>
        </Row>
        <Row label="enabled">
          <button
            onClick={() => onChange({ enabled: !cfg.enabled })}
            className="text-xs text-left"
          >
            <span className={cfg.enabled ? "text-foreground" : "text-muted-foreground"}>
              {cfg.enabled ? "● running" : "○ paused"}
            </span>
            <span className="text-muted-foreground ml-2">(click to toggle)</span>
          </button>
        </Row>
        <NumRow label="retry_count" value={cfg.retryCount} step={1} min={0} max={5} onChange={(v) => onChange({ retryCount: v })} />
        <NumRow label="timeout_ms" value={cfg.timeoutMs} step={1000} min={5000} max={120000} onChange={(v) => onChange({ timeoutMs: v })} />
        <NumRow label="cost_cap_usd" value={cfg.costCapUsd} step={0.01} min={0} max={10} onChange={(v) => onChange({ costCapUsd: v })} />
        <Row label="fallback">
          <select
            value={cfg.fallbackProvider}
            onChange={(e) => onChange({ fallbackProvider: e.target.value })}
            className={inCls}
          >
            <option value="none">none</option>
            <option value="gemini">gemini</option>
            <option value="openai">openai</option>
            <option value="openrouter">openrouter</option>
          </select>
        </Row>
      </Section>

      <Section label="variables">
        <div className="text-[11px]">
          {cfg.variables.map((v, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr_1fr_24px] gap-3 py-1.5 items-center">
              <input
                value={v.key}
                onChange={(e) => {
                  const next = [...cfg.variables];
                  next[i] = { ...v, key: e.target.value };
                  onChange({ variables: next });
                }}
                className="bg-transparent text-foreground focus:outline-none"
              />
              <input
                value={v.description}
                placeholder="description"
                onChange={(e) => {
                  const next = [...cfg.variables];
                  next[i] = { ...v, description: e.target.value };
                  onChange({ variables: next });
                }}
                className="bg-transparent text-muted-foreground focus:outline-none"
              />
              <input
                value={v.example}
                placeholder="example value"
                onChange={(e) => {
                  const next = [...cfg.variables];
                  next[i] = { ...v, example: e.target.value };
                  onChange({ variables: next });
                }}
                className="bg-transparent text-muted-foreground focus:outline-none"
              />
              <button
                onClick={() => onChange({ variables: cfg.variables.filter((_, j) => j !== i) })}
                className="text-muted-foreground justify-self-end"
              >
                Del
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              onChange({
                variables: [...cfg.variables, { key: "new_var", description: "", example: "" }],
              })
            }
            className="mt-2 text-muted-foreground"
          >
            + add variable
          </button>
        </div>
      </Section>

      <Section label="history">
        <div className="text-[11px]">
          {cfg.versions
            .slice()
            .reverse()
            .map((v) => (
              <div
                key={v.version}
                className="grid grid-cols-[50px_1fr_120px_90px_auto] gap-3 py-2 items-center"
              >
                <span className={v.version === prompt.currentVersion ? "text-foreground" : "text-muted-foreground"}>
                  v{v.version}
                </span>
                <span className="text-muted-foreground truncate">{v.note}</span>
                <span className="text-muted-foreground truncate">{v.author}</span>
                <span className="text-muted-foreground">{v.date}</span>
                <div className="flex gap-3 justify-end text-muted-foreground">
                  <button className="">diff</button>
                  <button className="">restore</button>
                </div>
              </div>
            ))}
        </div>
      </Section>

      <Section label="notes">
        <textarea
          value={cfg.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          placeholder="why this prompt exists, known edge cases, who to ping..."
          className={taCls}
        />
      </Section>

      <TestRun cfg={cfg} />
    </div>
  );
}

const inCls =
  "w-full bg-transparent border-0 border-b border-black/10 px-0 py-1  text-xs text-foreground focus:outline-none focus:border-foreground/60";
const taCls =
  "w-full bg-neutral-100 border border-black/5 px-3 py-2  text-xs leading-relaxed text-foreground focus:outline-none focus:border-foreground/40 resize-y";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="py-6">
      <h3 className="text-[10px] text-muted-foreground mb-4">
        {label}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
      <div className="pt-1.5">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function NumRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <Row label={label}>
      <div className="grid grid-cols-[1fr_72px] gap-3 items-center">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-foreground h-1"
        />
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-transparent border-b border-black/10 text-xs text-foreground px-0 py-1 text-right focus:outline-none focus:border-foreground/60"
        />
      </div>
    </Row>
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
    <div className="inline-flex border border-black/10 rounded-lg overflow-hidden">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-3 py-1 text-[11px]  ${
            value === o
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground "
          }`}
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
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] text-muted-foreground">
          test run
        </h3>
        <span className="text-[10px] text-muted-foreground">
          temp {cfg.temperature.toFixed(2)} · {cfg.maxTokens}t · est $0.003
        </span>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        className={taCls}
      />
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-foreground border border-black/10 disabled:opacity-50"
        >
          {running ? "running…" : "run"}
        </button>
        {output && (
          <span className="text-[10px] text-muted-foreground">
            completed in 487ms · $0.0028
          </span>
        )}
      </div>
      {output && (
        <pre className="mt-3 bg-neutral-100 border border-black/5 p-3 text-xs leading-relaxed text-emerald-300/90 whitespace-pre-wrap">
          {output}
        </pre>
      )}
    </section>
  );
}