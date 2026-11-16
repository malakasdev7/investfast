import {NextRequest} from 'next/server';
import {z} from 'zod';
import {authenticated,apiError,checkOrigin} from '@/lib/api';
import {marketTypes,periods} from '@/lib/market/types';
import {marketList,marketDetail,resolveAsset,savePrices} from '@/lib/market/service';
import {today} from '@/lib/domain';
import Decimal from 'decimal.js';
export const maxDuration=60;
const identity=z.object({type:z.enum(marketTypes),ticker:z.string().regex(/^[a-zA-Z0-9^._-]{1,100}$/)});
export async function GET(request:NextRequest){
  try{const ctx=await authenticated(),p=request.nextUrl.searchParams;
    if(p.has('ticker')){const value=identity.parse(Object.fromEntries(p));const period=z.enum(Object.keys(periods) as [keyof typeof periods,...(keyof typeof periods)[]]).parse(p.get('period')||'1mo');return Response.json(await marketDetail(ctx,value.type,value.ticker,period),{headers:{'Cache-Control':'private, no-store'}});}
    const type=z.enum([...marketTypes,'favoritos']).parse(p.get('type')||'acoes'),search=z.string().max(80).parse(p.get('search')||'');return Response.json(await marketList(ctx,type,search),{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){if(error instanceof z.ZodError)return Response.json({error:'Parâmetros de mercado inválidos.'},{status:422});return apiError(error);}
}
export async function POST(request:NextRequest){
  try{checkOrigin(request);const ctx=await authenticated();const body=await request.json();const key=identity.parse(body);const a=await resolveAsset(ctx,key.type,key.ticker);
    if(body.action==='favorite'){
      const enabled=z.boolean().parse(body.enabled);const r=enabled?await ctx.supabase.from('user_favorite_assets').upsert({user_id:ctx.user.id,asset_id:a.id},{onConflict:'user_id,asset_id'}):await ctx.supabase.from('user_favorite_assets').delete().eq('user_id',ctx.user.id).eq('asset_id',a.id);if(r.error)throw new Error('Não foi possível salvar o favorito.');return Response.json({ok:true});
    }
    if(body.action==='manual'){
      const price=z.string().regex(/^\d{1,15}(\.\d{1,12})?$/).parse(body.price);await savePrices(ctx,a,[{price,timestamp:new Date().toISOString(),source:'manual'}]);return Response.json({ok:true});
    }
    if(body.action==='prepare'){
      if(a.type==='indices')throw new Error('Índices são referenciais. Escolha um ETF ou outro ativo negociável para registrar uma operação.');
      let r=await ctx.supabase.from('assets').select('*').eq('user_id',ctx.user.id).eq('ticker',a.ticker).maybeSingle();if(r.error)throw new Error('Não foi possível consultar o ativo.');
      const q=await ctx.supabase.from('market_prices').select('price,timestamp').eq('user_id',ctx.user.id).eq('asset_id',a.id).order('timestamp',{ascending:false}).limit(1).maybeSingle();if(q.error)throw new Error('Não foi possível consultar o preço salvo.');
      if(r.data&&r.data.asset_class!==a.asset_class)throw new Error('Já existe um ativo com este ticker e outra classe. Revise o cadastro em Investimentos.');
      if(!r.data){r=await ctx.supabase.from('assets').upsert({ticker:a.ticker,name:a.name,asset_class:a.asset_class,status:'active'},{onConflict:'user_id,ticker',ignoreDuplicates:true}).select('*').maybeSingle();if(r.error)throw new Error('Não foi possível cadastrar o ativo.');
        if(!r.data)r=await ctx.supabase.from('assets').select('*').eq('user_id',ctx.user.id).eq('ticker',a.ticker).single();
        if(!r.data||r.error)throw new Error('Não foi possível preparar o ativo.');
        if(q.data){const price=await ctx.supabase.from('asset_prices').upsert({user_id:ctx.user.id,asset_id:r.data.id,price:q.data.price,price_date:q.data.timestamp.slice(0,10)},{onConflict:'user_id,asset_id,price_date',ignoreDuplicates:true});if(price.error)throw new Error('Ativo cadastrado; informe o preço no formulário de operação.');}
      }
      return Response.json({asset:r.data,defaults:{asset_id:r.data.id,type:'buy',quantity:'',unit_price:q.data?new Decimal(q.data.price).toDecimalPlaces(8).toFixed():'',fees:'0',operation_date:today()},quoteTime:q.data?.timestamp??null});
    }
    throw new Error('Ação de mercado inválida.');
  }catch(error){if(error instanceof z.ZodError)return Response.json({error:'Confira os campos informados.'},{status:422});return apiError(error);}
}
