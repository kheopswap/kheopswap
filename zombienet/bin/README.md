# Polkadot binaries folder

Sample build script for all needed binaries

```sh
# To run in polkadot-sdk repo root folder

cargo build --release --features fast-runtime --bin polkadot
cp target/release/polkadot ~/dev/kheopswap/kheopswap/zombienet/bin/polkadot

cargo build --release --features fast-runtime --bin polkadot-prepare-worker
cp target/release/polkadot-prepare-worker ~/dev/kheopswap/kheopswap/zombienet/bin/polkadot-prepare-worker

cargo build --release --features fast-runtime --bin polkadot-execute-worker
cp target/release/polkadot-execute-worker ~/dev/kheopswap/kheopswap/zombienet/bin/polkadot-execute-worker

cargo build --release -p polkadot-parachain-bin
cp target/release/polkadot-parachain ~/dev/kheopswap/kheopswap/zombienet/bin/polkadot-parachain
cp target/release/polkadot-parachain ~/dev/kheopswap/kheopswap/zombienet/bin/polkadot-parachain-asset-hub
```
