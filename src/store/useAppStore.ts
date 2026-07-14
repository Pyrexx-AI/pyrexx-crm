import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WorkspaceType = 'agency' | 'clinic';

interface AppState {
  currentWorkspace: WorkspaceType;
  activeOrgId: string | null;
  userRole: string | null;
  userId: string | null;
  mobileMenuOpen: boolean;
  setWorkspace: (ws: WorkspaceType) => void;
  setActiveOrgId: (id: string | null) => void;
  setUser: (id: string | null, role: string | null) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentWorkspace: 'agency',
      activeOrgId: null,
      userRole: null,
      userId: null,
      mobileMenuOpen: false,
      setWorkspace: (ws) => set({ currentWorkspace: ws }),
      setActiveOrgId: (id) => set({ activeOrgId: id }),
      setUser: (id, role) => set({ userId: id, userRole: role }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'pyrexx-crm-storage', // Saves to localStorage
      partialize: (state) => ({ 
        currentWorkspace: state.currentWorkspace,
        activeOrgId: state.activeOrgId 
      }), // Only persist workspace and org preferences
    }
  )
);