import 'zx/globals'
import fs from 'fs/promises'
import path from 'path'

const cmd = argv._[0]

async function prepare () {
  const packages = await $`pnpm ls -r --prod --json --depth 0 --filter "@standardproject/*"`.json()
  const dependencies = packages.reduce((acc, it) => {
    Object.values(it.dependencies ?? {}).forEach(dep => {
      if (dep.version.indexOf('link:') === 0) {
        return acc
      }
      acc[dep.from] = dep.version
    })
    return acc
  }, {})

  const appPKG = JSON.parse(await fs.readFile(path.resolve('./package.json'), 'utf-8'))

  const electronPKG = {
    version: appPKG.version,
    main: "main.js",
    type: "module",
    dependencies: {
      ...dependencies,
    },
    devDependencies: {
      "@electron-forge/cli": "^7.8.0",
      "@electron-forge/maker-deb": "^7.8.0",
      "@electron-forge/maker-dmg": "^7.8.0",
      "@electron-forge/maker-rpm": "^7.8.0",
      "@electron-forge/maker-squirrel": "^7.8.0",
      "@electron-forge/maker-zip": "^7.8.0",
      "@electron-forge/plugin-auto-unpack-natives": "^7.8.0",
      "@electron-forge/plugin-fuses": "^7.8.0",
      "@electron/fuses": "^1.8.0",
      "electron": "^36.1.0",
      "rimraf": "^6.0.1"
    },
  }

  // Copy all files from electron directory to build/electron
  const electronDir = path.resolve('./electron')
  const buildDir = path.resolve('./build/electron')
  const expressDir = path.resolve('./build/express')

  await fs.mkdir(buildDir, { recursive: true })
  await fs.writeFile(
    path.join(buildDir, 'package.json'),
    JSON.stringify(electronPKG, null, 2),
    'utf-8',
  )
  // Use zx's $ to run cp command
  await $`cp -R ${electronDir}/* ${buildDir}`
  
  await $`cp -R ${expressDir}/* ${buildDir}`

}

if (cmd == 'prepare') {
  await prepare()
} else {
  console.log('Unknown command:', cmd)
  process.exit(1)
}

