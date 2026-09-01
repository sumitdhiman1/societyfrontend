import HttpClient from "./HttpClient";

export interface CalculatorAnswer {
  key: string;
  text: string;
  amount: number;
  timeline?: string;
}

export interface CalculatorQuestion {
  key: string;
  text: string;
  type: "single" | "multi" | "text" | "number";
  order?: number;
  isMultiplier?: boolean;
  multiplierAmount?: number;
  answers: CalculatorAnswer[];
}

export interface CalculatorCategory {
  categoryKey: string;
  categoryName: string;
  baseAmount: number;
  timeline: string;
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

  calculateTotal(categoryKey: string, selections: Record<string, CalculatorSelection>): number {
    if (!this.cachedConfig) return 0;
    
    const category = this.cachedConfig.categories.find(c => c.categoryKey === categoryKey);
    if (!category) return 0;
    
    let total = category.baseAmount;
    
    category.questions.forEach(question => {
      const selection = selections[question.key];
      if (!selection) return;
      
      if (question.type === "single" && selection.answerKeys?.length > 0) {
        const answer = question.answers.find(a => a.key === selection.answerKeys[0]);
        if (answer) total += answer.amount;
      } else if (question.type === "multi" && selection.answerKeys) {
        selection.answerKeys.forEach(key => {
          const answer = question.answers.find(a => a.key === key);
          if (answer) total += answer.amount;
        });
      } else if (question.type === "number" && selection.numericValue !== undefined) {
        if (question.isMultiplier && question.multiplierAmount) {
          total += selection.numericValue * question.multiplierAmount;
        }
      }
    });
    
    return total;
  }

  async submitQuote(data: any) {
    try {
      return await this.post("/price-calculator/submit", data);
    } catch (err: any) {
      console.error("Submit quote failed", err);
      return { isSuccessful: false, message: err.message || "Unknown error" };
    }
  }
}

export const priceCalculatorService = new PriceCalculatorService();
