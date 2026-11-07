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

export const dotFromPeople: PeopleTeleportFixture = {
	relay: "polkadot",
	sender: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
	beneficiary: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
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
						value: 1000,
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
										id: "0x6ca8fe9e98a7d7fb4269fe93c638a2e388c6085e74c18bc220c125fd7f0b1b68",
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
										ref_time: 146931000n,
										proof_size: 3593n,
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
											id: "0x6ca8fe9e98a7d7fb4269fe93c638a2e388c6085e74c18bc220c125fd7f0b1b68",
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
											id: "0x6ca8fe9e98a7d7fb4269fe93c638a2e388c6085e74c18bc220c125fd7f0b1b68",
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
										value: 1000,
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
														id: "0x6ca8fe9e98a7d7fb4269fe93c638a2e388c6085e74c18bc220c125fd7f0b1b68",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x683cf77a60b984103a1a86f1dbb9e61e86e4d88453c30d67e7cdda47eb555b85",
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
									value: 1000,
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
														id: "0x6ca8fe9e98a7d7fb4269fe93c638a2e388c6085e74c18bc220c125fd7f0b1b68",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0x683cf77a60b984103a1a86f1dbb9e61e86e4d88453c30d67e7cdda47eb555b85",
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
						ref_time: 368588000n,
						proof_size: 10861n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Burned",
						value: {
							who: "13UVJyLnbVp9x5XDyJv8g8r3UddNwBrdaH7AADCmw9XQWvYW",
							amount: 10000000000n,
						},
					},
				},
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
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
							amount: 9991782414n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 8217586n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotFromPeopleTrapped: PeopleTeleportFixture = {
	relay: "polkadot",
	sender: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
	beneficiary: "13Rf5cF32WEqNn84UWDRzKyMuzCdv4U6nqeyK3ngNaQ8rWPV",
	amount: 50000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1000,
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
						value: 50000000n,
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
										ref_time: 146931000n,
										proof_size: 3593n,
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
											id: "0x6ca8fe9e98a7d7fb4269fe93c638a2e388c6085e74c18bc220c125fd7f0b1b68",
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
											id: "0x6ca8fe9e98a7d7fb4269fe93c638a2e388c6085e74c18bc220c125fd7f0b1b68",
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
										value: 1000,
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
												value: 50000000n,
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
												value: 50000000n,
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
								"0xb504ccd66048cf508d03f26516af550d5af197b5ef9b304eafa7b99616a5e357",
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
									value: 50000000n,
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
									value: 50000000n,
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
									value: 1000,
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
												value: 50000000n,
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
												value: 50000000n,
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
										"0xb504ccd66048cf508d03f26516af550d5af197b5ef9b304eafa7b99616a5e357",
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
						ref_time: 368043000n,
						proof_size: 10861n,
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
						type: "Burned",
						value: {
							who: "13UVJyLnbVp9x5XDyJv8g8r3UddNwBrdaH7AADCmw9XQWvYW",
							amount: 50000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Issued",
						value: {
							amount: 50000000n,
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
										value: 1004,
									},
								},
							},
							error: {
								type: "FailedToTransactAsset",
								value: undefined,
							},
							message_id:
								"0xb504ccd66048cf508d03f26516af550d5af197b5ef9b304eafa7b99616a5e357",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 8215425n,
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "AssetsTrapped",
						value: {
							hash: "0x5a63888244c96a4ba16f7b6b88e5091d0bdb385b96f11d151c08e0dd7e0dfc2e",
							origin: {
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 1004,
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
											value: 41784575n,
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

export const ksmFromPeople: PeopleTeleportFixture = {
	relay: "kusama",
	sender: "DtuntvQBh9vajFTnd42aTTCiuCyY3ep6EVwhhPji2ejyyhW",
	beneficiary: "DtuntvQBh9vajFTnd42aTTCiuCyY3ep6EVwhhPji2ejyyhW",
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
						value: 1000,
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
										id: "0x3a6a0745688c52b4709f65fa2e4508dfa0940ccc0d282cd16be9bc043b2f4a04",
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
										ref_time: 156470000n,
										proof_size: 3593n,
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
											id: "0x3a6a0745688c52b4709f65fa2e4508dfa0940ccc0d282cd16be9bc043b2f4a04",
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
											id: "0x3a6a0745688c52b4709f65fa2e4508dfa0940ccc0d282cd16be9bc043b2f4a04",
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
										value: 1000,
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
														id: "0x3a6a0745688c52b4709f65fa2e4508dfa0940ccc0d282cd16be9bc043b2f4a04",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x1a38cbf660dabe269c76f19c219d06409753632ff0ebfa2d12695c83434614a9",
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
									value: 1000,
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
														id: "0x3a6a0745688c52b4709f65fa2e4508dfa0940ccc0d282cd16be9bc043b2f4a04",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0x1a38cbf660dabe269c76f19c219d06409753632ff0ebfa2d12695c83434614a9",
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
						ref_time: 389085000n,
						proof_size: 10861n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Burned",
						value: {
							who: "F3opxRbN5ZcGCL9nNgBRwNtmbuy3Z7fxADRPaVNrriP5Man",
							amount: 100000000000n,
						},
					},
				},
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
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "DtuntvQBh9vajFTnd42aTTCiuCyY3ep6EVwhhPji2ejyyhW",
							amount: 99944627863n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "F3opxRUwkBj1LqjZ7DyiHCRh9Z4zVPLaVjoxfD5ddbip8mt",
							amount: 55372137n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const pasFromPeopleRejected: PeopleTeleportFixture = {
	relay: "paseo",
	sender: "5DvoL2BNoSm7wRt2tfZ6WW5QFrxm68GLv5SCrPQ4JBLjbvpL",
	beneficiary: "5DvoL2BNoSm7wRt2tfZ6WW5QFrxm68GLv5SCrPQ4JBLjbvpL",
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
						value: 1000,
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
										id: "0x5270ec35ba01254d8bff046a1a58f16d3ae615c235efd6e99a35f233b2d9df2c",
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
										ref_time: 148404000n,
										proof_size: 3593n,
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
											id: "0x5270ec35ba01254d8bff046a1a58f16d3ae615c235efd6e99a35f233b2d9df2c",
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
											id: "0x5270ec35ba01254d8bff046a1a58f16d3ae615c235efd6e99a35f233b2d9df2c",
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
										value: 1000,
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
														id: "0x5270ec35ba01254d8bff046a1a58f16d3ae615c235efd6e99a35f233b2d9df2c",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x6a526efab9da53459159768bbe3d1f94937b85ac7c09f7ecc6c6c5550a4981e6",
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
									value: 1000,
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
														id: "0x5270ec35ba01254d8bff046a1a58f16d3ae615c235efd6e99a35f233b2d9df2c",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0x6a526efab9da53459159768bbe3d1f94937b85ac7c09f7ecc6c6c5550a4981e6",
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
				type: "Error",
				value: {
					index: 1,
					error: {
						type: "Overflow",
						value: undefined,
					},
				},
			},
			emitted_events: [],
			forwarded_xcms: [],
		},
	},
};

