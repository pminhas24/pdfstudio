import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PDFUploader } from '../../components/PDFUploader/PDFUploader'

describe('PDFUploader', () => {
  it('renders the upload prompt', () => {
    render(<PDFUploader onFileLoaded={vi.fn()} />)
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument()
  })

  it('shows the privacy message', () => {
    render(<PDFUploader onFileLoaded={vi.fn()} />)
    expect(screen.getByText(/stays in your browser/i)).toBeInTheDocument()
  })

  it('calls onFileLoaded with ArrayBuffer when a PDF file is selected', async () => {
    const onFileLoaded = vi.fn()
    render(<PDFUploader onFileLoaded={onFileLoaded} />)
    const input = screen.getByTestId('file-input')
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' })
    await userEvent.upload(input, file)
    await waitFor(() =>
      expect(onFileLoaded).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'test.pdf'),
    )
  })
})
