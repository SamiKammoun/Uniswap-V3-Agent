import { ethers } from "ethers";
import { Finding, FindingSeverity, FindingType, LogDescription, TransactionEvent } from "forta-agent";
import { UNISWAP_V3_SWAPROUTER2_ADDRESS, UNISWAP_V3_SWAPROUTER_ADDRESS } from "./constants";
import TokenDataFetcher from "./token.data.fetcher";

export type transferEvent = {
  from: string;
  to: string;
  value: string;
  isTokenIn: boolean;
  tokenData: token;
};

export type token = {
  address: string;
  symbol: string;
  name: string;
  decimals: string;
};

export const generateTransferFromInvocation = async (
  tokenTransferInvocation: LogDescription,
  txEvent: TransactionEvent,
  tokenDataFetcher: TokenDataFetcher
): Promise<transferEvent> => {
  const tokenData: token = {
    address: tokenTransferInvocation.address,
    symbol: await tokenDataFetcher.getTokenSymbol(tokenTransferInvocation.address),
    name: await tokenDataFetcher.getTokenName(tokenTransferInvocation.address),
    decimals: await tokenDataFetcher.getTokenDecimals(tokenTransferInvocation.address),
  };
  const transfer: transferEvent = {
    from: tokenTransferInvocation.args.from,
    to: tokenTransferInvocation.args.to,
    value: tokenTransferInvocation.args.value,
    isTokenIn: txEvent.from.toLowerCase() == tokenTransferInvocation.args.to.toLowerCase(),
    tokenData: tokenData,
  };
  return transfer;
};

//sort transfer events as such [transferOut,corresponding TransferIn,...] to trace the swaps
export const sortTransfers = (msgSender: string, transferEvents: transferEvent[]): transferEvent[] => {
  const sortedTransfers: any = [];

  //first element is the transfer from the msgSender
  sortedTransfers.push(
    transferEvents.find((transfer) => {
      return transfer.from.toLowerCase() == msgSender;
    })
  );

  for (let i = 0; i < transferEvents.length - 1; i++) {
    sortedTransfers.push(
      transferEvents.find((transfer) => {
        return transfer.from.toLowerCase() == sortedTransfers[sortedTransfers.length - 1].to.toLowerCase();
      })
    );
  }

  return sortedTransfers;
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

export const createFindingSimpleSwap = (transferEvents: transferEvent[]): Finding => {
  let transferTokenIn: transferEvent;
  let transferTokenOut: transferEvent;
  if (transferEvents[0].isTokenIn) {
    transferTokenIn = transferEvents[0];
    transferTokenOut = transferEvents[1];
  } else {
    transferTokenOut = transferEvents[0];
    transferTokenIn = transferEvents[1];
  }
  return Finding.fromObject({
    name: "Uniswap V3 Simple Swap",
    description: createDescription(
      transferTokenIn.tokenData,
      transferTokenOut.tokenData,
      transferTokenIn.value,
      transferTokenOut.value
    ),
    alertId: "UNISWAPV3-1",
    type: FindingType.Info,
    severity: FindingSeverity.Info,
    protocol: "Uniswap V3",
    metadata: {
      beneficiary: transferTokenIn.to,
      tokenOut: transferTokenOut.tokenData.name,
      tookenIn: transferTokenIn.tokenData.name,
      amountOut: transferTokenOut.value.toString(),
      amountIn: transferTokenIn.value.toString(),
      liquidityPool: transferTokenIn.from,
    },
  });
};

export const createFindingMultihop = (transferEvents: transferEvent[], msgSender: string): Finding => {
  let description: string = ``;
  const sortedTransfers: transferEvent[] = sortTransfers(msgSender, transferEvents);
  for (let i = 0; i <= sortedTransfers.length / 2; i += 2) {
    description = description.concat(
      createDescription(
        sortedTransfers[i + 1].tokenData,
        sortedTransfers[i].tokenData,
        sortedTransfers[i + 1].value,
        sortedTransfers[i].value
      ),
      `     `
    );
  }
  return Finding.fromObject({
    name: "Uniswap V3 multihop",
    description: description,
    alertId: "UNISWAPV3-2",
    type: FindingType.Info,
    severity: FindingSeverity.Low,
    protocol: "Uniswap V3",
    metadata: {
      beneficiary: msgSender,
      liquidityPools: sortedTransfers
        .map((transfer) => {
          return transfer.to;
        })
        .filter((address) => {
          return ![msgSender, UNISWAP_V3_SWAPROUTER2_ADDRESS, UNISWAP_V3_SWAPROUTER2_ADDRESS].includes(
            address.toLowerCase()
          );
        })
        .toString(),
      tokenOut: sortedTransfers[0].tokenData.name,
      tokenIn: sortedTransfers[sortedTransfers.length - 1].tokenData.name,
      amountIn: sortedTransfers[0].value,
      amountOut: sortedTransfers[sortedTransfers.length - 1].value,
    },
  });
};
