// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useManifest } from './useManifest'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { ModelPreview } from '../components/ModelPreview'
import HomePage from '../pages/HomePage'

const pendingModel = { id: 'missing', displayName: 'Restaurant Regina', archetype: 'Restaurant', location: 'Regina', version: '2024', inputCount: 41, outputCount: 3, format: 'Keras HDF5', modelPath: 'restaurant/model.h5', outputNames: ['Heating', 'Cooling', 'Electricity'], status: 'unavailable', validationStatus: 'reconstructed-unverified', reasons: ['Missing scaler'] }

let root: Root | undefined
afterEach(async () => { if(root) await act(async()=>root?.unmount()); root=undefined; vi.unstubAllGlobals(); document.body.innerHTML='' })
function Probe() {
  const { id } = useParams()
  const state = useManifest(id!)
  if (state.status === 'preview') return createElement(ModelPreview, { entry: state.entry })
  return createElement('p', null, state.status === 'success' ? state.data.name : state.status === 'error' ? state.error : 'loading')
}
async function mount() {
  const node=document.createElement('div');document.body.append(node);root=createRoot(node)
  await act(async()=>{ root!.render(createElement(BrowserRouter,null,createElement(Routes,null,createElement(Route,{path:'/s/:id',element:createElement(Probe)})))) })
  await vi.waitFor(()=>expect(document.body.textContent).not.toBe('loading'))
}
describe('direct model URLs and refresh', () => {
  it('fetches the selected ID after remount and never requests Simple Office', async () => {
    window.history.replaceState({},'', '/s/school')
    const fetch=vi.fn(async(url:string)=>({ok:true,json:async()=>url.endsWith('catalog.json')?{models:[{id:'school',status:'available'}]}:{name:'Selected School','tf-models':[{path:'school/model.json',features:[{kind:'surrogate-input',feature:{id:'wall'},default:1,tf:{position:0,'training-mean':0,'training-scale':1}},{kind:'surrogate-output',feature:{id:'energy'},tf:{position:0,'training-mean':0,'training-scale':1}}]}]}}))
    vi.stubGlobal('fetch',fetch)
    await mount();expect(document.body.textContent).toBe('Selected School')
    await act(async()=>root!.unmount());root=undefined;document.body.innerHTML=''
    await mount();expect(document.body.textContent).toBe('Selected School')
    expect(fetch.mock.calls.some(([url])=>url.includes('20200224'))).toBe(false)
    expect(fetch.mock.calls.filter(([url])=>url.includes('/school/_manifest.json'))).toHaveLength(2)
  })
  it('opens pending models as details and retains selection after remount', async () => {
    window.history.replaceState({},'', '/s/missing')
    const fetch=vi.fn(async()=>({ok:true,json:async()=>({models:[pendingModel]})}))
    vi.stubGlobal('fetch',fetch);await mount()
    expect(document.body.textContent).toContain('Restaurant Regina')
    expect(document.body.textContent).toContain('Missing scaler');expect(fetch).toHaveBeenCalledTimes(1)
    await act(async()=>root!.unmount());root=undefined;document.body.innerHTML=''
    await mount()
    expect(document.body.textContent).toContain('Restaurant Regina')
    expect(document.body.textContent).toContain('predictions not connected yet')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('makes pending catalogue entries selectable', async () => {
    window.history.replaceState({},'', '/')
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({schemaVersion:1,models:[pendingModel]})})))
    const node=document.createElement('div');document.body.append(node);root=createRoot(node)
    await act(async()=>root!.render(createElement(BrowserRouter,null,createElement(HomePage))))
    await vi.waitFor(()=>expect(document.body.textContent).toContain('Restaurant Regina'))
    expect(document.querySelector('a[href="/s/missing"]')?.textContent).toBe('Open model')
    expect(document.querySelector('button[disabled]')).toBeNull()
    expect(document.body.textContent).toContain('Show the other 1 trained models')
  })
})
