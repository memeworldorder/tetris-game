# Raffle Service

This microservice is responsible for all raffle-related operations for the MWOR platform.

Key responsibilities:

1. Daily raffle ticket distribution based on player scores.
2. Merkle-tree generation for qualified wallets.
3. Verifiable Random Function (VRF) draw to select winners.
4. Persistence of results to Supabase tables.
5. (Optional) Telegram announcements for raffle lifecycle events.

The service is designed to run as a standalone Node process, a Supabase Edge Function, or any serverless container.

## Project Structure

```
raffle-service/
├── src/              # TypeScript source code
│   └── index.ts      # Entry-point (placeholder)
├── db/               # Database schema & migrations
├── dist/             # Compiled JS output (generated)
├── package.json      # NPM metadata & scripts
└── tsconfig.json     # TypeScript configuration
```

## Getting Started

```bash
pnpm install
pnpm run dev
```

---