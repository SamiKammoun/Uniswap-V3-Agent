import { ethers } from "ethers";
import { Finding, FindingSeverity, FindingType } from "forta-agent";
import { ERC20_CONTRACT_ABI } from "./constants";

export type transferEvent = {
  from: string;
  to: string;
  value: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  tokenIn: boolean;
  decimals: string;
};

export const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");

export const getTokenName = async (tokenContractAddress: string): Promise<string> => {
  const contract = new ethers.Contract(tokenContractAddress, ERC20_CONTRACT_ABI, provider);
  const name = await contract.name();

  return name;
};
export const getTokenSymbol = async (tokenContractAddress: string) => {
  const contract = new ethers.Contract(tokenContractAddress, ERC20_CONTRACT_ABI, provider);
  const symbol = await contract.symbol();

  return symbol;
};

export const getTokenDecimals = async (tokenContractAddress: string) => {
  const contract = new ethers.Contract(tokenContractAddress, ERC20_CONTRACT_ABI, provider);
  const decimals = await contract.decimals();

  return decimals.toString();
};

export const createFindingSimpleSwap = (transferEvents: transferEvent[]): Finding => {
  let transferTokenIn: transferEvent;
  let transferTokenOut: transferEvent;
  if (transferEvents[0].tokenIn) {
    transferTokenIn = transferEvents[0];
    transferTokenOut = transferEvents[1];
  } else {
    transferTokenOut = transferEvents[0];
    transferTokenIn = transferEvents[1];
  }
  return Finding.fromObject({
    name: "Uniswap V3 Simple Swap",
    description: `${transferTokenIn.to} received ${ethers.utils.formatUnits(
      transferTokenIn.value.toString(),
      transferTokenIn.decimals
    )}-${transferTokenIn.symbol} for ${ethers.utils.formatUnits(
      transferTokenOut.value.toString(),
      transferTokenOut.decimals
    )}-${transferTokenOut.symbol}`,
    alertId: "UNISWAPV3-1",
    type: FindingType.Info,
    severity: FindingSeverity.Info,
    protocol: "Uniswap V3",
    metadata: {
      amountIn: transferTokenIn.value,
      amountOut: transferTokenOut.value,
      liquidityPool: transferTokenIn.from,
    },
  });
};

export const createFindingMultiSwap = (transferEvents: transferEvent[]): Finding => {};
