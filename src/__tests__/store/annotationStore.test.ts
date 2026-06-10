import { describe, it, expect, beforeEach } from 'vitest'
import { useAnnotationStore } from '../../store/annotationStore'

const JSON_A = '{"objects":[],"version":"6.0.0"}'
const JSON_B = '{"objects":[{"type":"rect"}],"version":"6.0.0"}'

describe('annotationStore', () => {
  beforeEach(() => {
    useAnnotationStore.setState({ perPageJson: {}, undoStack: {}, redoStack: {} })
  })

  it('saves page json', () => {
    useAnnotationStore.getState().savePageJson(1, JSON_A)
    expect(useAnnotationStore.getState().perPageJson[1]).toBe(JSON_A)
  })

  it('undo restores previous json and pushes to redoStack', () => {
    useAnnotationStore.getState().savePageJson(1, JSON_A)
    useAnnotationStore.getState().savePageJson(1, JSON_B)
    const restored = useAnnotationStore.getState().undo(1)
    expect(restored).toBe(JSON_A)
    expect(useAnnotationStore.getState().perPageJson[1]).toBe(JSON_A)
    expect(useAnnotationStore.getState().redoStack[1]).toHaveLength(1)
  })

  it('redo restores next json', () => {
    useAnnotationStore.getState().savePageJson(1, JSON_A)
    useAnnotationStore.getState().savePageJson(1, JSON_B)
    useAnnotationStore.getState().undo(1)
    const restored = useAnnotationStore.getState().redo(1)
    expect(restored).toBe(JSON_B)
  })

  it('returns undefined when undo stack is empty', () => {
    const result = useAnnotationStore.getState().undo(1)
    expect(result).toBeUndefined()
  })

  it('saving clears the redo stack', () => {
    useAnnotationStore.getState().savePageJson(1, JSON_A)
    useAnnotationStore.getState().savePageJson(1, JSON_B)
    useAnnotationStore.getState().undo(1)
    useAnnotationStore.getState().savePageJson(1, JSON_B)
    expect(useAnnotationStore.getState().redoStack[1]).toHaveLength(0)
  })

  it('caps undo stack at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      useAnnotationStore.getState().savePageJson(1, `{"v":${i}}`)
    }
    expect(useAnnotationStore.getState().undoStack[1].length).toBeLessThanOrEqual(50)
  })

  it('clearPage removes all state for a page', () => {
    useAnnotationStore.getState().savePageJson(1, JSON_A)
    useAnnotationStore.getState().clearPage(1)
    expect(useAnnotationStore.getState().perPageJson[1]).toBeUndefined()
    expect(useAnnotationStore.getState().undoStack[1]).toBeUndefined()
  })
})
