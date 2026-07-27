"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAppStore, Workspace } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  
  const { 
    setActiveOrgId, setWorkspace, 
    setUser, setUserName, setUserEmail, setWorkspaces 
  } = useAppStore();
  
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const bootstrap = async (authUser?: any) => {
    logger.info('AuthProvider', 'Executing session bootstrap...');
    
    try {
      const user = authUser || (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        logger.info('AuthProvider', 'No active user session found.');
        setIsBootstrapping(false);
        return;
      }

      // Fetch User Profile
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      const fallbackName = user.email?.split('@')[0] || "User";
      setUserName(profile?.full_name || fallbackName);
      setUserEmail(profile?.email || user.email || "");

      // Fetch Memberships
      const { data: memberships } = await supabase
        .from('memberships')
        .select('role, org_id, organizations(id, name, type)')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        const availableWorkspaces: Workspace[] = [];
        
        // Read non-reactively from Zustand state to avoid reactive dependency loops
        const currentActiveOrg = useAppStore.getState().activeOrgId;
        const currentWorkspaceType = useAppStore.getState().currentWorkspace;
        let targetOrgId = currentActiveOrg;
        let agencyMembership: any = null;

        memberships.forEach((m: any) => {
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

        setWorkspaces(availableWorkspaces);

        // Check if saved Org ID is valid
        const isSavedOrgValid = availableWorkspaces.find(w => w.id === targetOrgId);

        if (isSavedOrgValid && targetOrgId) {
          setActiveOrgId(targetOrgId);
          const currentMembership = memberships.find((m: any) => m.org_id === targetOrgId);
          setUser(user.id, currentMembership?.role || 'rep');
        } else {
          const fallbackOrg = agencyMembership || memberships[0];
          const resolvedOrg = Array.isArray(fallbackOrg.organizations) 
            ? fallbackOrg.organizations[0] 
            : fallbackOrg.organizations;
            
          const fallbackType = resolvedOrg?.type || 'clinic';
          
          setActiveOrgId(fallbackOrg.org_id);
          setWorkspace(fallbackType as 'agency' | 'clinic');
          setUser(user.id, fallbackOrg.role);
        }
      } else {
        setUser(user.id, null);
      }
    } catch (err) {
      logger.error('AuthProvider', 'Fatal bootstrap error', err);
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    bootstrap();

    // Attach event listener for immediate post-login resolution without page reloads
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('AuthProvider', 'Auth state transition detected', { event });
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        bootstrap(session?.user);
      } else if (event === 'SIGNED_OUT') {
        setActiveOrgId(null);
        setUser(null, null);
        setUserName(null);
        setUserEmail(null);
        setWorkspaces([]);
        router.push('/auth/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (isBootstrapping) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="w-6 h-6 border-2 border-berry border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}