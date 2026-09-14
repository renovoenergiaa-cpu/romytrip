/**
 * Plugin Babel customizado para substituir `import.meta` por um objeto compatível.
 * O Zustand devtools usa `import.meta.env.MODE` para detectar o ambiente,
 * mas essa sintaxe causa SyntaxError no Expo web (script não-module).
 * 
 * Transforma:  import.meta.env.MODE
 * Para:        "production"
 */
module.exports = function replaceImportMeta() {
  return {
    visitor: {
      MetaProperty(path) {
        // Detecta exatamente `import.meta`
        if (
          path.node.meta &&
          path.node.meta.name === 'import' &&
          path.node.property &&
          path.node.property.name === 'meta'
        ) {
          // Substitui por { env: { MODE: "production" } }
          path.replaceWith(
            path.scope.buildUndefinedNode
              ? {
                  type: 'ObjectExpression',
                  properties: [
                    {
                      type: 'ObjectProperty',
                      computed: false,
                      shorthand: false,
                      key: { type: 'Identifier', name: 'env' },
                      value: {
                        type: 'ObjectExpression',
                        properties: [
                          {
                            type: 'ObjectProperty',
                            computed: false,
                            shorthand: false,
                            key: { type: 'Identifier', name: 'MODE' },
                            value: {
                              type: 'StringLiteral',
                              value:
                                process.env.NODE_ENV === 'development'
                                  ? 'development'
                                  : 'production',
                            },
                          },
                        ],
                      },
                    },
                  ],
                }
              : { type: 'ObjectExpression', properties: [] }
          );
        }
      },
    },
  };
};
