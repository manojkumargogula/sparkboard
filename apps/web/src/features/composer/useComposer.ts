import { createContext, useContext } from "react";

export interface ComposerContextValue {
  openComposer: () => void;
}

export const ComposerContext = createContext<ComposerContextValue | null>(null);

export function useComposer(): ComposerContextValue {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error("useComposer must be used inside <ComposerProvider>");
  return ctx;
}
