import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingData {
  // Você
  name: string;
  dob: string; // YYYY-MM-DD
  city: string;
  sex: string;
  photos: string[]; // URIs locais (antes do upload) ou URLs remotas
  bio: string;
  languages: string[];

  // Viagem
  destination: string;
  checkIn: string;
  checkOut: string;
  isFlexible: boolean;
  companions: string;
  travelStyles: string[];
  interests: string[];
  budget: string; // $, $$, $$$, $$$$

  // Conexões
  costSplit: boolean;
  group: boolean;
  onePerson: boolean;
  invitations: boolean;
  connectionIntentions: string[];
  genderPreference: string;

  // Pergunta atual do fluxo (retoma de onde parou)
  stepIndex: number;
}

export interface OnboardingState extends OnboardingData {
  updateField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  toggleArrayItem: (key: 'travelStyles' | 'interests' | 'connectionIntentions' | 'languages', item: string) => void;
  reset: () => void;
}

const initialData: OnboardingData = {
  name: '', dob: '', city: '', sex: '', photos: [], bio: '', languages: [],
  destination: '', checkIn: '', checkOut: '', isFlexible: false, companions: '',
  travelStyles: [], interests: [], budget: '',
  costSplit: false, group: false, onePerson: false, invitations: false,
  connectionIntentions: [], genderPreference: '',
  stepIndex: 0,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialData,

      updateField: (key, value) => set({ [key]: value } as Partial<OnboardingData>),

      toggleArrayItem: (key, item) =>
        set((state) => {
          const array = state[key];
          return { [key]: array.includes(item) ? array.filter((i) => i !== item) : [...array, item] };
        }),

      reset: () => set(initialData),
    }),
    {
      name: 'romy-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ updateField, toggleArrayItem, reset, ...data }) => data,
      // No web, fotos ainda não enviadas são blob: URLs que morrem com a aba.
      onRehydrateStorage: () => (state) => {
        if (state && Platform.OS === 'web') {
          state.photos = state.photos.filter((p) => !p.startsWith('blob:'));
        }
      },
    }
  )
);
