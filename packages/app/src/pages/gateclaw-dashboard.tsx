import { createSignal, createResource, For, Show, onMount } from "solid-js"
import { A } from "@solidjs/router"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Card } from "@opencode-ai/ui/card"
import { Spinner } from "@opencode-ai/ui/spinner"

// Types
interface HealthStatus {
  status: string
  soul: string
  uptime_ms: number
  pid: number
  telegram: string
}

interface Fact {
  id: string
  key: string
  value: string
  time_created: number
  time_updated: number
}

interface TelegramStatus {
  running: boolean
  configured: boolean
  stopRequested: boolean
}

// GateClaw API base (daemon runs on 7371)
const GC_API = "http://localhost:7371"

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString()
}

// API helpers
async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${GC_API}/health`)
  return res.json()
}

async function fetchFacts(): Promise<Fact[]> {
  const res = await fetch(`${GC_API}/facts`)
  return res.json()
}

async function fetchTelegramStatus(): Promise<TelegramStatus> {
  const res = await fetch(`${GC_API}/telegram/status`)
  return res.json()
}

async function saveFact(key: string, value: string): Promise<void> {
  await fetch(`${GC_API}/fact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  })
}

async function deleteFact(key: string): Promise<void> {
  await fetch(`${GC_API}/fact/${encodeURIComponent(key)}`, { method: "DELETE" })
}

async function shutdownDaemon(): Promise<void> {
  if (!confirm("Are you sure you want to shutdown the GateClaw daemon?")) return
  await fetch(`${GC_API}/shutdown`, { method: "POST" })
}

