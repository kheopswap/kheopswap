// TODO missing wss endpoints

export const chainSpec = `{
  "name": "Bifrost Polkadot",
  "id": "bifrost_polkadot",
  "chainType": "Live",
  "bootNodes": [
    "/dns4/jp.bifrost-polkadot.liebi.com/tcp/30333/p2p/12D3KooWHaTVz5iv5jvWaT5WaJWxV5bP4VQXNUN8uvJCQnKMW5Gg",
    "/dns4/hk.bifrost-polkadot.liebi.com/tcp/30333/p2p/12D3KooWA3Vz7a9kCF4qv7sukd3AGySwxzS98zTGVft1oHjW5enm",
    "/dns4/eu.bifrost-polkadot.liebi.com/tcp/30333/p2p/12D3KooWJLuZb3ZTSiCr35QaNVTrxtjB5FjNWXWWTUEEt7vvGtyz",
    "/dns4/us.bifrost-polkadot.liebi.com/tcp/30333/p2p/12D3KooWHo4jh4YUptet3dDRRdfMLpZmynebu75FF2NQWyVMwp3f",
  ],
  "properties": {
    "ss58Format": 0,
    "tokenDecimals": [
      12
    ],
    "tokenSymbol": [
      "BNC"
    ]
  },
  "relayChain": "polkadot",
  "paraId": 2030,
  "codeSubstitutes": {},
  "genesis": {
    "stateRootHash": "0x2a9c5fae68d226bfef7830398114196416ca1799ebb0099fdfa8b7b7ef19adf4"
  }
}`;
