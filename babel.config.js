const isImportMeta = (node, types) =>
  types.isMetaProperty(node) && node.meta.name === 'import'

const isHotProperty = (node, types) =>
  !node.computed && types.isIdentifier(node.property, { name: 'hot' })

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  overrides: [
    {
      test: /node_modules[/\\]react-router[/\\]/,
      env: {
        test: {
          plugins: [
            ({ types }) => ({
              visitor: {
                MemberExpression(path) {
                  // Jest runs React Router without Vite's HMR runtime.
                  if (
                    isImportMeta(path.node.object, types) &&
                    isHotProperty(path.node, types)
                  ) {
                    path.replaceWith(
                      types.unaryExpression('void', types.numericLiteral(0))
                    )
                  }
                }
              }
            })
          ]
        }
      }
    }
  ]
}
