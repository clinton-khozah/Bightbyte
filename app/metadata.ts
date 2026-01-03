import { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://brightbyt.com'

export function generateMetadata(pageTitle?: string, description?: string, path?: string): Metadata {
  const title = pageTitle 
    ? `${pageTitle} | Brightbyt`
    : "Brightbyt - Career Opportunities Platform | Jobs, Internships, Learnerships & Bursaries"
  
  const metaDescription = description || 
    "Brightbyt connects job seekers with career opportunities worldwide. Find jobs, internships, learnerships, and bursaries. Post jobs, connect with employers, and advance your career."
  
  const url = path ? `${siteUrl}${path}` : siteUrl

  return {
    title,
    description: metaDescription,
    openGraph: {
      title,
      description: metaDescription,
      url,
      siteName: 'Brightbyt',
      images: [
        {
          url: `${siteUrl}/images/logo1.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
      images: [`${siteUrl}/images/logo1.png`],
    },
    alternates: {
      canonical: url,
    },
  }
}

