export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  changeValue?: number;
  formattedPrice: string;
  isPositive: boolean;
  updatedAt: string;
}

export interface MarketData {
  dolar: MarketQuote;
  ibovespa: MarketQuote;
  isLoading: boolean;
  lastUpdated: string;
}

const DEFAULT_MARKET_DATA: MarketData = {
  dolar: {
    symbol: 'USD/BRL',
    name: 'Dólar Comercial',
    price: 5.65,
    changePercent: 0.15,
    formattedPrice: 'R$ 5,65',
    isPositive: true,
    updatedAt: 'Agora'
  },
  ibovespa: {
    symbol: '^BVSP',
    name: 'Ibovespa (B3)',
    price: 135400,
    changePercent: 0.45,
    formattedPrice: '135.400 pts',
    isPositive: true,
    updatedAt: 'Agora'
  },
  isLoading: false,
  lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
};

const MARKET_CACHE_KEY = 'balbino_market_quotes_cache';

/**
 * Busca cotações do Dólar e da Bolsa de Valores de São Paulo (Ibovespa)
 */
export async function fetchLiveMarketData(): Promise<MarketData> {
  let cached: MarketData | null = null;
  try {
    const rawCache = localStorage.getItem(MARKET_CACHE_KEY);
    if (rawCache) {
      cached = JSON.parse(rawCache);
    }
  } catch {
    // ignore cache read error
  }

  let dolarQuote: MarketQuote = cached?.dolar || DEFAULT_MARKET_DATA.dolar;
  let ibovQuote: MarketQuote = cached?.ibovespa || DEFAULT_MARKET_DATA.ibovespa;

  // 1. Fetch Dólar (AwesomeAPI)
  try {
    const resDolar = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    if (resDolar.ok) {
      const data = await resDolar.json();
      if (data && data.USDBRL) {
        const bid = parseFloat(data.USDBRL.bid) || 0;
        const pct = parseFloat(data.USDBRL.pctChange) || 0;
        const varBid = parseFloat(data.USDBRL.varBid) || 0;

        dolarQuote = {
          symbol: 'USD/BRL',
          name: 'Dólar Comercial',
          price: bid,
          changePercent: pct,
          changeValue: varBid,
          formattedPrice: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 3
          }).format(bid),
          isPositive: pct >= 0,
          updatedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar cotação do Dólar:', err);
  }

  // 2. Fetch Ibovespa (Yahoo Finance / Brapi)
  try {
    const resIbov = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?interval=1d&range=1d');
    if (resIbov.ok) {
      const data = await resIbov.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const changePct = meta.regularMarketChangePercent ?? meta.fulldayChangePercent ?? 0;
        const changeVal = meta.fulldayChange ?? 0;

        ibovQuote = {
          symbol: 'IBOV (B3)',
          name: 'Bolsa de São Paulo',
          price: price,
          changePercent: changePct,
          changeValue: changeVal,
          formattedPrice: `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(price)} pts`,
          isPositive: changePct >= 0,
          updatedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar cotação do Ibovespa:', err);
  }

  const result: MarketData = {
    dolar: dolarQuote,
    ibovespa: ibovQuote,
    isLoading: false,
    lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };

  try {
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(result));
  } catch {
    // ignore cache write error
  }

  return result;
}
