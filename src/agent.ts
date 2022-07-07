import { Finding, HandleTransaction, TransactionEvent } from "forta-agent";
import { createFindingSimpleSwap, getTokenDecimals, getTokenName, getTokenSymbol, transferEvent } from "./agent.utils";
import { ERC20_TRANSFER_EVENT, UNISWAP_V3_SWAPROUTER_ADDRESS } from "./constants";

export const provideHandleTransaction = (): HandleTransaction => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    if (txEvent.to?.toLowerCase() != UNISWAP_V3_SWAPROUTER_ADDRESS.toLowerCase()) return findings;

    const tokenTransferInvocations = txEvent.filterLog(ERC20_TRANSFER_EVENT);
    const tokenSwapCount = tokenTransferInvocations.length / 2;
    let transfers: transferEvent[] = [];

    await Promise.all(
      tokenTransferInvocations.map(async (tokenTransferInvocation) => {
        const tokenData = [
          await getTokenName(tokenTransferInvocation.address),
          await getTokenSymbol(tokenTransferInvocation.address),
        ];
        console.log(tokenData);
        const transfer: transferEvent = {
          from: tokenTransferInvocation.args.from,
          to: tokenTransferInvocation.args.to,
          value: tokenTransferInvocation.args.value,
          tokenAddress: tokenTransferInvocation.address,
          symbol: tokenData[1],
          name: tokenData[0],
          tokenIn: txEvent.from.toLowerCase() == tokenTransferInvocation.args.to.toLowerCase(),
          decimals: await getTokenDecimals(tokenTransferInvocation.address),
        };
        transfers.push(transfer);
      })
    );

    if (tokenSwapCount == 1) {
      findings.push(createFindingSimpleSwap(transfers));
    } else {
    }

    return findings;
  };
};
export default {
  handleTransaction: provideHandleTransaction(),
};
