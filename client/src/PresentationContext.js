import { createContext, useContext } from 'react';

export const PresentationContext = createContext(null);

export function usePresentationContext() {
  const ctx = useContext(PresentationContext);
  if (!ctx) throw new Error('usePresentationContext must be used inside a Presentation');
  return ctx;
}
