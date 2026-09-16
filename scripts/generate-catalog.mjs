import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as tf from '@tensorflow/tfjs'
import { buildTransferRecovery } from './transfer-recovery.mjs'

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicModels = path.join(app, 'public/models')
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
const inspectJson = p => { try { return read(p) } catch (e) { return { catalogueError: 'Invalid or missing model metadata: ' + e.message } } }
const write = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n') }
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]) : []
const pos = (t, kind) => (t.features || []).filter(f => f.tf && (kind === 'input' ? ['surrogate-input', 'exterior-context', 'exterior-selection'].includes(f.kind) : f.kind === 'surrogate-output')).sort((a,b) => a.tf.position-b.tf.position)
const idFor = p => 'model-' + crypto.createHash('sha256').update(p).digest('hex').slice(0, 16)
const pretty = s => s.replaceAll('_', ' ')
const city = s => pretty(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
function identity(p) {
  const name = path.basename(p).replace(/(?:\.epw)?_model(?:_\d+)?\.json$/, '')
  const match = name.match(/^(.*?)_CAN_([A-Z]{2})_(.*?)(?:_CWEC|_offset|\.\d)/)
  return { archetype: match ? pretty(match[1]) : 'Unknown archetype', location: match ? city(match[3]) + ', ' + match[2] : 'Unknown location' }
}
function dimensions(j) {
  const topology = j.modelTopology?.model_config || j.modelTopology || j
  const layers = topology.config?.layers || (Array.isArray(topology.config) ? topology.config : [])
  return { inputCount: layers[0]?.config?.batch_input_shape?.at(-1) ?? layers[0]?.config?.batch_shape?.at(-1) ?? null, outputCount: [...layers].reverse().find(l => l.config?.units)?.config.units ?? null }
}
export async function loadBundle(file) {
  const j = read(file)
  if (!j.weightsManifest || !j.modelTopology) throw Error('Unsupported Keras format: browser TFJS export required')
  const specs = [], buffers = []
  for (const group of j.weightsManifest) {
    specs.push(...group.weights)
    for (const shard of group.paths) {
      const target = path.resolve(path.dirname(file), shard)
      if (!target.startsWith(path.dirname(file) + path.sep)) throw Error('Invalid weight shard path')
      if (!fs.existsSync(target)) throw Error('Missing weight shard: ' + shard)
      buffers.push(fs.readFileSync(target))
    }
  }
  const bytes = Buffer.concat(buffers)
  return tf.loadLayersModel(tf.io.fromMemory({ modelTopology: j.modelTopology, weightSpecs: specs, weightData: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }))
}
function validateFeatures(t) {
  for (const kind of ['input', 'output']) {
    const features = pos(t, kind)
    if (!features.length) throw Error('Missing parameter metadata: ' + kind)
    features.forEach((f,i) => {
      if (!f.feature?.id || f.tf.position !== i) throw Error('Invalid parameter order: ' + kind)
      if (!Number.isFinite(f.tf['training-mean']) || !Number.isFinite(f.tf['training-scale']) || f.tf['training-scale'] <= 0) throw Error('Missing scaler: ' + f.feature.id)
      if (kind === 'input' && !Number.isFinite(Number(f.default))) throw Error('Missing parameter default: ' + f.feature.id)
    })
  }
}
// A linear output transform is accepted only when the archived physical samples
// are consistent with scaler statistics and paired predictions. This is a scale
// plausibility check, not a certification of predictive accuracy.
function recoverLinear(t, sourceDir) {
  const d = path.resolve(sourceDir, path.dirname(t.path), '..')
  const samplesPath = path.join(d, 'sample_outputs.json')
  const inputsPath = path.join(d, 'sample_inputs.json')
  if (!fs.existsSync(samplesPath) || !fs.existsSync(inputsPath)) throw Error('Pending output-scale validation: no paired sample data')
  const outputs = read(samplesPath), inputs = read(inputsPath)
  for (const f of pos(t, 'output')) {
    const col = outputs[0].indexOf(f['energy-plus-label'])
    if (col < 0) throw Error('Missing output sample column: ' + f.feature.id)
    const values = outputs.slice(1).map(row => row[col])
    const mean = values.reduce((a,b) => a+b,0)/values.length
    const variance = values.reduce((a,b) => a+(b-mean)**2,0)/values.length
    const shift = f.tf['training-mean']-mean
    if (Math.abs(shift) > Math.max(0.0001, Math.abs(mean)*0.3, f.tf['training-scale']) || Math.abs(variance-f.tf['training-variance']) > Math.max(1e-8,variance)) throw Error('Pending output-scale validation: scaler does not match physical sample statistics')
    f.tf['output-transform'] = 'linear'
    f.tf['output-offset'] = 0
  }
  return { inputs, outputs }
}
async function browserEntry(source, sourceKey, published = false) {
  const m = inspectJson(source), dir = path.dirname(source)
  const id = published ? path.basename(dir) : idFor(sourceKey)
  const entry = { id, displayName: m.name || [m['building-type'],m.location].filter(Boolean).join(' — ') || path.basename(dir), archetype: m['building-type'] || pretty((m['base-idf'] || 'Unknown archetype').replace(/^NZN_/, '').replace(/_v\d+\.idf$/, '')), location: m.location || (m['climate-file'] ? identity('Building_' + m['climate-file']).location : 'Unknown location'), version: m['schema-version'] || path.basename(dir).match(/^\d{8}/)?.[0] || 'Unspecified', source: sourceKey, modelPath: sourceKey, format: 'TensorFlow.js', inputCount: null, outputCount: null, outputNames: [], status: 'unavailable', validationStatus: 'unverified', reasons: [] }
  try {
    if (m.catalogueError) throw Error(m.catalogueError)
    if (!m['tf-models']?.length) throw Error('Missing parameter metadata: unsupported legacy manifest')
    if (m['tf-models'].some(t => !Array.isArray(t.features) || t.features.some(f => !f.feature?.id))) throw Error('Missing parameter metadata: feature IDs')
    entry.inputCount = pos(m['tf-models'][0], 'input').length
    entry.outputNames = pos(m['tf-models'][0], 'output').map(f => f['short-name'] || f.feature?.id || 'Unknown output')
    entry.outputCount = entry.outputNames.length
    if (/PILOT \/ APPROXIMATE|scaler.*not been recovered/i.test(m.description || '')) throw Error('Missing validated input scaler; Pending output-scale validation (approximate pilot)')
    for (const t of m['tf-models']) {
      validateFeatures(t)
      const paired = published ? null : recoverLinear(t,dir)
      const file = path.resolve(dir,t.path)
      if (!file.startsWith(dir + path.sep)) throw Error('Invalid model path')
      if (!fs.existsSync(file)) throw Error('Missing model file: ' + t.path)
      const model = await loadBundle(file)
      try {
        const ins = pos(t,'input'), outs = pos(t,'output')
        if (model.inputs[0].shape.at(-1) !== ins.length || model.outputs[0].shape.at(-1) !== outs.length) throw Error('Model dimensions do not match parameter metadata')
        const x = ins.map(f => (Number(f.default)-f.tf['training-mean'])/f.tf['training-scale'])
        const raw = tf.tidy(() => Array.from(model.predict(tf.tensor2d([x])).dataSync()))
        const values = raw.map((v,i) => { const f=outs[i]; const z=v*f.tf['training-scale']+f.tf['training-mean']; return f.tf['output-transform']==='linear' ? z-(f.tf['output-offset']||0) : Math.exp(z) })
        if (!values.every(Number.isFinite)) throw Error('Non-finite predictions: output-scale validation failed')
        if (paired) {
          const rows=paired.inputs.slice(1,33), targets=paired.outputs.slice(1,33)
          const matrix=rows.map(row=>ins.map(f=>{const c=paired.inputs[0].indexOf(f['energy-plus-label']); if(c<0)throw Error('Missing input sample column'); return (row[c]-f.tf['training-mean'])/f.tf['training-scale']}))
          const predictions=tf.tidy(()=>model.predict(tf.tensor2d(matrix)).arraySync())
          const errors=outs.map((f,i)=>{const col=paired.outputs[0].indexOf(f['energy-plus-label']);const mse=predictions.reduce((s,row,k)=>s+(row[i]*f.tf['training-scale']+f.tf['training-mean']-(f.tf['output-offset']||0)-targets[k][col])**2,0)/rows.length;return Math.sqrt(mse)/Math.max(1,Math.abs(f.tf['training-mean']),f.tf['training-scale'])})
          if (Math.max(...errors)>0.35) throw Error('Pending output-scale validation: paired-sample prediction check failed')
          entry.validation = { samples: rows.length, maxNormalizedRmse: Math.max(...errors), method: 'Physical sample scale plausibility and paired predictions; not an accuracy certification' }
        }
        entry.defaultPrediction = values
      } finally { model.dispose() }
    }
    m.id=id; m.name=entry.displayName
    if (!published) {
      for (const t of m['tf-models']) {
        const file=path.join(dir,t.path), j=read(file), dest=path.join(publicModels,id,t.path)
        fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest)
        for(const g of j.weightsManifest)for(const shard of g.paths){const target=path.join(path.dirname(dest),shard);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(path.dirname(file),shard),target)}
      }
      write(path.join(publicModels,id,'_manifest.json'),m)
    }
    entry.status='available'; entry.validationStatus=published?'runtime-checked':'sample-checked'; entry.modelPath=`/models/${id}/${m['tf-models'][0].path}`
  } catch(e) { entry.reasons.push(e.message) }
  return entry
}
async function main() {
  const args=process.argv.slice(2), option=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1]}
  const repo=option('--repository'), legacy=option('--legacy'), entries=[]
  if (!repo || !legacy) throw Error('Pass --repository <NZN pipeline checkout> and --legacy <core_interface> to avoid silently omitting model sources')
  if (!fs.existsSync(repo) || !fs.existsSync(legacy)) throw Error('Model source directory does not exist')
  // Generated exports are re-derived from their original sources, never counted twice.
  for(const d of fs.readdirSync(publicModels,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.name.startsWith('model-'))){const p=path.join(publicModels,d.name,'_manifest.json');if(fs.existsSync(p))entries.push(await browserEntry(p,`public/models/${d.name}/_manifest.json`,true))}
  if(legacy)for(const version of ['models','models_v2','models_v3'])for(const p of walk(path.join(legacy,version)).filter(p=>path.basename(p)==='_manifest.json'&&!/template/i.test(p)))entries.push(await browserEntry(p,`core_interface/${path.relative(legacy,p).replaceAll('\\','/')}`))
  if(repo) {
    const git=(...a)=>execFileSync('git',['-C',repo,...a],{maxBuffer:30e6}).toString()
    const ref=option('--ref') || 'origin/dev-main'
    const commit=git('rev-parse',ref).trim()
    const recovery=buildTransferRecovery(git,commit)
    const recoveryPath=`/models/_recovery/${recovery.id}.json`
    write(path.join(publicModels,'_recovery',`${recovery.id}.json`),recovery)
    const paths=git('ls-tree','-r','--name-only',ref,'NZN_Archetype_Surrogate_Models').trim().split('\n'), files=new Set(paths)
    for(const p of paths.filter(p=>p.endsWith('/model.json'))) {
      const source=`${ref}:${p}`, parent=path.basename(path.dirname(p)), ident=identity(parent), j=JSON.parse(git('show',`${ref}:${p}`))
      const shape=dimensions(j)
      const compatible=shape.inputCount===recovery.tensorInputCount&&shape.outputCount===recovery.outputCount&&parent.match(/_2024_\d+_\d+$/)
      entries.push({id:idFor(p),displayName:pretty(parent),...ident,version:parent.match(/(\d{4}_\d{1,2}_\d{1,2})$/)?.[1]||'Unspecified',source,sourceCommit:commit,modelPath:source.replace(/\.json$/,'.h5'),format:'Keras HDF5',...shape,outputNames:compatible?recovery.outputNames:[],status:'unavailable',validationStatus:compatible?'reconstructed-unverified':'unverified',
        ...(compatible?{recovery:{profilePath:recoveryPath,inputOrderSource:recovery.provenance.inputOrder,totalSamples:recovery.totalSamples,rawInputCount:recovery.rawInputCount,counts:recovery.recoveryCounts,outputOrderStatus:recovery.outputOrderStatus,summary:'Author-supplied 41-input order and output transform; estimates use four sampling bins. PV units and exact preprocessing remain unresolved.'}}:{}),
        reasons:[...(!files.has(p.replace(/\.json$/,'.h5'))?['Missing model file']:[]),...(compatible?['Input scaler reconstructed approximately; exact fitted scaler unverified','PV capacity units conflict: Wp/m2 of roof versus total Wp','Output column order and units need confirmation','Keras-to-TensorFlow.js export and parity checks required']:['Shared recovery profile does not match model dimensions or generation; separate metadata required'])]})
    }
    const roots=['Surrogate Development/Universal/Projects','Surrogate Development/Universal/pulled_data']
    for(const root of roots)for(const p of walk(path.join(repo,root)).filter(p=>/_model(?:_\d+)?\.json$/.test(p))) {
      const relative=path.relative(repo,p).replaceAll('\\','/'), stem=path.basename(p), ident=identity(p), j=inspectJson(p)
      const metadata=path.join(path.dirname(p),'../metadata',stem.replace(/_model(_\d+)?\.json$/,'_metadata$1.p'))
      entries.push({id:idFor(relative),displayName:pretty(stem.replace(/\.json$/,''))+' — '+relative.split('/surrogate_runs/')[1]?.split('/')[0],...ident,version:stem.match(/_model_(\d+)/)?.[1]||'Unspecified',source:relative,modelPath:relative.replace(/\.json$/,'.h5'),format:'Keras HDF5',...dimensions(j),outputNames:[],status:'unavailable',validationStatus:'unverified',reasons:[...(j.catalogueError?[j.catalogueError]:[]),...(!fs.existsSync(p.replace(/\.json$/,'.h5'))?['Missing model file']:[]),...(fs.existsSync(metadata)?['Scaler and parameter metadata require Python pickle export']:['Missing scaler','Missing parameter metadata']),'Unsupported Keras format: browser TFJS export required','Pending output-scale validation']})
    }
  }
  entries.sort((a,b)=>Number(b.status==='available')-Number(a.status==='available')||a.displayName.localeCompare(b.displayName)||a.id.localeCompare(b.id))
  const catalog={schemaVersion:1,generatedAt:new Date().toISOString(),models:entries}
  write(path.join(publicModels,'catalog.json'),catalog)
  console.log(JSON.stringify({discovered:entries.length,available:entries.filter(e=>e.status==='available').length,reasons:entries.reduce((r,e)=>{for(const reason of e.reasons)r[reason]=(r[reason]||0)+1;return r},{})},null,2))
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main()
