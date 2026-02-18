import type {
	KahWhitelistEntry,
	PahWhitelistEntry,
} from "@polkadot-api/descriptors";

type WhiteListEntry = KahWhitelistEntry | PahWhitelistEntry;

export const whitelist: WhiteListEntry[] = [
	"tx.AssetConversion.swap_exact_tokens_for_tokens",
	"tx.AssetConversion.add_liquidity",
	"tx.AssetConversion.remove_liquidity",
	"tx.AssetConversion.create_pool",
	"tx.Assets.transfer",
	"tx.Assets.transfer_keep_alive",
	"tx.Balances.transfer_keep_alive",
	"tx.ForeignAssets.transfer",
	"tx.Utility.batch_all",
	"query.System.Account",
	"query.System.BlockHash",
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
	"query.PolkadotXcm.SafeXcmVersion",
	"query.Revive.OriginalAccount",
	"query.System.Events",
	"const.AssetConversion.LPFee",
	"const.Balances.ExistentialDeposit",
	"api.AssetConversionApi.*",
	"api.DryRunApi.*",
	"api.Metadata.metadata_at_version",
];
