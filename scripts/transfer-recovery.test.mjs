import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { evidence, mixtureScaler, numericExpression, parameterDefinitions, forwardOutput, inverseOutput } from './transfer-recovery.mjs'

test('preserves the supplied input order and sampling counts',()=>{
  assert.equal(evidence.bins.reduce((sum,b)=>sum+b.count,0),7760)
  assert.equal(evidence.tensorInputNames.length,41)
  assert.equal(evidence.tensorInputNames[19],'Wall Insulation (R-Value)')
  assert.equal(evidence.tensorInputNames[34],'PV Capacity (Wp/m2(roof))')
  assert.deepEqual(evidence.tensorInputNames.slice(37),['Demand Controlled Ventilation_None','Demand Controlled Ventilation_OccupancySchedule','Outdoor Air Economizer_DifferentialEnthalpy','Outdoor Air Economizer_NoEconomizer'])
})
test('mixture variance includes between-bin differences',()=>{
  const estimate=mixtureScaler([{min:0,max:2,count:1},{min:10,max:12,count:3}])
  assert.equal(estimate.mean,8.5)
  assert.ok(Math.abs(estimate.variance-229/12)<1e-12)
  assert.ok(estimate.scale>4)
  assert.throws(()=>mixtureScaler([{min:1,max:0,count:1}]))
  assert.throws(()=>mixtureScaler([]))
})
test('reads numeric Python bounds without evaluating executable code',()=>{
  assert.equal(numericExpression('1.3 *10**(-6)'),1.3e-6)
  assert.equal(numericExpression('-2**2'),-4)
  assert.equal(numericExpression('(.2 + .3) / 2'),0.25)
  assert.throws(()=>numericExpression('__import__("os")'))
  const source=`def loads_parameters():
    '''parameters.append(Parameter(name='disabled', value_descriptor=RangeParameter(min_val=0,max_val=9)))'''
    parameters.append(Parameter(name='Hot water', value_descriptor=RangeParameter(min_val=0.2 *10**(-6),max_val=1.3 *10**(-6))))
    parameters.append(Parameter(name='Switch', value_descriptors=CategoryParameter(['None','On'])))
def other_parameters():
    parameters.append(Parameter(name='Other', value_descriptor=RangeParameter(min_val=0,max_val=1)))`
  assert.deepEqual(parameterDefinitions(source,'loads'),[{name:'Hot water',min:2e-7,max:1.3e-6},{name:'Switch',categories:['None','On']}])
})
test('uses positive seven when reversing the negative-seven forward shift',()=>{
  assert.ok(inverseOutput(0)>50)
  for(const y of [0.001,1,10,100,500])assert.ok(Math.abs(inverseOutput(forwardOutput(y))/y-1)<1e-10)
  assert.throws(()=>inverseOutput(-100))
  const pilot=JSON.parse(fs.readFileSync(new URL('../public/models/280set-medoff-calgary-pilot/_manifest.json',import.meta.url),'utf8'))
  for(const model of pilot['tf-models'])for(const f of model.features.filter(f=>f.kind==='surrogate-output'))assert.equal(f.tf['training-mean'],7)
})
test('all 280 transfer records reference the recovery profile but stay disabled',()=>{
  const catalogue=JSON.parse(fs.readFileSync(new URL('../public/models/catalog.json',import.meta.url),'utf8'))
  const records=catalogue.models.filter(m=>m.source?.includes('NZN_Archetype_Surrogate_Models/NZN_transfer/'))
  assert.equal(records.length,280)
  assert.equal(new Set(records.map(m=>m.archetype)).size,14)
  assert.equal(new Set(records.map(m=>m.location)).size,20)
  for(const m of records){assert.equal(m.inputCount,41);assert.equal(m.outputCount,3);assert.equal(m.outputNames.length,3);assert.equal(m.status,'unavailable');assert.equal(m.validationStatus,'reconstructed-unverified');assert.equal(m.recovery.counts.continuousEstimates,36);assert.equal(m.recovery.counts.categoricalConditionalEstimates,4);assert.equal(m.recovery.counts.blockedInputs,1);assert.ok(m.reasons.some(r=>r.includes('PV capacity')))}
  const profile=JSON.parse(fs.readFileSync(new URL(`../public/models/_recovery/${evidence.id}.json`,import.meta.url),'utf8'))
  assert.equal(profile.tensorInputs[34].scalerEstimate,null)
  assert.equal(profile.tensorInputs[33].candidateBounds.max,3e-6)
  assert.equal(profile.sourceFiles.length,24)
  assert.equal(profile.outputTransform.dashboardTrainingMean,7)
})
