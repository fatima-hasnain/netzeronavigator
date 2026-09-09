import { useCallback, useMemo } from 'react'
import {
  allSelectionKeys,
  collectSelectionOptions,
  getSelectionFromModel,
} from '../lib/tfModelSelection'
import { useSurrogateExploration } from '../hooks/useSurrogateExploration'
import { ModelStatusBar } from './ModelStatusBar'
import { ConfigurationBar } from './ConfigurationBar'
import { InputSlidersPane } from './InputSlidersPane'
import { OutputReadoutPane } from './OutputReadoutPane'
import type { Manifest, TfModel } from '../types/manifest'

export interface SurrogateExplorationProps {
  surrogateId: string
  manifest: Manifest
  activeTf: TfModel
  onConfigChange: (id: string, value: string) => void
  onOutputsChange?: (outputs: Record<string, number>) => void
  configError: string | null
}

/**
 * Two-pane exploration: configuration bar, tensor input sliders, tensor outputs
 * and derived metrics, with debounced inference via `useSurrogateExploration`.
 */
export function SurrogateExploration({
  surrogateId,
  manifest,
  activeTf,
  onConfigChange,
  onOutputsChange,
  configError,
}: SurrogateExplorationProps) {
  const tfModel = activeTf
  const exploration = useSurrogateExploration(
    surrogateId,
    tfModel,
    onOutputsChange,
  )
  const {
    modelJsonUrl,
    loadState,
    orderedIn,
    orderedOut,
    values,
    setValues,
    outputs,
    predictError,
    isPredicting,
    isOutputUpdating,
    inferenceWasSlow,
    resetToDefaults,
  } = exploration

  const onInputChange = useCallback(
    (id: string, value: number) => {
      setValues((prev) => ({ ...prev, [id]: value }))
    },
    [setValues],
  )

  const models = useMemo(
    () => (manifest['tf-models'] as TfModel[] | undefined) ?? [],
    [manifest],
  )
  const selectionKeys = useMemo(() => allSelectionKeys(models), [models])
  const activeSelection = useMemo(
    () => getSelectionFromModel(tfModel, selectionKeys),
    [tfModel, selectionKeys],
  )
  const selectionByOption = useMemo(() => {
    const o: Record<string, string[]> = {}
    for (const k of selectionKeys) {
      o[k] = collectSelectionOptions(models, k)
    }
    return o
  }, [models, selectionKeys])

  const selectionFeatures = useMemo(
    () => (tfModel.features ?? []).filter((f) => f.kind === 'exterior-selection'),
    [tfModel],
  )
  const noConfigAlternatives = useMemo(
    () => models.length <= 1,
    [models.length],
  )

  return (
    <section className="space-y-3">
      <ModelStatusBar
        modelJsonUrl={modelJsonUrl}
        loadState={loadState}
        tfModel={tfModel}
        variant="compact"
      />
      {loadState.status === 'ready' && (
        <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-[340px_minmax(0,1fr)] items-start">
          <div className="min-w-0 max-w-full">
            {selectionFeatures.length > 0 ? (
              <ConfigurationBar
                features={selectionFeatures}
                activeSelection={activeSelection}
                options={selectionByOption}
                onChange={onConfigChange}
                noAlternatives={noConfigAlternatives}
              />
            ) : null}
            {configError ? (
              <p className="dash-warning mb-2 text-sm" role="status">
                {configError}
              </p>
            ) : null}
            <InputSlidersPane
              features={orderedIn}
              values={values}
              onChange={onInputChange}
              onResetToDefaults={resetToDefaults}
            />
          </div>
          <OutputReadoutPane
            surrogateId={surrogateId}
            features={orderedOut}
            outputs={outputs}
            isOutputUpdating={isOutputUpdating}
            isPredicting={isPredicting}
            predictError={predictError}
            tfModel={tfModel}
            valueMap={values}
            inferenceWasSlow={inferenceWasSlow}
            model={loadState.model}
            inputFeatures={orderedIn}
          />
        </div>
      )}
    </section>
  )
}
