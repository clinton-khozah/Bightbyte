import { Metadata } from 'next'
import { JobCards } from '@/components/job-cards'

export const metadata: Metadata = {
  title: "Browse Jobs - Find Your Next Career Opportunity",
  description: "Browse thousands of job opportunities across various industries. Find full-time, part-time, remote, and contract positions. Search by category, location, and experience level.",
  keywords: [
    "jobs",
    "job search",
    "career opportunities",
    "employment",
    "job listings",
    "find jobs",
    "job board",
    "career",
    "hiring",
    "recruitment"
  ],
  openGraph: {
    title: "Browse Jobs - Brightbyt",
    description: "Browse thousands of job opportunities across various industries.",
    type: "website",
  },
}

export default function JobsPage() {
  return (
    <div className="min-h-screen">
      <JobCards />
    </div>
  )
}

