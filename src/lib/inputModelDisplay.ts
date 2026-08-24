import { M3S_TO_L_PER_S, M3S_M2_TO_L } from './volumeConversion'

const DHW = 'DHW'
const INFIL = 'INFILTRATION_RATE'

/** True if model stores m³/s but we display L/s. */
export function isFlowPerM2(id: string): boolean {
  return id === INFIL
}

export function isDhwId(id: string): boolean {
  return id === DHW
}

/** Model value (m³/s) → display value (L/s or L/(s·m²)). */
export function modelToDisplayFlow(
  id: string,
  modelValue: number,
): number {
  if (isDhwId(id)) {
    return modelValue * M3S_TO_L_PER_S
  }
  if (isFlowPerM2(id)) {
    return modelValue * M3S_M2_TO_L
  }
  return modelValue
}

/** Display (L/s or L/(s·m²)) → model m³/s or (m³/s)/m². */
export function displayToModelFlow(id: string, displayValue: number): number {
  if (isDhwId(id)) {
    return displayValue / M3S_TO_L_PER_S
  }
  if (isFlowPerM2(id)) {
    return displayValue / M3S_M2_TO_L
  }
  return displayValue
}

export function displayUnitForFlowInput(id: string, baseUnit: string | undefined): string {
  if (isDhwId(id)) {
    return 'L/s'
  }
  if (isFlowPerM2(id)) {
    return 'L/(s·m²)'
  }
  return baseUnit ? baseUnit : ''
}

/** Step in model units (m³/s) for range/number inputs for 3 dp in L/s or L/(s·m²). */
export function modelStepForFlowInput(id: string, displayDecimalPlaces: number): number {
  if (!isDhwId(id) && !isFlowPerM2(id)) {
    return Number.NaN
  }
  return Math.pow(10, -displayDecimalPlaces) / M3S_TO_L_PER_S
}
