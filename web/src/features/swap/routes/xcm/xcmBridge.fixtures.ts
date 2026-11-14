import {
	XcmV5Junction,
	XcmV5Junctions,
	XcmV5NetworkId,
} from "@polkadot-api/descriptors";
import { getTokenId } from "../../../../registry/tokens/helpers";
import type { XcmHopInbound } from "../../../../utils/xcmHop";
import type { XcmTransferArgs } from "../xcmTransfer/getXcmTransferCall";
import type { DeliveryFees, DestinationDryRun, OriginDryRun } from "./xcmQuote";

export type BridgeTransferFixture = (
	| { origin: "pah"; destination: "kah" }
	| { origin: "kah"; destination: "pah" }
) & {
	sender: string;
	beneficiary: string;
	amount: bigint;
	args: XcmTransferArgs;
	originDryRun: OriginDryRun;
	deliveryFees: DeliveryFees | null;
	inbound: XcmHopInbound | null;
	destinationDryRun: DestinationDryRun | null;
};

const getBridgedRelayTokenId = (
	chainId: "pah" | "kah",
	network: XcmV5NetworkId,
) =>
	getTokenId({
		type: "foreign-asset",
		chainId,
		location: {
			parents: 2,
			interior: XcmV5Junctions.X1(XcmV5Junction.GlobalConsensus(network)),
		},
	});

export const KSM_ON_PAH = getBridgedRelayTokenId(
	"pah",
	XcmV5NetworkId.Kusama(),
);
export const DOT_ON_KAH = getBridgedRelayTokenId(
	"kah",
	XcmV5NetworkId.Polkadot(),
);

