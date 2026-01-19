"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PageContainer } from "@/components/page-container"
import { 
  GraduationCap, 
  UserCheck, 
  FileText, 
  Video, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  Users, 
  Award,
  BookOpen,
  CreditCard,
  Shield,
  Globe,
  TrendingUp,
  Zap,
  Target,
  ArrowRight,
  Building2,
  Coins
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { SignInModal } from "@/components/auth/sign-in-modal"
import { SignUpModal } from "@/components/auth/sign-up-modal"
import { useState } from "react"

const steps = [
  {
    number: 1,
    title: "Sign Up",
    description: "Create your account on Brightbyt and join our community of expert educators.",
    icon: UserCheck,
    color: "from-blue-500 to-blue-600"
  },
  {
    number: 2,
    title: "Apply",
    description: "Submit your application with your credentials, experience, and areas of expertise.",
    icon: FileText,
    color: "from-purple-500 to-purple-600"
  },
  {
    number: 3,
    title: "Aptitude Test",
    description: "Complete our comprehensive aptitude test to demonstrate your knowledge and teaching abilities.",
    icon: BookOpen,
    color: "from-green-500 to-green-600"
  },
  {
    number: 4,
    title: "Online Interview",
    description: "Participate in a one-on-one online interview with our team to discuss your teaching approach and goals.",
    icon: Video,
    color: "from-yellow-500 to-yellow-600"
  },
  {
    number: 5,
    title: "Get Approved",
    description: "Once approved, you'll receive access to your mentor dashboard and can start accepting bookings.",
    icon: CheckCircle,
    color: "from-indigo-500 to-indigo-600"
  },
  {
    number: 6,
    title: "Start Hosting",
    description: "Create and host live sessions, wait for students to join, and begin your teaching journey.",
    icon: Users,
    color: "from-pink-500 to-pink-600"
  },
  {
    number: 7,
    title: "Get Paid",
    description: "Choose your preferred payment method and start earning from your sessions.",
    icon: DollarSign,
    color: "from-emerald-500 to-emerald-600"
  }
]

const paymentMethods = [
  {
    name: "Bank Transfer",
    logo: "https://cdn.simpleicons.org/bankofamerica/1E4C78",
    icon: Building2,
    fallbackColor: "text-blue-500"
  },
  {
    name: "PayPal",
    logo: "https://cdn.simpleicons.org/paypal/00457C",
    icon: CreditCard,
    fallbackColor: "text-blue-600"
  },
  {
    name: "Stripe",
    logo: "https://cdn.simpleicons.org/stripe/635BFF",
    icon: CreditCard,
    fallbackColor: "text-indigo-600"
  }
] as const

// Full text content for text-to-speech
const fullPageText = `Start Earning with Brightbyt

Become a Mentor, Tutor, Therapist, or Educator

Join our platform and start sharing your expertise with students worldwide. Earn competitive income while making a meaningful impact on learners' lives.

Get Started Now

Who Can Join?

Brightbyt welcomes mentors, tutors, therapists, coaches, and educators from all fields and disciplines. Whether you specialize in academic subjects, professional skills, creative arts, wellness, technology, languages, or any other area of expertise, we have a place for you on our platform.

Our diverse community includes subject matter experts, certified teachers, industry professionals, therapists, life coaches, language instructors, coding mentors, business consultants, and many more. If you have knowledge to share and a passion for helping others learn and grow, you're the perfect fit for Brightbyt.

We value diversity in expertise, teaching styles, and backgrounds. Whether you're a seasoned professional with decades of experience or a recent graduate with fresh perspectives, your unique insights and teaching approach can make a significant difference in students' lives.

How to Get Started

Step 1: Sign Up. Create your account on Brightbyt and join our community of expert educators.

Step 2: Apply. Submit your application with your credentials, experience, and areas of expertise.

Step 3: Aptitude Test. Complete our comprehensive aptitude test to demonstrate your knowledge and teaching abilities.

Step 4: Online Interview. Participate in a one-on-one online interview with our team to discuss your teaching approach and goals.

Step 5: Get Approved. Once approved, you'll receive access to your mentor dashboard and can start accepting bookings.

Step 6: Start Hosting. Create and host live sessions, wait for students to join, and begin your teaching journey.

Step 7: Get Paid. Choose your preferred payment method and start earning from your sessions.

Payment Methods

Once you start earning, you can choose from multiple secure payment methods to receive your earnings: Bank Transfer, PayPal, and Stripe.

All payments are processed securely and transferred to your account according to your preferred schedule. You can update your payment method at any time from your mentor dashboard.

Everything You Need to Know

Getting Started

The application process is straightforward and designed to ensure quality while being accessible. After signing up, you'll complete a detailed application form where you'll provide information about your background, qualifications, areas of expertise, and teaching experience. This helps us understand your unique strengths and match you with the right students.

Aptitude Test

Our aptitude test is comprehensive but fair, designed to assess your knowledge in your chosen field, your ability to explain complex concepts clearly, and your teaching methodology. The test is conducted online at your convenience and typically takes 60-90 minutes to complete. Don't worry—we provide study materials and practice questions to help you prepare.

Online Interview

The online interview is a friendly conversation with our team where we'll discuss your teaching philosophy, your goals as an educator, and how you plan to help students succeed. This is also an opportunity for you to ask questions about the platform, our support systems, and what to expect as a Brightbyt mentor. The interview typically lasts 30-45 minutes and is conducted via video call.

After Approval

Once approved, you'll gain access to your comprehensive mentor dashboard where you can create your profile, set your availability, define your session topics, and set your rates. Our dynamic pricing system helps you optimize your earnings while remaining competitive. You'll also receive onboarding materials, best practices guides, and access to our mentor community for support and networking.

Hosting Sessions

Creating and hosting sessions is simple and intuitive. You can schedule one-on-one tutoring sessions, group classes, workshops, or specialized training programs. Our platform provides all the tools you need: video conferencing, screen sharing, interactive whiteboards, file sharing, and session recording capabilities. You set the session duration, maximum participants, and pricing. Once you publish a session, students can discover and book it, and you'll be notified when someone joins.

Earning Potential

Your earning potential on Brightbyt is directly tied to your expertise, experience, ratings, and the demand for your subject area. Our AI-powered pricing system helps you set competitive rates that reflect your value while remaining accessible to students. Many of our mentors earn substantial income, with top performers generating significant monthly revenue. The more sessions you host and the higher your ratings, the more you can earn.

Support & Resources

We're committed to your success as an educator. You'll have access to ongoing training, marketing support to help you attract students, technical assistance, and a dedicated support team. We also provide analytics and insights to help you understand your performance, optimize your sessions, and grow your student base. Our mentor community is active and supportive, offering opportunities for collaboration and knowledge sharing.

Flexibility & Freedom

One of the greatest advantages of teaching on Brightbyt is the flexibility it offers. You control your schedule, choose your students (if desired), set your rates, and decide what topics to teach. Whether you want to teach full-time, part-time, or just occasionally, the platform adapts to your needs. Work from anywhere in the world, at any time that suits you, and build your teaching practice at your own pace.

Ready to Start Your Journey?

Join thousands of educators who are already making a difference and earning on Brightbyt.

Apply Now`

// Payment Method Card Component
function PaymentMethodCard({ method, Icon }: { method: typeof paymentMethods[number], Icon: any }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
      <div className="relative w-10 h-10 flex items-center justify-center bg-white rounded p-1.5">
        {!imageError ? (
          <img
            src={method.logo}
            alt={method.name}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <Icon className={`w-6 h-6 ${method.fallbackColor}`} />
        )}
      </div>
      <span className="text-gray-100 font-['Verdana',sans-serif] font-medium">
        {method.name}
        {method.comingSoon && (
          <span className="text-yellow-400 text-sm ml-2">(coming soon)</span>
        )}
      </span>
    </div>
  )
}

