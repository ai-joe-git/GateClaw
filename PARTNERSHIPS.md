# GateClaw Provider Partnerships

## Overview

GateClaw supports 40+ AI providers out of the box (OpenAI, Anthropic, Google, OpenRouter, etc.). Users configure their own API keys.

This document outlines partnership opportunities for providers who want to streamline GateClaw integration for new users.

---

## How It Works Today

1. User installs GateClaw (free, MIT)
2. User adds their own API keys in `gateclaw.jsonc`
3. User pays providers directly (OpenAI billing, Anthropic billing, etc.)
4. GateClaw makes API calls using user's keys
5. User pays provider for usage → GateClaw earns $0

**This stays free forever.** Self-hosted users keep 100% of their existing provider relationships.

---

## Partnership Opportunities

### 1. Affiliate Integration (New Users)

For users who **don't have** existing API keys:

| Current Flow | Partnership Flow |
|--------------|------------------|
| User installs GateClaw | User installs GateClaw |
| User goes to provider.com | User clicks "Get API Key" in GateClaw |
| Signs up, adds payment | Redirected via affiliate link |
| Copies API key | Signs up, gets key |
| Pastes in `gateclaw.jsonc` | Auto-configured in `gateclaw.jsonc` |
| Provider pays affiliate $0 | Provider pays affiliate % of spend |

**Benefits for providers:**
- Reduced friction for new users
- Higher conversion rates
- Pre-integrated, tested setup

**Benefits for users:**
- One-click setup
- No manual config editing
- Verified working configuration

**Benefits for GateClaw:**
- Affiliate commission (typically 5-15% of first-year spend)
- Easier onboarding for new users
- No lock-in — users can still add other providers

---

### 2. Bundled Credits (Cloud Offering)

For GateClaw Cloud users (paid hosted service):

| Self-Hosted (Free) | GateClaw Cloud (Paid) |
|--------------------|-----------------------|
| User manages own providers | Provider integrated |
| User pays OpenAI, Anthropic directly | Credits bundled in subscription |
| User handles bills | Single monthly bill |
| No affiliate relationship | Revenue share with providers |

**Pricing concept:**
- $9/month: Basic (small AI credits included)
- $29/month: Pro (larger AI credits included)
- $99/month: Enterprise (teams + enterprise support)

Revenue split with provider:
- GateClaw keeps subscription margin
- Provider credits at wholesale rates
- Or affiliate commission on overage

---

### 3. Enterprise Deals

For companies requiring:
- SSO (SAML, OAuth)
- SOC2/HIPAA compliance
- SLA guarantees
- On-premise deployment support
- Dedicated support

**Revenue model:**
- Per-seat pricing
- Annual contracts
- Provider credits at negotiated rates

---

## Provider Integration Points

GateClaw already supports these providers with user-provided keys:

**Cloud Providers:**
- OpenAI (GPT-4, GPT-4o, GPT-4.5)
- Anthropic (Claude 3.5, Claude 4)
- Google (Gemini 1.5, Gemini 2)
- OpenRouter ( aggregator)
- Mistral
- Cohere
- Replicate
- Together AI
- Fireworks
- Groq
- Cerebras
- DeepSeek
- DeepInfra
- X.AI (Grok)
- Perplexity

**Local Providers:**
- llama-swap (multi-model router)
- Ollama (local inference)
- LM Studio (desktop app)
- llama.cpp (CPU inference)
- vLLM (high-throughput)

---

## Partnership Interest Form

Providers interested in integration partnerships, email:

**business@yourcompany.com**

Include:
1. Provider name
2. API offerings (models, pricing)
3. Affiliate/commission structure
4. Integration requirements
5. Timeline

---

## Transparency Commitment

1. **Self-hosted stays free** — No partnership will remove features from self-hosted users
2. **Opt-in affiliate links** — Users with existing keys keep 100% of their relationship
3. **No lock-in** — Users can add any provider, affiliate or not
4. **Clear disclosure** — Affiliate links will be labeled "Get API Key (Partner Link)"

---

## Revenue Philosophy

- **Self-hosted**: Free forever. Costs you nothing. We earn $0.
- **Cloud**: Paid. We bundle provider credits at wholesale rates.
- **Affiliate**: Commission on new user signups. Your existing accounts stay 100% yours.

We don't double-dip. You don't pay extra. Providers pay for customer acquisition (which they'd spend anyway on marketing).