declare module "next-pwa" {
  import { NextConfig } from "next"

  interface PWAConfig {
    dest?: string
    register?: boolean
    skipWaiting?: boolean
    disable?: boolean
    scope?: string
    sw?: string
    runtimeCaching?: Array<{
      urlPattern: RegExp | string
      handler: "CacheFirst" | "CacheOnly" | "NetworkFirst" | "NetworkOnly" | "StaleWhileRevalidate"
      options?: {
        cacheName?: string
        expiration?: {
          maxEntries?: number
          maxAgeSeconds?: number
        }
        networkTimeoutSeconds?: number
        cacheableResponse?: {
          statuses?: number[]
          headers?: Record<string, string>
        }
      }
    }>
    buildExcludes?: Array<string | RegExp>
    publicExcludes?: Array<string>
    fallbacks?: {
      document?: string
      image?: string
      audio?: string
      video?: string
      font?: string
    }
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig
  export default withPWA
}
