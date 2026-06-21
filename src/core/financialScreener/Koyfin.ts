import { FinancialScreener } from "./FinancialScreener";

export class Koyfin extends FinancialScreener {
  public login(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public getStocksBySector(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
