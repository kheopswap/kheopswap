export const chainSpec = `{
  "name": "Mythos",
  "id": "mythos",
  "chainType": "Live",
  "bootNodes": [
    "/dns/polkadot-mythos-connect-0.polkadot.io/tcp/30333/p2p/12D3KooWJ3zJMjcReodmHx5KLm9LwbFtLvScncqj89UX5j8VYMUf",
    "/dns/polkadot-mythos-connect-0.polkadot.io/tcp/443/wss/p2p/12D3KooWJ3zJMjcReodmHx5KLm9LwbFtLvScncqj89UX5j8VYMUf",
    "/dns/polkadot-mythos-connect-1.polkadot.io/tcp/30333/p2p/12D3KooWLin9rPs8irgJZgFTab6nhQjFSVp6xYTPTrLGrbjZypeu",
    "/dns/polkadot-mythos-connect-1.polkadot.io/tcp/443/wss/p2p/12D3KooWLin9rPs8irgJZgFTab6nhQjFSVp6xYTPTrLGrbjZypeu"
  ],
  "telemetryEndpoints": null,
  "properties": {
    "isEthereum": true,
    "ss58Format": 29972,
    "tokenDecimals": 18,
    "tokenSymbol": "MYTH"
  },
  "relay_chain": "polkadot",
  "para_id": 3369,
  "codeSubstitutes": {},
  "genesis": {
    "stateRootHash": "0xebc8c0bc54d21776b5927eb7581d456172daf57aeada4b3dd007fc106ab99b53"
  }
}`;
