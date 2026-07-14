"use client";
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const { activeOrgId, setActiveOrgId, setUser, setWorkspace } = useAppStore();
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsBootstrapping(false);
        return;
      }

      // Fetch the user's memberships alongside the parent organization data
      const { data: memberships } = await supabase
        .from('memberships')
        .select('role, org_id, organizations(type)')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        // Fix: Safely handle Supabase's type inference for foreign key joins
        // It can infer it as an array or an object depending on schema strictness.
        const agencyMembership = memberships.find((m: any) => {
          const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
          return org?.type === 'agency';
        });
        
        setUser(user.id, agencyMembership?.role || 'rep');

        // If no active org is persisted, or the persisted org is no longer valid, set a default
        const validOrgIds = memberships.map(m => m.org_id);
        if (!activeOrgId || !validOrgIds.includes(activeOrgId)) {
          if (agencyMembership) {
            setActiveOrgId(agencyMembership.org_id);
            setWorkspace('agency');
          } else {
            setActiveOrgId(memberships[0].org_id);
            setWorkspace('clinic');
          }
        }
      }

      setIsBootstrapping(false);
    };

    bootstrap();

    // Listen for sign outs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setActiveOrgId(null);
        setUser(null, null);
        router.push('/auth/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, activeOrgId, setActiveOrgId, setUser, setWorkspace, router]);

  if (isBootstrapping) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-paper">
        <div className="w-6 h-6 border-2 border-berry border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}