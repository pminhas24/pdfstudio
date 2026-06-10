import { create } from 'zustand'

// PDF form field values keyed by AcroForm field name. The FormLayer inputs
// write here; the exporter reads them back into the PDF on download.
interface FormState {
  values: Record<string, string | boolean>
  setValue: (name: string, value: string | boolean) => void
  reset: () => void
}

export const useFormStore = create<FormState>((set) => ({
  values: {},
  setValue: (name, value) =>
    set((s) => ({ values: { ...s.values, [name]: value } })),
  reset: () => set({ values: {} }),
}))
