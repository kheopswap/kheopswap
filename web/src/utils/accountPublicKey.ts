import { uniqBy } from "lodash-es";
import { AccountId } from "polkadot-api";
import { toHex } from "polkadot-api/utils";
import { isEthereumAddress } from "./ethereumAddress";

const accountIdCodec = AccountId();

export const getAccountPublicKey = (address: string) =>
	isEthereumAddress(address)
		? address.toLowerCase()
		: toHex(accountIdCodec.enc(address));

export const uniqByPublicKey = <T>(
	items: T[],
	getAddress: (item: T) => string,
) => uniqBy(items, (item) => getAccountPublicKey(getAddress(item)));
