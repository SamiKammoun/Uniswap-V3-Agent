import { providers } from "ethers";
import { ethers } from "forta-agent";
import { ERC20_CONTRACT_ABI } from "./constants";

export default class TokenDataFetcher {
  provider: providers.Provider;

  constructor(provider: providers.Provider) {
    this.provider = provider;
  }

  public getTokenName = async (tokenContractAddress: string): Promise<string> => {
    const contract = new ethers.Contract(tokenContractAddress, ERC20_CONTRACT_ABI, this.provider);
    const name = await contract.name();
    return name;
  };
  public getTokenSymbol = async (tokenContractAddress: string): Promise<string> => {
    const contract = new ethers.Contract(tokenContractAddress, ERC20_CONTRACT_ABI, this.provider);
    const symbol = await contract.symbol();
    return symbol;
  };

  public getTokenDecimals = async (tokenContractAddress: string): Promise<string> => {
    const contract = new ethers.Contract(tokenContractAddress, ERC20_CONTRACT_ABI, this.provider);
    const decimals = await contract.decimals();

    return decimals.toString();
  };
}
