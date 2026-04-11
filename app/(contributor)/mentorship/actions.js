'use server'

import { getMentorEligibility } from '@/lib/levels'

// Mock mentor data
const MOCK_MENTORS = [
  {
    handle: 'sarahchen',
    name: 'Sarah Chen',
    level: 3,
    avatar: 'https://i.pravatar.cc/150?img=1',
    specialties: ['React', 'TypeScript', 'Node.js'],
    reviewsCompleted: 42,
    online: true,
    mentorXP: 4200,
  },
  {
    handle: 'alexkumar',
    name: 'Alex Kumar',
    level: 2,
    avatar: 'https://i.pravatar.cc/150?img=12',
    specialties: ['Python', 'Django', 'PostgreSQL'],
    reviewsCompleted: 28,
    online: true,
    mentorXP: 2800,
  },
  {
    handle: 'emilyrodriguez',
    name: 'Emily Rodriguez',
    level: 3,
    avatar: 'https://i.pravatar.cc/150?img=5',
    specialties: ['Go', 'Kubernetes', 'Docker'],
    reviewsCompleted: 35,
    online: false,
    mentorXP: 3500,
  },
  {
    handle: 'davidpark',
    name: 'David Park',
    level: 2,
    avatar: 'https://i.pravatar.cc/150?img=8',
    specialties: ['Rust', 'WebAssembly', 'Systems'],
    reviewsCompleted: 19,
    online: true,
    mentorXP: 1900,
  },
]

const MOCK_REVIEW_REQUESTS = [
  {
    id: 'req-1',
    prTitle: 'Fix: Update button component accessibility',
    prUrl: 'https://github.com/facebook/react/pull/12345',
    repo: 'facebook/react',
    menteeHandle: 'johndoe',
    menteeName: 'John Doe',
    menteeLevel: 1,
    difficulty: 'EASY',
    status: 'pending',
    requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'req-2',
    prTitle: 'Feature: Add dark mode support to docs',
    prUrl: 'https://github.com/vercel/next.js/pull/54321',
    repo: 'vercel/next.js',
    menteeHandle: 'janedoe',
    menteeName: 'Jane Doe',
    menteeLevel: 1,
    difficulty: 'MEDIUM',
    status: 'in_review',
    requestedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
]

export async function getMentorshipData(githubHandle, userLevel) {
  const eligibility = getMentorEligibility(userLevel)
  
  if (eligibility.canMentor) {
    // Mentor view
    const reviewQueue = MOCK_REVIEW_REQUESTS.filter(r => r.menteeLevel < userLevel)
    const mentorStats = {
      menteesHelped: 12,
      reviewsCompleted: MOCK_MENTORS.find(m => m.handle === githubHandle)?.reviewsCompleted || 15,
      mentorXP: MOCK_MENTORS.find(m => m.handle === githubHandle)?.mentorXP || 1500,
    }
    
    return {
      success: true,
      isMentor: true,
      mentorStats,
      reviewQueue,
      mentees: [
        {
          handle: 'johndoe',
          name: 'John Doe',
          level: 1,
          avatar: 'https://i.pravatar.cc/150?img=33',
          activePRs: 2,
          reviewsRequested: 5,
        },
        {
          handle: 'janedoe',
          name: 'Jane Doe',
          level: 1,
          avatar: 'https://i.pravatar.cc/150?img=44',
          activePRs: 1,
          reviewsRequested: 3,
        },
      ],
    }
  } else {
    // Mentee view
    const availableMentors = MOCK_MENTORS.filter(m => 
      eligibility.canRequestMentorFrom.includes(m.level)
    )
    
    return {
      success: true,
      isMentor: false,
      availableMentors,
      currentMentor: MOCK_MENTORS[0],
      myRequests: MOCK_REVIEW_REQUESTS.filter(r => r.menteeHandle === githubHandle),
    }
  }
}

export async function requestMentorReview(menteeHandle, mentorHandle, prUrl, prTitle) {
  // Store in localStorage for MVP
  if (typeof window !== 'undefined') {
    const requests = JSON.parse(localStorage.getItem('mentor_requests') || '[]')
    const newRequest = {
      id: `req-${Date.now()}`,
      prTitle,
      prUrl,
      menteeHandle,
      mentorHandle,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }
    requests.push(newRequest)
    localStorage.setItem('mentor_requests', JSON.stringify(requests))
  }
  
  return { success: true, requestId: `req-${Date.now()}` }
}

export async function completeMentorReview(requestId, mentorHandle, status) {
  // Update request status
  if (typeof window !== 'undefined') {
    const requests = JSON.parse(localStorage.getItem('mentor_requests') || '[]')
    const updated = requests.map(r => 
      r.id === requestId ? { ...r, status, reviewedAt: new Date().toISOString() } : r
    )
    localStorage.setItem('mentor_requests', JSON.stringify(updated))
  }
  
  // Award mentor XP (+100)
  return { success: true, xpAwarded: 100 }
}
