import { create } from 'zustand';

type WorkspaceType = 'agency' | 'clinic';

interface AppState {
  currentWorkspace: WorkspaceType;
  activeOrgId: string | null;
  mobileMenuOpen: boolean;
  setWorkspace: (ws: WorkspaceType) => void;
  setActiveOrgId: (id: string | null) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWorkspace: 'agency',
  activeOrgId: null,
  mobileMenuOpen: false,
  setWorkspace: (ws) => set({ currentWorkspace: ws }),
  setActiveOrgId: (id) => set({ activeOrgId: id }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));