export const wndFromPeople: PeopleTeleportFixture = {
	relay: "westend",
	sender: "5CFYvshLff1dHmT33jUcBc7mEKbVRJKbA9HzPqmLfjksHah6",
	beneficiary: "5CFYvshLff1dHmT33jUcBc7mEKbVRJKbA9HzPqmLfjksHah6",
	amount: 1000000000000n,
	args: {
		dest: {
			type: "V5",
			value: {
				parents: 1,
				interior: {
					type: "X1",
					value: {
						type: "Parachain",
						value: 1000,
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
						value: 1000000000000n,
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
										id: "0x0845a5993b29977c58c9ef36aad0e09946f8a10b2ad30956dec1207beda8014a",
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
										ref_time: 158787000n,
										proof_size: 3593n,
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
												type: "ByGenesis",
												value:
													"0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e",
											},
											id: "0x0845a5993b29977c58c9ef36aad0e09946f8a10b2ad30956dec1207beda8014a",
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
										value: 30970000000n,
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
												type: "ByGenesis",
												value:
													"0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e",
											},
											id: "0x0845a5993b29977c58c9ef36aad0e09946f8a10b2ad30956dec1207beda8014a",
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
										value: 1000,
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
												value: 1000000000000n,
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
												value: 1000000000000n,
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
														id: "0x0845a5993b29977c58c9ef36aad0e09946f8a10b2ad30956dec1207beda8014a",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x083876ed7503ca182ec693fb15dbb7a73af6cf070afb8b0e044df7ebdbfeac7d",
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
									value: 1000000000000n,
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
									value: 1000000000000n,
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
									value: 1000,
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
												value: 1000000000000n,
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
												value: 1000000000000n,
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
														id: "0x0845a5993b29977c58c9ef36aad0e09946f8a10b2ad30956dec1207beda8014a",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0x083876ed7503ca182ec693fb15dbb7a73af6cf070afb8b0e044df7ebdbfeac7d",
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
						value: 30970000000n,
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
						ref_time: 290449000n,
						proof_size: 10861n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Burned",
						value: {
							who: "5EYCAe5ijiYgWYWi1fs8Xz1td1djEtJVVnNfzvDRP4VtLL7Y",
							amount: 1000000000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Issued",
						value: {
							amount: 1000000000000n,
						},
					},
				},
				{
					type: "System",
					value: {
						type: "NewAccount",
						value: {
							account: "5CFYvshLff1dHmT33jUcBc7mEKbVRJKbA9HzPqmLfjksHah6",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Endowed",
						value: {
							account: "5CFYvshLff1dHmT33jUcBc7mEKbVRJKbA9HzPqmLfjksHah6",
							free_balance: 998342742920n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "5CFYvshLff1dHmT33jUcBc7mEKbVRJKbA9HzPqmLfjksHah6",
							amount: 998342742920n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "5EYCAe5cKPAoFh2HnQQvpKqRYZGqBpaA87u4Zzw89qPE58is",
							amount: 1657257080n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};
