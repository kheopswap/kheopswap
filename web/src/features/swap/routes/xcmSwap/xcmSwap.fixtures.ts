import type { XcmVersionedXcm } from "@polkadot-api/descriptors";
import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";

type DestinationDryRun = Awaited<
	ReturnType<Api<"hydration">["apis"]["DryRunApi"]["dry_run_xcm"]>
>;

type DeliveryFees = Awaited<
	ReturnType<Api<"pah">["apis"]["XcmPaymentApi"]["query_delivery_fees"]>
>;

type XcmSwapFixture = {
	sender: string;
	amount: bigint;
	appFee: bigint;
	swapAmount: bigint;
	slippageBps: bigint;
	lpFee: number;
	reserves: [bigint, bigint][];
	mins: bigint[];
	program: XcmVersionedXcm;
	origin: DryRun<"pah">;
	deliveryFee?: DeliveryFees;
	destination?: DestinationDryRun;
};

export const usdcToUsdt: XcmSwapFixture = {
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	amount: 100000000n,
	appFee: 300000n,
	swapAmount: 99700000n,
	slippageBps: 50n,
	lpFee: 3000,
	reserves: [
		[98373051784n, 825536871148060n],
		[9379141092987132n, 1115060134573n],
	],
	mins: [829153841606n, 98271373n],
	program: {
		type: "V5",
		value: [
			{
				type: "SetFeesMode",
				value: {
					jit_withdraw: true,
				},
			},
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
										value: 1337n,
									},
								],
							},
						},
						fun: {
							type: "Fungible",
							value: 99700000n,
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
								value: 829153841606n,
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
											value: 1984n,
										},
									],
								},
							},
							fun: {
								type: "Fungible",
								value: 98271373n,
							},
						},
					],
					maximal: true,
				},
			},
			{
				type: "DepositReserveAsset",
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
										value: 98271373n,
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
				},
			},
		],
	},
	origin: {
		success: true,
		value: {
			execution_result: {
				success: true,
				value: {
					actual_weight: {
						ref_time: 1822933042n,
						proof_size: 27102n,
					},
					pays_fee: {
						type: "Yes",
						value: undefined,
					},
				},
			},
			emitted_events: [
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 99700000n,
							amount_out: 833320443826n,
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
													value: 1337n,
												},
											],
										},
									},
									99700000n,
								],
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									833320443826n,
								],
							],
						},
					},
				},
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 833320443826n,
							amount_out: 98765199n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									833320443826n,
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
									98765199n,
								],
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
										value: 2034,
									},
								},
							},
							message: [],
							message_id:
								"0x769e6a5efea9eb78521f2fbe16b3553eee92463b3150d7b6fa2f286eeebf604d",
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
												value: 98765199n,
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
												value: 98271373n,
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
										"0x769e6a5efea9eb78521f2fbe16b3553eee92463b3150d7b6fa2f286eeebf604d",
								},
							],
						},
					],
				],
			],
		},
	},
	deliveryFee: {
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
						value: 305450000n,
					},
				},
			],
		},
	},
	destination: {
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
					type: "Tokens",
					value: {
						type: "Deposited",
						value: {
							currency_id: 10,
							who: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							amount: 98764625n,
						},
					},
				},
				{
					type: "Tokens",
					value: {
						type: "Deposited",
						value: {
							currency_id: 10,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 574n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotToUsdt: XcmSwapFixture = {
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	amount: 100000000000n,
	appFee: 300000000n,
	swapAmount: 99700000000n,
	slippageBps: 50n,
	lpFee: 3000,
	reserves: [[9379141092987132n, 1115060134573n]],
	mins: [11758285n],
	program: {
		type: "V5",
		value: [
			{
				type: "SetFeesMode",
				value: {
					jit_withdraw: true,
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
							value: 99700000000n,
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
											value: 1984n,
										},
									],
								},
							},
							fun: {
								type: "Fungible",
								value: 11758285n,
							},
						},
					],
					maximal: true,
				},
			},
			{
				type: "DepositReserveAsset",
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
										value: 11758285n,
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
				},
			},
		],
	},
	origin: {
		success: true,
		value: {
			execution_result: {
				success: true,
				value: {
					actual_weight: {
						ref_time: 1160141042n,
						proof_size: 20214n,
					},
					pays_fee: {
						type: "Yes",
						value: undefined,
					},
				},
			},
			emitted_events: [
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 99700000000n,
							amount_out: 11817372n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									99700000000n,
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
									11817372n,
								],
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
										value: 2034,
									},
								},
							},
							message: [],
							message_id:
								"0xe5037a064155baec5f2da6e377002fefcfadc579a39cdb5c0be042008f1fd4c4",
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
												value: 11817372n,
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
												value: 11758285n,
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
										"0xe5037a064155baec5f2da6e377002fefcfadc579a39cdb5c0be042008f1fd4c4",
								},
							],
						},
					],
				],
			],
		},
	},
	deliveryFee: {
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
						value: 305450000n,
					},
				},
			],
		},
	},
	destination: {
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
					type: "Tokens",
					value: {
						type: "Deposited",
						value: {
							currency_id: 10,
							who: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							amount: 11816798n,
						},
					},
				},
				{
					type: "Tokens",
					value: {
						type: "Deposited",
						value: {
							currency_id: 10,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 574n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotToUsdtTrapped: XcmSwapFixture = {
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	amount: 100000000n,
	appFee: 0n,
	swapAmount: 100000000n,
	slippageBps: 10000n,
	lpFee: 3000,
	reserves: [[9379141092987132n, 1115060134573n]],
	mins: [1n],
	program: {
		type: "V5",
		value: [
			{
				type: "SetFeesMode",
				value: {
					jit_withdraw: true,
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
							value: 100000000n,
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
											value: 1984n,
										},
									],
								},
							},
							fun: {
								type: "Fungible",
								value: 1n,
							},
						},
					],
					maximal: true,
				},
			},
			{
				type: "DepositReserveAsset",
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
										value: 1n,
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
				},
			},
		],
	},
	origin: {
		success: true,
		value: {
			execution_result: {
				success: true,
				value: {
					actual_weight: {
						ref_time: 1007337000n,
						proof_size: 16621n,
					},
					pays_fee: {
						type: "Yes",
						value: undefined,
					},
				},
			},
			emitted_events: [
				{
					type: "AssetConversion",
					value: {
						type: "SwapCreditExecuted",
						value: {
							amount_in: 100000000n,
							amount_out: 11853n,
							path: [
								[
									{
										parents: 1,
										interior: {
											type: "Here",
											value: undefined,
										},
									},
									100000000n,
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
									11853n,
								],
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
										value: 2034,
									},
								},
							},
							message: [],
							message_id:
								"0x0feb236e92149d808e93b9d1b46e2b2453dfc94faa0d5dca6ffde5527c93eda7",
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
												value: 11853n,
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
												value: 1n,
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
										"0x0feb236e92149d808e93b9d1b46e2b2453dfc94faa0d5dca6ffde5527c93eda7",
								},
							],
						},
					],
				],
			],
		},
	},
	deliveryFee: {
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
						value: 305200000n,
					},
				},
			],
		},
	},
	destination: {
		success: true,
		value: {
			execution_result: {
				type: "Incomplete",
				value: {
					used: {
						ref_time: 300000000n,
						proof_size: 0n,
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
						type: "AssetsTrapped",
						value: {
							hash: "0x54b535325e2c5bbeea4a5a1cdd73e41d2298c533a7840d1cf54c337dc2bdc134",
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
											value: 11853n,
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

export const usdcToDotNoDeal: XcmSwapFixture = {
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	amount: 50000000n,
	appFee: 150000n,
	swapAmount: 49850000n,
	slippageBps: -300n,
	lpFee: 3000,
	reserves: [[98373051784n, 825536871148060n]],
	mins: [429376741129n],
	program: {
		type: "V5",
		value: [
			{
				type: "SetFeesMode",
				value: {
					jit_withdraw: true,
				},
			},
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
										value: 1337n,
									},
								],
							},
						},
						fun: {
							type: "Fungible",
							value: 49850000n,
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
								value: 429376741129n,
							},
						},
					],
					maximal: true,
				},
			},
			{
				type: "DepositReserveAsset",
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
										value: 429376741129n,
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
				},
			},
		],
	},
	origin: {
		success: true,
		value: {
			execution_result: {
				success: false,
				value: {
					post_info: {
						actual_weight: {
							ref_time: 608817465n,
							proof_size: 9526n,
						},
						pays_fee: {
							type: "Yes",
							value: undefined,
						},
					},
					error: {
						type: "Module",
						value: {
							type: "PolkadotXcm",
							value: {
								type: "LocalExecutionIncompleteWithError",
								value: {
									index: 2,
									error: {
										type: "NoDeal",
										value: undefined,
									},
								},
							},
						},
					},
				},
			},
			emitted_events: [],
			forwarded_xcms: [],
		},
	},
};

