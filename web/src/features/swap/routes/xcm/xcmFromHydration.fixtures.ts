import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";

type HydrationApis = Api<"hydration">["apis"];

type XcmFromHydrationFixture = {
	sender: string;
	beneficiary: string;
	amount: bigint;
	callArgs: Parameters<
		Api<"hydration">["tx"]["PolkadotXcm"]["transfer_assets_using_type_and_then"]
	>[0];
	origin: DryRun<"hydration">;
	deliveryFees?: Awaited<
		ReturnType<HydrationApis["XcmPaymentApi"]["query_delivery_fees"]>
	>;
	fee?: { hdx: bigint; currency: number; refHdx: bigint; refCurrency: bigint };
	destination?: Awaited<
		ReturnType<Api<"pah">["apis"]["DryRunApi"]["dry_run_xcm"]>
	>;
};

export const dotToAssetHub: XcmFromHydrationFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	amount: 10000000000n,
	callArgs: {
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
	origin: {
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
								"0x1f30c808aaad69a25ea4aff4d80e1ebba9d4b9ae8c3e006a9e241d4433fdaecf",
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
										"0x1f30c808aaad69a25ea4aff4d80e1ebba9d4b9ae8c3e006a9e241d4433fdaecf",
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
	fee: {
		hdx: 562619677758n,
		currency: 0,
		refHdx: 154096976308000000n,
		refCurrency: 154096976308000000n,
	},
	destination: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 672759000n,
						proof_size: 11036n,
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
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 9991650007n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 8349993n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotToAssetHubDotFeePayer: XcmFromHydrationFixture = {
	sender: "147vNmBXQQYqcj7TTkuEY4eYEAXG58UyVHPiEFBYKAtkVL8w",
	beneficiary: "147vNmBXQQYqcj7TTkuEY4eYEAXG58UyVHPiEFBYKAtkVL8w",
	amount: 10000000000n,
	callArgs: {
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
										id: "0x89fbd9882326208a8ce1ecdce15ca6b2a7c44e6a0c4cba219f2325b6bebb8e4c",
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
	origin: {
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
											id: "0x89fbd9882326208a8ce1ecdce15ca6b2a7c44e6a0c4cba219f2325b6bebb8e4c",
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
														id: "0x89fbd9882326208a8ce1ecdce15ca6b2a7c44e6a0c4cba219f2325b6bebb8e4c",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0x5dc459181139aacca413b50a0cc332f4c7455c105dace1834d8a8090e96790ca",
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
														id: "0x89fbd9882326208a8ce1ecdce15ca6b2a7c44e6a0c4cba219f2325b6bebb8e4c",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0x5dc459181139aacca413b50a0cc332f4c7455c105dace1834d8a8090e96790ca",
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
	fee: {
		hdx: 560953011092n,
		currency: 5,
		refHdx: 154096976308000000n,
		refCurrency: 9628983178411n,
	},
	destination: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 672759000n,
						proof_size: 11036n,
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
					type: "System",
					value: {
						type: "NewAccount",
						value: {
							account: "147vNmBXQQYqcj7TTkuEY4eYEAXG58UyVHPiEFBYKAtkVL8w",
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Endowed",
						value: {
							account: "147vNmBXQQYqcj7TTkuEY4eYEAXG58UyVHPiEFBYKAtkVL8w",
							free_balance: 9991650007n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "147vNmBXQQYqcj7TTkuEY4eYEAXG58UyVHPiEFBYKAtkVL8w",
							amount: 9991650007n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 8349993n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const usdtToAssetHub: XcmFromHydrationFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	amount: 10000000n,
	callArgs: {
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
	origin: {
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
								"0x17b1c64f0557938f04a777aaf113517cb4c744534fd0ca4cb876438627b48b92",
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
										"0x17b1c64f0557938f04a777aaf113517cb4c744534fd0ca4cb876438627b48b92",
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
	fee: {
		hdx: 585953011082n,
		currency: 0,
		refHdx: 154096976308000000n,
		refCurrency: 154096976308000000n,
	},
	destination: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 672759000n,
						proof_size: 11036n,
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
							amount: 8349993n,
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
							amount: 997n,
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
							amount: 9999003n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 8349993n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const usdcToAssetHub: XcmFromHydrationFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	amount: 10000000n,
	callArgs: {
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
									value: 1337n,
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
							value: 1337n,
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
	origin: {
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
															value: 1337n,
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
															value: 1337n,
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
								"0x28302e20c9f12b2c073f0e86912a9d6f7c09ff2b3f051d6da5e1fd59854554d3",
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
															value: 1337n,
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
															value: 1337n,
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
										"0x28302e20c9f12b2c073f0e86912a9d6f7c09ff2b3f051d6da5e1fd59854554d3",
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
	fee: {
		hdx: 585953011082n,
		currency: 0,
		refHdx: 154096976308000000n,
		refCurrency: 154096976308000000n,
	},
	destination: {
		success: true,
		value: {
			execution_result: {
				type: "Complete",
				value: {
					used: {
						ref_time: 672759000n,
						proof_size: 11036n,
					},
				},
			},
			emitted_events: [
				{
					type: "Assets",
					value: {
						type: "Withdrawn",
						value: {
							asset_id: 1337,
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
							who: "163CRvzDQ8JHZfmufa86zA7BfDY7NToUSqmWbpDq5kwDYSmH",
							amount: 8349993n,
						},
					},
				},
				{
					type: "Assets",
					value: {
						type: "Deposited",
						value: {
							asset_id: 1337,
							who: "163CRvzDQ8JHZfmufa86zA7BfDY7NToUSqmWbpDq5kwDYSmH",
							amount: 1000n,
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
							amount: 9999000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 8349993n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotToAssetHubTrapped: XcmFromHydrationFixture = {
	sender: "12eNcvtqwzXCnAESdtqkBdRoigUqAdEB9BFHNp7vDkF8zvXB",
	beneficiary: "14Y4nJrx6fogWpLJPu6XkFCEgtJWPkzv3nZtGkBH58nxkGHk",
	amount: 50000000n,
	callArgs: {
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
										id: "0x9c660954f0bae84d52c12a5719a91b5fd6a26500202a5512062af551cc3baa78",
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
	origin: {
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
											id: "0x48bd174e0ba05321362fff413753402dfc888080e5e41effc616cfbaeb68ac5c",
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
														id: "0x9c660954f0bae84d52c12a5719a91b5fd6a26500202a5512062af551cc3baa78",
													},
												},
											},
										},
									},
								},
							],
							message_id:
								"0xb2c8c7974439a69f41c86a57b5cec98d2b01dba5b4222c6a5048eaf093533cc5",
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
														id: "0x9c660954f0bae84d52c12a5719a91b5fd6a26500202a5512062af551cc3baa78",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0xb2c8c7974439a69f41c86a57b5cec98d2b01dba5b4222c6a5048eaf093533cc5",
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
	fee: {
		hdx: 557619677760n,
		currency: 0,
		refHdx: 154096976308000000n,
		refCurrency: 154096976308000000n,
	},
	destination: {
		success: true,
		value: {
			execution_result: {
				type: "Incomplete",
				value: {
					used: {
						ref_time: 672214000n,
						proof_size: 11036n,
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
						type: "Withdraw",
						value: {
							who: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
							amount: 50000000n,
						},
					},
				},
				{
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 8347832n,
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "AssetsTrapped",
						value: {
							hash: "0x7e8c0d391f24b3d621ab701e5f420678eb91bbef01575a93fe61968f055ca202",
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
											parents: 1,
											interior: {
												type: "Here",
												value: undefined,
											},
										},
										fun: {
											type: "Fungible",
											value: 41652168n,
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

export const pinkToAssetHubInsufficient: XcmFromHydrationFixture = {
	sender: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	beneficiary: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
	amount: 1000000000000n,
	callArgs: {
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
									value: 23n,
								},
							],
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
							value: 23n,
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
	origin: {
		success: true,
		value: {
			execution_result: {
				success: false,
				value: {
					post_info: {
						actual_weight: undefined,
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
									index: 0,
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
