import { create } from 'zustand'
import type { EditorState, ToolName, ShapeName, InteractionMode } from '../types/pdf'

export const useEditorStore = create<EditorState>((set) => ({
  interactionMode: 'annotate',
  activeTool: 'select',
  activeShape: 'rect',
  drawColor: '#0284c7',
  drawWidth: 3,
  drawOpacity: 1,
  zoom: 1,
  currentPage: 1,
  selectedObjectId: null,
  selectedPages: [],
  setInteractionMode: (mode: InteractionMode) => set({ interactionMode: mode }),
  setActiveTool: (tool: ToolName) => set({ activeTool: tool }),
  togglePageSelection: (page: number) =>
    set((s) => ({
      selectedPages: s.selectedPages.includes(page)
        ? s.selectedPages.filter((p) => p !== page)
        : [...s.selectedPages, page].sort((a, b) => a - b),
    })),
  clearPageSelection: () => set({ selectedPages: [] }),
  setActiveShape: (shape: ShapeName) => set({ activeShape: shape }),
  setDrawColor: (color: string) => set({ drawColor: color }),
  setDrawWidth: (width: number) => set({ drawWidth: Math.min(40, Math.max(1, width)) }),
  setDrawOpacity: (opacity: number) => set({ drawOpacity: Math.min(1, Math.max(0.05, opacity)) }),
  setZoom: (zoom: number) => set({ zoom: Math.min(4, Math.max(0.25, zoom)) }),
  setCurrentPage: (page: number) => set({ currentPage: page }),
  setSelectedObjectId: (id: string | null) => set({ selectedObjectId: id }),
}))