export default function StartEarningPage() {
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/images/background.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <PageContainer className="flex-1 relative z-10">
        <div className="py-12 md:py-20">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="flex justify-center mb-6">
              <Image
                src="/images/logo1.png"
                alt="Brightbyt Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-['Verdana',sans-serif] drop-shadow-lg">
              Start Earning with Brightbyt
            </h1>
            <div className="max-w-4xl mx-auto">
              <p className="text-xl md:text-2xl text-white mb-4 font-['Verdana',sans-serif] leading-relaxed font-semibold drop-shadow-md">
                Become a <span className="text-yellow-400 font-bold">Mentor, Tutor, Therapist, or Educator</span>
              </p>
              <p className="text-lg text-gray-100 font-['Verdana',sans-serif] leading-relaxed drop-shadow-md mb-8">
                Join our platform and start sharing your expertise with students worldwide. 
                Earn competitive income while making a meaningful impact on learners' lives.
              </p>
              <Button
                onClick={() => setIsSignUpOpen(true)}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-8 py-6 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all font-['Verdana',sans-serif]"
              >
                Get Started Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* Who Can Join */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-8 text-center font-['Verdana',sans-serif] drop-shadow-lg">
                Who Can Join?
              </h2>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border-2 border-yellow-400/30 shadow-2xl">
                <div className="space-y-4 text-gray-100 font-['Verdana',sans-serif] leading-relaxed text-lg md:text-xl">
                  <p className="drop-shadow-md">
                    Brightbyt welcomes <strong className="text-white">mentors, tutors, therapists, coaches, and educators</strong> from all fields and disciplines. Whether you specialize in academic subjects, professional skills, creative arts, wellness, technology, languages, or any other area of expertise, we have a place for you on our platform.
                  </p>
                  <p className="drop-shadow-md">
                    Our diverse community includes <strong className="text-white">subject matter experts, certified teachers, industry professionals, therapists, life coaches, language instructors, coding mentors, business consultants, and many more</strong>. If you have knowledge to share and a passion for helping others learn and grow, you're the perfect fit for Brightbyt.
                  </p>
                  <p className="drop-shadow-md">
                    We value diversity in expertise, teaching styles, and backgrounds. Whether you're a seasoned professional with decades of experience or a recent graduate with fresh perspectives, your unique insights and teaching approach can make a significant difference in students' lives.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Application Process */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-12 text-center font-['Verdana',sans-serif] drop-shadow-lg">
                How to Get Started
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <motion.div
                      key={step.number}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Card className="bg-white/10 backdrop-blur-md border-2 border-yellow-400/30 shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
                        <CardContent className="p-6 text-center">
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                            <Icon className="w-8 h-8 text-white" />
                          </div>
                          <div className="w-10 h-10 rounded-full bg-yellow-400 text-gray-900 font-bold text-lg flex items-center justify-center mx-auto mb-4 font-['Verdana',sans-serif]">
                            {step.number}
                          </div>
                          <h3 className="text-xl font-bold text-white mb-3 font-['Verdana',sans-serif] drop-shadow-md">
                            {step.title}
                          </h3>
                          <p className="text-gray-200 text-sm leading-relaxed font-['Verdana',sans-serif] drop-shadow-sm">
                            {step.description}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Payment Methods */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-8 text-center font-['Verdana',sans-serif] drop-shadow-lg">
                Payment Methods
              </h2>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border-2 border-yellow-400/30 shadow-2xl">
                <p className="text-gray-100 font-['Verdana',sans-serif] leading-relaxed text-lg md:text-xl mb-6 drop-shadow-md">
                  Once you start earning, you can choose from multiple secure payment methods to receive your earnings:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map((method, index) => {
                    const Icon = method.icon
                    return (
                      <PaymentMethodCard
                        key={index}
                        method={method}
                        Icon={Icon}
                      />
                    )
                  })}
                </div>
                <p className="text-gray-200 font-['Verdana',sans-serif] leading-relaxed text-base mt-6 drop-shadow-sm">
                  All payments are processed securely and transferred to your account according to your preferred schedule. 
                  You can update your payment method at any time from your mentor dashboard.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Additional Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-8 text-center font-['Verdana',sans-serif] drop-shadow-lg">
                Everything You Need to Know
              </h2>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border-2 border-yellow-400/30 shadow-2xl">
                <div className="space-y-6 text-gray-100 font-['Verdana',sans-serif] leading-relaxed text-lg md:text-xl">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">Getting Started</h3>
                    <p className="drop-shadow-md">
                      The application process is straightforward and designed to ensure quality while being accessible. After signing up, you'll complete a detailed application form where you'll provide information about your background, qualifications, areas of expertise, and teaching experience. This helps us understand your unique strengths and match you with the right students.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">Aptitude Test</h3>
                    <p className="drop-shadow-md">
                      Our aptitude test is comprehensive but fair, designed to assess your knowledge in your chosen field, your ability to explain complex concepts clearly, and your teaching methodology. The test is conducted online at your convenience and typically takes 60-90 minutes to complete. Don't worry—we provide study materials and practice questions to help you prepare.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">Online Interview</h3>
                    <p className="drop-shadow-md">
                      The online interview is a friendly conversation with our team where we'll discuss your teaching philosophy, your goals as an educator, and how you plan to help students succeed. This is also an opportunity for you to ask questions about the platform, our support systems, and what to expect as a Brightbyt mentor. The interview typically lasts 30-45 minutes and is conducted via video call.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">After Approval</h3>
                    <p className="drop-shadow-md">
                      Once approved, you'll gain access to your comprehensive mentor dashboard where you can create your profile, set your availability, define your session topics, and set your rates. Our dynamic pricing system helps you optimize your earnings while remaining competitive. You'll also receive onboarding materials, best practices guides, and access to our mentor community for support and networking.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">Hosting Sessions</h3>
                    <p className="drop-shadow-md">
                      Creating and hosting sessions is simple and intuitive. You can schedule one-on-one tutoring sessions, group classes, workshops, or specialized training programs. Our platform provides all the tools you need: video conferencing, screen sharing, interactive whiteboards, file sharing, and session recording capabilities. You set the session duration, maximum participants, and pricing. Once you publish a session, students can discover and book it, and you'll be notified when someone joins.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">Earning Potential</h3>
                    <p className="drop-shadow-md">
                      Your earning potential on Brightbyt is directly tied to your expertise, experience, ratings, and the demand for your subject area. Our AI-powered pricing system helps you set competitive rates that reflect your value while remaining accessible to students. Many of our mentors earn substantial income, with top performers generating significant monthly revenue. The more sessions you host and the higher your ratings, the more you can earn.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">Support & Resources</h3>
                    <p className="drop-shadow-md">
                      We're committed to your success as an educator. You'll have access to ongoing training, marketing support to help you attract students, technical assistance, and a dedicated support team. We also provide analytics and insights to help you understand your performance, optimize your sessions, and grow your student base. Our mentor community is active and supportive, offering opportunities for collaboration and knowledge sharing.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-md">Flexibility & Freedom</h3>
                    <p className="drop-shadow-md">
                      One of the greatest advantages of teaching on Brightbyt is the flexibility it offers. You control your schedule, choose your students (if desired), set your rates, and decide what topics to teach. Whether you want to teach full-time, part-time, or just occasionally, the platform adapts to your needs. Work from anywhere in the world, at any time that suits you, and build your teaching practice at your own pace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-['Verdana',sans-serif] drop-shadow-lg">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-gray-100 mb-8 font-['Verdana',sans-serif] drop-shadow-md">
                Join thousands of educators who are already making a difference and earning on Brightbyt
              </p>
              <Button
                onClick={() => setIsSignUpOpen(true)}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-10 py-6 text-xl rounded-lg shadow-lg hover:shadow-xl transition-all font-['Verdana',sans-serif]"
              >
                Apply Now
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
          </motion.div>
        </div>
      </PageContainer>
      <div className="relative z-10">
        <Footer />
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignUp={() => {
          setIsSignInOpen(false)
          setIsSignUpOpen(true)
        }}
      />

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        onSignIn={() => {
          setIsSignUpOpen(false)
          setIsSignInOpen(true)
        }}
      />
    </div>
  )
}

