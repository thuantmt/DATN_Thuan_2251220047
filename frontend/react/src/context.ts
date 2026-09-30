import { createContext, useContext } from 'react';
import type { State } from './types';

export interface AppContextValue {
  state: State;
  update: (change: (next: State) => void, message?: string) => boolean;
  notify: (message: string) => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw Error('Missing AppContext');
  return value;
}
