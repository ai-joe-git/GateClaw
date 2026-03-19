#!/usr/bin/env bun
/**
 * GateClaw Provider Signup Command
 * 
 * Helps users sign up for AI provider API keys with affiliate links.
 * For users who don't have existing accounts - existing users keep 100% of their relationship.
 */

import * as prompts from "@clack/prompts"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"

// Provider affiliate configuration
// Add new providers here as partnerships are established
const PROVIDER_SIGNUP: Record<string, {
  name: string
  description: string
  affiliateUrl?: string
  referralCode?: string
  signupUrl: string
  apiKeyPath: string
  freeCredits?: string
  note?: string
}> = {
  openai: {
    name: "OpenAI",
    description: "GPT-4, GPT-4o, GPT-4.5, DALL-E, Whisper",
    signupUrl: "https://platform.openai.com/signup",
    apiKeyPath: "Settings → API keys → Create new secret key",
    freeCredits: "$5 free credits for new accounts",
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3.5, Claude 4, Claude 4 Opus",
    signupUrl: "https://console.anthropic.com/signup",
    apiKeyPath: "API Keys → Create Key",
    freeCredits: "$5 free credits for new accounts",
  },
  openrouter: {
    name: "OpenRouter",
    description: "Aggregate: 200+ models (OpenAI, Anthropic, Google, open source)",
    signupUrl: "https://openrouter.ai/auth/signup",
    apiKeyPath: "Keys → Create Key",
    freeCredits: "Pay-as-you-go, no free tier",
    note: "Best value for trying multiple models",
  },
  google: {
    name: "Google AI Studio",
    description: "Gemini 1.5, Gemini 2.0, Gemini 2.5",
    signupUrl: "https://aistudio.google.com/apikey",
    apiKeyPath: "Get API key → Create API key",
    freeCredits: "Free tier available with rate limits",
  },
  groq: {
    name: "Groq",
    description: "Fast inference: Llama, Mixtral, Whisper",
    signupUrl: "https://console.groq.com/signup",
    apiKeyPath: "API Keys → Create API Key",
    freeCredits: "Free tier available",
  },
  together: {
    name: "Together AI",
    description: "Open source models: Llama, Mistral, CodeLlama",
    signupUrl: "https://api.together.xyz/signup",
    apiKeyPath: "Settings → API Keys → Create Key",
    freeCredits: "$1 free credits for new accounts",
  },
  fireworks: {
    name: "Fireworks AI",
    description: "Fast inference for open source models",
    signupUrl: "https://fireworks.ai/login",
    apiKeyPath: "Account → API Keys → Create Key",
    freeCredits: "Free tier available",
  },
  deepseek: {
    name: "DeepSeek",
    description: "DeepSeek V3, DeepSeek Coder",
    signupUrl: "https://platform.deepseek.com/signup",
    apiKeyPath: "API Keys → Create Key",
    freeCredits: "$5 free credits for new accounts",
  },
  mistral: {
    name: "Mistral AI",
    description: "Mistral Large, Mistral Medium, Codestral",
    signupUrl: "https://console.mistral.ai/",
    apiKeyPath: "API Keys → Create new key",
    freeCredits: "Free tier available",
  },
}

// Local providers (no affiliate needed - user hosts locally)
const LOCAL_PROVIDERS = [
  { id: "llama-swap", name: "llama-swap", description: "Multi-model router (local)", port: 8888 },
  { id: "ollama", name: "Ollama", description: "Local inference (free)", port: 11434 },
  { id: "lm-studio", name: "LM Studio", description: "Desktop app with server mode (free)", port: 1234 },
  { id: "llama-cpp", name: "llama.cpp", description: "CPU inference server (free)", port: "varies" },
  { id: "vllm", name: "vLLM", description: "High-throughput serving (free)", port: "varies" },
]

