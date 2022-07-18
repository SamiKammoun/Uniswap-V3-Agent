# Swap on Uniswap-V3 Agent

## Description

This agent detects when a swap happens on Uniswap-V3


## Alerts

- UNISWAPV3-1
  - Fired when a single hop is detected on Uniswap V3
  - Severity is always set to "info" 
  - Type is always set to "info" 
  - Metadata includes: 
    - benificiary (address)
    - tokenOut (name)
    - tokenIn (name)
    - amountOut
    - amountIn
    - liquidityPool (address)

- UNISWAPV3-2
  - Fired when a multi hop is detected on Uniswap V3
  - Severity is always set to "Low" 
  - Type is always set to "info" 
  - Metadata includes: 
    - benificiary (address)
    - tokenOut (name)
    - tokenIn (name)
    - amountOut
    - amountIn
    - liquidityPools (address)
    
 - UNISWAPV3-3 (TODO)
   - Fired when multiple swaps are executed with different protocols including Uniswap V3
   - Severity is always set to "Medium"
   - Type is always set to "info"
   - Metadata includes:
     - benificiary (address)
     - tokenOut (name)
     - tokenIn (name)
     - amountOut
     - amountIn
     - liquidityPools (address)
     
## Test Data

[single hop](https://etherscan.io/tx/0xaf47c830dcd91b6d1c8c2c7035485d8a3a8a490e3f025b7a6a8c45e18d764a33)
[multi hop](https://etherscan.io/tx/0x3ca5be285539c48c38495abb43aa433ac22e673a619b823decff0a07f4e43d44)
[swap with different protocols](https://etherscan.io/tx/0xea7945506d2bb46db4e310f06698940027e358d05fa0168dc0513a9e14cd556f) (this won't return any findings for the moment)
