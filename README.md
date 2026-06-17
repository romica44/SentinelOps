# SentinelOps — AI Crisis Command Center

> Band of Agents Hackathon 2026 · Track 3: Regulated / High-Stakes

SentinelOps turns Band into a multi-agent crisis command center for regulated industries. Seven specialized AI agents debate in real time inside a Band chat room, with a human operator able to inject intelligence mid-crisis and trigger agent recalibration.

## Demo

[Watch the 5-minute demo video](#) <!-- link a tu video -->

## How it works

1. Operator selects or writes a crisis scenario and clicks **Launch Crisis**
2. Seven Band Remote Agents run sequentially: Commander → Security → Operations → Legal → Finance → PR → Executive
3. Agents genuinely conflict — Security wants to freeze accounts, Operations says that destroys evidence
4. Human operator injects new intelligence into the Band room mid-crisis
5. Security and Executive recalibrate with updated AI responses
6. Full timestamped audit trail exported as JSON for compliance review

## Tech stack

- **Next.js 14** — App Router, TypeScript
- **Band Remote Agent API** — per-agent API keys, @mention routing
- **Groq** — Llama 3.3 70B via OpenAI-compatible API
- **pptxgenjs** — audit report generation

## Setup

```bash
npm install
cp .env.example .env.local
# Add your Band agent keys and GROQ_API_KEY
npm run dev
```

## Evidence

See [`/evidence/band/`](./evidence/band/) for Band chat screenshots and exported crisis audit trail.