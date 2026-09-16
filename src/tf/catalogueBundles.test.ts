/// <reference types="node" />
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { runSurrogatePredict } from './runSurrogatePredict'
import { tensorInputFeatures, tensorOutputFeatures } from '../lib/tfFeatureSelection'
import { initialTensorValueMap } from './initialTensorValues'
import type { Manifest } from '../types/manifest'

const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'))
const catalog=read('public/models/catalog.json') as {models:{id:string;status:string}[]}
describe('every available catalogue bundle',()=>{
  for(const entry of catalog.models.filter(e=>e.status==='available'))it('loads and predicts '+entry.id,async()=>{
    const manifest=read(`public/models/${entry.id}/_manifest.json`) as Manifest
    for(const metadata of manifest['tf-models']){
      const file=path.join('public/models',entry.id,metadata.path), bundle=read(file)
      const specs: tf.io.WeightsManifestEntry[]=[], buffers:Buffer[]=[]
      for(const group of bundle.weightsManifest){specs.push(...group.weights);for(const p of group.paths)buffers.push(readFileSync(path.join(path.dirname(file),p)))}
      const bytes=Buffer.concat(buffers)
      const model=await tf.loadLayersModel(tf.io.fromMemory({modelTopology:bundle.modelTopology,weightSpecs:specs,weightData:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}))
      try {
        const inputs=tensorInputFeatures(metadata),outputs=tensorOutputFeatures(metadata),values=initialTensorValueMap(inputs)
        const baseline=runSurrogatePredict(model,inputs,outputs,values)
        expect(Object.values(baseline).every(Number.isFinite)).toBe(true)
        const changed={...values};for(const f of inputs)changed[f.feature.id]=f.tf?.['training-max']??values[f.feature.id]*1.1
        const alternate=runSurrogatePredict(model,inputs,outputs,changed)
        expect(Object.values(alternate).every(Number.isFinite)).toBe(true)
        expect(Object.keys(baseline).some(id=>Math.abs(baseline[id]-alternate[id])>1e-6)).toBe(true)
      } finally {model.dispose()}
    }
  },30000)
})