export const usdcToDotInsufficient: XcmSwapFixture = {
	sender: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
	amount: 50000000n,
	appFee: 150000n,
	swapAmount: 49850000n,
	slippageBps: 50n,
	lpFee: 3000,
	reserves: [[98373051784n, 825536871148060n]],
	mins: [414786269343n],
	program: {
		type: "V5",
		value: [
			{
				type: "SetFeesMode",
				value: {
					jit_withdraw: true,
				},
			},
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
										value: 1337n,
									},
								],
							},
						},
						fun: {
							type: "Fungible",
							value: 49850000n,
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
								value: 414786269343n,
							},
						},
					],
					maximal: true,
				},
			},
			{
				type: "DepositReserveAsset",
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
										value: 414786269343n,
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
												id: "0x048c3dfaa8932ac253cab28b53f4360e0d024ea2c8cad7990f4958fe9f7f6342",
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
	origin: {
		success: true,
		value: {
			execution_result: {
				success: false,
				value: {
					post_info: {
						actual_weight: {
							ref_time: 411197465n,
							proof_size: 5253n,
						},
						pays_fee: {
							type: "Yes",
							value: undefined,
						},
					},
					error: {
						type: "Module",
						value: {
							type: "PolkadotXcm",
							value: {
								type: "LocalExecutionIncompleteWithError",
								value: {
									index: 1,
									error: {
										type: "FailedToTransactAsset",
										value: undefined,
									},
								},
							},
						},
					},
				},
			},
			emitted_events: [],
			forwarded_xcms: [],
		},
	},
};
