import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GeneratedQuiz, UserProfile } from '@workspace/api-client-react';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface QuizState {
  activeQuiz: GeneratedQuiz | null;
  setActiveQuiz: (quiz: GeneratedQuiz | null) => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  activeQuiz: null,
  setActiveQuiz: (quiz) => set({ activeQuiz: quiz }),
}));
