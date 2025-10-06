'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, FolderOpen, Users } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
  avatarUrl: string
}

interface Organization {
  id: string
  name: string
  slug: string
  projects: Project[]
  members: any[]
}

interface Project {
  id: string
  name: string
  repoFullName: string
  defaultBranch: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, orgsData] = await Promise.all([
          api.getMe(),
          api.getOrgs(),
        ])
        
        setUser(userData)
        setOrgs(orgsData)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login')
          return
        }
        setError('Failed to load dashboard data')
        console.error('Dashboard error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.name || user?.email}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <img
                src={user?.avatarUrl}
                alt={user?.name}
                className="h-8 w-8 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Organizations</h2>
          
          {orgs.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No organizations</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating your first organization.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/org/${org.id}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-foreground">{org.name}</h3>
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {org.projects.length} project{org.projects.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {org.members.length} member{org.members.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
