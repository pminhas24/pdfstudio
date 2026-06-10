import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EditorToolbar } from '../../components/EditorToolbar/EditorToolbar'
import { useEditorStore } from '../../store/editorStore'

describe('EditorToolbar', () => {
  beforeEach(() => {
    useEditorStore.setState({
      activeTool: 'select',
      activeShape: 'rect',
      zoom: 1,
      currentPage: 1,
      selectedObjectId: null,
    })
  })

  it('renders all tool buttons', () => {
    render(<EditorToolbar onDownload={vi.fn()} onUndo={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Draw')).toBeInTheDocument()
    expect(screen.getByText('Highlight')).toBeInTheDocument()
  })

  it('clicking Text sets activeTool to text', async () => {
    render(<EditorToolbar onDownload={vi.fn()} onUndo={vi.fn()} onRedo={vi.fn()} />)
    await userEvent.click(screen.getByText('Text'))
    expect(useEditorStore.getState().activeTool).toBe('text')
  })

  it('clicking zoom in increases zoom', async () => {
    render(<EditorToolbar onDownload={vi.fn()} onUndo={vi.fn()} onRedo={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Zoom in'))
    expect(useEditorStore.getState().zoom).toBeGreaterThan(1)
  })

  it('shows shape picker only when shape tool active', async () => {
    render(<EditorToolbar onDownload={vi.fn()} onUndo={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.queryByText('→ Arrow')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('Shape'))
    expect(screen.getByText('→ Arrow')).toBeInTheDocument()
  })

  it('calls onDownload when Download clicked', async () => {
    const onDownload = vi.fn()
    render(<EditorToolbar onDownload={onDownload} onUndo={vi.fn()} onRedo={vi.fn()} />)
    await userEvent.click(screen.getByText(/Download PDF/))
    expect(onDownload).toHaveBeenCalled()
  })
})
