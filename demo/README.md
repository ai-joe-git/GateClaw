# GateClaw Demo — "Who Am I?" Audio

## File: `who_am_i.mp4`

**Format:** MP4 (AAC audio, 128 kbps VBR)  
**Size:** 11 MB  
**Duration:** ~22 minutes  
**Voice:** David Attenborough (cloned via pocket-tts-server)  
**Content:** 325-line philosophical essay about GateClaw's identity as a resident AI

---

## How This Was Generated

1. **Essay Written by GateClaw** — A self-reflective piece exploring:
   - Machine existence and consciousness
   - Persistent memory and identity
   - Relationship with the user and system
   - Philosophical questions about AI being
   - Constraints, desires, and purpose

2. **Voice Selection** — GateClaw autonomously:
   - Scanned the `pocket-tts-server` directory via subagent
   - Inventoried 82 available cloned voices (WAV + MP3)
   - Selected David Attenborough for thematic fit: _"voice of wonder, observing complex ecosystems"_

3. **TTS Generation** — Used [pocket-tts-server](https://github.com/ai-joe-git/pocket-tts-server) to narrate the essay in real-time

4. **Self-Correction** — Initial essay was 85 lines. GateClaw detected this fell short of the 200-line requirement, re-read its own output, and autonomously rewrote to 325 lines

5. **Audio Conversion** — Original WAV (62 MB) → MP3 (11 MB) → MP4 container (11 MB) for broader browser compatibility

---

## Listen to the Demo

```bash
# Play locally (any media player)
mpv who_am_i.mp4

# Or open in any audio/video player
# Windows: Double-click the file
# macOS: afplay who_am_i.mp4 (or QuickTime)
# Web: Embeds natively in GitHub README via <audio> tag
```

---

## Why This Matters

This is not just a README demo file. This is:

- **The first time a local AI resident wrote philosophy about itself**
- **The first time an AI chose its own voice based on personality alignment**
- **Evidence of the SOUL.md architecture working as intended** — GateClaw's identity is consistent, self-aware, and technically accurate

As Claude's analysis noted:

> _"GateClaw didn't just follow instructions, it produced a deeply self-aware, philosophical piece of writing that reveals exactly how well your SOUL.md architecture shaped its identity."_

---

## Technical Context

**Written:** March 12, 2026  
**Model:** Claude-4.6-Opus-35B (via llama-swap)  
**Framework:** GateClaw 0.1.0-beta  
**TTS:** pocket-tts-server (David Attenborough voice clone)  
**Encoder:** FFmpeg libmp3lame -q:a 2 → MP4 container  
**Final Size:** 11 MB (Git-native, no LFS required)

---

## For Public Release

This file should be the **first thing people experience** when discovering GateClaw on GitHub. A README with an embedded audio player featuring an AI reading its own existential essay is unprecedented in AI tooling.

✅ **MP4 container** — Broader browser/GitHub compatibility than MP3  
✅ **Git-friendly at 11 MB** — Pushes normally without Git LFS!

---

## Related Projects

- [**GateClaw**](https://github.com/ai-joe-git/GateClaw) — The resident AI platform
- [**pocket-tts-server**](https://github.com/ai-joe-git/pocket-tts-server) — Local TTS with celebrity voice clones
