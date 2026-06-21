export interface Stock {
  ticker: string;
  name: string;
  sector: string;
  marketCap: string;
  peRatio: number | null;
  dividendYield: string;
}

export abstract class FinancialScreener {
  // constructor(private stocks: Array<Stock> = []){}

  public abstract login(): Promise<void>;

  public abstract getStocksBySector(): Promise<void>;
}
