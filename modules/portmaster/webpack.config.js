// Uses ngx-build-plus to add tailwindcss support
module.exports = {
  module: {
    rules: [
      {
        test: /\.scss$/,
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            ident: 'postcss',
            syntax: 'postcss-scss',
            plugins: [
              'postcss-import',
              'tailwindcss',
              'autoprefixer',
            ],
          },
        },
      },
    ],
  },
};
