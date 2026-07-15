"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAppStore, Workspace } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const { activeOrgId, setActiveOrgId, setUser, setUserName, setUserEmail, setWorkspace, setWorkspaces } = useAppStore();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      logger.info('AuthProvider', 'Starting bootstrap sequence...');
      
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          logger.error('AuthProvider', 'Auth Error on getUser', authError);
        }
        
        if (!user) {
          logger.info('AuthProvider', 'No active user found. Redirecting to login.');
          setIsBootstrapping(false);
          return;
        }

        logger.info('AuthProvider', 'User authenticated', { userId: user.id });

        // Safe fetch profile
        const { data: profile, error: profileError } = await supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle();
        if (profileError) {
          logger.error('AuthProvider', 'Failed to fetch user profile', profileError);
        }
        
        const fallbackName = user.email?.split('@')[0] || "User";
        setUserName(profile?.full_name || fallbackName);
        setUserEmail(profile?.email || user.email || "");

        // Fetch memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('memberships')
          .select('role, org_id, organizations(id, name, type)')
          .eq('user_id', user.id);

        if (membershipError) {
          logger.error('AuthProvider', 'Failed to fetch memberships (Check RLS or DB constraints)', membershipError);
        }

        logger.info('AuthProvider', 'Memberships fetched', { count: memberships?.length || 0 });

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

              if (org.type === 'agency') {
                agencyMembership = m;
              }
            }
          });

          setWorkspaces(availableWorkspaces);

          const currentMembership = memberships.find((m: any) => m.org_id === activeOrgId);
          let resolvedRole = null;
          
          if (currentMembership) {
            resolvedRole = currentMembership.role;
          } else if (agencyMembership) {
            resolvedRole = agencyMembership.role;
          } else {
            resolvedRole = memberships[0].role;
          }

          logger.info('AuthProvider', 'Resolved User Role', { role: resolvedRole });
          setUser(user.id, resolvedRole);

          const validOrgIds = availableWorkspaces.map(w => w.id);
          if (!activeOrgId || !validOrgIds.includes(activeOrgId)) {
            if (agencyMembership) {
              logger.info('AuthProvider', 'Setting active workspace to Agency', { orgId: agencyMembership.org_id });
              setActiveOrgId(agencyMembership.org_id);
              setWorkspace('agency');
            } else {
              logger.info('AuthProvider', 'Setting active workspace to Clinic', { orgId: availableWorkspaces[0].id });
              setActiveOrgId(availableWorkspaces[0].id);
              setWorkspace(availableWorkspaces[0].type);
            }
          }
        } else {
          logger.warn('AuthProvider', 'User has no memberships. They are logged in but attached to zero organizations.');
          setUser(user.id, null);
        }
      } catch (err) {
        logger.error('AuthProvider', 'Fatal error during bootstrap', err);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      logger.info('AuthProvider', 'Auth state changed', { event });
      if (event === 'SIGNED_OUT') {
        setActiveOrgId(null);
        setUser(null, null);
        setUserName(null);
        setUserEmail(null);
        setWorkspaces([]);
        router.push('/auth/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, activeOrgId, setActiveOrgId, setUser, setUserName, setUserEmail, setWorkspace, setWorkspaces, router]);

  if (isBootstrapping) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="w-6 h-6 border-2 border-berry border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}