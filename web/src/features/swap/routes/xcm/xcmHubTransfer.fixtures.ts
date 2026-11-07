import type { XcmTransferArgs } from "../xcmTransfer/getXcmTransferCall";
import type {
	DeliveryFees,
	DestinationDryRun,
	HubDryRun,
	OriginDryRun,
} from "./xcmQuote";

export type HubTransferFixture = {
	sender: string;
	beneficiary: string;
	amount: bigint;
	args: XcmTransferArgs;
	originDryRun: OriginDryRun;
	deliveryFees: DeliveryFees;
	hubDryRun: HubDryRun;
	destinationDryRun: DestinationDryRun | null;
};

export const dotPeopleToHydration: HubTransferFixture = {
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
					type: "DepositReserveAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						dest: {
							parents: 1,
							interior: {
								type: "X1",
								value: {
									type: "Parachain",
									value: 2034,
								},
							},
						},
						xcm: [
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
											value: 5000000000n,
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
										value: 305900000n,
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
									type: "DepositReserveAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										dest: {
											parents: 1,
											interior: {
												type: "X1",
												value: {
													type: "Parachain",
													value: 2034,
												},
											},
										},
										xcm: [
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
															value: 5000000000n,
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
									},
								},
							],
							message_id:
								"0x8f4e29ed4ed675d67f181086cbb1c2c149f3d21886b9787fe3b045970d742686",
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
									type: "DepositReserveAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										dest: {
											parents: 1,
											interior: {
												type: "X1",
												value: {
													type: "Parachain",
													value: 2034,
												},
											},
										},
										xcm: [
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
															value: 5000000000n,
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
									},
								},
								{
									type: "SetTopic",
									value:
										"0x8f4e29ed4ed675d67f181086cbb1c2c149f3d21886b9787fe3b045970d742686",
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
						value: 305900000n,
					},
				},
			],
		},
	},
	hubDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 540757000n,
						proof_size: 14281n,
					},
				},
			},
			emitted_events: [
				{
					type: "PolkadotXcm",
					value: {
						type: "Sent",
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
							destination: {
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 2034,
									},
								},
							},
							message: [],
							message_id:
								"0x8f4e29ed4ed675d67f181086cbb1c2c149f3d21886b9787fe3b045970d742686",
						},
					},
				},
			],
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
									value: 2034,
								},
							},
						},
					},
					[
						{
							type: "V5",
							value: [
								{
									type: "ReserveAssetDeposited",
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
												value: 9684344794n,
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
												value: 5000000000n,
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
										"0x8f4e29ed4ed675d67f181086cbb1c2c149f3d21886b9787fe3b045970d742686",
								},
							],
						},
					],
				],
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
						ref_time: 500000000n,
						proof_size: 0n,
					},
				},
			},
			emitted_events: [
				{
					type: "System",
					value: {
						type: "NewAccount",
						value: {
							account: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
						},
					},
				},
				{
					type: "Tokens",
					value: {
						type: "Endowed",
						value: {
							currency_id: 5,
							who: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
							amount: 9678556145n,
						},
					},
				},
				{
					type: "Tokens",
					value: {
						type: "Deposited",
						value: {
							currency_id: 5,
							who: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
							amount: 9678556145n,
						},
					},
				},
				{
					type: "Currencies",
					value: {
						type: "Deposited",
						value: {
							currency_id: 5,
							who: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
							amount: 9678556145n,
						},
					},
				},
				{
					type: "Tokens",
					value: {
						type: "Deposited",
						value: {
							currency_id: 5,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 5788649n,
						},
					},
				},
				{
					type: "Currencies",
					value: {
						type: "Deposited",
						value: {
							currency_id: 5,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 5788649n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotHydrationToPeople: HubTransferFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
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
			type: "DestinationReserve",
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
			type: "DestinationReserve",
			value: undefined,
		},
		custom_xcm_on_dest: {
			type: "V5",
			value: [
				{
					type: "InitiateTeleport",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						dest: {
							parents: 1,
							interior: {
								type: "X1",
								value: {
									type: "Parachain",
									value: 1004,
								},
							},
						},
						xcm: [
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
											value: 5000000000n,
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
										ref_time: 200000000n,
										proof_size: 0n,
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
											id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
										},
									},
								},
							},
							fees: [],
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
											id: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",
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
									type: "InitiateTeleport",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										dest: {
											parents: 1,
											interior: {
												type: "X1",
												value: {
													type: "Parachain",
													value: 1004,
												},
											},
										},
										xcm: [
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
															value: 5000000000n,
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
									},
								},
							],
							message_id:
								"0xaa91d4da289abb8dbddc748a9dc6969356656bbeff238edc539f35e81f3c8421",
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
									type: "InitiateTeleport",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										dest: {
											parents: 1,
											interior: {
												type: "X1",
												value: {
													type: "Parachain",
													value: 1004,
												},
											},
										},
										xcm: [
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
															value: 5000000000n,
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
									},
								},
								{
									type: "SetTopic",
									value:
										"0xaa91d4da289abb8dbddc748a9dc6969356656bbeff238edc539f35e81f3c8421",
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
			value: [],
		},
	},
	hubDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 857822000n,
						proof_size: 14435n,
					},
				},
			},
			emitted_events: [
				{
					type: "PolkadotXcm",
					value: {
						type: "Sent",
						value: {
							origin: {
								parents: 1,
								interior: {
									type: "X1",
									value: {
										type: "Parachain",
										value: 2034,
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
							message: [],
							message_id:
								"0xaa91d4da289abb8dbddc748a9dc6969356656bbeff238edc539f35e81f3c8421",
						},
					},
				},
			],
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
												value: 9684228275n,
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
												value: 5000000000n,
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
										"0xaa91d4da289abb8dbddc748a9dc6969356656bbeff238edc539f35e81f3c8421",
								},
							],
						},
					],
				],
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
							amount: 9684228275n,
						},
					},
				},
				{
					type: "System",
					value: {
						type: "NewAccount",
						value: {
							account: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Endowed",
						value: {
							account: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							free_balance: 9678791246n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 9678791246n,
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

export const dotPeopleToHydrationTrappedOnHub: HubTransferFixture = {
	sender: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
	beneficiary: "13TUNfEBCi6xw5ZQgxYAwbCsALSuDfqDWMfbHigZNgncuV6v",
	amount: 1000000n,
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
						value: 1000000n,
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
					type: "DepositReserveAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllCounted",
								value: 1,
							},
						},
						dest: {
							parents: 1,
							interior: {
								type: "X1",
								value: {
									type: "Parachain",
									value: 2034,
								},
							},
						},
						xcm: [
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
											value: 500000n,
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
										value: 305600000n,
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
												value: 1000000n,
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
												value: 1000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "DepositReserveAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										dest: {
											parents: 1,
											interior: {
												type: "X1",
												value: {
													type: "Parachain",
													value: 2034,
												},
											},
										},
										xcm: [
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
															value: 500000n,
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
									},
								},
							],
							message_id:
								"0x6d5c590a525afd9eb21d61aea2d3b01676c3ea18f3cb774104119edc8013b9ed",
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
									value: 1000000n,
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
									value: 1000000n,
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
												value: 1000000n,
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
												value: 1000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "DepositReserveAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllCounted",
												value: 1,
											},
										},
										dest: {
											parents: 1,
											interior: {
												type: "X1",
												value: {
													type: "Parachain",
													value: 2034,
												},
											},
										},
										xcm: [
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
															value: 500000n,
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
									},
								},
								{
									type: "SetTopic",
									value:
										"0x6d5c590a525afd9eb21d61aea2d3b01676c3ea18f3cb774104119edc8013b9ed",
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
						value: 305600000n,
					},
				},
			],
		},
	},
	hubDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Incomplete",
				value: {
					used: {
						ref_time: 135579000n,
						proof_size: 7186n,
					},
					error: {
						index: 2,
						error: {
							type: "TooExpensive",
							value: undefined,
						},
					},
				},
			},
			emitted_events: [
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
								type: "TooExpensive",
								value: undefined,
							},
							message_id:
								"0x6d5c590a525afd9eb21d61aea2d3b01676c3ea18f3cb774104119edc8013b9ed",
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "AssetsTrapped",
						value: {
							hash: "0xf082eb6351ecdc0c1514dbca614977bfe1aaf9b76ae20d348410a07c824eb39a",
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
											value: 1000000n,
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
	destinationDryRun: null,
};
