import { createContext, useContext } from 'react'

// Opens the grade detail sheet from any evaluation row of "Mes notes":
// `open({ moduleCode, evaluationId, isNew, from })`. Null outside GradesPage, where
// rows stay plain.
export const GradeDetailContext = createContext(null)

export function useGradeDetail() {
  return useContext(GradeDetailContext)
}
