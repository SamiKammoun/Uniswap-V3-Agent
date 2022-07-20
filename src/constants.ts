import { ethers } from "forta-agent";

export const UNISWAP_V3_FACTORY = "0x1f98431c8ad98523631ae4a59f267346ea31f984";

export const ERC20_CONTRACT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];
export const UNISWAP_V3_POOL_ABI = [
  "event Swap(address indexed sender,address indexed recipient,int256 amount0,int256 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick)",
  "function factory() external view returns (address)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];
