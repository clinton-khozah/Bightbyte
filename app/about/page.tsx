import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PageContainer } from "@/components/page-container"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/images/adspace.png')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <main className="flex-1 relative z-10">
        <div className="container py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-6 text-white">About Us</h1>
            
            <div className="space-y-6 text-gray-300">
              <p className="text-lg">
                We are a dedicated team passionate about connecting businesses with the right advertising opportunities. 
                Our platform was created to simplify the process of buying and selling ad spaces.
              </p>
              
              <h2 className="text-2xl font-bold text-white mt-8">Our Mission</h2>
              <p className="text-lg">
                To create a transparent, efficient marketplace that benefits both advertisers and publishers. 
                We believe in fair pricing, quality ad spaces, and building long-term relationships.
              </p>
              
              <h2 className="text-2xl font-bold text-white mt-8">Our Values</h2>
              <ul className="space-y-3 list-disc pl-5">
                <li>Transparency in all transactions</li>
                <li>Quality over quantity</li>
                <li>Innovation in advertising solutions</li>
                <li>Customer-focused approach</li>
                <li>Data-driven decision making</li>
              </ul>
              
              <div className="pt-8">
                <Button asChild>
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  )
}