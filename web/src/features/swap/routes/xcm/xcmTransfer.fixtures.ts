import type { DryRun } from "../../../../hooks/useDryRun";
import type { Api } from "../../../../papi/getApi";

type DestinationDryRun = Awaited<
	ReturnType<Api<"hydration">["apis"]["DryRunApi"]["dry_run_xcm"]>
>;

type XcmTransferFixture = {
	sender: string;
	beneficiary: string;
	amount: bigint;
	origin: DryRun<"pah">;
	destination?: DestinationDryRun;
};

export const dotSuccess: XcmTransferFixture = {
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	beneficiary: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
	amount: 10000000000n,
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
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 304850000n,
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
														id: "0x048c3dfaa8932ac253cab28b53f4360e0d024ea2c8cad7990f4958fe9f7f6342",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0x6c79370c66515d9e929b9cca10beb95e43247e2469d15c1586b8506d273b631b",
								},
							],
						},
					],
				],
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
							currency_id: 5,
							who: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
							amount: 9995190152n,
						},
					},
				},
				{
					type: "Currencies",
					value: {
						type: "Deposited",
						value: {
							currency_id: 5,
							who: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
							amount: 9995190152n,
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
							amount: 4809848n,
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
							amount: 4809848n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const usdtSuccess: XcmTransferFixture = {
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	beneficiary: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
	amount: 10000000n,
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
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 305450000n,
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
										value: 305450000n,
									},
								},
							],
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
								{
									type: "SetTopic",
									value:
										"0x73cb51ec955c6bd9f3883b2452f95cb61cc25e490bcfa781b4a517a2f14ce069",
								},
							],
						},
					],
				],
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
						type: "Endowed",
						value: {
							currency_id: 10,
							who: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
							amount: 9999427n,
						},
					},
				},
				{
					type: "Tokens",
					value: {
						type: "Deposited",
						value: {
							currency_id: 10,
							who: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
							amount: 9999427n,
						},
					},
				},
				{
					type: "Currencies",
					value: {
						type: "Deposited",
						value: {
							currency_id: 10,
							who: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
							amount: 9999427n,
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
							amount: 573n,
						},
					},
				},
				{
					type: "Currencies",
					value: {
						type: "Deposited",
						value: {
							currency_id: 10,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 573n,
						},
					},
				},
			],
			forwarded_xcms: [],
		},
	},
};

export const dotTrapped: XcmTransferFixture = {
	sender: "13cKp89Uh2yWgTG28JA1QEvPUMjEPKejqkjHKf9zqLiFKjH6",
	beneficiary: "1ADRXEpxCcHPze36zV1imej5DNcGZ8puqopyUhbppXyGuhP",
	amount: 20000000n,
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
					type: "Balances",
					value: {
						type: "Deposit",
						value: {
							who: "13UVJyLkAxdQn6zM3Gz49SmCLi8SZW3bdtm7DTY29ScavqW2",
							amount: 304650000n,
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
												value: 20000000n,
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
												value: 20000000n,
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
														id: "0x0707070707070707070707070707070707070707070707070707070707070707",
													},
												},
											},
										},
									},
								},
								{
									type: "SetTopic",
									value:
										"0x08da94f89a6b7c2909bfd4fb989e4017dcdc3c8b0bd9b1685fa941f1c2a4895a",
								},
							],
						},
					],
				],
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
						ref_time: 400000000n,
						proof_size: 0n,
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
					type: "Tokens",
					value: {
						type: "Deposited",
						value: {
							currency_id: 5,
							who: "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB",
							amount: 3847879n,
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
							amount: 3847879n,
						},
					},
				},
				{
					type: "PolkadotXcm",
					value: {
						type: "AssetsTrapped",
						value: {
							hash: "0xd7d1c4c89f2671bfcbc2daff271fe010cba723b4ce3282ecc8c43f20add09c44",
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
											value: 16152121n,
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

export const dotOriginFailed: XcmTransferFixture = {
	sender: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
	beneficiary: "16xrRcxrBT6NfiukMzxeHGHPuJtHa9ypdgvvPJVw5zV8hwo",
	amount: 5000000000n,
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
