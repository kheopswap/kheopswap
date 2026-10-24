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
	destinationFee: { plancks: bigint; nativePlancks: bigint };
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
		ref_time: 1337353000n,
		proof_size: 22659n,
	},
	destinationFee: {
		plancks: 1784n,
		nativePlancks: 17144120n,
	},
	hops: [
		{
			tokenIdIn: "asset::pah::1984",
			tokenIdOut: "native::pah",
			reserveIn: 1046165526485n,
			reserveOut: 10088227084341921n,
			amountIn: 9998216n,
			amountOut: 96123146443n,
			minOut: 95642530710n,
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
							type: "RefundSurplus",
							value: undefined,
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
									value: 95642530710n,
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 95642530710n,
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
								"0x1801a32520b6d905b56e371c8f0f349ec4e920364e673a23ae0cdc28c2556ea6",
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 95642530710n,
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
										"0x1801a32520b6d905b56e371c8f0f349ec4e920364e673a23ae0cdc28c2556ea6",
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
						ref_time: 1337353000n,
						proof_size: 22659n,
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
							amount: 17144120n,
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
							amount: 1784n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 1784n,
							amount_out: 17144120n,
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
									1784n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									17144120n,
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
							amount: 96123146443n,
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
							amount: 9998216n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9998216n,
							amount_out: 96123146443n,
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
									9998216n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									96123146443n,
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
							amount: 96123146443n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 17144120n,
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
		ref_time: 1767514000n,
		proof_size: 30607n,
	},
	destinationFee: {
		plancks: 2409n,
		nativePlancks: 23157689n,
	},
	hops: [
		{
			tokenIdIn: "asset::pah::1984",
			tokenIdOut: "native::pah",
			reserveIn: 1046165526485n,
			reserveOut: 10088227084341921n,
			amountIn: 9997591n,
			amountOut: 96117137617n,
			minOut: 95636551928n,
		},
		{
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::23",
			reserveIn: 8415590132n,
			reserveOut: 542456565100733n,
			amountIn: 96117137617n,
			amountOut: 498664350338186n,
			minOut: 496171028586495n,
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
							type: "RefundSurplus",
							value: undefined,
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
									value: 95636551928n,
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
									value: 496171028586495n,
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 95636551928n,
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
													value: 496171028586495n,
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
								"0xd8cf1a2152b39b8550f487cf9650e59c8c67475d6fc31f1490a280fce15f5cbe",
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 95636551928n,
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
													value: 496171028586495n,
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
										"0xd8cf1a2152b39b8550f487cf9650e59c8c67475d6fc31f1490a280fce15f5cbe",
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
						ref_time: 1767514000n,
						proof_size: 30607n,
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
							amount: 23157689n,
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
							amount: 2409n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 2409n,
							amount_out: 23157689n,
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
									2409n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									23157689n,
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
							amount: 96117137617n,
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
							amount: 9997591n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9997591n,
							amount_out: 96117137617n,
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
									9997591n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									96117137617n,
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
							amount: 498664350338186n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "15sv1V4LvqS4e6FdPzCzoao3SLmVPnzLrMwbm1X6PVGsVCpa",
							amount: 96117137617n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 96117137617n,
							amount_out: 498664350338186n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									96117137617n,
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
									498664350338186n,
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
							amount: 498664350338186n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 23157689n,
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
		ref_time: 1337353000n,
		proof_size: 22659n,
	},
	destinationFee: {
		plancks: 17144120n,
		nativePlancks: 17144120n,
	},
	hops: [
		{
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::1337",
			reserveIn: 888395022991321n,
			reserveOut: 92023362208n,
			amountIn: 9982855880n,
			amountOut: 1030948n,
			minOut: 1025793n,
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
							type: "RefundSurplus",
							value: undefined,
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
									value: 1025793n,
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 1025793n,
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
								"0xc60029f32e2037ea20ba1a54d6fe0bd243211cf799d25ec5da6537d20c329427",
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 1025793n,
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
										"0xc60029f32e2037ea20ba1a54d6fe0bd243211cf799d25ec5da6537d20c329427",
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
						ref_time: 1337353000n,
						proof_size: 22659n,
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
							amount: 1030948n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "163CRvzDQ8JHZfmufa86zA7BfDY7NToUSqmWbpDq5kwDYSmH",
							amount: 9982855880n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9982855880n,
							amount_out: 1030948n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									9982855880n,
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
									1030948n,
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
							amount: 1030948n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 17144120n,
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
		ref_time: 1767514000n,
		proof_size: 30607n,
	},
	destinationFee: {
		plancks: 2409n,
		nativePlancks: 23157689n,
	},
	hops: [
		{
			tokenIdIn: "asset::pah::1984",
			tokenIdOut: "native::pah",
			reserveIn: 1046165526485n,
			reserveOut: 10088227084341921n,
			amountIn: 9997591n,
			amountOut: 96117137617n,
			minOut: 95636551928n,
		},
		{
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::23",
			reserveIn: 8415590132n,
			reserveOut: 542456565100733n,
			amountIn: 96117137617n,
			amountOut: 498664350338186n,
			minOut: 496171028586495n,
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
							type: "RefundSurplus",
							value: undefined,
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
									value: 95636551928n,
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
									value: 992342057172990n,
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 95636551928n,
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
													value: 992342057172990n,
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
								"0xa241f9acc31597dd50bc377f13b0a2bfcf5a95f5abcdeec88babf4672f55487d",
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 95636551928n,
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
													value: 992342057172990n,
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
										"0xa241f9acc31597dd50bc377f13b0a2bfcf5a95f5abcdeec88babf4672f55487d",
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
						ref_time: 1534428000n,
						proof_size: 26932n,
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
							amount: 23157689n,
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
							amount: 2409n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 2409n,
							amount_out: 23157689n,
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
									2409n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									23157689n,
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
							amount: 96117137617n,
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
							amount: 9997591n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9997591n,
							amount_out: 96117137617n,
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
									9997591n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									96117137617n,
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
								"0xa241f9acc31597dd50bc377f13b0a2bfcf5a95f5abcdeec88babf4672f55487d",
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
							amount: 287n,
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
							amount_out: 287n,
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
									287n,
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
							amount: 96117137617n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1984,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 287n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 20377132n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const usdtToPinkExact: XcmDestinationSwapFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	tokenIdIn: "hydration-asset::hydration::10",
	tokenIdOut: "asset::pah::23",
	amount: 10000000n,
	slippage: 0,
	lpFee: 3000,
	destinationWeight: {
		ref_time: 1767514000n,
		proof_size: 30607n,
	},
	destinationFee: {
		plancks: 2409n,
		nativePlancks: 23157689n,
	},
	hops: [
		{
			tokenIdIn: "asset::pah::1984",
			tokenIdOut: "native::pah",
			reserveIn: 1046165526485n,
			reserveOut: 10088227084341921n,
			amountIn: 9997591n,
			amountOut: 96117137617n,
			minOut: 96117137617n,
		},
		{
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::23",
			reserveIn: 8415590132n,
			reserveOut: 542456565100733n,
			amountIn: 96117137617n,
			amountOut: 498664350338186n,
			minOut: 498664350338186n,
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
							type: "RefundSurplus",
							value: undefined,
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
									value: 96117137617n,
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
									value: 498664350338186n,
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 96117137617n,
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
													value: 498664350338186n,
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
								"0x8d0738b235b85ddbb6b88277f0bb37d84ada9be5bdd7d09fb8d24988a20049a7",
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
											type: "RefundSurplus",
											value: undefined,
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
													value: 96117137617n,
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
													value: 498664350338186n,
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
										"0x8d0738b235b85ddbb6b88277f0bb37d84ada9be5bdd7d09fb8d24988a20049a7",
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
						ref_time: 1767514000n,
						proof_size: 30607n,
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
							amount: 23157689n,
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
							amount: 2409n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 2409n,
							amount_out: 23157689n,
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
									2409n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									23157689n,
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
							amount: 96117137617n,
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
							amount: 9997591n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9997591n,
							amount_out: 96117137617n,
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
									9997591n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									96117137617n,
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
							amount: 498664350338186n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "15sv1V4LvqS4e6FdPzCzoao3SLmVPnzLrMwbm1X6PVGsVCpa",
							amount: 96117137617n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 96117137617n,
							amount_out: 498664350338186n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									96117137617n,
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
									498664350338186n,
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
							amount: 498664350338186n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 23157689n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const usdtToPinkDust: XcmDestinationSwapFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "163CRvzDQ8JHZfmufa86zA7BfDY7NToUSqmWbpDq5kwDYSmH",
	tokenIdIn: "hydration-asset::hydration::10",
	tokenIdOut: "asset::pah::23",
	amount: 10000000n,
	slippage: 0.005,
	lpFee: 3000,
	destinationWeight: {
		ref_time: 1767514000n,
		proof_size: 30607n,
	},
	destinationFee: {
		plancks: 2405n,
		nativePlancks: 23157689n,
	},
	hops: [
		{
			tokenIdIn: "asset::pah::1984",
			tokenIdOut: "native::pah",
			reserveIn: 1045149427039n,
			reserveOut: 10098064429251503n,
			amountIn: 9997595n,
			amountOut: 96304438754n,
			minOut: 95822916560n,
		},
		{
			tokenIdIn: "native::pah",
			tokenIdOut: "asset::pah::23",
			reserveIn: 8415590132n,
			reserveOut: 542456565100733n,
			amountIn: 96304438754n,
			amountOut: 498742657694928n,
			minOut: 496248944406453n,
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
							type: "RefundSurplus",
							value: undefined,
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
												id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
											},
										},
									},
								},
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
												id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
											},
										},
									},
								},
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
								beneficiary: {
									parents: 0,
									interior: {
										type: "X1",
										value: {
											type: "AccountId32",
											value: {
												network: undefined,
												id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
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
									value: 95822916560n,
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
									value: 992497888812906n,
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
										id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
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
											type: "RefundSurplus",
											value: undefined,
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
																id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
															},
														},
													},
												},
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
																id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
															},
														},
													},
												},
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
												beneficiary: {
													parents: 0,
													interior: {
														type: "X1",
														value: {
															type: "AccountId32",
															value: {
																network: undefined,
																id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
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
													value: 95822916560n,
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
													value: 992497888812906n,
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
														id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0xaac20b11491948cc5e598b04dba5bca1868ec914ddb9cba889e688636c6af476",
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
											type: "RefundSurplus",
											value: undefined,
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
																id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
															},
														},
													},
												},
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
																id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
															},
														},
													},
												},
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
												beneficiary: {
													parents: 0,
													interior: {
														type: "X1",
														value: {
															type: "AccountId32",
															value: {
																network: undefined,
																id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
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
													value: 95822916560n,
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
													value: 992497888812906n,
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
														id: "0xdeda2264bb968ebcfe21568bc886926528379fd2d863283962cab7e33536b22a",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0xaac20b11491948cc5e598b04dba5bca1868ec914ddb9cba889e688636c6af476",
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
						ref_time: 1534428000n,
						proof_size: 26932n,
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
							amount: 23157689n,
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
							amount: 2405n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 2405n,
							amount_out: 23157689n,
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
									2405n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									23157689n,
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
							amount: 96304438754n,
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
							amount: 9997595n,
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 9997595n,
							amount_out: 96304438754n,
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
									9997595n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									96304438754n,
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
								"0xaac20b11491948cc5e598b04dba5bca1868ec914ddb9cba889e688636c6af476",
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
							amount: 286n,
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
							amount_out: 286n,
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
									286n,
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
							who: "163CRvzDQ8JHZfmufa86zA7BfDY7NToUSqmWbpDq5kwDYSmH",
							amount: 96304438754n,
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
								type: "FailedToTransactAsset",
								value: undefined,
							},
							message_id:
								"0xaac20b11491948cc5e598b04dba5bca1868ec914ddb9cba889e688636c6af476",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 20377132n,
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "AssetsTrapped",
						value: {
							hash: "0xa9063b821a37812b9ff53a5de7e95e48e84116d4b77d403f01626c05d3aa680b",
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
											value: 286n,
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
