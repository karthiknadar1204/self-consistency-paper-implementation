# self-consistency-paper-implementation

Self-consistency API using Groq Cloud for LLM sampling (Bun + Express).

## Setup

```bash
bun install
```

Add a `.env` in the project root (get your key from https://console.groq.com):

```
GROQ_API_KEY=gsk_your_key_here
PORT=3000
```

## Run

```bash
bun run index.ts
```

Server runs at `http://localhost:3000`.

## Workflow

1. You send **your query** in the JSON body as `prompt`.
2. The server sends a **system prompt** (in `index.ts` as `SYSTEM_PROMPT`) plus your query to the model, samples multiple answers, and returns the majority **topAnswer** and vote details.

**System prompt** (edit in `index.ts`): `"Think step by step, then give your final answer in the form: The answer is X."`

## Example API call

```bash
curl -X POST http://localhost:3000/self-consistency \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 15 + 27?", "numSamples": 5, "temperature": 0.8}'
```

This project was created using `bun init`. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
