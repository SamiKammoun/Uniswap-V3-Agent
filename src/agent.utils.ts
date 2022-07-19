import { ethers } from "ethers";
import { Finding, FindingSeverity, FindingType, LogDescription } from "forta-agent";
import DataFetcher from "./data.fetcher";
export type swap = {
  sender: string;
  recipient: string;
  liquidityPool: string;
  tokenOut: token;
  amountOut: BigInt;
  tokenIn: token;
  amountIn: BigInt;
};

export type token = {
  address: string;
  symbol: string;
  name: string;
  decimals: string;
};

export const checkUniswapLiquidityPools = async (
  tokenSwapInvocations: LogDescription[],
  dataFetcher: DataFetcher
): Promise<boolean> => {
  for (let i = 0; i < tokenSwapInvocations.length; i++) {
    const tokenSwapInvocation = tokenSwapInvocations[i];
    const isUniswap = await dataFetcher.checkLiquidityPool(tokenSwapInvocation.address);
    if (!isUniswap) return false;
  }
  return true;
};

//create a swap object from swap event
export const generateSwap = async (tokenSwapInvocation: LogDescription, dataFetcher: DataFetcher): Promise<swap> => {
  const liquidityPoolData = await dataFetcher.fetchLiquidityPool(tokenSwapInvocation.address);
  const token0 = await dataFetcher.getTokenData(liquidityPoolData.token0);
  const token1 = await dataFetcher.getTokenData(liquidityPoolData.token1);

  let tokenOut: token;
  let tokenIn: token;
  let amountOut: bigint;
  let amountIn: bigint;
  if (tokenSwapInvocation.args.amount0 > 0) {
    tokenOut = token0;
    tokenIn = token1;
    amountOut = tokenSwapInvocation.args.amount0;
    amountIn = tokenSwapInvocation.args.amount1.abs();
  } else {
    tokenOut = token1;
    tokenIn = token0;
    amountOut = tokenSwapInvocation.args.amount1;
    amountIn = tokenSwapInvocation.args.amount0.abs();
  }

  const _swap: swap = {
    sender: tokenSwapInvocation.args.sender,
    recipient: tokenSwapInvocation.args.recipient,
    liquidityPool: tokenSwapInvocation.address,
    tokenOut: tokenOut,
    tokenIn: tokenIn,
    amountOut: amountOut,
    amountIn: amountIn,
  };

  return _swap;
};

export const createDescription = (
  tokenIn: token,
  tokenOut: token,
  tokenInValue: string,
  tokenOutValue: string
): string => {
  return `Swap ${ethers.utils.formatUnits(tokenOutValue, tokenOut.decimals)}-${
    tokenOut.symbol
  } for ${ethers.utils.formatUnits(tokenInValue, tokenIn.decimals)}-${tokenIn.symbol}`;
};

export const createFindingSimpleSwap = (msgSender: string, swap: swap): Finding => {
  return Finding.fromObject({
    name: "Uniswap V3 Simple Swap",
    description: createDescription(swap.tokenIn, swap.tokenOut, swap.amountIn.toString(), swap.amountOut.toString()),
    alertId: "UNISWAPV3-1",
    type: FindingType.Info,
    severity: FindingSeverity.Info,
    protocol: "Uniswap V3",
    metadata: {
      beneficiary: msgSender,
      tokenOut: swap.tokenOut.name,
      tookenIn: swap.tokenIn.name,
      amountOut: swap.amountOut.toString(),
      amountIn: swap.amountIn.toString(),
      liquidityPool: swap.liquidityPool,
    },
  });
};

export const createFindingMultihop = (msgSender: string, swaps: swap[]): Finding => {
  let description: string = ``;
  swaps.forEach((swap) => {
    description = description.concat(
      createDescription(swap.tokenIn, swap.tokenOut, swap.amountIn.toString(), swap.amountOut.toString()),
      "  |"
    );
  });
  return Finding.fromObject({
    name: "Uniswap V3 Multihop Swap",
    description: description,
    alertId: "UNISWAPV3-2",
    type: FindingType.Info,
    severity: FindingSeverity.Low,
    protocol: "Uniswap V3",
    metadata: {
      beneficiary: msgSender,
      tokenOut: swaps[0].tokenOut.name,
      tokenIn: swaps[swaps.length - 1].tokenIn.name,
      amountOut: swaps[0].amountOut.toString(),
      amountIn: swaps[swaps.length - 1].amountIn.toString(),
      liquidityPools: swaps
        .map((swap) => {
          return swap.liquidityPool;
        })
        .toString(),
    },
  });
};
