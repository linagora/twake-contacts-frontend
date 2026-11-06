const isImportMeta = (node, types) =>
  types.isMetaProperty(node) && node.meta.name === 'import'

const isHotProperty = (node, types) =>
  !node.computed && types.isIdentifier(node.property, { name: 'hot' })

// Jest's babel-preset-current-node-syntax@1.2.0 skips its Babel 7 syntax
// plugins on Babel 8. The scoped peer override in package.json reflects this.
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
