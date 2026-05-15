import { puppeteerLauncher } from '@web/test-runner-puppeteer'

export default {
  files: ['client/test/**/*.test.js'],
  nodeResolve: true,
  concurrency: 1,
  setupFiles: ['client/test/setup.js'],
  browsers: [
    puppeteerLauncher({
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    })
  ]
}
