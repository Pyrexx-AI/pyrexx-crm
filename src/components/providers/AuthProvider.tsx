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
    activeOrgId, setActiveOrgId, 
    currentWorkspace, setWorkspace, 
    setUser, setUserName, setUserEmail, setWorkspaces 
  } = useAppStore();
  
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      logger.info('AuthProvider', 'Starting bootstrap sequence...', { activeOrgId });
      
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          logger.error('AuthProvider', 'Auth Error on getUser', authError);
        }
        
        if (!user) {
          logger.info('AuthProvider', 'No active user found. Redirecting to login.');
          if (isMounted) setIsBootstrapping(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle();
        if (profileError) {
          logger.error('AuthProvider', 'Failed to fetch user profile', profileError);
        }
        
        const fallbackName = user.email?.split('@')[0] || "User";
        setUserName(profile?.full_name || fallbackName);
        setUserEmail(profile?.email || user.email || "");

        const { data: memberships, error: membershipError } = await supabase
          .from('memberships')
          .select('role, org_id, organizations(id, name, type)')
          .eq('user_id', user.id);

        if (membershipError) {
          logger.error('AuthProvider', 'Failed to fetch memberships', membershipError);
        }

        if (memberships && memberships.length > 0) {
          const availableWorkspaces: Workspace[] = [];
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

          // By this point Zustand has successfully hydrated naturally
          const isSavedOrgValid = availableWorkspaces.find(w => w.id === activeOrgId);

          if (isSavedOrgValid && activeOrgId) {
            const currentMembership = memberships.find((m: any) => m.org_id === activeOrgId);
            setUser(user.id, currentMembership?.role || 'rep');
            logger.info('AuthProvider', 'Restored validated workspace from storage', { activeOrgId });
          } else {
            const fallbackOrg = agencyMembership || memberships[0];
            const resolvedOrg = Array.isArray(fallbackOrg.organizations) 
              ? fallbackOrg.organizations[0] 
              : fallbackOrg.organizations;
              
            const fallbackType = resolvedOrg?.type || 'clinic';
            
            setActiveOrgId(fallbackOrg.org_id);
            setWorkspace(fallbackType as 'agency' | 'clinic');
            setUser(user.id, fallbackOrg.role);
            logger.info('AuthProvider', 'Fallback workspace assigned', { orgId: fallbackOrg.org_id });
          }
        } else {
          setUser(user.id, null);
        }
      } catch (err) {
        logger.error('AuthProvider', 'Fatal error during bootstrap', err);
      } finally {
        if (isMounted) setIsBootstrapping(false);
      }
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setActiveOrgId(null);
        setUser(null, null);
        setUserName(null);
        setUserEmail(null);
        setWorkspaces([]);
        router.push('/auth/login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, activeOrgId, currentWorkspace, setActiveOrgId, setUser, setUserName, setUserEmail, setWorkspace, setWorkspaces, router]);

  if (isBootstrapping) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="w-6 h-6 border-2 border-berry border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}