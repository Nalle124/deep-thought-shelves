import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUserState, saveUserState, EMPTY_STATE, type UserState } from "@/lib/userState";

// The React Query cache is the single source of truth for user_state, so every
// consumer (home schedule, goals, coffee, cover gallery) reads and writes the
// same blob. Each `update` merges into the latest cached value before saving, so
// concurrent edits from different places can't clobber each other with a stale
// snapshot. Saves are debounced.
export function useUserState() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["userState"],
    queryFn: fetchUserState,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const saveTimer = useRef<number | null>(null);
  const saveMut = useMutation({ mutationFn: (s: UserState) => saveUserState(s) });
  function update(updater: (prev: UserState) => UserState) {
    const next = updater(qc.getQueryData<UserState>(["userState"]) ?? EMPTY_STATE);
    qc.setQueryData(["userState"], next); // instant in-memory update, shared by all consumers
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveMut.mutate(next), 700);
  }
  return { state: data ?? EMPTY_STATE, update };
}
