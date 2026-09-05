import HttpClient from './HttpClient';

export interface Country {
  _id?: string;
  name: string;
  iso2: string;
  iso3: string;
  numericCode?: string;
  phoneCode?: string;
  currency?: string;
  vatRate: number;
  flagEmoji?: string;
  isActive?: boolean;
}

class CountryService {
  private client: HttpClient;
  private cachedCountries: Country[] | null = null;
  private fetchPromise: Promise<Country[]> | null = null;

  constructor(session?: any) {
    this.client = new HttpClient(session);
  }

  async getAllCountries(): Promise<Country[]> {
    if (this.cachedCountries && this.cachedCountries.length > 0) {
      return this.cachedCountries;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      try {
        const res = await this.client.get('/countries');
        let list: Country[] = [];
        if (res && res.data) {
          list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        } else if (Array.isArray(res)) {
          list = res;
        }

        if (list.length > 0) {
          this.cachedCountries = list;
          return list;
        }
      } catch (err) {
        console.error('Failed to fetch countries in frontend countryService:', err);
      } finally {
        this.fetchPromise = null;
      }
      return this.cachedCountries || [];
    })();

    return this.fetchPromise;
  }

  async getCountryByIso(iso: string): Promise<Country | null> {
    if (!iso) return null;
    const countries = await this.getAllCountries();
    const query = iso.trim().toUpperCase();
    return (
      countries.find(
        (c) =>
          c.iso2?.toUpperCase() === query ||
          c.iso3?.toUpperCase() === query ||
          c.name?.toLowerCase() === iso.toLowerCase().trim()
      ) || null
    );
  }

  findCachedCountry(codeOrName: string): Country | null {
    if (!codeOrName || !this.cachedCountries) return null;
    const query = codeOrName.trim().toUpperCase();
    return (
      this.cachedCountries.find(
        (c) =>
          c.iso2?.toUpperCase() === query ||
          c.iso3?.toUpperCase() === query ||
          c.name?.toLowerCase() === codeOrName.toLowerCase().trim()
      ) || null
    );
  }

  getVatRateSync(countryCodeOrName: string): number {
    const match = this.findCachedCountry(countryCodeOrName);
    return match ? (Number(match.vatRate) || 0) : 0;
  }
}

export const countryService = new CountryService();
export default CountryService;
