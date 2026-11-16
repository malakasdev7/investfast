import type { Snapshot } from '@/lib/domain';
import { insights } from '@/lib/calculations/finance';
export interface AnalysisProvider { analyze(data:Snapshot,start:string,end:string):Promise<ReturnType<typeof insights>>; }
/** Motor local sem custo de API; pode ser substituído por um provedor explicitamente configurado. */
export class RulesAnalysisProvider implements AnalysisProvider {
  async analyze(data:Snapshot,start:string,end:string){return insights(data,start,end);}
}
