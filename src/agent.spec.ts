import { createTransactionEvent, ethers, Finding, FindingSeverity, FindingType, HandleTransaction } from "forta-agent";
import { createAddress } from "forta-agent-tools/lib/tests";
import { provideHandleTransaction } from "./agent";
import { when } from "jest-when";
import { ERC20_TRANSFER_EVENT, UNISWAP_V3_SWAPROUTER_ADDRESS } from "./constants";
import { createDescription } from "./agent.utils";

const mockTokenDataFetcher = {
  getTokenSymbol: jest.fn(),
  getTokenName: jest.fn(),
  getTokenDecimals: jest.fn(),
};

describe("Swap on UNISWAPV2", () => {
  let handleTransaction: HandleTransaction;
  beforeAll(() => {
    handleTransaction = provideHandleTransaction(mockTokenDataFetcher as any);
  });

  it("returns empty finding if there are no swaps", async () => {
    const mockTxEvent = createTransactionEvent({
      transaction: { from: "0x00", to: UNISWAP_V3_SWAPROUTER_ADDRESS },
    } as any);
    mockTxEvent.filterLog = jest.fn().mockReturnValue([]);

    const findings = await handleTransaction(mockTxEvent);

    expect(findings).toStrictEqual([]);

    expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(1);
    expect(mockTxEvent.filterLog).toHaveBeenCalledWith(ERC20_TRANSFER_EVENT);
  });

  describe("Simple Swap", () => {
    it("returns empty findings if swap is not from Uniswap", async () => {
      const mockTxEvent = createTransactionEvent({
        transaction: { from: "0x00", to: "0x00a" },
      } as any);
      mockTxEvent.filterLog = jest.fn().mockReturnValue([]);

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([]);
      expect(mockTxEvent.filterLog).toHaveBeenCalledTimes(0);
    });
    it("returns simple swap finding if swap is from Uniswap", async () => {
      const tokenInAddress = createAddress("0x01");
      const tokenOutAddress = createAddress("0x02");
      const msgSender = createAddress("0x03");
      const liquidityPool = createAddress("0x04");

      const mockTxEvent = createTransactionEvent({
        transaction: { from: msgSender, to: UNISWAP_V3_SWAPROUTER_ADDRESS },
      } as any);

      const mockTransferEventIn = {
        address: tokenInAddress,
        args: {
          from: liquidityPool,
          to: msgSender,
          value: 100,
        },
      };
      const mockTransferEventOut = {
        address: tokenOutAddress,
        args: {
          from: msgSender,
          to: liquidityPool,
          value: 200,
        },
      };
      mockTxEvent.filterLog = jest.fn().mockReturnValue([mockTransferEventIn, mockTransferEventOut]);

      when(mockTokenDataFetcher.getTokenName).calledWith(tokenInAddress).mockReturnValue("Matic");
      when(mockTokenDataFetcher.getTokenSymbol).calledWith(tokenInAddress).mockReturnValue("MATIC");
      when(mockTokenDataFetcher.getTokenDecimals)
        .calledWith(tokenInAddress)
        .mockReturnValue(ethers.BigNumber.from("18"));

      when(mockTokenDataFetcher.getTokenName).calledWith(tokenOutAddress).mockReturnValue("USDT stable coin");
      when(mockTokenDataFetcher.getTokenSymbol).calledWith(tokenOutAddress).mockReturnValue("USDT");
      when(mockTokenDataFetcher.getTokenDecimals)
        .calledWith(tokenOutAddress)
        .mockReturnValue(ethers.BigNumber.from("6"));

      const findings = await handleTransaction(mockTxEvent);

      expect(findings).toStrictEqual([
        Finding.fromObject({
          name: "Uniswap V3 Simple Swap",
          description: `Swap ${ethers.utils.formatUnits(200, 6)}-USDT for ${ethers.utils.formatUnits(100, 18)}-MATIC`,
          alertId: "UNISWAPV3-1",
          type: FindingType.Info,
          severity: FindingSeverity.Info,
          protocol: "Uniswap V3",
          metadata: {
            beneficiary: msgSender,
            tokenOut: "USDT stable coin",
            tookenIn: "Matic",
            amountOut: "200",
            amountIn: "100",
            liquidityPool: liquidityPool,
          },
        }),
      ]);
    });
  });
  // describe("Multihop swap", () => {
  //   it("Returns multihop swap finding if multihop swap is from uniswap", async () => {
  //     const tokenInAddress = createAddress("0x01");
  //     const tokenOutAddress = createAddress("0x02");
  //     const msgSender = createAddress("0x03");
  //     const liquidityPool = createAddress("0x04");

  //     const mockTxEvent = createTransactionEvent({
  //       transaction: { from: msgSender, to: UNISWAP_V3_SWAPROUTER_ADDRESS },
  //     } as any);

  //     const mockTransferEventIn = {
  //       address: tokenInAddress,
  //       args: {
  //         from: liquidityPool,
  //         to: msgSender,
  //         value: 100,
  //       },
  //     };
  //     const mockTransferEventOut = {
  //       address: tokenOutAddress,
  //       args: {
  //         from: msgSender,
  //         to: liquidityPool,
  //         value: 200,
  //       },
  //     };
  //     mockTxEvent.filterLog = jest.fn().mockReturnValue([mockTransferEventIn, mockTransferEventOut]);

  //     when(mockTokenDataFetcher.getTokenName).calledWith(tokenInAddress).mockReturnValue("Matic");
  //     when(mockTokenDataFetcher.getTokenSymbol).calledWith(tokenInAddress).mockReturnValue("MATIC");
  //     when(mockTokenDataFetcher.getTokenDecimals)
  //       .calledWith(tokenInAddress)
  //       .mockReturnValue(ethers.BigNumber.from("18"));

  //     when(mockTokenDataFetcher.getTokenName).calledWith(tokenOutAddress).mockReturnValue("USDT stable coin");
  //     when(mockTokenDataFetcher.getTokenSymbol).calledWith(tokenOutAddress).mockReturnValue("USDT");
  //     when(mockTokenDataFetcher.getTokenDecimals)
  //       .calledWith(tokenOutAddress)
  //       .mockReturnValue(ethers.BigNumber.from("6"));

  //     const findings = await handleTransaction(mockTxEvent);

  //     expect(findings).toStrictEqual([
  //       Finding.fromObject({
  //         name: "Uniswap V3 Simple Swap",
  //         description: `${msgSender} received ${ethers.utils.formatUnits(100, 18)}-MATIC for ${ethers.utils.formatUnits(
  //           200,
  //           6
  //         )}-USDT`,
  //         alertId: "UNISWAPV3-1",
  //         type: FindingType.Info,
  //         severity: FindingSeverity.Info,
  //         protocol: "Uniswap V3",
  //         metadata: {
  //           amountIn: "100",
  //           amountOut: "200",
  //           liquidityPool: liquidityPool,
  //         },
  //       }),
  //     ]);
  //   });
  // });
});
