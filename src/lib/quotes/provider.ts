import { z } from 'zod';

export const quoteSchema=z.object({
  ticker:z.string().min(1),
  price:z.string().regex(/^\d{1,12}(\.\d{1,8})?$/),
  date:z.iso.date(),
  currency:z.literal('BRL'),
  source:z.string().min(1),
});
export type Quote=z.infer<typeof quoteSchema>;
export interface QuoteProvider { getQuote(ticker:string):Promise<Quote|null>; }

/** Integrações futuras devem implementar este contrato e salvar por usuário em asset_prices. */
export class ManualQuoteProvider implements QuoteProvider {
  constructor(private readonly quotes:ReadonlyMap<string,Quote>){}
  async getQuote(ticker:string){
    const quote=this.quotes.get(ticker);
    return quote?quoteSchema.parse(quote):null;
  }
}
