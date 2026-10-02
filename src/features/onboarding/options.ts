import {
  Armchair, Backpack, Bank, BeerStein, BowlSteam, Camera, ChatsCircle, Coffee, Confetti,
  Diamond, Fish, FlowerLotus, ForkKnife, HandCoins, HandHeart, Heart, Island, Laptop,
  Lightning, MapPinArea, Martini, Mountains, MusicNotes, Palette, Signpost, PersonSimpleBike,
  PersonSimpleHike, ShoppingBag, SunHorizon, Tent, TreeEvergreen, User, Users, UsersThree,
  Waves, Wine, type Icon,
} from './icons';

// `id` é o valor gravado no banco e comparado pelo feed/algoritmo — NÃO alterar,
// senão perfis antigos deixam de combinar. Só `label`/`desc`/`icon` são de exibição.
// Ícones: Phosphor, sempre no peso "duotone" (ver OptionRow/ChoiceChip).
export type Option = { id: string; label: string; desc?: string; icon?: Icon };

export const GENDER_OPTIONS: Option[] = [
  { id: 'Feminino', label: 'Mulher' },
  { id: 'Masculino', label: 'Homem' },
  { id: 'Não-binário', label: 'Não-binário' },
  { id: 'Prefiro não dizer', label: 'Prefiro não dizer' },
];

export const LANGUAGE_OPTIONS: Option[] = [
  'Português', 'Inglês', 'Espanhol', 'Francês', 'Italiano', 'Alemão', 'Libras', 'Mandarim', 'Japonês',
].map((l) => ({ id: l, label: l }));

export const COMPANION_OPTIONS: Option[] = [
  { id: 'Sozinho(a)', label: 'Sozinho(a)', desc: 'Vou por conta própria e faço amigos no caminho', icon: User },
  { id: 'Em dupla', label: 'Em dupla', desc: 'Com amigo(a) ou par', icon: Users },
  { id: 'Com amigos', label: 'Em grupo', desc: 'Com a galera', icon: UsersThree },
];

export const TRAVEL_STYLE_OPTIONS: Option[] = [
  { id: 'Mochilão & Roots', label: 'Mochilão raiz', desc: 'Hostel, economia e aventura de verdade', icon: Backpack },
  { id: 'Conforto & Relax', label: 'Conforto e calmaria', desc: 'Pousada charmosa, praia e descanso', icon: Armchair },
  { id: 'Luxo & Exclusivo', label: 'Luxo', desc: 'Experiências exclusivas e alta gastronomia', icon: Diamond },
  { id: 'Natureza & Trilhas', label: 'Natureza', desc: 'Montanha, cachoeira e acampamento', icon: TreeEvergreen },
  { id: 'Festas & Vida Noturna', label: 'Festa e noite', desc: 'Baladas, festivais e bares até tarde', icon: Martini },
  { id: 'Cultural & Histórico', label: 'Cultura e história', desc: 'Museus, arquitetura e arte', icon: Bank },
  { id: 'Gastronômica', label: 'Comida', desc: 'Comida de rua, vinícolas e bistrôs', icon: ForkKnife },
  { id: 'Nômade Digital', label: 'Nômade digital', desc: 'Trabalho remoto, cafés e boa internet', icon: Laptop },
  { id: 'Mulheres na Estrada', label: 'Mulheres na estrada', desc: 'Parcerias de viagem entre mulheres', icon: HandHeart },
];

