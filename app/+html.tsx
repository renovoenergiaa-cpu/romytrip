import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Só é usado com web.output "static"/"server". Hoje o app.json usa "single", e o
// modelo da página é public/index.html — mantenha os dois em sincronia.

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* Sem user-scalable=no / maximum-scale: bloquear zoom é falha de acessibilidade.
            O zoom em inputs no iOS é evitado com fonte de 16px (abaixo). */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#FAFAFA" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0A0A0A" />
        <title>Romy</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveStyles = `
html, body {
  height: 100%;
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
  /* App de toque: controles não devem selecionar texto num toque longo.
     Campos de texto voltam a permitir seleção logo abaixo. */
  user-select: none;
  -webkit-user-select: none;
  background-color: #FAFAFA;
}
@media (prefers-color-scheme: dark) {
  html, body { background-color: #0A0A0A; }
}
#root {
  display: flex;
  height: 100%;
  height: 100dvh;
  flex: 1;
}
input, textarea, select {
  font-size: 16px !important;
  user-select: text;
  -webkit-user-select: text;
  caret-color: #6338FA;
}
[role="button"], button, a {
  touch-action: manipulation;
  -webkit-touch-callout: none;
}
::selection {
  background: rgba(99, 56, 250, 0.22);
}
:focus-visible {
  outline: 2px solid #6338FA;
  outline-offset: 2px;
}
input:focus, textarea:focus {
  outline: none;
}
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 56, 250, 0.35) transparent;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;
