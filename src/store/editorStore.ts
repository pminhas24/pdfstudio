import { create } from 'zustand'
import type { EditorState, ToolName, ShapeName } from '../types/pdf'

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  activeShape: 'rect',
  zoom: 1,
  currentPage: 1,
  selectedObjectId: null,
  selectedPages: [],
  setActiveTool: (tool: ToolName) => set({ activeTool: tool }),
  togglePageSelection: (page: number) =>
    set((s) => ({
      selectedPages: s.selectedPages.includes(page)
        ? s.selectedPages.filter((p) => p !== page)
        : [...s.selectedPages, page].sort((a, b) => a - b),
    })),
  clearPageSelection: () => set({ selectedPages: [] }),
  setActiveShape: (shape: ShapeName) => set({ activeShape: shape }),
  setZoom: (zoom: number) => set({ zoom: Math.min(4, Math.max(0.25, zoom)) }),
  setCurrentPage: (page: number) => set({ currentPage: page }),
  setSelectedObjectId: (id: string | null) => set({ selectedObjectId: id }),
}))
