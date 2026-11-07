import type { RelayId } from "../../../../registry/chains/types";
import type { XcmTransferArgs } from "../xcmTransfer/getXcmTransferCall";
import type { DeliveryFees, DestinationDryRun, OriginDryRun } from "./xcmQuote";

export type PeopleTeleportFixture = {
	relay: RelayId;
	sender: string;
	beneficiary: string;
	amount: bigint;
	args: XcmTransferArgs;
	originDryRun: OriginDryRun;
	deliveryFees: DeliveryFees;
	destinationDryRun: DestinationDryRun;
};

export const dotToPeople: PeopleTeleportFixture = {
	relay: "polkadot",
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	beneficiary: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	amount: 10000000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1004,
					},
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
			type: "Teleport",
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
			type: "Teleport",
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
										ref_time: 407291000n,
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
										value: 304850000n,
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
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 1004,
									},
								},
							},
							message: [
								{
									type: "ReceiveTeleportedAsset",
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
														id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x91a1564541ed33fad25bdb4b54ec0fff2460324dc3c2b1f7c5f6f54c2a302457",
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
						type: "BurnAsset",
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
									value: 1004,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "ReceiveTeleportedAsset",
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
										"0x91a1564541ed33fad25bdb4b54ec0fff2460324dc3c2b1f7c5f6f54c2a302457",
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
						value: 304850000n,
					},
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
						ref_time: 278271000n,
						proof_size: 7186n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Issued",
						value: {
							amount: 10000000000n,
						},
					},
				},
				{
					type: "System",
					value: {
						type: "NewAccount",
						value: {
							account: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Endowed",
						value: {
							account: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							free_balance: 9994562971n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							amount: 9994562971n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLgBASGhE2ok3TvxUfaQBGUt88JCcdYjHvUhvQkFTTx",
							amount: 5437029n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotToPeopleTrapped: PeopleTeleportFixture = {
	relay: "polkadot",
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	beneficiary: "13Rf5cF32WEqNn84UWDRzKyMuzCdv4U6nqeyK3ngNaQ8rWPV",
	amount: 500000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1004,
					},
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
						value: 500000000n,
					},
				},
			],
		},
		assets_transfer_type: {
			type: "Teleport",
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
			type: "Teleport",
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
										id: "0x6b468b1ec4163f05a109450860694ec3d4a73e782dda45b19e99ae58e72483d6",
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
										ref_time: 407291000n,
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
										value: 304650000n,
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
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 1004,
									},
								},
							},
							message: [
								{
									type: "ReceiveTeleportedAsset",
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
												value: 500000000n,
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
												value: 500000000n,
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
														id: "0x6b468b1ec4163f05a109450860694ec3d4a73e782dda45b19e99ae58e72483d6",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x13eac3e979004ad7f5be5d84603e91d9fbca18649c63d588a4eec0559f04ff81",
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
									parents: 1,
									interior: {
										type: "Here",
										value: undefined,
									},
								},
								fun: {
									type: "Fungible",
									value: 500000000n,
								},
							},
						],
					},
					{
						type: "BurnAsset",
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
									value: 500000000n,
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
									value: 1004,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "ReceiveTeleportedAsset",
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
												value: 500000000n,
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
												value: 500000000n,
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
														id: "0x6b468b1ec4163f05a109450860694ec3d4a73e782dda45b19e99ae58e72483d6",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0x13eac3e979004ad7f5be5d84603e91d9fbca18649c63d588a4eec0559f04ff81",
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
						value: 304650000n,
					},
				},
			],
		},
	},
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Incomplete",
				value: {
					used: {
						ref_time: 277599000n,
						proof_size: 7186n,
					},
					error: {
						index: 3,
						error: {
							type: "FailedToTransactAsset",
							value: undefined,
						},
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Issued",
						value: {
							amount: 500000000n,
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "ProcessXcmError",
						value: {
							origin: {
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 1000,
									},
								},
							},
							error: {
								type: "FailedToTransactAsset",
								value: undefined,
							},
							message_id:
								"0x13eac3e979004ad7f5be5d84603e91d9fbca18649c63d588a4eec0559f04ff81",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLgBASGhE2ok3TvxUfaQBGUt88JCcdYjHvUhvQkFTTx",
							amount: 5434364n,
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "AssetsTrapped",
						value: {
							hash: "0x3540fe853678054a7f5591c96fb6373fd770621eb2fb2c800a4e3c12b03d1be6",
							origin: {
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 1000,
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
											value: 494565636n,
										},
									},
								],
							},
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const ksmToPeople: PeopleTeleportFixture = {
	relay: "kusama",
	sender: "13cKp89Msu7M2PiaCuuGr1BzAsD5V3vaVbDMs3YtjMZHdGwR",
	beneficiary: "13cKp89Msu7M2PiaCuuGr1BzAsD5V3vaVbDMs3YtjMZHdGwR",
	amount: 100000000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1004,
					},
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
			type: "Teleport",
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
			type: "Teleport",
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
										id: "0x7369626cd0070000000000000000000000000000000000000000000000000000",
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
										ref_time: 204474000n,
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
											id: "0x7369626cd0070000000000000000000000000000000000000000000000000000",
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
										value: 1032333300n,
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
											id: "0x7369626cd0070000000000000000000000000000000000000000000000000000",
										},
									},
								},
							},
							destination: {
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 1004,
									},
								},
							},
							message: [
								{
									type: "ReceiveTeleportedAsset",
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
														id: "0x7369626cd0070000000000000000000000000000000000000000000000000000",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0xaf349e59cf9e9b309995901aa9eb5affb7be2524a4e857ce17912a1aa5e1438a",
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
						type: "BurnAsset",
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
									value: 1004,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "ReceiveTeleportedAsset",
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
														id: "0x7369626cd0070000000000000000000000000000000000000000000000000000",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0xaf349e59cf9e9b309995901aa9eb5affb7be2524a4e857ce17912a1aa5e1438a",
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
						value: 1032333300n,
					},
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
						ref_time: 290389000n,
						proof_size: 7186n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Issued",
						value: {
							amount: 100000000000n,
						},
					},
				},
				{
					type: "System",
					value: {
						type: "NewAccount",
						value: {
							account: "FBeL7EAeUroLWXW1yfKboiqTqVfbRBcsUKd6QqVf4kGBySS",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Endowed",
						value: {
							account: "FBeL7EAeUroLWXW1yfKboiqTqVfbRBcsUKd6QqVf4kGBySS",
							free_balance: 99963363946n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "FBeL7EAeUroLWXW1yfKboiqTqVfbRBcsUKd6QqVf4kGBySS",
							amount: 99963363946n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "F3opxRUwkBj1LqjZ7DyiHCRh9Z4zVPLaVjoxfD5ddbip8mt",
							amount: 36636054n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const pasToPeople: PeopleTeleportFixture = {
	relay: "paseo",
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	beneficiary: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	amount: 10000000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1004,
					},
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
			type: "Teleport",
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
			type: "Teleport",
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
										ref_time: 956784000n,
										proof_size: 3804n,
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
										value: 304850000n,
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
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 1004,
									},
								},
							},
							message: [
								{
									type: "ReceiveTeleportedAsset",
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
														id: "0x7369626cf2070000000000000000000000000000000000000000000000000000",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x91a1564541ed33fad25bdb4b54ec0fff2460324dc3c2b1f7c5f6f54c2a302457",
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
						type: "BurnAsset",
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
									value: 1004,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "ReceiveTeleportedAsset",
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
										"0x91a1564541ed33fad25bdb4b54ec0fff2460324dc3c2b1f7c5f6f54c2a302457",
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
						value: 304850000n,
					},
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
						ref_time: 181708000n,
						proof_size: 3593n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Issued",
						value: {
							amount: 10000000000n,
						},
					},
				},
				{
					type: "System",
					value: {
						type: "NewAccount",
						value: {
							account: "5Eg2fntQqFi3EvFWAf71G66Ecjjah26bmFzoANAeHFgj9Lia",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Endowed",
						value: {
							account: "5Eg2fntQqFi3EvFWAf71G66Ecjjah26bmFzoANAeHFgj9Lia",
							free_balance: 10000000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "5Eg2fntQqFi3EvFWAf71G66Ecjjah26bmFzoANAeHFgj9Lia",
							amount: 10000000000n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};
