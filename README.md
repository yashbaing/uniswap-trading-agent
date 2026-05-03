# Uniswap Trading Agent

Dynamic wallet-based trading agent using Uniswap Trade API.

## What this does

- Uses your wallet private key to sign and send swap transactions.
- Calls Uniswap Trade API for `/quote` and `/swap`.
- Exposes HTTP endpoints so you can trade any supported token pair dynamically.
- Supports chain presets (`mainnet`, `base`, `arbitrum`).
- Supports `amountHuman` conversion to on-chain units (auto-decimals from token when needed).
- Includes DCA strategy endpoint for repeated buys.

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill `.env` values:

- `UNISWAP_API_KEY`: your Uniswap API key.
- `RPC_URL`: mainnet/base/arbitrum RPC URL for the chain you want to trade on.
- `WALLET_PRIVATE_KEY`: private key of the wallet that holds funds.
- `CHAIN_PRESET`: `mainnet` / `base` / `arbitrum` default chain.
- `PORT`: optional service port.

3. Install dependencies:

```bash
npm install
```

4. Start server:

```bash
npm start
```

## Endpoints

### Health

`GET /health`

Returns wallet address, native coin balance, and network info.

### Quote

`POST /quote`

Example body:

```json
{
  "chain": "mainnet",
  "tokenIn": "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "tokenOut": "0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2",
  "amountHuman": "1.0",
  "type": "EXACT_INPUT",
  "slippageTolerance": 0.5
}
```

### Trade

`POST /trade`

Same body as quote, optional `deadlineSeconds`.

The agent will:
1. Request quote from Uniswap
2. Build swap request
3. Send transaction from your wallet
4. Wait for confirmation

### DCA Strategy

`POST /strategy/dca`

Same as trade body plus:

- `runs`: number of swaps to execute (max 20)
- `intervalMs`: pause between runs in milliseconds

Example:

```json
{
  "chain": "mainnet",
  "tokenIn": "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "tokenOut": "0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2",
  "amountHuman": "1",
  "type": "EXACT_INPUT",
  "slippageTolerance": 0.5,
  "runs": 3,
  "intervalMs": 10000
}
```

## Important

- This trades real money if your wallet has funds.
- Start with very small amounts.
- Keep `.env` private and never commit private key or API key.
