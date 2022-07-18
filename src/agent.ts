import { Finding, getEthersProvider, HandleTransaction, TransactionEvent } from "forta-agent";
import {
  checkUniswapLiquidityPools,
  createFindingMultihop,
  createFindingSimpleSwap,
  generateSwap,
  swap,
} from "./agent.utils";
import { SWAP_EVENT } from "./constants";
import DataFetcher from "./data.fetcher";

export const provideHandleTransaction = (provider: any): HandleTransaction => {
  const dataFetcher: DataFetcher = new DataFetcher(provider);

  return async (txEvent: TransactionEvent) => {
    const findings: Finding[] = [];

    const tokenSwapInvocations = txEvent.filterLog(SWAP_EVENT);
    const tokenSwapCount = tokenSwapInvocations.length;

    if (tokenSwapCount == 0) return findings;

    const areUniswapLiqPools = await checkUniswapLiquidityPools(tokenSwapInvocations, dataFetcher);
    if (!areUniswapLiqPools) return findings;

    let swaps: swap[] = [];
    await Promise.all(
      tokenSwapInvocations.map(async (tokenSwapInvocation) => {
        swaps.push(await generateSwap(tokenSwapInvocation, dataFetcher));
      })
    );

    if (tokenSwapCount == 1) {
      findings.push(createFindingSimpleSwap(swaps[0]));
    } else {
      findings.push(createFindingMultihop(swaps));
    }

    return findings;
  };
};
export default {
  handleTransaction: provideHandleTransaction(getEthersProvider()),
};
