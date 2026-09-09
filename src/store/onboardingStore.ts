import { create } from 'zustand';

export interface OnboardingState {
  // Step 1: Personal
  name: string;
  dob: string;
  city: string;
  sex: string;
  photos: string[]; // local uris or remote urls
  bio: string;
  
  // Step 2: Trip
  destination: string;
  checkIn: string;
  checkOut: string;
  isFlexible: boolean;
  companions: string;
  
  // Step 3: Travel Styles
  travelStyles: string[];
  
  // Step 4: Interests
  interests: string[];
  
  // Step 5: Social & Budget
  budget: string; // $, $$, $$$, $$$$
  costSplit: boolean;
  group: boolean;
  onePerson: boolean;
  invitations: boolean;

  // Step 6: Connections
  connectionIntentions: string[];
  genderPreference: string;

  // Actions
  updateField: (key: keyof Omit<OnboardingState, 'updateField' | 'toggleArrayItem'>, value: any) => void;
  toggleArrayItem: (key: 'travelStyles' | 'interests' | 'connectionIntentions', item: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  name: '',
  dob: '',
  city: '',
  sex: '',
  photos: [],
  bio: '',
  
  destination: '',
  checkIn: '',
  checkOut: '',
  isFlexible: false,
  companions: 'Sozinho(a)',
  
  travelStyles: [],
  interests: [],
  
  budget: '$$',
  costSplit: false,
  group: false,
  onePerson: false,
  invitations: false,

  connectionIntentions: [],
  genderPreference: 'Todos',

  updateField: (key, value) => set((state) => ({ ...state, [key]: value })),
  
  toggleArrayItem: (key, item) => set((state) => {
    const array = state[key] as string[];
    if (array.includes(item)) {
      return { ...state, [key]: array.filter((i) => i !== item) };
    } else {
      return { ...state, [key]: [...array, item] };
    }
  }),
  
  reset: () => set({
    name: '', dob: '', city: '', sex: '', photos: [], bio: '',
    destination: '', checkIn: '', checkOut: '', isFlexible: false, companions: 'Sozinho(a)',
    travelStyles: [], interests: [],
    budget: '$$', costSplit: false, group: false, onePerson: false, invitations: false,
    connectionIntentions: [], genderPreference: 'Todos'
  }),
}));
