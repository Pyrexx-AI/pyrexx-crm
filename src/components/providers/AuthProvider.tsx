"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAppStore, Workspace } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const store = useAppStore.getState();

        if (!user) {
          if (isMounted) setIsBootstrapping(false);
          return;
        }

        // 1. Fetch Profile Details
        const { data: profile } = await supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle();
        
        const fallbackName = user.email?.split('@')[0] || "User";
        store.setUserName(profile?.full_name || fallbackName);
        store.setUserEmail(profile?.email || user.email || "");

        // 2. Fetch Workspace Memberships (Removed .eq('status', 'active') to prevent legacy owner lockout)
        const { data: memberships } = await supabase
          .from('memberships')
          .select('role, org_id, status, organizations(id, name, type)')
          .eq('user_id', user.id);

        if (memberships && memberships.length > 0) {
          const availableWorkspaces: Workspace[] = [];
          let agencyMembership: any = null;

          // Treat 'active' and 'null' (legacy accounts) as active workspaces
          const activeMemberships = memberships.filter(m => m.status === 'active' || m.status === null);

          activeMemberships.forEach((m: any) => {
            const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
            if (org) {
              availableWorkspaces.push({ 
                id: org.id, 
                name: org.name, 
                type: org.type as 'agency' | 'clinic' 
              });
              if (org.type === 'agency') agencyMembership = m;
            }
          });

          store.setWorkspaces(availableWorkspaces);

          // 3. Resolve Active Organization (Hydration Fallback)
          let targetOrgId = store.activeOrgId; 
          
          if (!targetOrgId) {
            try {
              const persistedData = localStorage.getItem('pyrexx-crm-storage');
              if (persistedData) {
                const parsed = JSON.parse(persistedData);
                if (parsed?.state?.activeOrgId) {
                  targetOrgId = parsed.state.activeOrgId;
                }
              }
            } catch (e) {
              logger.error('AuthProvider', 'Storage parse error', e);
            }
          }

          // Validate that the saved org actually exists in their current active memberships
          const isSavedOrgValid = availableWorkspaces.find(w => w.id === targetOrgId);

          if (isSavedOrgValid && targetOrgId) {
            store.setActiveOrgId(targetOrgId);
            const currentMembership = activeMemberships.find((m: any) => m.org_id === targetOrgId);
            store.setUser(user.id, currentMembership?.role || 'rep');
          } else {
            // Safe fallback if their previous workspace was deleted or they are a brand new user
            const fallbackOrg = agencyMembership || activeMemberships[0];
            if (fallbackOrg) {
              const resolvedOrg = Array.isArray(fallbackOrg.organizations) 
                ? fallbackOrg.organizations[0] 
                : fallbackOrg.organizations;
                
              store.setActiveOrgId(fallbackOrg.org_id);
              store.setWorkspace((resolvedOrg?.type as 'agency' | 'clinic') || 'clinic');
              store.setUser(user.id, fallbackOrg.role);
            } else {
              // User has memberships, but they are all 'pending' (hasn't set password yet)
              store.setUser(user.id, null);
              store.setWorkspaces([]);
              store.setActiveOrgId(null);
            }
          }
        } else {
          // User exists but has no workspaces at all
          store.setUser(user.id, null);
          store.setWorkspaces([]);
          store.setActiveOrgId(null);
        }
      } catch (error) {
        logger.error('AuthProvider', 'Fatal error during bootstrap', error);
      } finally {
        if (isMounted) setIsBootstrapping(false);
      }
    };

    bootstrap();

    // Listen for Auth events to trigger state hydration dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        bootstrap();
      } else if (event === 'SIGNED_OUT') {
        const store = useAppStore.getState();
        store.setActiveOrgId(null);
        store.setUser(null, null);
        store.setUserName(null);
        store.setUserEmail(null);
        store.setWorkspaces([]);
        router.push('/auth/login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]); 

  if (isBootstrapping) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="w-6 h-6 border-2 border-berry border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}