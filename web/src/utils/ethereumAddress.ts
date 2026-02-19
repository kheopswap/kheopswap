import {
	AccountId,
	Binary,
	type SizedHex,
	type SS58String,
} from "polkadot-api";
import { fromHex } from "polkadot-api/utils";
import { isAddress } from "viem";
import { isValidSs58Address } from "./isValidSs58Address";

const EVM_SUFFIX = new Uint8Array(12).fill(0xee);

const accountIdCodec = AccountId();

/**
 * Check if a string is a valid EVM (Ethereum) address (0x-prefixed, 40 hex chars).
 */
export const isEthereumAddress = (address: string): address is `0x${string}` =>
	isAddress(address);

/**
 * Check if a string is a valid address of any supported type (SS58 or EVM).
 */
export const isValidAnyAddress = (address: string): boolean =>
	isValidSs58Address(address) || isEthereumAddress(address);

/**
 * Convert an EVM address to a Substrate SS58 address using the Revive pallet's
 * fallback derivation: 20 bytes of the EVM address + 12 bytes of 0xEE.
 *
 * @see https://github.com/paritytech/polkadot-sdk/blob/main/substrate/frame/revive/src/address.rs — `AccountId32Mapper::to_fallback_account_id`
 */
export const getSs58AddressFallback = (
	evmAddress: `0x${string}`,
): SS58String => {
	const evmBytes = fromHex(evmAddress);
	const publicKey = new Uint8Array(32);
	publicKey.set(evmBytes, 0);
	publicKey.set(EVM_SUFFIX, 20);
	return accountIdCodec.dec(publicKey);
};

/**
 * Convert an EVM address to a SizedHex<20> (H160-compatible) value.
 */
export const getEthereumAddressSizedHex = (
	evmAddress: `0x${string}`,
): SizedHex<20> => {
	const bytes = Binary.fromHex(evmAddress);

	if (bytes.length !== 20) {
		throw new Error("Invalid ethereum address byte length");
	}

	return evmAddress.toLowerCase() as SizedHex<20>;
};
