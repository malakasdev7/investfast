import {notFound} from 'next/navigation';
import {MarketDetail} from '@/components/market/market';
import {marketTypes,type MarketType} from '@/lib/market/types';
export default async function Page({params}:{params:Promise<{type:string;ticker:string}>}){const {type,ticker}=await params;if(!marketTypes.includes(type as MarketType)||!/^[a-zA-Z0-9^._-]{1,100}$/.test(ticker))notFound();return <MarketDetail type={type as MarketType} ticker={ticker}/>;}