// Dashboard Overview Tab
function OverviewTab() {
  const [health] = createResource(fetchHealth)
  const [telegram] = createResource(fetchTelegramStatus)

  return (
    <div class="p-6 space-y-6">
      {/* Status Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div
              classList={{
                "size-3 rounded-full": true,
                "bg-icon-success-base": health()?.status === "ok",
                "bg-icon-critical-base": health()?.status !== "ok",
              }}
            />
            <div>
              <div class="text-12-regular text-text-weak">Daemon Status</div>
              <div class="text-16-medium">{health()?.status === "ok" ? "Running" : "Error"}</div>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <Icon name="task" size="medium" />
            <div>
              <div class="text-12-regular text-text-weak">Uptime</div>
              <div class="text-16-medium">{health() ? formatUptime(health()!.uptime_ms) : "-"}</div>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <Icon name="server" size="medium" />
            <div>
              <div class="text-12-regular text-text-weak">PID</div>
              <div class="text-16-medium font-mono">{health()?.pid ?? "-"}</div>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <Icon name="new-session" size="medium" />
            <div>
              <div class="text-12-regular text-text-weak">Soul</div>
              <div class="text-16-medium">{health()?.soul ?? "-"}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Telegram Status */}
      <Card class="p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Icon name="share" size="medium" />
            <div>
              <div class="text-14-medium">Telegram Integration</div>
              <div class="text-12-regular text-text-weak">
                {telegram()?.configured ? (
                  <span class="text-icon-success-base">● Configured</span>
                ) : (
                  <span class="text-icon-critical-base">● Not configured</span>
                )}
                {" · "}
                {telegram()?.running ? (
                  <span class="text-icon-success-base">Running</span>
                ) : (
                  <span class="text-text-weak">Stopped</span>
                )}
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <Button size="small" variant="ghost" onClick={() => fetch(`${GC_API}/telegram/stop`, { method: "POST" })}>
              Stop
            </Button>
            <Button size="small" variant="ghost" onClick={() => fetch(`${GC_API}/telegram/start`, { method: "POST" })}>
              Start
            </Button>
          </div>
        </div>
      </Card>

      {/* Links to Web UI */}
      <Card class="p-4">
        <div class="text-14-medium mb-3">Open Web UI</div>
        <div class="flex gap-3">
          <A href="/" class="text-14-regular text-link-base hover:underline">
            Go to Projects Home →
          </A>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card class="p-4">
        <div class="text-14-medium mb-3">Quick Actions</div>
        <div class="flex gap-3 flex-wrap">
          <Button size="small" variant="primary" onClick={shutdownDaemon}>
            Shutdown Daemon
          </Button>
          <Button size="small" variant="ghost" onClick={() => window.location.reload()}>
            Refresh Status
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Memory Tab
function MemoryTab() {
  const [facts, { refetch }] = createResource(fetchFacts)
  const [newKey, setNewKey] = createSignal("")
  const [newValue, setNewValue] = createSignal("")
  const [saving, setSaving] = createSignal(false)

  async function handleAddFact(e: Event) {
    e.preventDefault()
    const key = newKey().trim()
    const value = newValue().trim()
    if (!key || !value) return

    setSaving(true)
    try {
      await saveFact(key, value)
      setNewKey("")
      setNewValue("")
      refetch()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteFact(key: string) {
    if (!confirm(`Delete fact "${key}"?`)) return
    await deleteFact(key)
    refetch()
  }

  return (
    <div class="p-6 space-y-6">
      {/* Add New Fact */}
      <Card class="p-4">
        <div class="text-14-medium mb-3">Add New Fact</div>
        <form onSubmit={handleAddFact} class="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="key"
            value={newKey()}
            onInput={(e) => setNewKey(e.currentTarget.value)}
            class="px-3 py-2 border border-border-base rounded text-14-regular bg-bg-subtle"
          />
          <input
            type="text"
            placeholder="value"
            value={newValue()}
            onInput={(e) => setNewValue(e.currentTarget.value)}
            class="px-3 py-2 border border-border-base rounded text-14-regular bg-bg-subtle flex-1 min-w-64"
          />
          <Button type="submit" size="small" disabled={saving()}>
            {saving() ? <Spinner /> : "Add Fact"}
          </Button>
        </form>
      </Card>

      {/* Facts List */}
      <Card class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="text-14-medium">Persistent Memory ({facts()?.length ?? 0} facts)</div>
          <Button size="small" variant="ghost" onClick={refetch}>
            Refresh
          </Button>
        </div>

        <Show when={facts()?.length === 0}>
          <div class="text-14-regular text-text-weak py-8 text-center">No facts stored yet</div>
        </Show>

        <div class="space-y-2 max-h-96 overflow-y-auto">
          <For each={facts()}>
            {(fact) => (
              <div class="flex items-start gap-2 p-2 rounded hover:bg-bg-subtle">
                <div class="flex-1 min-w-0">
                  <div class="text-14-mono text-link-base">{fact.key}</div>
                  <div class="text-12-regular text-text-weak truncate">{fact.value}</div>
                  <div class="text-10-regular text-text-disabled">{formatDate(fact.time_updated)}</div>
                </div>
                <Button size="small" variant="ghost" onClick={() => handleDeleteFact(fact.key)}>
                  Delete
                </Button>
              </div>
            )}
          </For>
        </div>
      </Card>
    </div>
  )
}

// Config Tab (read-only view)
function ConfigTab() {
  const [env, setEnv] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [activeFile, setActiveFile] = createSignal<"env" | "json">("env")

  onMount(async () => {
    try {
      // Files are on disk - show placeholder content with paths
      setEnv(`# Configure .env at:
# Windows: %APPDATA%/gateclaw/.env
# Linux: ~/.config/gateclaw/.env
#
# Required variables:
GATECLAW_TELEGRAM_TOKEN="your-telegram-bot-token"
GATECLAW_TELEGRAM_CHAT_ID="your-chat-id"
GATECLAW_MODEL="gpt-oss-20b"
GATECLAW_DIRECTORY="C:\\path\\to\\gateclaw"
OPENCODE_SERVER_USERNAME=gateclaw
STT_API_URL=http://localhost:8888
TTS_API_URL=http://localhost:8000
STT_MODEL=whisper-large-v3-turbo
TTS_MODEL=pocket-tts`)
    } finally {
      setLoading(false)
    }
  })

  return (
    <div class="p-6 space-y-6">
      <div class="flex gap-2">
        <Button
          size="small"
          variant={activeFile() === "env" ? "primary" : "ghost"}
          onClick={() => setActiveFile("env")}
        >
          .env
        </Button>
        <Button
          size="small"
          variant={activeFile() === "json" ? "primary" : "ghost"}
          onClick={() => setActiveFile("json")}
        >
          gateclaw.jsonc
        </Button>
      </div>

      <Card class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="text-14-medium">{activeFile() === "env" ? ".env" : "gateclaw.jsonc"}</div>
          <div class="text-12-regular text-text-weak">
            {activeFile() === "env" ? "%APPDATA%/gateclaw/.env" : "%APPDATA%/gateclaw/gateclaw.jsonc"}
          </div>
        </div>
        <Show when={loading()}>
          <Spinner />
        </Show>
        <Show when={!loading()}>
          <pre class="text-12-mono bg-bg-subtle p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
            {activeFile() === "env"
              ? env()
              : `// gateclaw.jsonc - Provider and model configuration\n// Edit directly at %APPDATA%/gateclaw/gateclaw.jsonc`}
          </pre>
        </Show>
      </Card>

      <Card class="p-4">
        <div class="text-14-medium mb-2">Config File Locations</div>
        <div class="text-12-regular text-text-weak space-y-1">
          <div>
            Windows: <span class="text-12-mono">%APPDATA%/gateclaw/</span>
          </div>
          <div>
            Linux/macOS: <span class="text-12-mono">~/.config/gateclaw/</span>
          </div>
        </div>
        <div class="mt-4 text-12-regular text-text-weak">
          <p>Edit config files directly in your text editor, or use CLI commands:</p>
          <code class="text-12-mono block mt-1">gateclaw soul edit</code>
          <code class="text-12-mono block">gateclaw fact store</code>
        </div>
      </Card>
    </div>
  )
}

// Soul Tab
function SoulTab() {
  const [soulContent, setSoulContent] = createSignal("")
  const [loading, setLoading] = createSignal(true)

  onMount(async () => {
    setSoulContent(`---
name: GateClaw
owner: YourName
version: 0.2.0-beta
---

# Soul Configuration
# Edit at: %APPDATA%/gateclaw/SOUL.md
# Or use CLI: gateclaw soul edit

The Soul defines GateClaw's personality and behavior.
Edit SOUL.md directly with your text editor.

Current soul system uses soul_v2/ for behavioral config.`)
    setLoading(false)
  })

  return (
    <div class="p-6 space-y-6">
      <Card class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="text-14-medium">SOUL.md</div>
          <div class="text-12-regular text-text-weak">%APPDATA%/gateclaw/SOUL.md</div>
        </div>
        <Show when={loading()}>
          <Spinner />
        </Show>
        <Show when={!loading()}>
          <pre class="text-12-mono bg-bg-subtle p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
            {soulContent()}
          </pre>
        </Show>
      </Card>

      <Card class="p-4">
        <div class="text-14-medium mb-2">Soul Configuration</div>
        <div class="text-12-regular text-text-weak">
          The Soul defines GateClaw's personality and behavior. Edit SOUL.md directly with your text editor, or use the
          CLI:
          <code class="text-12-mono block mt-1">gateclaw soul edit</code>
        </div>
      </Card>
    </div>
  )
}

// Main Dashboard Page
export default function GateClawDashboard() {
  const [activeTab, setActiveTab] = createSignal("overview")

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "memory", label: "Memory" },
    { id: "config", label: "Config" },
    { id: "soul", label: "Soul" },
  ]

  return (
    <div class="min-h-screen bg-bg-base">
      {/* Header */}
      <header class="border-b border-border-base bg-bg-elevated">
        <div class="px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="text-18-semibold text-text-strong">GateClaw Dashboard</div>
            <div class="text-12-regular text-text-weak">Resident AI Control Center</div>
          </div>
          <div class="flex items-center gap-2">
            <A href="/" class="text-14-regular text-link-base hover:underline">
              ← Web UI
            </A>
          </div>
        </div>

        {/* Tab Navigation */}
        <div class="px-6 flex gap-1">
          <For each={tabs}>
            {(tab) => (
              <button
                onClick={() => setActiveTab(tab.id)}
                classList={{
                  "px-4 py-3 text-14-medium border-b-2 transition-colors": true,
                  "border-link-base text-link-base": activeTab() === tab.id,
                  "border-transparent text-text-weak hover:text-text-base": activeTab() !== tab.id,
                }}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>
      </header>

      {/* Tab Content */}
      <main>
        <Show when={activeTab() === "overview"}>
          <OverviewTab />
        </Show>
        <Show when={activeTab() === "memory"}>
          <MemoryTab />
        </Show>
        <Show when={activeTab() === "config"}>
          <ConfigTab />
        </Show>
        <Show when={activeTab() === "soul"}>
          <SoulTab />
        </Show>
      </main>
    </div>
  )
}
