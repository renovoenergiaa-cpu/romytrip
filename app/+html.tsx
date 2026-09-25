import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
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
  height: -webkit-fill-available;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  background-color: transparent;
}
#root {
  display: flex;
  height: 100%;
  height: -webkit-fill-available;
  flex: 1;
}
input, textarea, select {
  font-size: 16px !important;
}
`;
