"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAppStore, Workspace } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const { activeOrgId, setActiveOrgId, setUser, setUserName, setUserEmail, setWorkspace, setWorkspaces } = useAppStore();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsBootstrapping(false);
        return;
      }

      // Fetch the user's profile details
      const { data: profile } = await supabase.from('users').select('full_name, email').eq('id', user.id).single();
      if (profile) {
        setUserName(profile.full_name);
        setUserEmail(profile.email);
      }

      const { data: memberships } = await supabase
        .from('memberships')
        .select('role, org_id, organizations(id, name, type)')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        const availableWorkspaces: Workspace[] = [];
        let agencyMembership: any = null;

        memberships.forEach((m: any) => {
          const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
          if (org) {
            availableWorkspaces.push({ id: org.id, name: org.name, type: org.type as 'agency' | 'clinic' });
            if (org.type === 'agency') agencyMembership = m;
          }
        });

        setWorkspaces(availableWorkspaces);

        const currentMembership = memberships.find((m: any) => m.org_id === activeOrgId);
        
        if (currentMembership) {
          setUser(user.id, currentMembership.role);
        } else if (agencyMembership) {
          setUser(user.id, agencyMembership.role);
        } else {
          setUser(user.id, memberships[0].role);
        }

        const validOrgIds = availableWorkspaces.map(w => w.id);
        if (!activeOrgId || !validOrgIds.includes(activeOrgId)) {
          if (agencyMembership) {
            setActiveOrgId(agencyMembership.org_id);
            setWorkspace('agency');
          } else {
            setActiveOrgId(availableWorkspaces[0].id);
            setWorkspace(availableWorkspaces[0].type);
          }
        }
      }

      setIsBootstrapping(false);
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