export const INTEREST_OPTIONS: Option[] = [
  { id: '🏖️ Praia & Mar', label: 'Praia e mar', icon: Island },
  { id: '🥾 Trilhas & Natureza', label: 'Trilhas', icon: PersonSimpleHike },
  { id: '🏛️ Museus & História', label: 'Museus', icon: Bank },
  { id: '🎉 Baladas & Festas', label: 'Baladas', icon: Confetti },
  { id: '📸 Fotografia', label: 'Fotografia', icon: Camera },
  { id: '🍷 Vinhos & Bistrôs', label: 'Vinhos', icon: Wine },
  { id: '☕ Cafés Charmosos', label: 'Cafés', icon: Coffee },
  { id: '🏄 Surf & Esportes Aquáticos', label: 'Surf', icon: Waves },
  { id: '🧘 Yoga & Bem-estar', label: 'Yoga', icon: FlowerLotus },
  { id: '🧗 Escalada & Aventura', label: 'Escalada', icon: Mountains },
  { id: '🎨 Arte Urbana & Galerias', label: 'Arte', icon: Palette },
  { id: '🎶 Música ao Vivo & Shows', label: 'Shows', icon: MusicNotes },
  { id: '⛺ Camping & Fogueira', label: 'Camping', icon: Tent },
  { id: '🍜 Comidas de Rua', label: 'Comida de rua', icon: BowlSteam },
  { id: '🚲 Ciclismo & Passeios', label: 'Bike', icon: PersonSimpleBike },
  { id: '🍻 Cervejarias Artesanais', label: 'Cerveja artesanal', icon: BeerStein },
  { id: '🛍️ Feirinhas & Compras', label: 'Feirinhas', icon: ShoppingBag },
  { id: '🌅 Pôr do Sol', label: 'Pôr do sol', icon: SunHorizon },
  { id: '🤿 Mergulho', label: 'Mergulho', icon: Fish },
  { id: '🤝 Networking Nômade', label: 'Networking', icon: Laptop },
];

export const BUDGET_OPTIONS: Option[] = [
  { id: '$', label: 'Econômico', desc: 'Hostel, comida local e transporte público' },
  { id: '$$', label: 'Moderado', desc: 'Pousadas charmosas e bistrôs' },
  { id: '$$$', label: 'Confortável', desc: 'Bons hotéis e passeios escolhidos a dedo' },
  { id: '$$$$', label: 'Sem economizar', desc: 'Experiências exclusivas' },
];

// Campos booleanos do perfil; `group` e `onePerson` são mutuamente exclusivos.
export const SOCIAL_OPTIONS: (Option & { id: 'costSplit' | 'group' | 'onePerson' | 'invitations' })[] = [
  { id: 'costSplit', label: 'Dividir custos', desc: 'Hospedagem, carro ou combustível', icon: HandCoins },
  { id: 'group', label: 'Viajar em grupo pequeno', desc: 'De 3 a 5 pessoas', icon: UsersThree },
  { id: 'onePerson', label: 'Uma companhia por vez', desc: 'Passeios e viagens em dupla', icon: User },
  { id: 'invitations', label: 'Convites de última hora', desc: 'Jantar, café ou rolê local', icon: Lightning },
];

export const INTENTION_OPTIONS: Option[] = [
  { id: 'Parceria de Passeio', label: 'Companhia pra passear', desc: 'Pontos turísticos, praias e cafés', icon: MapPinArea },
  { id: 'Companheiro de Estrada', label: 'Parceria de viagem', desc: 'Planejar e viajar junto do início ao fim', icon: Signpost },
  { id: 'Fazer Amizades', label: 'Amizades e dicas locais', desc: 'Bater papo e trocar experiências', icon: ChatsCircle },
  { id: 'Dividir Custos', label: 'Dividir custos', desc: 'Hospedagem, carro ou passeios', icon: HandCoins },
  { id: 'Networking', label: 'Networking nômade', desc: 'Quem trabalha remoto e curte coworking', icon: Laptop },
  { id: 'Romance / Dates', label: 'Romance', desc: 'Aberto(a) a um date na viagem', icon: Heart },
];

export const GENDER_PREF_OPTIONS: Option[] = [
  { id: 'all', label: 'Todo mundo', desc: 'Ver todos os viajantes' },
  { id: 'female', label: 'Só mulheres', desc: 'Modo seguro para se conectar com mulheres' },
  { id: 'male', label: 'Só homens', desc: 'Ver apenas viajantes homens' },
];

export const BIO_STARTERS = [
  'Meu lugar favorito no mundo é',
  'Numa viagem eu nunca abro mão de',
  'Topo qualquer rolê que envolva',
  'A melhor história que já vivi viajando',
];

export const labelFor = (options: Option[], id: string) => options.find((o) => o.id === id)?.label ?? id;