export const ksmKusamaToPolkadot: BridgeTransferFixture = {
	origin: "kah",
	destination: "pah",
	sender: "F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29",
	beneficiary: "F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29",
	amount: 100000000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 2,
				interior: {
					type: "X2",
					value: [
						{
							type: "GlobalConsensus",
							value: {
								type: "Polkadot",
								value: undefined,
							},
						},
						{
							type: "Parachain",
							value: 1000,
						},
					],
				},
			},
		},
		assets: {
			type: "V5",
			value: [
				{
					id: {
						parents: 1,
						interior: {
							type: "Here",
							value: undefined,
						},
					},
					fun: {
						type: "Fungible",
						value: 100000000000n,
					},
				},
			],
		},
		assets_transfer_type: {
			type: "LocalReserve",
			value: undefined,
		},
		remote_fees_id: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "Here",
					value: undefined,
				},
			},
		},
		fees_transfer_type: {
			type: "LocalReserve",
			value: undefined,
		},
		custom_xcm_on_dest: {
			type: "V5",
			value: [
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						beneficiary: {
							parents: 0,
							interior: {
								type: "X1",
								value: {
									type: "AccountId32",
									value: {
										network: undefined,
										id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
									},
								},
							},
						},
					},
				},
			],
		},
		weight_limit: {
			type: "Unlimited",
			value: undefined,
		},
	},
	originDryRun: {
		success: true,
		value: {
			execution_result: {
				success: true,
				value: {
					actual_weight: undefined,
					pays_fee: {
						type: "Yes",
						value: undefined,
					},
				},
			},
			emitted_events: [
				{
					type: "PolkadotXcm",
					value: {
						type: "Attempted",
						value: {
							outcome: {
								type: "Complete",
								value: {
									used: {
										ref_time: 288331000n,
										proof_size: 6208n,
									},
								},
							},
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "FeesPaid",
						value: {
							paying: {
								parents: 0,
								interior: {
									type: "X1",
									value: {
										type: "AccountId32",
										value: {
											network: {
												type: "Kusama",
												value: undefined,
											},
											id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
										},
									},
								},
							},
							fees: [
								{
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: 3496641411n,
									},
								},
							],
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "Sent",
						value: {
							origin: {
								parents: 0,
								interior: {
									type: "X1",
									value: {
										type: "AccountId32",
										value: {
											network: {
												type: "Kusama",
												value: undefined,
											},
											id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
										},
									},
								},
							},
							destination: {
								parents: 2,
								interior: {
									type: "X2",
									value: [
										{
											type: "GlobalConsensus",
											value: {
												type: "Polkadot",
												value: undefined,
											},
										},
										{
											type: "Parachain",
											value: 1000,
										},
									],
								},
							},
							message: [
								{
									type: "ReserveAssetDeposited",
									value: [
										{
											id: {
												parents: 2,
												interior: {
													type: "X1",
													value: {
														type: "GlobalConsensus",
														value: {
															type: "Kusama",
															value: undefined,
														},
													},
												},
											},
											fun: {
												type: "Fungible",
												value: 100000000000n,
											},
										},
									],
								},
								{
									type: "ClearOrigin",
									value: undefined,
								},
								{
									type: "BuyExecution",
									value: {
										fees: {
											id: {
												parents: 2,
												interior: {
													type: "X1",
													value: {
														type: "GlobalConsensus",
														value: {
															type: "Kusama",
															value: undefined,
														},
													},
												},
											},
											fun: {
												type: "Fungible",
												value: 100000000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										beneficiary: {
											parents: 0,
											interior: {
												type: "X1",
												value: {
													type: "AccountId32",
													value: {
														network: undefined,
														id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0xf932e35ce244167b98c7cfa6aec34fd2f1cb1a72801d93824b2c3d7ba9a8a70a",
						},
					},
				},
			],
			local_xcm: {
				type: "V5",
				value: [
					{
						type: "TransferAsset",
						value: {
							assets: [
								{
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: 100000000000n,
									},
								},
							],
							beneficiary: {
								parents: 2,
								interior: {
									type: "X2",
									value: [
										{
											type: "GlobalConsensus",
											value: {
												type: "Polkadot",
												value: undefined,
											},
										},
										{
											type: "Parachain",
											value: 1000,
										},
									],
								},
							},
						},
					},
				],
			},
			forwarded_xcms: [
				[
					{
						type: "V5",
						value: {
							parents: 1,
							interior: {
								type: "X1",
								value: {
									type: "Parachain",
									value: 1002,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "UnpaidExecution",
									value: {
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
										check_origin: undefined,
									},
								},
								{
									type: "ExportMessage",
									value: {
										network: {
											type: "Polkadot",
											value: undefined,
										},
										destination: {
											type: "X1",
											value: {
												type: "Parachain",
												value: 1000,
											},
										},
										xcm: [
											{
												type: "ReserveAssetDeposited",
												value: [
													{
														id: {
															parents: 2,
															interior: {
																type: "X1",
																value: {
																	type: "GlobalConsensus",
																	value: {
																		type: "Kusama",
																		value: undefined,
																	},
																},
															},
														},
														fun: {
															type: "Fungible",
															value: 100000000000n,
														},
													},
												],
											},
											{
												type: "ClearOrigin",
												value: undefined,
											},
											{
												type: "BuyExecution",
												value: {
													fees: {
														id: {
															parents: 2,
															interior: {
																type: "X1",
																value: {
																	type: "GlobalConsensus",
																	value: {
																		type: "Kusama",
																		value: undefined,
																	},
																},
															},
														},
														fun: {
															type: "Fungible",
															value: 100000000000n,
														},
													},
													weight_limit: {
														type: "Unlimited",
														value: undefined,
													},
												},
											},
											{
												type: "DepositAsset",
												value: {
													assets: {
														type: "Wild",
														value: {
															type: "AllCounted",
															value: 1,
														},
													},
													beneficiary: {
														parents: 0,
														interior: {
															type: "X1",
															value: {
																type: "AccountId32",
																value: {
																	network: undefined,
																	id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
																},
															},
														},
													},
												},
											},
											{
												type: "SetTopic",
												value:
													"0xf932e35ce244167b98c7cfa6aec34fd2f1cb1a72801d93824b2c3d7ba9a8a70a",
											},
										],
									},
								},
								{
									type: "SetTopic",
									value:
										"0xf932e35ce244167b98c7cfa6aec34fd2f1cb1a72801d93824b2c3d7ba9a8a70a",
								},
							],
						},
					],
				],
			],
		},
	},
	deliveryFees: {
		success: true,
		value: {
			type: "V5",
			value: [
				{
					id: {
						parents: 1,
						interior: {
							type: "Here",
							value: undefined,
						},
					},
					fun: {
						type: "Fungible",
						value: 3496641411n,
					},
				},
			],
		},
	},
	inbound: {
		origin: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1002,
					},
				},
			},
		},
		message: {
			type: "V5",
			value: [
				{
					type: "DescendOrigin",
					value: {
						type: "X1",
						value: {
							type: "PalletInstance",
							value: 53,
						},
					},
				},
				{
					type: "UniversalOrigin",
					value: {
						type: "GlobalConsensus",
						value: {
							type: "Kusama",
							value: undefined,
						},
					},
				},
				{
					type: "DescendOrigin",
					value: {
						type: "X1",
						value: {
							type: "Parachain",
							value: 1000,
						},
					},
				},
				{
					type: "ReserveAssetDeposited",
					value: [
						{
							id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Kusama",
											value: undefined,
										},
									},
								},
							},
							fun: {
								type: "Fungible",
								value: 100000000000n,
							},
						},
					],
				},
				{
					type: "ClearOrigin",
					value: undefined,
				},
				{
					type: "BuyExecution",
					value: {
						fees: {
							id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Kusama",
											value: undefined,
										},
									},
								},
							},
							fun: {
								type: "Fungible",
								value: 100000000000n,
							},
						},
						weight_limit: {
							type: "Unlimited",
							value: undefined,
						},
					},
				},
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						beneficiary: {
							parents: 0,
							interior: {
								type: "X1",
								value: {
									type: "AccountId32",
									value: {
										network: undefined,
										id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
									},
								},
							},
						},
					},
				},
				{
					type: "SetTopic",
					value:
						"0xf932e35ce244167b98c7cfa6aec34fd2f1cb1a72801d93824b2c3d7ba9a8a70a",
				},
			],
		},
	},
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 401524000n,
						proof_size: 15856n,
					},
				},
			},
			emitted_events: [
				{
					type: "ForeignAssets",
					value: {
						type: "IssuedCredit",
						value: {
							asset_id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Kusama",
											value: undefined,
										},
									},
								},
							},
							amount: 100000000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "13R1jCReSA88A45FhMyGTUKtQF3HiSXEvV5Rz1CBcu9eNFVR",
							amount: 11996874n,
						},
					},
				},
				{
					type: "ForeignAssets",
					value: {
						type: "Deposited",
						value: {
							asset_id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Kusama",
											value: undefined,
										},
									},
								},
							},
							who: "13R1jCReSA88A45FhMyGTUKtQF3HiSXEvV5Rz1CBcu9eNFVR",
							amount: 371580592n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 371580592n,
							amount_out: 11996874n,
							path: [
								[
									{
										parents: 2,
										interior: {
											type: "X1",
											value: {
												type: "GlobalConsensus",
												value: {
													type: "Kusama",
													value: undefined,
												},
											},
										},
									},
									371580592n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									11996874n,
								],
							],
						},
					},
				},
				{
					type: "ForeignAssets",
					value: {
						type: "Deposited",
						value: {
							asset_id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Kusama",
											value: undefined,
										},
									},
								},
							},
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 99628419408n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 11996874n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const ksmPolkadotToKusama: BridgeTransferFixture = {
	origin: "pah",
	destination: "kah",
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	beneficiary: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	amount: 100000000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 2,
				interior: {
					type: "X2",
					value: [
						{
							type: "GlobalConsensus",
							value: {
								type: "Kusama",
								value: undefined,
							},
						},
						{
							type: "Parachain",
							value: 1000,
						},
					],
				},
			},
		},
		assets: {
			type: "V5",
			value: [
				{
					id: {
						parents: 2,
						interior: {
							type: "X1",
							value: {
								type: "GlobalConsensus",
								value: {
									type: "Kusama",
									value: undefined,
								},
							},
						},
					},
					fun: {
						type: "Fungible",
						value: 100000000000n,
					},
				},
			],
		},
		assets_transfer_type: {
			type: "DestinationReserve",
			value: undefined,
		},
		remote_fees_id: {
			type: "V5",
			value: {
				parents: 2,
				interior: {
					type: "X1",
					value: {
						type: "GlobalConsensus",
						value: {
							type: "Kusama",
							value: undefined,
						},
					},
				},
			},
		},
		fees_transfer_type: {
			type: "DestinationReserve",
			value: undefined,
		},
		custom_xcm_on_dest: {
			type: "V5",
			value: [
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						beneficiary: {
							parents: 0,
							interior: {
								type: "X1",
								value: {
									type: "AccountId32",
									value: {
										network: undefined,
										id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
									},
								},
							},
						},
					},
				},
			],
		},
		weight_limit: {
			type: "Unlimited",
			value: undefined,
		},
	},
	originDryRun: {
		success: true,
		value: {
			execution_result: {
				success: true,
				value: {
					actual_weight: undefined,
					pays_fee: {
						type: "Yes",
						value: undefined,
					},
				},
			},
			emitted_events: [
				{
					type: "PolkadotXcm",
					value: {
						type: "Attempted",
						value: {
							outcome: {
								type: "Complete",
								value: {
									used: {
										ref_time: 407325000n,
										proof_size: 3768n,
									},
								},
							},
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "FeesPaid",
						value: {
							paying: {
								parents: 0,
								interior: {
									type: "X1",
									value: {
										type: "AccountId32",
										value: {
											network: {
												type: "Polkadot",
												value: undefined,
											},
											id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
										},
									},
								},
							},
							fees: [
								{
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: 376780428n,
									},
								},
							],
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "Sent",
						value: {
							origin: {
								parents: 0,
								interior: {
									type: "X1",
									value: {
										type: "AccountId32",
										value: {
											network: {
												type: "Polkadot",
												value: undefined,
											},
											id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
										},
									},
								},
							},
							destination: {
								parents: 2,
								interior: {
									type: "X2",
									value: [
										{
											type: "GlobalConsensus",
											value: {
												type: "Kusama",
												value: undefined,
											},
										},
										{
											type: "Parachain",
											value: 1000,
										},
									],
								},
							},
							message: [
								{
									type: "WithdrawAsset",
									value: [
										{
											id: {
												parents: 1,
												interior: {
													type: "Here",
													value: undefined,
												},
											},
											fun: {
												type: "Fungible",
												value: 100000000000n,
											},
										},
									],
								},
								{
									type: "ClearOrigin",
									value: undefined,
								},
								{
									type: "BuyExecution",
									value: {
										fees: {
											id: {
												parents: 1,
												interior: {
													type: "Here",
													value: undefined,
												},
											},
											fun: {
												type: "Fungible",
												value: 100000000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										beneficiary: {
											parents: 0,
											interior: {
												type: "X1",
												value: {
													type: "AccountId32",
													value: {
														network: undefined,
														id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0xa4c86fdad2b3e4d98ed4670e55243922d5bcced99ad187a81d054b9c46ce675a",
						},
					},
				},
			],
			local_xcm: {
				type: "V5",
				value: [
					{
						type: "WithdrawAsset",
						value: [
							{
								id: {
									parents: 2,
									interior: {
										type: "X1",
										value: {
											type: "GlobalConsensus",
											value: {
												type: "Kusama",
												value: undefined,
											},
										},
									},
								},
								fun: {
									type: "Fungible",
									value: 100000000000n,
								},
							},
						],
					},
					{
						type: "BurnAsset",
						value: [
							{
								id: {
									parents: 2,
									interior: {
										type: "X1",
										value: {
											type: "GlobalConsensus",
											value: {
												type: "Kusama",
												value: undefined,
											},
										},
									},
								},
								fun: {
									type: "Fungible",
									value: 100000000000n,
								},
							},
						],
					},
				],
			},
			forwarded_xcms: [
				[
					{
						type: "V5",
						value: {
							parents: 1,
							interior: {
								type: "X1",
								value: {
									type: "Parachain",
									value: 1002,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "UnpaidExecution",
									value: {
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
										check_origin: undefined,
									},
								},
								{
									type: "ExportMessage",
									value: {
										network: {
											type: "Kusama",
											value: undefined,
										},
										destination: {
											type: "X1",
											value: {
												type: "Parachain",
												value: 1000,
											},
										},
										xcm: [
											{
												type: "WithdrawAsset",
												value: [
													{
														id: {
															parents: 1,
															interior: {
																type: "Here",
																value: undefined,
															},
														},
														fun: {
															type: "Fungible",
															value: 100000000000n,
														},
													},
												],
											},
											{
												type: "ClearOrigin",
												value: undefined,
											},
											{
												type: "BuyExecution",
												value: {
													fees: {
														id: {
															parents: 1,
															interior: {
																type: "Here",
																value: undefined,
															},
														},
														fun: {
															type: "Fungible",
															value: 100000000000n,
														},
													},
													weight_limit: {
														type: "Unlimited",
														value: undefined,
													},
												},
											},
											{
												type: "DepositAsset",
												value: {
													assets: {
														type: "Wild",
														value: {
															type: "AllCounted",
															value: 1,
														},
													},
													beneficiary: {
														parents: 0,
														interior: {
															type: "X1",
															value: {
																type: "AccountId32",
																value: {
																	network: undefined,
																	id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
																},
															},
														},
													},
												},
											},
											{
												type: "SetTopic",
												value:
													"0xa4c86fdad2b3e4d98ed4670e55243922d5bcced99ad187a81d054b9c46ce675a",
											},
										],
									},
								},
								{
									type: "SetTopic",
									value:
										"0xa4c86fdad2b3e4d98ed4670e55243922d5bcced99ad187a81d054b9c46ce675a",
								},
							],
						},
					],
				],
			],
		},
	},
	deliveryFees: {
		success: true,
		value: {
			type: "V5",
			value: [
				{
					id: {
						parents: 1,
						interior: {
							type: "Here",
							value: undefined,
						},
					},
					fun: {
						type: "Fungible",
						value: 376780428n,
					},
				},
			],
		},
	},
	inbound: {
		origin: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1002,
					},
				},
			},
		},
		message: {
			type: "V5",
			value: [
				{
					type: "DescendOrigin",
					value: {
						type: "X1",
						value: {
							type: "PalletInstance",
							value: 53,
						},
					},
				},
				{
					type: "UniversalOrigin",
					value: {
						type: "GlobalConsensus",
						value: {
							type: "Polkadot",
							value: undefined,
						},
					},
				},
				{
					type: "DescendOrigin",
					value: {
						type: "X1",
						value: {
							type: "Parachain",
							value: 1000,
						},
					},
				},
				{
					type: "WithdrawAsset",
					value: [
						{
							id: {
								parents: 1,
								interior: {
									type: "Here",
									value: undefined,
								},
							},
							fun: {
								type: "Fungible",
								value: 100000000000n,
							},
						},
					],
				},
				{
					type: "ClearOrigin",
					value: undefined,
				},
				{
					type: "BuyExecution",
					value: {
						fees: {
							id: {
								parents: 1,
								interior: {
									type: "Here",
									value: undefined,
								},
							},
							fun: {
								type: "Fungible",
								value: 100000000000n,
							},
						},
						weight_limit: {
							type: "Unlimited",
							value: undefined,
						},
					},
				},
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						beneficiary: {
							parents: 0,
							interior: {
								type: "X1",
								value: {
									type: "AccountId32",
									value: {
										network: undefined,
										id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
									},
								},
							},
						},
					},
				},
				{
					type: "SetTopic",
					value:
						"0xa4c86fdad2b3e4d98ed4670e55243922d5bcced99ad187a81d054b9c46ce675a",
				},
			],
		},
	},
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 478499000n,
						proof_size: 12432n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "FwGjEp7GXJXT9NjH8r4sqdyd8XZVogbxSs3iFakx4wFwJ5Y",
							amount: 100000000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "FBeL7EHTcixza4wwMv4A3TEmL1pVgunDdqYZ2Sbm3uDtFjD",
							amount: 99936618505n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "F3opxRUwkBj1LqjZ7DyiHCRh9Z4zVPLaVjoxfD5ddbip8mt",
							amount: 63381495n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotPolkadotToKusama: BridgeTransferFixture = {
	origin: "pah",
	destination: "kah",
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	beneficiary: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	amount: 10000000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 2,
				interior: {
					type: "X2",
					value: [
						{
							type: "GlobalConsensus",
							value: {
								type: "Kusama",
								value: undefined,
							},
						},
						{
							type: "Parachain",
							value: 1000,
						},
					],
				},
			},
		},
		assets: {
			type: "V5",
			value: [
				{
					id: {
						parents: 1,
						interior: {
							type: "Here",
							value: undefined,
						},
					},
					fun: {
						type: "Fungible",
						value: 10000000000n,
					},
				},
			],
		},
		assets_transfer_type: {
			type: "LocalReserve",
			value: undefined,
		},
		remote_fees_id: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "Here",
					value: undefined,
				},
			},
		},
		fees_transfer_type: {
			type: "LocalReserve",
			value: undefined,
		},
		custom_xcm_on_dest: {
			type: "V5",
			value: [
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						beneficiary: {
							parents: 0,
							interior: {
								type: "X1",
								value: {
									type: "AccountId32",
									value: {
										network: undefined,
										id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
									},
								},
							},
						},
					},
				},
			],
		},
		weight_limit: {
			type: "Unlimited",
			value: undefined,
		},
	},
	originDryRun: {
		success: true,
		value: {
			execution_result: {
				success: true,
				value: {
					actual_weight: undefined,
					pays_fee: {
						type: "Yes",
						value: undefined,
					},
				},
			},
			emitted_events: [
				{
					type: "PolkadotXcm",
					value: {
						type: "Attempted",
						value: {
							outcome: {
								type: "Complete",
								value: {
									used: {
										ref_time: 327118000n,
										proof_size: 6208n,
									},
								},
							},
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "FeesPaid",
						value: {
							paying: {
								parents: 0,
								interior: {
									type: "X1",
									value: {
										type: "AccountId32",
										value: {
											network: {
												type: "Polkadot",
												value: undefined,
											},
											id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
										},
									},
								},
							},
							fees: [
								{
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: 377047092n,
									},
								},
							],
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "Sent",
						value: {
							origin: {
								parents: 0,
								interior: {
									type: "X1",
									value: {
										type: "AccountId32",
										value: {
											network: {
												type: "Polkadot",
												value: undefined,
											},
											id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
										},
									},
								},
							},
							destination: {
								parents: 2,
								interior: {
									type: "X2",
									value: [
										{
											type: "GlobalConsensus",
											value: {
												type: "Kusama",
												value: undefined,
											},
										},
										{
											type: "Parachain",
											value: 1000,
										},
									],
								},
							},
							message: [
								{
									type: "ReserveAssetDeposited",
									value: [
										{
											id: {
												parents: 2,
												interior: {
													type: "X1",
													value: {
														type: "GlobalConsensus",
														value: {
															type: "Polkadot",
															value: undefined,
														},
													},
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000000n,
											},
										},
									],
								},
								{
									type: "ClearOrigin",
									value: undefined,
								},
								{
									type: "BuyExecution",
									value: {
										fees: {
											id: {
												parents: 2,
												interior: {
													type: "X1",
													value: {
														type: "GlobalConsensus",
														value: {
															type: "Polkadot",
															value: undefined,
														},
													},
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										beneficiary: {
											parents: 0,
											interior: {
												type: "X1",
												value: {
													type: "AccountId32",
													value: {
														network: undefined,
														id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0xe3fe523a94e982eb585206d7196af9dba536b61a4bf65e16ee0eae31f6419558",
						},
					},
				},
			],
			local_xcm: {
				type: "V5",
				value: [
					{
						type: "TransferAsset",
						value: {
							assets: [
								{
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: 10000000000n,
									},
								},
							],
							beneficiary: {
								parents: 2,
								interior: {
									type: "X2",
									value: [
										{
											type: "GlobalConsensus",
											value: {
												type: "Kusama",
												value: undefined,
											},
										},
										{
											type: "Parachain",
											value: 1000,
										},
									],
								},
							},
						},
					},
				],
			},
			forwarded_xcms: [
				[
					{
						type: "V5",
						value: {
							parents: 1,
							interior: {
								type: "X1",
								value: {
									type: "Parachain",
									value: 1002,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "UnpaidExecution",
									value: {
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
										check_origin: undefined,
									},
								},
								{
									type: "ExportMessage",
									value: {
										network: {
											type: "Kusama",
											value: undefined,
										},
										destination: {
											type: "X1",
											value: {
												type: "Parachain",
												value: 1000,
											},
										},
										xcm: [
											{
												type: "ReserveAssetDeposited",
												value: [
													{
														id: {
															parents: 2,
															interior: {
																type: "X1",
																value: {
																	type: "GlobalConsensus",
																	value: {
																		type: "Polkadot",
																		value: undefined,
																	},
																},
															},
														},
														fun: {
															type: "Fungible",
															value: 10000000000n,
														},
													},
												],
											},
											{
												type: "ClearOrigin",
												value: undefined,
											},
											{
												type: "BuyExecution",
												value: {
													fees: {
														id: {
															parents: 2,
															interior: {
																type: "X1",
																value: {
																	type: "GlobalConsensus",
																	value: {
																		type: "Polkadot",
																		value: undefined,
																	},
																},
															},
														},
														fun: {
															type: "Fungible",
															value: 10000000000n,
														},
													},
													weight_limit: {
														type: "Unlimited",
														value: undefined,
													},
												},
											},
											{
												type: "DepositAsset",
												value: {
													assets: {
														type: "Wild",
														value: {
															type: "AllCounted",
															value: 1,
														},
													},
													beneficiary: {
														parents: 0,
														interior: {
															type: "X1",
															value: {
																type: "AccountId32",
																value: {
																	network: undefined,
																	id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
																},
															},
														},
													},
												},
											},
											{
												type: "SetTopic",
												value:
													"0xe3fe523a94e982eb585206d7196af9dba536b61a4bf65e16ee0eae31f6419558",
											},
										],
									},
								},
								{
									type: "SetTopic",
									value:
										"0xe3fe523a94e982eb585206d7196af9dba536b61a4bf65e16ee0eae31f6419558",
								},
							],
						},
					],
				],
			],
		},
	},
	deliveryFees: {
		success: true,
		value: {
			type: "V5",
			value: [
				{
					id: {
						parents: 1,
						interior: {
							type: "Here",
							value: undefined,
						},
					},
					fun: {
						type: "Fungible",
						value: 377047092n,
					},
				},
			],
		},
	},
	inbound: {
		origin: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1002,
					},
				},
			},
		},
		message: {
			type: "V5",
			value: [
				{
					type: "DescendOrigin",
					value: {
						type: "X1",
						value: {
							type: "PalletInstance",
							value: 53,
						},
					},
				},
				{
					type: "UniversalOrigin",
					value: {
						type: "GlobalConsensus",
						value: {
							type: "Polkadot",
							value: undefined,
						},
					},
				},
				{
					type: "DescendOrigin",
					value: {
						type: "X1",
						value: {
							type: "Parachain",
							value: 1000,
						},
					},
				},
				{
					type: "ReserveAssetDeposited",
					value: [
						{
							id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Polkadot",
											value: undefined,
										},
									},
								},
							},
							fun: {
								type: "Fungible",
								value: 10000000000n,
							},
						},
					],
				},
				{
					type: "ClearOrigin",
					value: undefined,
				},
				{
					type: "BuyExecution",
					value: {
						fees: {
							id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Polkadot",
											value: undefined,
										},
									},
								},
							},
							fun: {
								type: "Fungible",
								value: 10000000000n,
							},
						},
						weight_limit: {
							type: "Unlimited",
							value: undefined,
						},
					},
				},
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						beneficiary: {
							parents: 0,
							interior: {
								type: "X1",
								value: {
									type: "AccountId32",
									value: {
										network: undefined,
										id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
									},
								},
							},
						},
					},
				},
				{
					type: "SetTopic",
					value:
						"0xe3fe523a94e982eb585206d7196af9dba536b61a4bf65e16ee0eae31f6419558",
				},
			],
		},
	},
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 402336000n,
						proof_size: 15856n,
					},
				},
			},
			emitted_events: [
				{
					type: "ForeignAssets",
					value: {
						type: "IssuedCredit",
						value: {
							asset_id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Polkadot",
											value: undefined,
										},
									},
								},
							},
							amount: 10000000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "HbJnJy2Jg81pAytZogkz1qCzfyQvgq9VCrLaL5jK79jdtLJ",
							amount: 80837917n,
						},
					},
				},
				{
					type: "ForeignAssets",
					value: {
						type: "Deposited",
						value: {
							asset_id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Polkadot",
											value: undefined,
										},
									},
								},
							},
							who: "HbJnJy2Jg81pAytZogkz1qCzfyQvgq9VCrLaL5jK79jdtLJ",
							amount: 2645380n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 2645380n,
							amount_out: 80837917n,
							path: [
								[
									{
										parents: 2,
										interior: {
											type: "X1",
											value: {
												type: "GlobalConsensus",
												value: {
													type: "Polkadot",
													value: undefined,
												},
											},
										},
									},
									2645380n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									80837917n,
								],
							],
						},
					},
				},
				{
					type: "ForeignAssets",
					value: {
						type: "Deposited",
						value: {
							asset_id: {
								parents: 2,
								interior: {
									type: "X1",
									value: {
										type: "GlobalConsensus",
										value: {
											type: "Polkadot",
											value: undefined,
										},
									},
								},
							},
							who: "FBeL7EHTcixza4wwMv4A3TEmL1pVgunDdqYZ2Sbm3uDtFjD",
							amount: 9997354620n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "F3opxRUwkBj1LqjZ7DyiHCRh9Z4zVPLaVjoxfD5ddbip8mt",
							amount: 80837917n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotKusamaToPolkadot: BridgeTransferFixture = {
	origin: "kah",
	destination: "pah",
	sender: "F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29",
	beneficiary: "F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29",
	amount: 10000000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 2,
				interior: {
					type: "X2",
					value: [
						{
							type: "GlobalConsensus",
							value: {
								type: "Polkadot",
								value: undefined,
							},
						},
						{
							type: "Parachain",
							value: 1000,
						},
					],
				},
			},
		},
		assets: {
			type: "V5",
			value: [
				{
					id: {
						parents: 2,
						interior: {
							type: "X1",
							value: {
								type: "GlobalConsensus",
								value: {
									type: "Polkadot",
									value: undefined,
								},
							},
						},
					},
					fun: {
						type: "Fungible",
						value: 10000000000n,
					},
				},
			],
		},
		assets_transfer_type: {
			type: "DestinationReserve",
			value: undefined,
		},
		remote_fees_id: {
			type: "V5",
			value: {
				parents: 2,
				interior: {
					type: "X1",
					value: {
						type: "GlobalConsensus",
						value: {
							type: "Polkadot",
							value: undefined,
						},
					},
				},
			},
		},
		fees_transfer_type: {
			type: "DestinationReserve",
			value: undefined,
		},
		custom_xcm_on_dest: {
			type: "V5",
			value: [
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						beneficiary: {
							parents: 0,
							interior: {
								type: "X1",
								value: {
									type: "AccountId32",
									value: {
										network: undefined,
										id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
									},
								},
							},
						},
					},
				},
			],
		},
		weight_limit: {
			type: "Unlimited",
			value: undefined,
		},
	},
	originDryRun: {
		success: true,
		value: {
			execution_result: {
				success: true,
				value: {
					actual_weight: undefined,
					pays_fee: {
						type: "Yes",
						value: undefined,
					},
				},
			},
			emitted_events: [
				{
					type: "PolkadotXcm",
					value: {
						type: "Attempted",
						value: {
							outcome: {
								type: "Complete",
								value: {
									used: {
										ref_time: 194107000n,
										proof_size: 3675n,
									},
								},
							},
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "FeesPaid",
						value: {
							paying: {
								parents: 0,
								interior: {
									type: "X1",
									value: {
										type: "AccountId32",
										value: {
											network: {
												type: "Kusama",
												value: undefined,
											},
											id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
										},
									},
								},
							},
							fees: [
								{
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: 3491308079n,
									},
								},
							],
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "Sent",
						value: {
							origin: {
								parents: 0,
								interior: {
									type: "X1",
									value: {
										type: "AccountId32",
										value: {
											network: {
												type: "Kusama",
												value: undefined,
											},
											id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
										},
									},
								},
							},
							destination: {
								parents: 2,
								interior: {
									type: "X2",
									value: [
										{
											type: "GlobalConsensus",
											value: {
												type: "Polkadot",
												value: undefined,
											},
										},
										{
											type: "Parachain",
											value: 1000,
										},
									],
								},
							},
							message: [
								{
									type: "WithdrawAsset",
									value: [
										{
											id: {
												parents: 1,
												interior: {
													type: "Here",
													value: undefined,
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000000n,
											},
										},
									],
								},
								{
									type: "ClearOrigin",
									value: undefined,
								},
								{
									type: "BuyExecution",
									value: {
										fees: {
											id: {
												parents: 1,
												interior: {
													type: "Here",
													value: undefined,
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										beneficiary: {
											parents: 0,
											interior: {
												type: "X1",
												value: {
													type: "AccountId32",
													value: {
														network: undefined,
														id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x66604b2562f4cfac745572cca27b883bc4ac6cdf21d51c63aeae1e2f99fa4350",
						},
					},
				},
			],
			local_xcm: {
				type: "V5",
				value: [
					{
						type: "WithdrawAsset",
						value: [
							{
								id: {
									parents: 2,
									interior: {
										type: "X1",
										value: {
											type: "GlobalConsensus",
											value: {
												type: "Polkadot",
												value: undefined,
											},
										},
									},
								},
								fun: {
									type: "Fungible",
									value: 10000000000n,
								},
							},
						],
					},
					{
						type: "BurnAsset",
						value: [
							{
								id: {
									parents: 2,
									interior: {
										type: "X1",
										value: {
											type: "GlobalConsensus",
											value: {
												type: "Polkadot",
												value: undefined,
											},
										},
									},
								},
								fun: {
									type: "Fungible",
									value: 10000000000n,
								},
							},
						],
					},
				],
			},
			forwarded_xcms: [
				[
					{
						type: "V5",
						value: {
							parents: 1,
							interior: {
								type: "X1",
								value: {
									type: "Parachain",
									value: 1002,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "UnpaidExecution",
									value: {
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
										check_origin: undefined,
									},
								},
								{
									type: "ExportMessage",
									value: {
										network: {
											type: "Polkadot",
											value: undefined,
										},
										destination: {
											type: "X1",
											value: {
												type: "Parachain",
												value: 1000,
											},
										},
										xcm: [
											{
												type: "WithdrawAsset",
												value: [
													{
														id: {
															parents: 1,
															interior: {
																type: "Here",
																value: undefined,
															},
														},
														fun: {
															type: "Fungible",
															value: 10000000000n,
														},
													},
												],
											},
											{
												type: "ClearOrigin",
												value: undefined,
											},
											{
												type: "BuyExecution",
												value: {
													fees: {
														id: {
															parents: 1,
															interior: {
																type: "Here",
																value: undefined,
															},
														},
														fun: {
															type: "Fungible",
															value: 10000000000n,
														},
													},
													weight_limit: {
														type: "Unlimited",
														value: undefined,
													},
												},
											},
											{
												type: "DepositAsset",
												value: {
													assets: {
														type: "Wild",
														value: {
															type: "AllCounted",
															value: 1,
														},
													},
													beneficiary: {
														parents: 0,
														interior: {
															type: "X1",
															value: {
																type: "AccountId32",
																value: {
																	network: undefined,
																	id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
																},
															},
														},
													},
												},
											},
											{
												type: "SetTopic",
												value:
													"0x66604b2562f4cfac745572cca27b883bc4ac6cdf21d51c63aeae1e2f99fa4350",
											},
										],
									},
								},
								{
									type: "SetTopic",
									value:
										"0x66604b2562f4cfac745572cca27b883bc4ac6cdf21d51c63aeae1e2f99fa4350",
								},
							],
						},
					],
				],
			],
		},
	},
	deliveryFees: {
		success: true,
		value: {
			type: "V5",
			value: [
				{
					id: {
						parents: 1,
						interior: {
							type: "Here",
							value: undefined,
						},
					},
					fun: {
						type: "Fungible",
						value: 3491308079n,
					},
				},
			],
		},
	},
	inbound: {
		origin: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1002,
					},
				},
			},
		},
		message: {
			type: "V5",
			value: [
				{
					type: "DescendOrigin",
					value: {
						type: "X1",
						value: {
							type: "PalletInstance",
							value: 53,
						},
					},
				},
				{
					type: "UniversalOrigin",
					value: {
						type: "GlobalConsensus",
						value: {
							type: "Kusama",
							value: undefined,
						},
					},
				},
				{
					type: "DescendOrigin",
					value: {
						type: "X1",
						value: {
							type: "Parachain",
							value: 1000,
						},
					},
				},
				{
					type: "WithdrawAsset",
					value: [
						{
							id: {
								parents: 1,
								interior: {
									type: "Here",
									value: undefined,
								},
							},
							fun: {
								type: "Fungible",
								value: 10000000000n,
							},
						},
					],
				},
				{
					type: "ClearOrigin",
					value: undefined,
				},
				{
					type: "BuyExecution",
					value: {
						fees: {
							id: {
								parents: 1,
								interior: {
									type: "Here",
									value: undefined,
								},
							},
							fun: {
								type: "Fungible",
								value: 10000000000n,
							},
						},
						weight_limit: {
							type: "Unlimited",
							value: undefined,
						},
					},
				},
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						beneficiary: {
							parents: 0,
							interior: {
								type: "X1",
								value: {
									type: "AccountId32",
									value: {
										network: undefined,
										id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
									},
								},
							},
						},
					},
				},
				{
					type: "SetTopic",
					value:
						"0x66604b2562f4cfac745572cca27b883bc4ac6cdf21d51c63aeae1e2f99fa4350",
				},
			],
		},
	},
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 690838000n,
						proof_size: 12525n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "12GvRkNCmXFuaaziTJ2ZKAfa7MArKfLT2HYvLjQuepP3JuHf",
							amount: 10000000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 9990523408n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 9476592n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};
