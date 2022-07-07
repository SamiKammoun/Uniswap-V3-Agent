export const UNISWAP_V3_SWAPROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
// export const UNISWAP_V3_SWAPCALLBACK =
//   " function uniswapV3SwapCallback(int256 amount0Delta,int256 amount1Delta,bytes data)";
export const ERC20_TRANSFER_EVENT = "event Transfer(address indexed from, address indexed to, uint256 value)";
export const ERC20_CONTRACT_ABI = [
  // Some details about the token
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];
