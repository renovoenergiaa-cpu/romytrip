import {
  BeerStein, Camera, Coffee, ForkKnife, Island, MusicNotes, PersonSimpleRun, SunHorizon, Tent, Trophy, type Icon,
} from '../onboarding/icons';

// `id` é o valor gravado em local_events.icon (nomes antigos do lucide) — NÃO alterar.
// Só o ícone e o rótulo são de exibição.
export const AVAILABLE_EVENT_ICONS: { id: string; component: Icon; label: string }[] = [
  { id: 'Beer', component: BeerStein, label: 'Bar' },
  { id: 'TreePalm', component: Island, label: 'Praia' },
  { id: 'Music', component: MusicNotes, label: 'Música' },
  { id: 'Utensils', component: ForkKnife, label: 'Comida' },
  { id: 'Trophy', component: Trophy, label: 'Jogo' },
  { id: 'Camera', component: Camera, label: 'Fotos' },
  { id: 'Activity', component: PersonSimpleRun, label: 'Esporte' },
  { id: 'Tent', component: Tent, label: 'Acampar' },
  { id: 'Sun', component: SunHorizon, label: 'Pôr do sol' },
  { id: 'Coffee', component: Coffee, label: 'Café' },
];

export const eventIcon = (id?: string | null) => AVAILABLE_EVENT_ICONS.find((i) => i.id === id);
