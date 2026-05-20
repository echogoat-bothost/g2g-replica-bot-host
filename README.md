# g2g-replica-bot-host

G2G Helper Discord Bot — AutoMM, Panel Tickets, Wallet Management

## Commands

| Command | Description |
|---------|-------------|
| `/automm-panel` | Creates an AutoMM panel with payment method dropdown |
| `/setwallet` | Sets the wallet address for a payment method (admin only) |
| `/panel create` | Creates a support/MM panel with a fully custom ticket form |
| `/add` | Adds a user to the current ticket channel |

## AutoMM Flow

1. User selects payment method from dropdown → private ticket created
2. User clicks **Setup Trade** → enters amount and trade description
3. Bot posts wallet address for that method automatically
4. User sends payment, clicks **I've Sent Payment** → enters TxID/proof
5. Staff clicks **✅ Verify Payment** → buyer confirmed, seller delivers
6. Staff clicks **Mark as Completed** → ticket closes in 10 seconds

## Setup

1. Clone this repo
2. Install dependencies: `pnpm install`
3. Set environment variables:
   - `DISCORD_TOKEN` — your bot token
   - `DISCORD_CLIENT_ID` — your bot application ID
   - `DATABASE_URL` — PostgreSQL connection string
4. Push DB schema: `pnpm --filter @workspace/db run push`
5. Run: `pnpm --filter @workspace/api-server run dev`

## Setwallet (run once per payment method)

```
/setwallet payment_method:Bitcoin address:bc1qxxxxxxx
/setwallet payment_method:Ethereum address:0xxxxxxxxxx
```

## Panel Create Example

When prompted for **Ticket Form Questions**, separate each question with `|`:

```
Who is the trader? | What are you trading? | Agreed amount | Payment method
```

## Stack

- Node.js 24 + TypeScript
- discord.js v14
- Express 5
- PostgreSQL + Drizzle ORM
- pnpm workspaces

