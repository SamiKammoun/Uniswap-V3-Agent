import { providers } from "ethers";
import { ethers } from "forta-agent";
import { ERC20_CONTRACT_ABI, UNISWAP_V3_FACTORY, UNISWAP_V3_POOL_ABI } from "./constants";
import { token } from "./agent.utils";
import LRU from "lru-cache";

export default class DataFetcher {
  provider: providers.Provider;
  private uniswapLiqPoolCache: LRU<string, boolean>;
  private liqPoolCache: LRU<string, { token0: string; token1: string }>;
  private tokenDataCache: LRU<string, token>;
  constructor(provider: providers.Provider) {
    this.provider = provider;
    this.liqPoolCache = new LRU<string, { token0: string; token1: string }>({ max: 500 });
    this.uniswapLiqPoolCache = new LRU<string, boolean>({ max: 500 });
    this.tokenDataCache = new LRU<string, token>({ max: 1000 });
  }

  public getTokenData = async (tokenContractAddress: string): Promise<token> => {
    if (this.tokenDataCache.has(tokenContractAddress))
      return this.tokenDataCache.get(tokenContractAddress) as Promise<token>;

    const contract = new ethers.Contract(tokenContractAddress, ERC20_CONTRACT_ABI, this.provider);
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();

    const tokenData: token = {
      address: tokenContractAddress,
      name: name,
      symbol: symbol,
      decimals: decimals,
    };

    this.tokenDataCache.set(tokenContractAddress, tokenData);
    return tokenData;
  };

  public checkLiquidityPool = async (liquidityPoolAddress: string): Promise<boolean> => {
    if (this.uniswapLiqPoolCache.has(liquidityPoolAddress))
      return this.uniswapLiqPoolCache.get(liquidityPoolAddress) as Promise<boolean>;
    const contract = new ethers.Contract(liquidityPoolAddress, UNISWAP_V3_POOL_ABI, this.provider);
    try {
      const factory = await contract.factory();
      const isUniswap = factory.toLowerCase() == UNISWAP_V3_FACTORY;
      this.uniswapLiqPoolCache.set(liquidityPoolAddress, isUniswap);
      return isUniswap;
    } catch {
      return false;
    }
  };

  public fetchLiquidityPool = async (liquidityPoolAddress: string): Promise<{ token0: string; token1: string }> => {
    if (this.liqPoolCache.has(liquidityPoolAddress))
      return this.liqPoolCache.get(liquidityPoolAddress) as Promise<{ token0: string; token1: string }>;
    const contract = new ethers.Contract(liquidityPoolAddress, UNISWAP_V3_POOL_ABI, this.provider);
    const token0 = await contract.token0();
    const token1 = await contract.token1();
    this.liqPoolCache.set(liquidityPoolAddress, { token0, token1 });
    return { token0, token1 };
  };
}
