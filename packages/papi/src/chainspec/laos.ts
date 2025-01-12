export const chainSpec = `{
  "name": "Laos Network",
  "id": "laos_network",
  "chainType": "Live",
  "bootNodes": [
    "/dns4/laos-boot-0.laosfoundation.io/tcp/30334/p2p/12D3KooWPwbNZK339oHX2BGrkp9UAkZ5XKaWkkejy4kj4ZU3aKM5",
    "/dns4/laos-boot-0.laosfoundation.io/tcp/443/wss/p2p/12D3KooWPwbNZK339oHX2BGrkp9UAkZ5XKaWkkejy4kj4ZU3aKM5",
    "/dns4/laos-boot-1.laosfoundation.io/tcp/30334/p2p/12D3KooWH9tUB68tBwUfP54NJkGxwx7cxKmuoLX5gpHkHiESLoeJ",
    "/dns4/laos-boot-1.laosfoundation.io/tcp/443/wss/p2p/12D3KooWH9tUB68tBwUfP54NJkGxwx7cxKmuoLX5gpHkHiESLoeJ",
    "/dns4/laos-boot-2.laosfoundation.io/tcp/30334/p2p/12D3KooWEv926SQ6djXFEMMskZKKMuN3HwJYoCZKBHvymU8Dp5Qc",
    "/dns4/laos-boot-2.laosfoundation.io/tcp/443/wss/p2p/12D3KooWEv926SQ6djXFEMMskZKKMuN3HwJYoCZKBHvymU8Dp5Qc"
  ],
  "properties": {
    "ss58Format": 42,
    "tokenDecimals": 18,
    "tokenSymbol": "LAOS"
  },
  "relay_chain": "polkadot",
  "para_id": 3370,
  "codeSubstitutes": {},
  "genesis": {
    "stateRootHash": "0xd80e8c97286442f29e6bcb8a2d8e692099c15a1ab5fe3a337a7ddc8b4a62744f"
  }
}`;
