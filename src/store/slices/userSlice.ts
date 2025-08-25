import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { ExtendedAnalyticsState } from '../useAnalyticsStore';

// Using 'any' for now as we don't know the exact structure of the decoded token yet.
// We will replace this with a proper type in a later phase.
export type UserProfile = any;

// This interface now correctly defines the nested 'user' object and the actions
export interface UserSlice {
  user: {
    isAuthenticated: boolean;
    profile: UserProfile | null; // Renamed from 'user' for clarity
  };
  login: (userProfile: UserProfile) => void;
  logout: () => void;
}

export const createUserSlice: StateCreator<
  ExtendedAnalyticsState,
  [],
  [],
  UserSlice
> = (set) => ({
  // 1. The initial state is now properly nested inside the 'user' object
  user: {
    isAuthenticated: false,
    profile: null,
  },

  // 2. The actions now update the properties *within* state.user
  login: (userProfile) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.user.isAuthenticated = true;
        state.user.profile = userProfile;
      })
    ),

  logout: () =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.user.isAuthenticated = false;
        state.user.profile = null;
      })
    ),
});