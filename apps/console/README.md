# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

# express 模式

用途

- 在 Electron 作为 SSR 服务器使用
- 支持部署到 Node 环境

要启动 express 开发模

```sh
pnpm dev:express
```

构建 express 部署

```sh
pnpm build:express
```

Electron 预览

```sh
pnpm build:express && pnpm electron:preview
```

Electron 构建可执行文件

```sh
pnpm build:express && pnpm electron:package
```

Electron 打包 DMG

```sh
pnpm build:express && pnpm electron:make
```

---

Built with ❤️ using React Router.
