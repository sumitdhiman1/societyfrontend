import HttpClient from "./HttpClient";

export interface CalculatorAnswer {
  key: string;
  text: string;
  amount: number;
  timeline?: string;
  metadata?: Record<string, unknown>;
  visibleIf?: { tier?: string };
}

export interface CalculatorQuestion {
  key: string;
  text: string;
  type: "single" | "multi" | "text" | "number";
  order?: number;
  isRequired?: boolean;
  isMultiplier?: boolean;
  multiplierAmount?: number;
  affectsPrice?: boolean;
  roleId?: number;
  conditionalOn?: {
    questionKey: string;
    answerKey?: string;
    answerKeys?: string[];
  };
  config?: { placeholder?: string; minValue?: number };
  answers: CalculatorAnswer[];
}

export interface CalculatorCategory {
  categoryKey: string;
  categoryName: string;
  image?: string;
  baseAmount?: number;
  timeline?: string;
  uiRules?: {
    priceBarTrigger?: { questionKey: string; minSelections?: number };
  };
  questions: CalculatorQuestion[];
}

export interface CalculatorConfig {
  categories: CalculatorCategory[];
}

export interface CalculatorSelection {
  questionKey: string;
  answerKeys: string[];
  textValue?: string;
  numericValue?: number;
}

export interface CalculatePriceResult {
  totalPrice: number;
  timeline: string;
  breakdown: { item: string; amount: number; type: string }[];
}

class PriceCalculatorService extends HttpClient {
  private cachedConfig: CalculatorConfig | null = null;

  async getCalculatorConfig(): Promise<CalculatorConfig> {
    try {
      const response = await this.get("/price-calculator/config");

      if (response && (response.data || response.categories)) {
        let config: CalculatorConfig;

        if (Array.isArray(response.data)) {
          config = { categories: response.data };
        } else if (response.categories) {
          config = response;
        } else if (response.data?.categories) {
          config = response.data;
        } else {
          config = { categories: [] };
        }

        this.cachedConfig = config;
        return config;
      }
    } catch (err) {
      console.error("Failed to load calculator config:", err);
    }

    return { categories: [] };
  }

  async calculatePrice(
    categoryKey: string,
    selections: CalculatorSelection[]
  ): Promise<CalculatePriceResult | null> {
    try {
      const response = await this.post("/price-calculator/calculate", {
        categoryKey,
        selections,
      });
      const data = response?.data ?? response;
      if (data?.totalPrice !== undefined) {
        return data as CalculatePriceResult;
      }
    } catch (err) {
      console.error("Failed to calculate price:", err);
    }
    return null;
  }

  async submitQuote(data: Record<string, unknown>) {
    try {
      return await this.post("/price-calculator/submit", data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Submit quote failed", err);
      return { isSuccessful: false, message };
    }
  }
}

export const priceCalculatorService = new PriceCalculatorService();
