import { createContext } from 'react';

export const DockContext = createContext<{
  size: number;
  id: string;
  expanded: boolean;
} | null>(null);
