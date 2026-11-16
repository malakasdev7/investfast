import test from 'node:test';
import assert from 'node:assert/strict';
import {entitySchema} from '../src/lib/validations/entities';
const base={ticker:'CDI-TEST',name:'Caixinha',asset_class:'cdi',institution:'Banco',subclass:'',notes:'',status:'active'};
test('CDI requires an explicit valid percentage while existing assets remain compatible',()=>{
 const schema=entitySchema('assets');
 assert.equal(schema.safeParse({...base,cdi_percent:'100'}).success,true);
 for(const rate of ['', '0','-1','1001','abc'])assert.equal(schema.safeParse({...base,cdi_percent:rate}).success,false);
 assert.equal(schema.safeParse({...base,asset_class:'stock'}).success,true);
});
