import { Platform } from 'react-native';

// No Android com a tela de ponta a ponta (sempre ligada no Expo Go e no app.json),
// o sistema não encolhe mais a janela quando o teclado abre: o teclado fica por
// cima do que estiver embaixo. As telas são compensadas uma vez no _layout raiz;
// cada Modal é uma janela à parte e precisa compensar sozinho, com este valor.
export const modalKeyboardBehavior = Platform.OS === 'web' ? undefined : 'padding';
