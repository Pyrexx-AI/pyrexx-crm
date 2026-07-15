import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WorkspaceType = 'agency' | 'clinic';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
}

interface AppState {
  currentWorkspace: WorkspaceType;
  activeOrgId: string | null;
  userRole: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  workspaces: Workspace[];
  mobileMenuOpen: boolean;
  commandPaletteOpen: boolean;
  
  setWorkspace: (ws: WorkspaceType) => void;
  setActiveOrgId: (id: string | null) => void;
  setUser: (id: string | null, role: string | null) => void;
  setUserName: (name: string | null) => void;
  setUserEmail: (email: string | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentWorkspace: 'agency',
      activeOrgId: null,
      userRole: null,
      userId: null,
      userName: null,
      userEmail: null,
      workspaces: [],
      mobileMenuOpen: false,
      commandPaletteOpen: false,
      
      setWorkspace: (ws) => set({ currentWorkspace: ws }),
      setActiveOrgId: (id) => set({ activeOrgId: id }),
      setUser: (id, role) => set({ userId: id, userRole: role }),
      setUserName: (name) => set({ userName: name }),
      setUserEmail: (email) => set({ userEmail: email }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'pyrexx-crm-storage',
      partialize: (state) => ({ 
        currentWorkspace: state.currentWorkspace,
        activeOrgId: state.activeOrgId,
        userRole: state.userRole,
        userId: state.userId,
        userName: state.userName,
        userEmail: state.userEmail
      }), 
    }
  )
);