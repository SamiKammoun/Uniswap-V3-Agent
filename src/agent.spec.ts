import { ethers, Finding, FindingSeverity, FindingType, HandleTransaction, TransactionEvent } from "forta-agent";
import { provideHandleTransaction } from "./agent";
import { createAddress, MockEthersProvider, TestTransactionEvent } from "forta-agent-tools/lib/tests";
import { ERC20_CONTRACT_ABI, UNISWAP_V3_FACTORY, UNISWAP_V3_POOL_ABI } from "./constants";
import { encodeParameters } from "forta-agent-tools";
import { createDescription, token } from "./agent.utils";
import { BigNumber } from "ethers";
const iface = new ethers.utils.Interface(UNISWAP_V3_POOL_ABI);
const mockContractCalls = (
  mockProvider: MockEthersProvider,
  liqPoolAddress: string,
  token0: token,
  token1: token,
  block?: number
) => {
  block = block as any as number;
  const iface = new ethers.utils.Interface([...UNISWAP_V3_POOL_ABI, ...ERC20_CONTRACT_ABI]);

  mockProvider.addCallTo(liqPoolAddress, block, iface, "factory", { inputs: [], outputs: [UNISWAP_V3_FACTORY] });
  mockProvider.addCallTo(liqPoolAddress, block, iface, "token0", { inputs: [], outputs: [token0.address] });
  mockProvider.addCallTo(liqPoolAddress, block, iface, "token1", { inputs: [], outputs: [token1.address] });

  mockProvider.addCallTo(token0.address, block, iface, "name", { inputs: [], outputs: [token0.name] });
  mockProvider.addCallTo(token0.address, block, iface, "symbol", { inputs: [], outputs: [token0.symbol] });
  mockProvider.addCallTo(token0.address, block, iface, "decimals", { inputs: [], outputs: [token0.decimals] });

  mockProvider.addCallTo(token1.address, block, iface, "name", { inputs: [], outputs: [token1.name] });
  mockProvider.addCallTo(token1.address, block, iface, "symbol", { inputs: [], outputs: [token1.symbol] });
  mockProvider.addCallTo(token1.address, block, iface, "decimals", { inputs: [], outputs: [token1.decimals] });
};

const mockEvent = (tx: TestTransactionEvent, amount0: number, amount1: number, liqPoolAddress: string) => {
  const { data, topics } = iface.encodeEventLog(iface.getEvent("Swap"), [
    createAddress("0xabc"),
    createAddress("0xabc"),
    -amount0,
    amount1,
    1,
    1,
    1,
  ]);
  tx.addAnonymousEventLog(liqPoolAddress, data, ...topics);
};

describe("Uniswap Swap detection test suite", () => {
  let mockProvider: MockEthersProvider = new MockEthersProvider();
  const handler: HandleTransaction = provideHandleTransaction(mockProvider);

  beforeEach(() => {
    mockProvider.clear();
  });

  it("should return empty findings when nothing happened", async () => {
    const tx: TransactionEvent = new TestTransactionEvent();

    const findings: Finding[] = await handler(tx);
    expect(findings).toStrictEqual([]);
  });

  it("should return empty findings on other events", async () => {
    const tx: TransactionEvent = new TestTransactionEvent()
      .addEventLog("customEvent()", createAddress("0xabc"))
      .addEventLog("secondEvent(uint256)", createAddress("0xabc"), encodeParameters(["uint256"], ["20"]));

    const findings: Finding[] = await handler(tx);
    expect(findings).toStrictEqual([]);
  });

  it("should return a finding for simple swap", async () => {
    const sender: string = createAddress("0xabc1");
    const liqPool: string = createAddress("0xabc2");
    const token0: token = {
      address: createAddress("0xabc3"),
      decimals: "18",
      name: "MATIC",
      symbol: "MATIC",
    };
    const token1: token = {
      address: createAddress("0xabc4"),
      decimals: "6",
      name: "USDT",
      symbol: "USDT",
    };

    const tx: TransactionEvent = new TestTransactionEvent().setFrom(sender).setHash("0x00");

    mockEvent(tx as TestTransactionEvent, 3000, 2000, liqPool);

    mockContractCalls(mockProvider, liqPool, token0, token1);

    const findings: Finding[] = await handler(tx);

    expect(findings).toStrictEqual([
      Finding.fromObject({
        name: "Uniswap V3 Simple Swap",
        description: createDescription(token0, token1, "3000", "2000"),
        alertId: "UNISWAPV3-1",
        type: FindingType.Info,
        severity: FindingSeverity.Info,
        protocol: "Uniswap V3",
        metadata: {
          beneficiary: sender,
          tokenOut: token1.name,
          tookenIn: token0.name,
          amountOut: "2000",
          amountIn: "3000",
          liquidityPool: liqPool,
          hash: "0x00",
        },
      }),
    ]);
  });

  it("should return finding for a multihop", async () => {
    const sender: string = createAddress("0xabc1");

    let liqPools: string[] = [];
    let tokens: token[] = [];
    for (let i = 2; i < 7; i++) {
      liqPools.push(createAddress(`0xabc${i}`));
    }
    for (let i = 2; i < 8; i++) {
      tokens.push({
        name: `token${i}`,
        address: createAddress(`0xabcd${i}`),
        decimals: i.toString(),
        symbol: `symbol${i}`,
      });
    }

    const tx: TransactionEvent = new TestTransactionEvent().setFrom(sender).setHash("0x00");

    for (let i = 0; i < 5; i++) {
      mockContractCalls(mockProvider, liqPools[i], tokens[i], tokens[i + 1]);
      mockEvent(tx as TestTransactionEvent, 100000, 200000, liqPools[i]);
    }

    const findings: Finding[] = await handler(tx);

    expect(findings).toEqual([
      Finding.fromObject({
        name: "Uniswap V3 Multihop Swap",
        description: "Detected Multihop on UniswapV3",
        alertId: "UNISWAPV3-2",
        type: FindingType.Info,
        severity: FindingSeverity.Low,
        protocol: "Uniswap V3",
        metadata: {
          beneficiary: sender,
          liquidityPools: liqPools.toString(),
          hash: tx.hash,
        },
      }),
    ]);
  });

  it("should NOT return finding for a multiswap that includes other protocols", async () => {
    const sender: string = createAddress("0xabc1");

    let liqPools: string[] = [];
    let tokens: token[] = [];
    for (let i = 2; i < 7; i++) {
      liqPools.push(createAddress(`0xabc${i}`));
    }
    for (let i = 2; i < 8; i++) {
      tokens.push({
        name: `token${i}`,
        address: createAddress(`0xabcd${i}`),
        decimals: i.toString(),
        symbol: `symbol${i}`,
      });
    }

    const tx: TransactionEvent = new TestTransactionEvent().setFrom(sender).setHash("0x00");

    for (let i = 0; i < 4; i++) {
      mockContractCalls(mockProvider, liqPools[i], tokens[i], tokens[i + 1]);
      mockEvent(tx as TestTransactionEvent, 100000, 200000, liqPools[i]);
    }

    //swap from other protocol
    mockEvent(tx as TestTransactionEvent, 10000, 20000, liqPools[5]);
    mockProvider.addCallTo(liqPools[4], 0, iface, "factory", { inputs: [], outputs: [createAddress("0x01")] });

    const findings: Finding[] = await handler(tx);

    expect(findings).toStrictEqual([]);
  });
});
