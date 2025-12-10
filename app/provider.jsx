'use client';
import { UserDetailContext } from '@/context/UserDetailContext';
import { supabase } from '@/services/supabaseClient';
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DB_TABLES } from '@/services/Constants';

function Provider({ children }) {
  const [user, setUser] = useState();
  const router = useRouter();

  // Fetch user from Supabase and DB
  const fetchAndSetUser = useCallback(async () => {
    const {
      data: { user: supaUser },
    } = await supabase.auth.getUser();
    if (!supaUser) {
      setUser(null);
      return;
    }
    let { data: users, error: fetchError } = await supabase
      .from(DB_TABLES.USERS)
      .select('*')
      .eq('email', supaUser.email);
    if (fetchError) console.debug('Error fetching user from DB:', fetchError);
    if (users?.length === 0) {
      // Do NOT create user here for OAuth signups!
      // Let /auth/callback handle user creation and role assignment
      setUser(null);
      return;
    }

    // Check if user is banned
    if (users[0]?.banned) {
      await supabase.auth.signOut();
      toast.error(
        'Your account has been banned. Please contact support for more information.'
      );
      router.push('/login');
      setUser(null);
      return;
    }

    setUser(users[0]);
  }, [router]);

  // Function to update user credits
  const updateUserCredits = async (newCredits) => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from(DB_TABLES.USERS)
        .update({ credits: newCredits })
        .eq('email', user.email)
        .select();

      if (!error && data?.[0]) {
        setUser(data[0]);
        return { success: true, data: data[0] };
      }
      return { success: false, error };
    } catch (error) {
      console.error('Error updating credits:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    (async () => {
      await fetchAndSetUser(); // Initial fetch
    })();
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchAndSetUser();
    });
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [fetchAndSetUser]);

  // Global click disabler: prevent accidental multiple rapid clicks on buttons.
  // Exempt elements with `data-allow-multiple="true"`.
  useEffect(() => {
    const handler = (e) => {
      try {
        const target = e.target;
        const btn = target.closest && target.closest('button');
        if (!btn) return;
        if (btn.getAttribute('data-allow-multiple') === 'true') return;
        if (btn.disabled) return;
        // Disable visually and functionally for a short period
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('opacity-60', 'pointer-events-none');
        // Re-enable after 1s (adjustable)
        setTimeout(() => {
          try {
            btn.disabled = false;
            btn.removeAttribute('aria-disabled');
            btn.classList.remove('opacity-60', 'pointer-events-none');
          } catch (e) {
            // ignore
          }
        }, 1000);
      } catch (err) {
        // ignore errors in global handler
      }
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  return (
    <UserDetailContext.Provider value={{ user, setUser, updateUserCredits }}>
      <div>{children}</div>
    </UserDetailContext.Provider>
  );
}

export default Provider;

export const useUser = () => {
  const context = useContext(UserDetailContext);
  return context;
};
