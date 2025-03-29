import { sha256 } from "@noble/hashes/sha256";
import { utf8ToBytes } from "@noble/hashes/utils";
import { safeQueryKeyPart } from "./safeQueryKeyPart";

/**
 * Generates a secure and synchronous hash for an object or string.
 *
 * @param input - The input to hash (object or string).
 * @param length - The length of the truncated hash (default is 8).
 * @returns A short, secure hash string.
 */
export const objectHash = (input: object | string, length = 8) => {
	// Convert the input to a JSON string if it's an object
	const inputString: string =
		typeof input === "string" ? input : safeQueryKeyPart(input);

	// Encode the string into a Uint8Array
	const data: Uint8Array = utf8ToBytes(inputString);

	// Compute the SHA-256 hash
	const hash: Uint8Array = sha256(data);

	// Convert the hash to Base64
	const hashBase64: string = btoa(String.fromCharCode(...hash));

	// Return the truncated hash
	return hashBase64.slice(0, length);
};
