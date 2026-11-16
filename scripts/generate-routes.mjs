import { mkdirSync,writeFileSync } from 'node:fs';
const routes={contas:'accounts',categorias:'categories',orcamentos:'budgets',transacoes:'transactions',recorrencias:'recurring_transactions',carteiras:'portfolios',investimentos:'assets',operacoes:'investment_transactions',cotacoes:'asset_prices',metas:'goals',aportes:'goal_contributions'};
for(const [route,entity]of Object.entries(routes)){
  const dir=`src/app/(dashboard)/${route}`;mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/page.tsx`,`import { RecordPage } from '@/components/finances/record-page';\nexport default function Page(){return <RecordPage entity="${entity}"/>;}\n`);
}
for(const [route,component,module,props]of [['dashboard','Dashboard','dashboard',''],['relatorios','Reports','reports',''],['analises','Reports','reports',' analysis'],['configuracoes','SettingsPage','settings','']]){
  const dir=`src/app/(dashboard)/${route}`;mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/page.tsx`,`import { ${component} } from '@/components/finances/${module}';\nexport default function Page(){return <${component}${props}/>;}\n`);
}
console.log('Rotas criadas.');
