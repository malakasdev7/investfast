import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'InvestFast',short_name:'InvestFast',description:'Finanças e investimentos conectados ao seu futuro.',start_url:'/dashboard',display:'standalone',background_color:'#090d16',theme_color:'#090d16',lang:'pt-BR',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};}
