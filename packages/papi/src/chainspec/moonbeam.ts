// https://github.com/moonbeam-foundation/moonbeam/blob/master/specs/moonbeam/parachain-embedded-specs.json
// It connects but fails to estimate fees on transfers
export const chainSpec = `{
  "name": "Moonbeam",
  "id": "moonbeam",
  "chainType": "Live",
  "bootNodes": [
    "/dns4/del-moonbeam-boot-1.moonbeam.ol-infra.network/tcp/30333/p2p/12D3KooWCSHmCQYeSpt7LC8B6sePi6zN89saSWEhBs9VbkDvxHar",
    "/dns4/fro-moonbeam-boot-1.moonbeam.ol-infra.network/tcp/30333/p2p/12D3KooWN9HEoJHEi6VzemrFgyiY2vjTPhcSMKAb4qQ9hUyRKQsU",
    "/dns4/ukl-moonbeam-boot-1.moonbeam.ol-infra.network/tcp/30333/p2p/12D3KooWAHrxxSWaV2WGaP2a3Fyueurxi6SAMCRzgjzUtVZSu9Zx",
    "/dns4/sino-moonbeam-boot-1.moonbeam.ol-infra.network/tcp/30333/p2p/12D3KooWREsu1J1T76YGHL77BLrJYTdfWZBd4eY4Kbwfa2DqUhoh",
    "/dns/na-02.unitedbloc.com/tcp/7060/p2p/12D3KooWS9aDbVwmLHrWKjehiGGzDSsTUVYyjvwuguz8jyFVDG2q",
    "/dns/eu-02.unitedbloc.com/tcp/37060/p2p/12D3KooWRwPNbahHG9pnPd5hSyHCMZo8aV5qaJwH2qCoxTbMA3KJ",
    "/dns/eu-03.unitedbloc.com/tcp/37060/p2p/12D3KooWF43rrtXewLGW8X9Pp6nyV6ESAZRnNCHVkZy1kzG1MueB",
    "/dns/eu-04.unitedbloc.com/tcp/37060/p2p/12D3KooWSVwNFLrR9Bc3st9yiyjUnEx8CKSavfh3hyPeVsSdTDSn",
    "/dns/eu-01.unitedbloc.com/tcp/37060/p2p/12D3KooWJTFVibb5ADHY1iUhE3iqMYiaVeXhdBWFYXrkmkxVXrBD",
    "/dns/apac-02.unitedbloc.com/tcp/37060/p2p/12D3KooWJsfWGQLajaXXoqYSpn1CZbXHs7RDWqbgvsBXPJrjVGjb",
    "/dns/apac-01.unitedbloc.com/tcp/37060/p2p/12D3KooWCnXymVyowL5YymVk6RNzRzFAWUvurX7eTTYAFcCbs4nj",
    "/dns/sa-01.unitedbloc.com/tcp/37060/p2p/12D3KooWC3FoL2bFJ79C5CeLDjLmL2yRyozPxSjTQbm9RY95KNsV",
    "/dns/na-01.unitedbloc.com/tcp/37060/p2p/12D3KooWLEZwHD8tWvWiEqKcD976wxdE5JRUnq1JG9a6VJxHUjiS",
    "/dns/moonbeam-boot-ng.dwellir.com/tcp/443/wss/p2p/12D3KooWSKaKdqWFhNK8XTBhqNUZL2LUTZNCgFt1iXRN2HfvoLsh",
    "/dns/moonbeam-boot-ng.dwellir.com/tcp/30364/p2p/12D3KooWSKaKdqWFhNK8XTBhqNUZL2LUTZNCgFt1iXRN2HfvoLsh"
  ],
  "properties": {
    "SS58Prefix": 1284,
    "tokenDecimals": 18,
    "tokenSymbol": "GLMR"
  },
  "relayChain": "polkadot",
  "paraId": 2004,
  "consensusEngine": null,
  "codeSubstitutes": {},
  "genesis": {
    "stateRootHash": "0x74e54bafcf1ecdce51867078fa16f2902751d11473628ac19e89a5be20df3262"
  }
}`;
