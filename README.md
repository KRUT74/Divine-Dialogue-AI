# Divine Dialogue

An AI guide to six world traditions (Buddhism, Christianity, Hinduism, Islam, Judaism and secular
philosophy): a daily blessing, questions answered with care, a side-by-side view of how the other
traditions see the same question, and scripture explained.

> Work in progress: this is being rebuilt from a 2025 Replit prototype. Voice conversation, grounded
> citations, accounts and subscriptions are on the way.

## Run it locally

```bash
pnpm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
pnpm dev
```

Without a key the app still loads and shows a friendly "not configured" message.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm build
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Anthropic SDK (Claude Sonnet 5.5
for answers, Claude Haiku 5.5 for the daily blessing)
