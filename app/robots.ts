import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://lailacollections.my.id'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/dashboard/', // Disallow crawlers from trying to crawl the protected dashboard routes
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
