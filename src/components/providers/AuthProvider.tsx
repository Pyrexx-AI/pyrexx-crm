"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAppStore, Workspace } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  
  // Extract all setters
  const { activeOrgId, setActiveOrgId, setUser, setUserName, setUserEmail, setWorkspace, setWorkspaces } = useAppStore();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          if (isMounted) setIsBootstrapping(false);
          return;
        }

        // Fetch Profile
        const { data: profile } = await supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle();
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
          let targetOrgId = activeOrgId; // Default to what's in Zustand
          let resolvedRole = null;

          memberships.forEach((m: any) => {
            const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
            if (org) {
              availableWorkspaces.push({ id: org.id, name: org.name, type: org.type });
            }
          });

          setWorkspaces(availableWorkspaces);

          // If no activeOrgId in Zustand, or it's invalid, pick the first available
          if (!targetOrgId || !availableWorkspaces.find(w => w.id === targetOrgId)) {
            targetOrgId = availableWorkspaces[0].id;
            setActiveOrgId(targetOrgId);
            setWorkspace(availableWorkspaces[0].type);
          }

          // Match the role exactly to the active Org
          const currentMembership = memberships.find((m: any) => m.org_id === targetOrgId);
          if (currentMembership) {
            resolvedRole = currentMembership.role;
          } else {
            resolvedRole = memberships[0].role;
          }

          setUser(user.id, resolvedRole);
        } else {
          setUser(user.id, null);
        }
      } catch (error) {
        logger.error('AuthProvider', 'Bootstrap failed', error);
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