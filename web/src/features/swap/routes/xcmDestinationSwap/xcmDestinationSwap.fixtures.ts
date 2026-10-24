import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";
import type { TokenId } from "../../../../registry/tokens/types";
import type { DeliveryFees, DestinationDryRun } from "../xcm/xcmQuote";

type QuotedPoolHop = {
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	reserveIn: bigint;
	reserveOut: bigint;
	amountIn: bigint;
	amountOut: bigint;
	minOut: bigint;
};

export type XcmDestinationSwapFixture = {
	sender: string;
	beneficiary: string;
	tokenIdIn: TokenId;
	tokenIdOut: TokenId;
	amount: bigint;
	slippage: number;
	lpFee: number;
	destinationWeight: { ref_time: bigint; proof_size: bigint };
	destinationFee: bigint;
	hops: QuotedPoolHop[];
	args: Parameters<
		Api<"hydration">["tx"]["PolkadotXcm"]["transfer_assets_using_type_and_then"]
	>[0];
	originDryRun: DryRun<"hydration">;
	deliveryFees: DeliveryFees;
	destinationDryRun: DestinationDryRun;
};

export const usdtToDot: XcmDestinationSwapFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	tokenIdIn: "hydration-asset::hydration::10",
	tokenIdOut: "native::pah",
	amount: 10000000n,
	slippage: 0.005,
	lpFee: 3000,
	destinationWeight: {
		ref_time: 1103478000n,
		proof_size: 18984n,
	},
	destinationFee: 1531n,
	hops: [
		{
			tokenIdIn: "asset::pah::1984",
			tokenIdOut: "native::pah",
			reserveIn: 1058817440785n,
			reserveOut: 9967038622626529n,
			amountIn: 9998469n,
			amountOut: 93836030727n,
			minOut: 93366850573n,
		},
	],
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
							type: "X3",
							value: [
								{
									type: "Parachain",
									value: 1000,
								},
								{
									type: "PalletInstance",
									value: 50,
								},
								{
									type: "GeneralIndex",
									value: 1984n,
								},
							],
						},
					},
					fun: {
						type: "Fungible",
						value: 10000000n,
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
					type: "X3",
					value: [
						{
							type: "Parachain",
							value: 1000,
						},
						{
							type: "PalletInstance",
							value: 50,
						},
						{
							type: "GeneralIndex",
							value: 1984n,
						},
					],
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
					type: "SetAppendix",
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
				{
					type: "ExchangeAsset",
					value: {
						give: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
							},
						},
						want: [
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
									value: 93366850573n,
								},
							},
						],
						maximal: true,
					},
				},
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "SetAppendix",
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
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 1984n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
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
													value: 93366850573n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 1,
														interior: {
															type: "Here",
															value: undefined,
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
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
								"0xbc0da83b1a966e7ec957ab59b7d57cfd442f4ab94b9ea4f7365a858b3e3d2b55",
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
										type: "X3",
										value: [
											{
												type: "Parachain",
												value: 1000,
											},
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 1984n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 10000000n,
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
										type: "X3",
										value: [
											{
												type: "Parachain",
												value: 1000,
											},
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 1984n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "SetAppendix",
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
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 1984n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
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
													value: 93366850573n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 1,
														interior: {
															type: "Here",
															value: undefined,
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
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
										"0xbc0da83b1a966e7ec957ab59b7d57cfd442f4ab94b9ea4f7365a858b3e3d2b55",
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
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 1103478000n,
						proof_size: 18984n,
					},
				},
			},
			emitted_events: [
				{
					type: "Assets",
					value: {
						type: "Withdrawn",
						value: {
							asset_id: 1984,
							who: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							amount: 10000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 14363563n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1984,
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 1531n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 1531n,
							amount_out: 14363563n,
							path: [
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									1531n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									14363563n,
								],
							],
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 93836030456n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1984,
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 9998469n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9998469n,
							amount_out: 93836030456n,
							path: [
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									9998469n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									93836030456n,
								],
							],
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 93836030456n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 14363563n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const usdtToPink: XcmDestinationSwapFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	tokenIdIn: "hydration-asset::hydration::10",
	tokenIdOut: "asset::pah::23",
	amount: 10000000n,
	slippage: 0.005,
	lpFee: 3000,
	destinationWeight: {
		ref_time: 1301098000n,
		proof_size: 23257n,
	},
	destinationFee: 1875n,
	hops: [
		{
			tokenIdIn: "asset::pah::1984",
			tokenIdOut: "native::pah",
			reserveIn: 1058817440785n,
			reserveOut: 9967038622626529n,
			amountIn: 9998125n,
			amountOut: 93832802303n,
			minOut: 93363638291n,
		},
		{
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::23",
			reserveIn: 8415590132n,
			reserveOut: 542456565100733n,
			amountIn: 93832802303n,
			amountOut: 497686229004757n,
			minOut: 495197797859733n,
		},
	],
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
							type: "X3",
							value: [
								{
									type: "Parachain",
									value: 1000,
								},
								{
									type: "PalletInstance",
									value: 50,
								},
								{
									type: "GeneralIndex",
									value: 1984n,
								},
							],
						},
					},
					fun: {
						type: "Fungible",
						value: 10000000n,
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
					type: "X3",
					value: [
						{
							type: "Parachain",
							value: 1000,
						},
						{
							type: "PalletInstance",
							value: 50,
						},
						{
							type: "GeneralIndex",
							value: 1984n,
						},
					],
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
					type: "SetAppendix",
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
				{
					type: "ExchangeAsset",
					value: {
						give: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
							},
						},
						want: [
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
									value: 93363638291n,
								},
							},
						],
						maximal: true,
					},
				},
				{
					type: "ExchangeAsset",
					value: {
						give: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
							},
						},
						want: [
							{
								id: {
									parents: 0,
									interior: {
										type: "X2",
										value: [
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 23n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 495197797859733n,
								},
							},
						],
						maximal: true,
					},
				},
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 23n,
												},
											],
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "SetAppendix",
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
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 1984n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
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
													value: 93363638291n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 1,
														interior: {
															type: "Here",
															value: undefined,
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
											{
												id: {
													parents: 0,
													interior: {
														type: "X2",
														value: [
															{
																type: "PalletInstance",
																value: 50,
															},
															{
																type: "GeneralIndex",
																value: 23n,
															},
														],
													},
												},
												fun: {
													type: "Fungible",
													value: 495197797859733n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 23n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
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
								"0x8c98ffd52723527cff896d1070bcfa3c14a40667a40cef4a83661e5a65fe3645",
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
										type: "X3",
										value: [
											{
												type: "Parachain",
												value: 1000,
											},
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 1984n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 10000000n,
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
										type: "X3",
										value: [
											{
												type: "Parachain",
												value: 1000,
											},
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 1984n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "SetAppendix",
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
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 1984n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
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
													value: 93363638291n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 1,
														interior: {
															type: "Here",
															value: undefined,
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
											{
												id: {
													parents: 0,
													interior: {
														type: "X2",
														value: [
															{
																type: "PalletInstance",
																value: 50,
															},
															{
																type: "GeneralIndex",
																value: 23n,
															},
														],
													},
												},
												fun: {
													type: "Fungible",
													value: 495197797859733n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 23n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
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
										"0x8c98ffd52723527cff896d1070bcfa3c14a40667a40cef4a83661e5a65fe3645",
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
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 1301098000n,
						proof_size: 23257n,
					},
				},
			},
			emitted_events: [
				{
					type: "Assets",
					value: {
						type: "Withdrawn",
						value: {
							asset_id: 1984,
							who: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							amount: 10000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 17596575n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1984,
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 1875n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 1875n,
							amount_out: 17596575n,
							path: [
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									1875n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									17596575n,
								],
							],
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 93832801972n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1984,
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 9998125n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9998125n,
							amount_out: 93832801972n,
							path: [
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									9998125n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									93832801972n,
								],
							],
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Withdrawn",
						value: {
							asset_id: 23,
							who: "15sv1V4LvqS4e6FdPzCzoao3SLmVPnzLrMwbm1X6PVGsVCpa",
							amount: 497686228859862n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "15sv1V4LvqS4e6FdPzCzoao3SLmVPnzLrMwbm1X6PVGsVCpa",
							amount: 93832801972n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 93832801972n,
							amount_out: 497686228859862n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									93832801972n,
								],
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 23n,
												},
											],
										},
									},
									497686228859862n,
								],
							],
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 23,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 497686228859862n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 17596575n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotToUsdc: XcmDestinationSwapFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	tokenIdIn: "hydration-asset::hydration::5",
	tokenIdOut: "asset::pah::1337",
	amount: 10000000000n,
	slippage: 0.005,
	lpFee: 3000,
	destinationWeight: {
		ref_time: 1103478000n,
		proof_size: 18984n,
	},
	destinationFee: 14363563n,
	hops: [
		{
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::1337",
			reserveIn: 877327054307216n,
			reserveOut: 93178385314n,
			amountIn: 9985636437n,
			amountOut: 1057352n,
			minOut: 1052065n,
		},
	],
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
					type: "SetAppendix",
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
				{
					type: "ExchangeAsset",
					value: {
						give: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
							},
						},
						want: [
							{
								id: {
									parents: 0,
									interior: {
										type: "X2",
										value: [
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 1337n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 1052065n,
								},
							},
						],
						maximal: true,
					},
				},
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1337n,
												},
											],
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
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
									type: "SetAppendix",
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
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 1,
														interior: {
															type: "Here",
															value: undefined,
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
											{
												id: {
													parents: 0,
													interior: {
														type: "X2",
														value: [
															{
																type: "PalletInstance",
																value: 50,
															},
															{
																type: "GeneralIndex",
																value: 1337n,
															},
														],
													},
												},
												fun: {
													type: "Fungible",
													value: 1052065n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 1337n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
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
								"0xd84448c2f32edff702552e1f5097352df8e4f0412f8b7bce7ce6f81b5bd13572",
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
									type: "SetAppendix",
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
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 1,
														interior: {
															type: "Here",
															value: undefined,
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
											{
												id: {
													parents: 0,
													interior: {
														type: "X2",
														value: [
															{
																type: "PalletInstance",
																value: 50,
															},
															{
																type: "GeneralIndex",
																value: 1337n,
															},
														],
													},
												},
												fun: {
													type: "Fungible",
													value: 1052065n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 1337n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
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
										"0xd84448c2f32edff702552e1f5097352df8e4f0412f8b7bce7ce6f81b5bd13572",
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
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 1103478000n,
						proof_size: 18984n,
					},
				},
			},
			emitted_events: [
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							amount: 10000000000n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Withdrawn",
						value: {
							asset_id: 1337,
							who: "163CRvzDQ8JHZfmufa86zA7BfDY7NToUSqmWbpDq5kwDYSmH",
							amount: 1057352n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "163CRvzDQ8JHZfmufa86zA7BfDY7NToUSqmWbpDq5kwDYSmH",
							amount: 9985636437n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9985636437n,
							amount_out: 1057352n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									9985636437n,
								],
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1337n,
												},
											],
										},
									},
									1057352n,
								],
							],
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1337,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 1057352n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 14363563n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const usdtToPinkPriceMoved: XcmDestinationSwapFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	tokenIdIn: "hydration-asset::hydration::10",
	tokenIdOut: "asset::pah::23",
	amount: 10000000n,
	slippage: 0.005,
	lpFee: 3000,
	destinationWeight: {
		ref_time: 1301098000n,
		proof_size: 23257n,
	},
	destinationFee: 1875n,
	hops: [
		{
			tokenIdIn: "asset::pah::1984",
			tokenIdOut: "native::pah",
			reserveIn: 1058817440785n,
			reserveOut: 9967038622626529n,
			amountIn: 9998125n,
			amountOut: 93832802303n,
			minOut: 93363638291n,
		},
		{
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::23",
			reserveIn: 8415590132n,
			reserveOut: 542456565100733n,
			amountIn: 93832802303n,
			amountOut: 497686229004757n,
			minOut: 495197797859733n,
		},
	],
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
							type: "X3",
							value: [
								{
									type: "Parachain",
									value: 1000,
								},
								{
									type: "PalletInstance",
									value: 50,
								},
								{
									type: "GeneralIndex",
									value: 1984n,
								},
							],
						},
					},
					fun: {
						type: "Fungible",
						value: 10000000n,
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
					type: "X3",
					value: [
						{
							type: "Parachain",
							value: 1000,
						},
						{
							type: "PalletInstance",
							value: 50,
						},
						{
							type: "GeneralIndex",
							value: 1984n,
						},
					],
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
					type: "SetAppendix",
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
				{
					type: "ExchangeAsset",
					value: {
						give: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
							},
						},
						want: [
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
									value: 93363638291n,
								},
							},
						],
						maximal: true,
					},
				},
				{
					type: "ExchangeAsset",
					value: {
						give: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
							},
						},
						want: [
							{
								id: {
									parents: 0,
									interior: {
										type: "X2",
										value: [
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 23n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 990395595719466n,
								},
							},
						],
						maximal: true,
					},
				},
				{
					type: "DepositAsset",
					value: {
						assets: {
							type: "Wild",
							value: {
								type: "AllOf",
								value: {
									id: {
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 23n,
												},
											],
										},
									},
									fun: {
										type: "Fungible",
										value: undefined,
									},
								},
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "SetAppendix",
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
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 1984n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
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
													value: 93363638291n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 1,
														interior: {
															type: "Here",
															value: undefined,
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
											{
												id: {
													parents: 0,
													interior: {
														type: "X2",
														value: [
															{
																type: "PalletInstance",
																value: 50,
															},
															{
																type: "GeneralIndex",
																value: 23n,
															},
														],
													},
												},
												fun: {
													type: "Fungible",
													value: 990395595719466n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 23n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
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
								"0xc386ae6e33ba987982573d2c13bf6bed3ad3af29b5b9d57ce5aa79aa69098d24",
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
										type: "X3",
										value: [
											{
												type: "Parachain",
												value: 1000,
											},
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 1984n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 10000000n,
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
										type: "X3",
										value: [
											{
												type: "Parachain",
												value: 1000,
											},
											{
												type: "PalletInstance",
												value: 50,
											},
											{
												type: "GeneralIndex",
												value: 1984n,
											},
										],
									},
								},
								fun: {
									type: "Fungible",
									value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
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
												parents: 0,
												interior: {
													type: "X2",
													value: [
														{
															type: "PalletInstance",
															value: 50,
														},
														{
															type: "GeneralIndex",
															value: 1984n,
														},
													],
												},
											},
											fun: {
												type: "Fungible",
												value: 10000000n,
											},
										},
										weight_limit: {
											type: "Unlimited",
											value: undefined,
										},
									},
								},
								{
									type: "SetAppendix",
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
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 1984n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
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
													value: 93363638291n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "ExchangeAsset",
									value: {
										give: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 1,
														interior: {
															type: "Here",
															value: undefined,
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
											},
										},
										want: [
											{
												id: {
													parents: 0,
													interior: {
														type: "X2",
														value: [
															{
																type: "PalletInstance",
																value: 50,
															},
															{
																type: "GeneralIndex",
																value: 23n,
															},
														],
													},
												},
												fun: {
													type: "Fungible",
													value: 990395595719466n,
												},
											},
										],
										maximal: true,
									},
								},
								{
									type: "DepositAsset",
									value: {
										assets: {
											type: "Wild",
											value: {
												type: "AllOf",
												value: {
													id: {
														parents: 0,
														interior: {
															type: "X2",
															value: [
																{
																	type: "PalletInstance",
																	value: 50,
																},
																{
																	type: "GeneralIndex",
																	value: 23n,
																},
															],
														},
													},
													fun: {
														type: "Fungible",
														value: undefined,
													},
												},
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
										"0xc386ae6e33ba987982573d2c13bf6bed3ad3af29b5b9d57ce5aa79aa69098d24",
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
	destinationDryRun: {
		success: true,
		value: {
			execution_result: {
				type: "Incomplete",
				value: {
					used: {
						ref_time: 1068012000n,
						proof_size: 19582n,
					},
					error: {
						index: 5,
						error: {
							type: "NoDeal",
							value: undefined,
						},
					},
				},
			},
			emitted_events: [
				{
					type: "Assets",
					value: {
						type: "Withdrawn",
						value: {
							asset_id: 1984,
							who: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							amount: 10000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 17596575n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1984,
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 1875n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 1875n,
							amount_out: 17596575n,
							path: [
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									1875n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									17596575n,
								],
							],
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Withdraw",
						value: {
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 93832801972n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1984,
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 9998125n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9998125n,
							amount_out: 93832801972n,
							path: [
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									9998125n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									93832801972n,
								],
							],
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
										value: 2034,
									},
								},
							},
							error: {
								type: "NoDeal",
								value: undefined,
							},
							message_id:
								"0xc386ae6e33ba987982573d2c13bf6bed3ad3af29b5b9d57ce5aa79aa69098d24",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 93832801972n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Withdrawn",
						value: {
							asset_id: 1984,
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 294n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "12dvmstTqsjrPrPdouMpbsgaaQjPGYFh7gMaiNgZ7Rzaacok",
							amount: 2780557n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 2780557n,
							amount_out: 294n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									2780557n,
								],
								[
									{
										parents: 0,
										interior: {
											type: "X2",
											value: [
												{
													type: "PalletInstance",
													value: 50,
												},
												{
													type: "GeneralIndex",
													value: 1984n,
												},
											],
										},
									},
									294n,
								],
							],
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 14816018n,
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "AssetsTrapped",
						value: {
							hash: "0xa1f027df0b8b1ff9d8c107966130efd3efb78fd0f801c5b429fc02459a650cea",
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
							assets: {
								type: "V5",
								value: [
									{
										id: {
											parents: 0,
											interior: {
												type: "X2",
												value: [
													{
														type: "PalletInstance",
														value: 50,
													},
													{
														type: "GeneralIndex",
														value: 1984n,
													},
												],
											},
										},
										fun: {
											type: "Fungible",
											value: 294n,
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
