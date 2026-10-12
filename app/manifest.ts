import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Honest Mailbox',
    short_name: 'HM',
    description: 'A safe and honest space for couples to communicate.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/HM.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/HM.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/HM.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
