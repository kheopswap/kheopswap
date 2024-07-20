import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { AccountId } from "polkadot-api";
import { getPolkadotSigner } from "polkadot-api/signer";

const entropy = mnemonicToEntropy(DEV_PHRASE);
const miniSecret = entropyToMiniSecret(entropy);
const derive = sr25519CreateDerive(miniSecret);

const getDevAccount = (derivationPath: string) => {
  const keyPair = derive("//Alice");
  return {
    // derivationPath,
    // keyPair,
    address: AccountId().dec(keyPair.publicKey),
    signer: getPolkadotSigner(keyPair.publicKey, "Sr25519", keyPair.sign),
  };
};

export const getAccount = (mnemonic: string, derivationPath: string) => {
  const entropy = mnemonicToEntropy(mnemonic);
  const miniSecret = entropyToMiniSecret(entropy);
  const derive = sr25519CreateDerive(miniSecret);

  const keyPair = derive(derivationPath);
  return {
    // derivationPath,
    // keyPair,
    address: AccountId().dec(keyPair.publicKey),
    signer: getPolkadotSigner(keyPair.publicKey, "Sr25519", keyPair.sign),
  };
};

export type Account = ReturnType<typeof getDevAccount>;

export const alice = getDevAccount("//Alice");
export const bob = getDevAccount("//Bob");
export const charlie = getDevAccount("//Charlie");
export const dave = getDevAccount("//Dave");
export const eve = getDevAccount("//Eve");
export const ferdie = getDevAccount("//Ferdie");

export const getDevEnvAccount = () => {
  const mnemonic = process.env.KHEOPSWAP_MNEMONIC;
  const derivationPath = process.env.KHEOPSWAP_DERIVATION_PATH;
  const expectedAddress = process.env.KHEOPSWAP_ADDRESS;

  if (!mnemonic || !derivationPath || !expectedAddress) {
    throw new Error("Missing env variables");
  }

  const account = getAccount(mnemonic, derivationPath);

  if (account.address !== expectedAddress) {
    throw new Error("Invalid address");
  }

  return account;
};
