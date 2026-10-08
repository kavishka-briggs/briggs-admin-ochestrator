import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import dotenv from 'dotenv'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const envFilePath = path.resolve(rootDir, '.env')
const orchConfigPath = path.resolve(rootDir, 'public/config-orch.js')

const trimEnvValue = (value?: string) => value?.trim() || ''

const buildOrchConfigContent = () => {
  let fileEnv: Record<string, string> = {}
  if (fs.existsSync(envFilePath)) {
    fileEnv = Object.fromEntries(
      Object.entries(dotenv.parse(fs.readFileSync(envFilePath)))
        .filter(([key]) => key.startsWith('VITE_'))
        .map(([key, value]) => [key, trimEnvValue(value)]),
    )
  }
  // map to a dictionary of env variables that start with VITE_
  const envVars = Object.keys(process.env)
    .filter((key) => key.startsWith('VITE_'))
    .reduce((acc, key) => {
      acc[key] = trimEnvValue(process.env[key])
      return acc
    }, {} as Record<string, string>)

  // merge fileEnv and envVars, with envVars taking precedence
  const mergedEnv = { ...fileEnv, ...envVars }
  return `window.orch_env = {
  ${Object.entries(mergedEnv)
      .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
      .join(',\n')}
};\n`
}
const writeOrchConfig = () => {
  const nextContent = buildOrchConfigContent()
  const currentContent = fs.existsSync(orchConfigPath)
    ? fs.readFileSync(orchConfigPath, 'utf8')
    : ''

  if (currentContent !== nextContent) {
    fs.writeFileSync(orchConfigPath, nextContent, 'utf8')
  }
}

export const orchConfigPlugin = (): Plugin => ({
  name: 'orch-config-generator',
  buildStart() {
    writeOrchConfig()
    this.addWatchFile(envFilePath)
  },
  configureServer(server) {
    writeOrchConfig()
    server.watcher.add(envFilePath)

    server.watcher.on('change', (changedPath) => {
      if (path.resolve(changedPath) !== envFilePath) {
        return
      }

      writeOrchConfig()
      server.ws.send({ type: 'full-reload' })
    })
  }
})
