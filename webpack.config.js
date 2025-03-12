const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/index.js',
    output: {
      filename: 'bundle.[contenthash].js',
      path: path.resolve(__dirname, 'build'),
      clean: true
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    devServer: {
      static: path.join(__dirname, 'public'),
      port: 3000,
      hot: true,
      open: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.ico',
        minify: isProduction
      }),
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: 'public', 
            to: './', 
            globOptions: {
              ignore: ['**/index.html', '**/favicon.ico']
            }
          }
        ]
      })
    ],
    resolve: {
      extensions: ['.js']
    },
    performance: {
      hints: isProduction ? 'warning' : false
    }
  };
};