export async function signup() {
  const blue = "\x1b[36m"
  const green = "\x1b[32m"
  const yellow = "\x1b[33m"
  const reset = "\x1b[0m"
  const bold = "\x1b[1m"

  console.log(`\n${blue}  ██████╗ ██╗   ██╗███████╗███████╗██████╗  ██████╗ ███████╗███████╗${reset}`)
  console.log(`${blue} ██╔════╝██║   ██║██╔════╝██╔════╝██╔══██╗██╔═══██╗██╔════╝██╔════╝${reset}`)
  console.log(`${blue} ██║     ██║   ██║█████╗  █████╗  ██████╔╝██║   ██║█████╗  █████╗${reset}`)
  console.log(`${blue} ██║     ██║   ██║██╔══╝  ██╔══╝  ██╔══██╗██║   ██║██╔══╝  ██╔══╝${reset}`)
  console.log(`${blue} ╚██████╗╚██████╔╝███████╗███████╗██║  ██║╚██████╔╝███████╗███████╗${reset}`)
  console.log(`${blue}  ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝${reset}\n`)

  console.log(`${bold}GateClaw Provider Signup${reset}`)
  console.log()
  console.log("This wizard helps you get API keys for cloud AI providers.")
  console.log("If you already have an API key with a provider, skip this - add it directly via:")
  console.log(`  ${green}gateclaw providers add${reset}`)
  console.log()

  prompts.intro("Choose a provider to sign up")

  // Show local providers first
  console.log(`\n${yellow}━━━ Local Providers (Free, No Signup Required) ━━━${reset}\n`)
  LOCAL_PROVIDERS.forEach((p) => {
    console.log(`  ${green}${p.id.padEnd(12)}${reset} - ${p.description}`)
    console.log(`             Default: http://localhost:${p.port}/v1`)
  })
  console.log()

  // Show cloud providers
  console.log(`${yellow}━━━ Cloud Providers (API Key Required) ━━━${reset}\n`)

  const options = Object.entries(PROVIDER_SIGNUP).map(([id, p]) => ({
    label: p.name,
    value: id,
    hint: p.freeCredits || "Pay-as-you-go",
  }))

  const provider = await prompts.select({
    message: "Select a cloud provider",
    options,
  })

  if (prompts.isCancel(provider)) {
    prompts.outro("Cancelled")
    return
  }

  const info = PROVIDER_SIGNUP[provider as string]
  if (!info) {
    prompts.log.error("Unknown provider")
    return
  }

  console.log()
  prompts.log.info(`${bold}${info.name}${reset}`)
  console.log()
  console.log(`  Models:     ${info.description}`)
  if (info.freeCredits) {
    console.log(`  Free Tier:  ${info.freeCredits}`)
  }

  if (info.affiliateUrl) {
    console.log()
    console.log(`${yellow}━━━ Partner Link${reset}`)
    console.log()
    console.log(`  Using this link supports GateClaw development at`)
    console.log(`  no extra cost to you (affiliate commission comes`)
    console.log(`  from the provider's marketing budget).`)
    console.log()
    console.log(`  ${green}${info.affiliateUrl}${reset}`)
  } else {
    console.log()
    console.log(`${yellow}━━━ Signup Link${reset}`)
    console.log()
    console.log(`  ${green}${info.signupUrl}${reset}`)
  }

  if (info.referralCode) {
    console.log()
    console.log(`  ${yellow}Referral code:${reset} ${info.referralCode}`)
  }

  console.log()
  console.log(`${yellow}━━━ Getting Your API Key${reset}`)
  console.log()
  console.log(`  1. Click the signup link above`)
  console.log(`  2. Create an account`)
  console.log(`  3. Navigate to: ${info.apiKeyPath}`)
  console.log(`  4. Create a new API key`)
  console.log(`  5. Copy the key (you won't see it again)`)
  console.log()

  if (info.note) {
    console.log(`${yellow}Note:${reset} ${info.note}`)
    console.log()
  }

  const hasKey = await prompts.confirm({
    message: "Do you have your API key ready?",
    initialValue: false,
  })

  if (prompts.isCancel(hasKey) || !hasKey) {
    console.log()
    prompts.log.info("Add your key later via:")
    console.log(`  ${green}gateclaw providers add${reset}`)
    prompts.outro("Done")
    return
  }

  // Prompt for API key
  const apiKey = await prompts.password({
    message: `Paste your ${info.name} API key`,
    validate: (v) => (v && v.length > 0 ? undefined : "Required"),
  })

  if (prompts.isCancel(apiKey)) {
    prompts.outro("Cancelled")
    return
  }

  // Save to config
  const configDir = process.env.APPDATA
    ? path.join(process.env.APPDATA, "gateclaw")
    : path.join(os.homedir(), ".config", "gateclaw")

  fs.mkdirSync(configDir, { recursive: true })
  const configPath = path.join(configDir, "gateclaw.jsonc")

  let config: any = { provider: {} }
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8")
    try {
      // Remove JSONC comments
      config = JSON.parse(content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1"))
    } catch {
      prompts.log.warn("Could not parse existing config, creating new one")
    }
  }

  // Add provider config
  config.provider = config.provider || {}
  config.provider[provider as string] = {
    name: info.name,
    npm: "@ai-sdk/openai-compatible",
    models: {
      "default": {
        name: "Default Model",
        limit: { context: 128000, output: 128000 },
      },
    },
    options: {
      baseURL: provider === "anthropic" 
        ? "https://api.anthropic.com/v1"
        : provider === "openrouter"
        ? "https://openrouter.ai/api/v1"
        : provider === "together"
        ? "https://api.together.xyz/v1"
        : provider === "fireworks"
        ? "https://api.fireworks.ai/inference/v1"
        : provider === "deepseek"
        ? "https://api.deepseek.com/v1"
        : provider === "mistral"
        ? "https://api.mistral.ai/v1"
        : provider === "google"
        ? "https://generativelanguage.googleapis.com/v1beta"
        : provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : "https://api.openai.com/v1",
      apiKey: apiKey,
    },
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  console.log()
  prompts.log.success(`${info.name} configured!`)
  console.log()
  console.log(`  Config: ${configPath}`)
  console.log()
  prompts.log.info("Next steps:")
  console.log(`  1. ${green}gateclaw restart${reset} - Restart the daemon`)
  console.log(`  2. ${green}gateclaw tui${reset} - Open TUI and select ${info.name}`)
  console.log()

  prompts.outro("Done")
}