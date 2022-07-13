import { Finding, getEthersProvider, HandleTransaction, TransactionEvent } from "forta-agent";
import {
  transferEvent,
  createFindingMultihop,
  createFindingSimpleSwap,
  generateTransferFromInvocation,
} from "./agent.utils";
import { ERC20_TRANSFER_EVENT, UNISWAP_V3_SWAPROUTER2_ADDRESS, UNISWAP_V3_SWAPROUTER_ADDRESS } from "./constants";
import TokenDataFetcher from "./token.data.fetcher";

const dataFetcher: TokenDataFetcher = new TokenDataFetcher(getEthersProvider());

export const provideHandleTransaction = (tokenDataFetcher: TokenDataFetcher): HandleTransaction => {
  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    if (
      txEvent.to?.toLowerCase() != UNISWAP_V3_SWAPROUTER_ADDRESS &&
      txEvent.to?.toLowerCase() != UNISWAP_V3_SWAPROUTER2_ADDRESS
    )
      return findings;

    const tokenTransferInvocations = txEvent.filterLog(ERC20_TRANSFER_EVENT);
    const tokenSwapCount = tokenTransferInvocations.length / 2;
    if (tokenSwapCount == 0) return findings;
    let transfers: transferEvent[] = [];
    await Promise.all(
      tokenTransferInvocations.map(async (tokenTransferInvocation) => {
        transfers.push(await generateTransferFromInvocation(tokenTransferInvocation, txEvent, tokenDataFetcher));
      })
    );

    if (tokenSwapCount == 1) {
      findings.push(createFindingSimpleSwap(transfers));
    } else {
      findings.push(createFindingMultihop(transfers, txEvent.from.toLowerCase()));
    }

    return findings;
  };
};
export default {
  handleTransaction: provideHandleTransaction(dataFetcher),
};
