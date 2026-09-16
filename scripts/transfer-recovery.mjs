import fs from 'node:fs'
import crypto from 'node:crypto'

export const evidence = JSON.parse(fs.readFileSync(new URL('./transfer-evidence.json', import.meta.url), 'utf8'))

/** Evaluate numeric Python literals/arithmetic only, without executing source code. */
export function numericExpression(source) {
  const text=source.replace(/\s/g,''), tokens=text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|\*\*|[()+*/-]/g)||[]
  if(tokens.join('')!==text)throw Error('Unsupported numeric expression: '+source)
  let index=0
  function atom(){const token=tokens[index++];if(token==='('){const value=sum();if(tokens[index++]!==')')throw Error('Unbalanced expression');return value}if(!token||!/^\d|^\./.test(token))throw Error('Expected numeric literal');return Number(token)}
  function power(){const value=atom();if(tokens[index]==='**'){index++;return value**unary()}return value}
  function unary(){if(tokens[index]==='-'){index++;return -unary()}if(tokens[index]==='+'){index++;return unary()}return power()}
  function product(){let value=unary();while(['*','/'].includes(tokens[index])){const op=tokens[index++],next=unary();value=op==='*'?value*next:value/next}return value}
  function sum(){let value=product();while(['+','-'].includes(tokens[index])){const op=tokens[index++],next=product();value=op==='+'?value+next:value-next}return value}
  const result=sum();if(index!==tokens.length||!Number.isFinite(result))throw Error('Invalid numeric expression: '+source);return result
}
function callBody(text, name) {
  const start=text.indexOf(name+'(')
  if(start<0)return null
  let depth=1,end=start+name.length+1
  for(;end<text.length;end++){if(text[end]==='(')depth++;if(text[end]===')'&&!--depth)return text.slice(start+name.length+1,end)}
  throw Error('Unclosed '+name)
}
export function parameterDefinitions(source,module) {
  // Static inspection only: remove disabled triple-quoted blocks and comments.
  let code=source.replace(/'''[\s\S]*?'''|"""[\s\S]*?"""/g,'').replace(/^\s*#.*$/gm,'')
  const start=code.indexOf('def '+module+'_parameters(')
  if(start<0)throw Error('Missing parameter function: '+module)
  const next=code.indexOf('\ndef ',start+4);code=code.slice(start,next<0?undefined:next)
  return code.split('parameters.append(Parameter(').slice(1).map(block=>{
    const name=block.match(/^name\s*=\s*['"]([^'"]+)/)?.[1]
    if(!name)throw Error('Unrecognized parameter definition')
    const range=callBody(block,'RangeParameter')
    if(range!==null){const m=range.match(/^\s*min_val\s*=\s*(.*),\s*max_val\s*=\s*(.*)$/s);if(!m)throw Error('Unrecognized range for '+name);const min=numericExpression(m[1]),max=numericExpression(m[2]);if(max<min)throw Error('Inverted range: '+name);return {name,min,max}}
    const category=callBody(block,'CategoryParameter')
    if(category!==null)return {name,categories:[...category.matchAll(/['"]([^'"]+)['"]/g)].map(m=>m[1])}
    throw Error('No range or categories: '+name)
  })
}
export function mixtureScaler(bins) {
  const total=bins.reduce((sum,b)=>sum+b.count,0)
  if(!bins.length||total<=0||bins.some(b=>b.count<0||![b.min,b.max,b.count].every(Number.isFinite)||b.max<b.min))throw Error('Invalid mixture bins')
  const mean=bins.reduce((sum,b)=>sum+b.count/total*(b.min+b.max)/2,0)
  const variance=bins.reduce((sum,b)=>sum+b.count/total*((b.max-b.min)**2/12+((b.min+b.max)/2-mean)**2),0)
  return {mean,variance,scale:variance===0?1:Math.sqrt(variance)}
}
export function forwardOutput(y) {
  if(!Number.isFinite(y)||y<0)throw Error('Invalid physical output')
  return ((y**0.17-1)/0.17-7)/1.7
}
export function inverseOutput(z) {
  const base=1+0.17*(1.7*z+7)
  if(!Number.isFinite(z)||base<0)throw Error('Output outside inverse Box-Cox domain')
  return base**(1/0.17)
}
export function buildTransferRecovery(git, commit) {
  const modules=['architectural','comfort','envelope','lighting','loads','renewable']
  const sources=[],definitions=new Map()
  for(const bin of evidence.bins){const parameters=[];for(const module of modules){const file=`Surrogate Development/Universal/parameter_set/${bin.directory}${module}_parameters.py`,source=git('show',`${commit}:${file}`);sources.push({path:file,sha256:crypto.createHash('sha256').update(source).digest('hex')});parameters.push(...parameterDefinitions(source,module))}if(parameters.length!==39)throw Error(`${bin.name}: expected 39 raw inputs, found ${parameters.length}`);definitions.set(bin.name,new Map(parameters.map(p=>[p.name,p])))}
  const tensorInputs=evidence.tensorInputNames.map((name,position)=>{
    const category=evidence.categoricalGroups.find(g=>g.positions.includes(position))
    const pvConflict=name==='PV Capacity (Wp/m2(roof))'
    const sourceName=category?.name||(pvConflict?'PV Capacity (Wp)':name)
    const bins=evidence.bins.map(bin=>{const parameter=definitions.get(bin.name).get(sourceName);if(!parameter)throw Error(`Missing ${sourceName} in ${bin.name}`);return {...bin,...parameter}})
    if(category){if(bins.some(b=>category.categories.some(c=>!b.categories?.includes(c))||b.categories.length!==category.categories.length))throw Error('Category mismatch: '+name);return {position,name,kind:'onehot',group:category.name,category:category.categories[category.positions.indexOf(position)],scalerEstimate:{mean:0.5,scale:0.5,variance:0.25},estimateStatus:'Conditional on equally likely categories in every bin; actual frequencies not recovered',candidateBins:bins}}
    if(pvConflict)return {position,name,kind:'continuous',candidateBins:bins,scalerEstimate:null,estimateStatus:'Blocked: author table uses Wp/m2(roof), repository uses total Wp; no unit substitution applied'}
    return {position,name,kind:'continuous',candidateBounds:{min:Math.min(...bins.map(b=>b.min)),max:Math.max(...bins.map(b=>b.max))},candidateBins:bins,scalerEstimate:mixtureScaler(bins),estimateStatus:'Approximate population moments, conditional on historical bin definitions and uniform within-bin sampling'}
  })
  return {...evidence,sourceCommit:commit,sourceFiles:sources,totalSamples:evidence.bins.reduce((sum,b)=>sum+b.count,0),rawInputCount:39,tensorInputCount:41,outputCount:3,status:'reconstructed-unverified',tensorInputs,
    assumptions:['ALL is mapped to the root parameter_set directory because its wider bounds match the conversation; the screenshot does not identify a commit.','Bin counts are applied to the shared author-described sampling design, not claimed as the actual retained training rows for every model.','Train/test split, failed simulations and finite-sample variation can change fitted scalers.','Categorical estimates assume 50/50 sampling in each bin.'],
    unresolved:['PV input position 34: Wp/m2(roof) versus total Wp; historical revision must be established.','Exact fitted input scalers or numerical parity references are not recovered.','Output names are recovered; exact output column order and physical units require corroboration.','Keras models require browser conversion and numerical parity tests.'],
    recoveryCounts:{continuousEstimates:tensorInputs.filter(f=>f.kind==='continuous'&&f.scalerEstimate).length,categoricalConditionalEstimates:tensorInputs.filter(f=>f.kind==='onehot').length,blockedInputs:tensorInputs.filter(f=>!f.scalerEstimate).length}}
}
