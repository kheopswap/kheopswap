# kheopswap.xyz

[https://kheopswap.xyz](https://kheopswap.xyz) - A decentralized exchange for seamless swaps on the Polkadot Asset Hub.

## Development

### Option 1 - Dev using production RPCs

```bash
corepack enable

pnpm install

# optionally, update PAPI metadata from live networks
# pnpm papi:update

pnpm dev
```

### Option 2 - Dev using Chopsticks RPCs (local sandbox)

This method is recommended for development as it allows you to test and execute transactions in a sandboxed environment without using real tokens.

You will need two terminal instances:

#### Terminal 1: Launch Chopsticks networks

```bash
corepack enable

pnpm install

# This will launch networks and keep the terminal instance busy
pnpm chopsticks
```

Chopsticks runs a local copy of the Polkadot Asset Hub at `ws://localhost:3421`.

> Note: To see your balances on this local network in Talisman, customize the Asset Hub network in Talisman settings to use this RPC.

#### Terminal 2: Launch Kheopswap

```bash
pnpm install

# optionally, update PAPI metadata from live networks
# pnpm papi:update

pnpm dev:chopsticks
```

> Note: When Kheopswap is connected to Chopsticks, the website header will be orange (instead of the usual pink), letting you know you are in sandbox mode.
