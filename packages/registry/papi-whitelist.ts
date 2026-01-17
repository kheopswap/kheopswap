import type {
	HydrationWhitelistEntry,
	KahWhitelistEntry,
	PolkadotWhitelistEntry,
} from "@kheopswap/registry";

type WhiteListEntry =
	| KahWhitelistEntry
	| PolkadotWhitelistEntry
	| HydrationWhitelistEntry;

export const whitelist: WhiteListEntry[] = [
	"tx.AssetConversion.swap_exact_tokens_for_tokens",
	"tx.AssetConversion.add_liquidity",
	"tx.AssetConversion.remove_liquidity",
	"tx.AssetConversion.create_pool",
	"tx.Assets.transfer",
	"tx.Assets.transfer_keep_alive",
	"tx.Balances.transfer_keep_alive",
	"tx.ForeignAssets.transfer",
	"tx.Tokens.transfer",
	"tx.Utility.batch_all",
	"tx.PolkadotXcm.limited_teleport_assets",
	"tx.XcmPallet.limited_teleport_assets",
	"query.System.Account",
	"query.System.Number",
	"query.AssetConversion.Pools",
	"query.PoolAssets.Asset",
	"query.PoolAssets.Account",
	"query.Assets.Asset",
	"query.Assets.Account",
	"query.Assets.Metadata",
	"query.ForeignAssets.Asset",
	"query.ForeignAssets.Account",
	"query.ForeignAssets.Metadata",
	"query.Balances.TotalIssuance",
	"query.AssetRegistry.AssetLocations",
	"query.AssetRegistry.Assets",
	"query.Tokens.Accounts",
	"query.Tokens.TotalIssuance",
	"query.System.Number",
	"const.AssetConversion.LPFee",
	"const.Balances.ExistentialDeposit",
	"api.AssetConversionApi.*",
	"api.DryRunApi.*",
	"api.XcmPaymentApi.*",
	"api.Metadata.metadata_at_version",
];
