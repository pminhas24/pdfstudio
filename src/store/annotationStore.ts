import { create } from 'zustand'
import type { AnnotationState } from '../types/pdf'

const MAX_UNDO = 50

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  perPageJson: {},
  undoStack: {},
  redoStack: {},

  savePageJson: (page: number, json: string) => {
    const { perPageJson, undoStack } = get()
    const previous = perPageJson[page]
    const stack = undoStack[page] ?? []
    const newStack = previous ? [...stack, previous].slice(-MAX_UNDO) : stack
    set({
      perPageJson: { ...perPageJson, [page]: json },
      undoStack: { ...undoStack, [page]: newStack },
      redoStack: { ...get().redoStack, [page]: [] },
    })
  },

  undo: (page: number) => {
    const { perPageJson, undoStack, redoStack } = get()
    const stack = undoStack[page] ?? []
    if (stack.length === 0) return undefined
    const previous = stack[stack.length - 1]
    const current = perPageJson[page]
    const rStack = redoStack[page] ?? []
    set({
      perPageJson: { ...perPageJson, [page]: previous },
      undoStack: { ...undoStack, [page]: stack.slice(0, -1) },
      redoStack: { ...redoStack, [page]: current ? [...rStack, current] : rStack },
    })
    return previous
  },

  redo: (page: number) => {
    const { perPageJson, undoStack, redoStack } = get()
    const rStack = redoStack[page] ?? []
    if (rStack.length === 0) return undefined
    const next = rStack[rStack.length - 1]
    const current = perPageJson[page]
    const stack = undoStack[page] ?? []
    set({
      perPageJson: { ...perPageJson, [page]: next },
      undoStack: { ...undoStack, [page]: current ? [...stack, current] : stack },
      redoStack: { ...redoStack, [page]: rStack.slice(0, -1) },
    })
    return next
  },

  clearPage: (page: number) => {
    const { perPageJson, undoStack, redoStack } = get()
    const { [page]: _p, ...restJson } = perPageJson
    const { [page]: _u, ...restUndo } = undoStack
    const { [page]: _r, ...restRedo } = redoStack
    set({ perPageJson: restJson, undoStack: restUndo, redoStack: restRedo })
  },
}))
