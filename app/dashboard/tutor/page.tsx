"use client"

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { MentorProfileCompletionForm } from '@/components/dashboard/mentor-profile-completion-form'
import { LoadingLogo } from '@/components/loading-logo'

export default function TutorDashboard() {
  const [userData, setUserData] = useState<any>(null)
  const [mentorData, setMentorData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/')
          return
        }

        // Fetch mentor data
        const { data: mentor, error: mentorError } = await supabase
          .from('mentors')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (mentorError || !mentor) {
          // Check user metadata to see if they signed up as tutor/mentor
          const userType = user.user_metadata?.user_type
          
          if (userType === 'tutor' || userType === 'mentor') {
            // User signed up as tutor but mentor record doesn't exist yet
            // Create a basic mentor record
            const { data: newMentor, error: createError } = await supabase
              .from('mentors')
              .insert({
                id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                email: user.email || '',
                title: '',
                description: '',
                specialization: '[]',
                rating: 1.00,
                total_reviews: 0,
                hourly_rate: 0.00,
                avatar: user.user_metadata?.avatar_url || '',
                experience: 0,
                languages: '[]',
                availability: 'Available now',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phone_number: '',
                gender: '',
                age: null,
                country: '',
                latitude: null,
                longitude: null,
                sessions_conducted: 0,
                qualifications: '',
                id_document: '',
                id_number: '',
                cv_document: '',
                payment_method: '',
                linkedin_profile: '',
                github_profile: '',
                twitter_profile: '',
                facebook_profile: '',
                instagram_profile: '',
                personal_website: '',
                bank_name: '',
                account_holder_name: '',
                account_number: '',
                routing_number: '',
                payment_account_details: '{}',
                payment_period: 'per_session',
                is_complete: false,
                is_verified: false
              })
              .select()
              .single()

            if (createError) {
              console.error('Error creating mentor record:', createError)
              // Still allow access, user can complete profile later
              setUserData({ 
                id: user.id, 
                email: user.email || '', 
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                user_type: 'mentor'
              })
            } else if (newMentor) {
              setMentorData(newMentor)
              setUserData({ ...newMentor, full_name: newMentor.name, user_type: 'mentor' })
              // Show profile completion modal for new mentors
              // Check for false or null/undefined
              if (newMentor.is_complete === false || newMentor.is_complete === null || newMentor.is_complete === undefined) {
                // Use setTimeout to ensure modal opens after component renders
                setTimeout(() => {
                  setIsProfileCompletionOpen(true)
                }, 100)
              }
            }
          } else {
            // User is not a mentor, redirect to learner dashboard
            router.push('/dashboard/learner')
            return
          }
        } else {
          setMentorData(mentor)
          // Use mentor data as user data for tutors
          setUserData({ ...mentor, full_name: mentor.name, user_type: 'mentor' })
          // Show profile completion modal if profile is not complete
          // Check for false or null/undefined
          if (mentor.is_complete === false || mentor.is_complete === null || mentor.is_complete === undefined) {
            // Use setTimeout to ensure modal opens after component renders
            setTimeout(() => {
              setIsProfileCompletionOpen(true)
            }, 100)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check if profile completion modal should be shown after data loads
  useEffect(() => {
    if (!loading && mentorData && (mentorData.is_complete === false || mentorData.is_complete === null || mentorData.is_complete === undefined)) {
      setIsProfileCompletionOpen(true)
    }
  }, [loading, mentorData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingLogo size={48} />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Welcome, {userData?.full_name || 'Tutor'}!</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">My Sessions</h2>
            <p className="text-gray-600">View and manage your scheduled sessions</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile</h2>
            <p className="text-gray-600">
              {mentorData?.is_complete ? 'Complete' : 'Complete your profile to start teaching'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Earnings</h2>
            <p className="text-gray-600">View your earnings and payment history</p>
          </div>
        </div>
      </div>

      {/* Mentor Profile Completion Form */}
      {userData && (
        <MentorProfileCompletionForm
          isOpen={isProfileCompletionOpen}
          onClose={() => setIsProfileCompletionOpen(false)}
          userId={userData.id}
          onComplete={() => {
            setIsProfileCompletionOpen(false)
            // Refresh mentor data
            const fetchMentorData = async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                const { data: mentor } = await supabase
                  .from('mentors')
                  .select('*')
                  .eq('id', user.id)
                  .single()
                if (mentor) {
                  setMentorData(mentor)
                  setUserData({ ...mentor, full_name: mentor.name, user_type: 'mentor' })
                }
              }
            }
            fetchMentorData()
          }}
        />
      )}
    </DashboardLayout>
  )
}


