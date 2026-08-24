import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXPLORATION_DEBOUNCE_MS } from './useSurrogateExploration'

describe('debounced one-shot (pattern used by useSurrogateExploration)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires only once for rapid triggers with the last value', () => {
    const fn = vi.fn()
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = (n: number) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fn(n)
        timer = null
      }, EXPLORATION_DEBOUNCE_MS)
    }

    schedule(1)
    schedule(2)
    schedule(3)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(EXPLORATION_DEBOUNCE_MS)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(3)
  })
})
