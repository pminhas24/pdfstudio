import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../../store/editorStore'

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      activeTool: 'select',
      activeShape: 'rect',
      zoom: 1,
      currentPage: 1,
      selectedObjectId: null,
    })
  })

  it('sets active tool', () => {
    useEditorStore.getState().setActiveTool('text')
    expect(useEditorStore.getState().activeTool).toBe('text')
  })

  it('sets zoom clamped between 0.25 and 4', () => {
    useEditorStore.getState().setZoom(10)
    expect(useEditorStore.getState().zoom).toBe(4)
    useEditorStore.getState().setZoom(0.1)
    expect(useEditorStore.getState().zoom).toBe(0.25)
  })

  it('sets currentPage', () => {
    useEditorStore.getState().setCurrentPage(3)
    expect(useEditorStore.getState().currentPage).toBe(3)
  })

  it('sets active shape', () => {
    useEditorStore.getState().setActiveShape('arrow')
    expect(useEditorStore.getState().activeShape).toBe('arrow')
  })
})
