# Divine Dialogue

An AI guide to six world traditions (Buddhism, Christianity, Hinduism, Islam, Judaism and secular
philosophy). Talk with a guide, ask one question of all six traditions side by side, read any
passage with an explanation, and get a daily blessing.

Every quotation is fetched from a published translation and linked to its source, so the guides
never invent scripture:

| Tradition | Texts | Source |
| --- | --- | --- |
| Christianity | Bible: World English Bible; Reina-Valera 1909 in Spanish | getbible.net |
| Islam | Quran: Saheeh International; Julio Cortés in Spanish. Hadith: Bukhari, Muslim, Nawawi | fawazahmed0 quran-api and hadith-api |
| Judaism | Tanakh, Mishnah, Talmud | Sefaria |
| Hinduism | Bhagavad Gita: Shri Purohit Swami | vedicscriptures.github.io |
| Buddhism | Dhammapada and suttas: Bhikkhu Sujato (CC0) | SuttaCentral |
| Secular | Marcus Aurelius (George Long), Epictetus (T. W. Higginson) | Project Gutenberg, bundled |

> Work in progress: this is being rebuilt from a 2025 Replit prototype. Voice conversation,
> accounts and subscriptions are on the way.

## Run it locally

```bash
pnpm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
pnpm dev
```

Without a key the app still loads and shows a friendly "not configured" message.

Voice needs an ElevenLabs key with Text to Speech and Speech to Text access (`ELEVENLABS_API_KEY`).

## Free limits and spending safety

Every visitor gets an anonymous, signed cookie (`SESSION_SECRET`). Each paid action is logged with
its estimated cost in a Supabase table, and the server checks it before calling Claude or ElevenLabs:

| Free each day | Default |
|---|---|
| Typed questions | 10 |
| Voice replies | 3 |
| "Ask all six traditions" | 2 |
| Passage explanations | 10 |

On top of that: 6 requests a minute per visitor, $0.40 a day per visitor, per-network caps that
survive clearing cookies, and a $3 daily ceiling across everyone, after which AI features pause.
All are adjustable by environment variable (see `.env.example`). If the usage database can't be
reached, AI features are refused rather than left unguarded.

To set it up, create a free Supabase project, run `supabase/migrations/20261027200000_usage.sql`
in its SQL Editor, and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Locally, without Supabase,
limits are switched off (with a warning); in production they are required.

## Divine Dialogue Plus (Stripe, test mode)

Plus is a €4.99/month subscription that raises the daily allowances (100 questions, 40 voice
replies up to 200 a month, 20 comparisons, 50 passages). It runs entirely in **Stripe test mode**:
the server refuses a live key unless `ALLOW_LIVE_PAYMENTS=true` is set on purpose.

- **Checkout:** signed-in visitors upgrade through Stripe Checkout; the price is found by its
  lookup key, so no price ID needs configuring.
- **Webhooks:** `/api/stripe/webhook` verifies Stripe's signature and copies the subscription's
  status into Supabase. Returning from Checkout also syncs, so Plus applies at once.
- **Billing portal:** members change their card, see invoices or cancel in Stripe's Customer Portal.

Setup, in a Stripe sandbox:

```bash
# 1. Put the sandbox's sk_test_ key in .env.local as STRIPE_SECRET_KEY
# 2. Create the Plus product, price and portal settings (safe to re-run)
pnpm stripe:setup
# 3. Run supabase/migrations/20261028100000_subscriptions.sql in the Supabase SQL Editor
# 4. Locally, forward webhooks (prints the whsec_ secret for STRIPE_WEBHOOK_SECRET)
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Test card: `4242 4242 4242 4242`, any future date, any CVC.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm build
pnpm check:sources   # fetches a passage from every source, including all daily-blessing passages
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Anthropic SDK (Claude Sonnet 5.5
for answers, Claude Haiku 5.5 for the daily blessing)
