import { TalismanOrb } from "@talismn/orb";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { WalletAccount } from "../common/kheopskit";
import { AccountIcon } from "./AccountIcon";

afterEach(cleanup);

const POLKADOT_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const ETHEREUM_ADDRESS = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67";

const renderedMarkup = (element: React.ReactElement) =>
	render(element).container.innerHTML.replaceAll(/_r_\w+_/g, "useId");

const talismanOrbMarkup = (address: string) =>
	renderedMarkup(<TalismanOrb seed={address} />);

const account = (
	fields: Pick<
		WalletAccount,
		"platform" | "address" | "walletId" | "walletName"
	>,
) =>
	({ id: `${fields.walletId}::${fields.address}`, ...fields }) as WalletAccount;

describe("AccountIcon", () => {
	it.each([
		["polkadot", POLKADOT_ADDRESS],
		["ethereum", ETHEREUM_ADDRESS],
	] as const)(
		"renders a Talisman orb for a %s account of Talisman Mobile over WalletConnect",
		(platform, address) => {
			const markup = renderedMarkup(
				<AccountIcon
					account={account({
						platform,
						address,
						walletId: "walletconnect",
						walletName: "Talisman",
					})}
				/>,
			);

			expect(markup).toBe(talismanOrbMarkup(address));
		},
	);

	it("renders a Talisman orb for an account of the Talisman extension", () => {
		const markup = renderedMarkup(
			<AccountIcon
				account={account({
					platform: "polkadot",
					address: POLKADOT_ADDRESS,
					walletId: "polkadot:talisman",
					walletName: "Talisman",
				})}
			/>,
		);

		expect(markup).toBe(talismanOrbMarkup(POLKADOT_ADDRESS));
	});

	it("renders an identicon for an account of another wallet over WalletConnect", () => {
		const markup = renderedMarkup(
			<AccountIcon
				account={account({
					platform: "polkadot",
					address: POLKADOT_ADDRESS,
					walletId: "walletconnect",
					walletName: "Nova Wallet",
				})}
			/>,
		);

		expect(markup).not.toBe(talismanOrbMarkup(POLKADOT_ADDRESS));
	});
});
