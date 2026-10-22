import test from 'node:test';
import assert from 'node:assert/strict';
import { readiness, nextState, validateFile } from '../src/domain.js';
const valid = () => ({ status:'draft', company:'ООО Маяк', inn:'0000000000', amount:1000000, months:12, purpose:'Закупка', revenue:800000, expenses:500000, confirmed:true, documents:[{kind:'statement',state:'received'}] });
test('readiness rejects missing and invalid data', () => {
  assert.ok(readiness(valid()).every(x=>x.ok));
  for(const change of [{inn:'1'}, {amount:0}, {months:1.5}, {confirmed:false}, {documents:[]}, {documents:[{kind:'statement',state:'invalid'}]}]) {
    assert.ok(readiness({...valid(),...change}).some(x=>!x.ok));
    assert.throws(()=>nextState({...valid(),...change},'submit'));
  }
});
test('state machine requires completed request and accepted current offer', () => {
  assert.equal(nextState(valid(),'submit'),'submitted');
  assert.throws(()=>nextState({...valid(),status:'needs_info',request:{resolved:false}},'submit'));
  assert.throws(()=>nextState({...valid(),status:'reviewing'},'issue'));
  assert.throws(()=>nextState({...valid(),status:'offered',offer:{version:2}},'accept',{offerVersion:1}));
  assert.equal(nextState({...valid(),status:'offered',offer:{version:2}},'accept',{offerVersion:2}),'accepted');
});
test('reasons and proposed terms are validated', () => {
  assert.throws(()=>nextState({...valid(),status:'reviewing'},'decline',{reason:' '}));
  assert.throws(()=>nextState({...valid(),status:'reviewing'},'offer',{amount:2000000,months:12}));
  assert.throws(()=>nextState({...valid(),status:'reviewing'},'offer',{amount:700000,months:0}));
});
test('file size and type validation', () => {
  assert.doesNotThrow(()=>validateFile({name:'file.pdf',type:'application/pdf',size:10}));
  for(const f of [{name:'a.exe',type:'application/pdf',size:10},{name:'a.pdf',type:'application/pdf',size:0},{name:'a.pdf',type:'application/pdf',size:11*1024*1024}])assert.throws(()=>validateFile(f));
});
