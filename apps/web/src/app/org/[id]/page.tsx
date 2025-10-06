'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, FolderOpen, GitBranch, Calendar } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

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

interface CreateProjectForm {
  name: string
  repoFullName: string
  defaultBranch: string
}

export default function OrgPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [org, setOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CreateProjectForm>({
    name: '',
    repoFullName: '',
    defaultBranch: 'main',
  })

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const orgs = await api.getOrgs()
        const foundOrg = orgs.find(o => o.id === params.id)
        
        if (!foundOrg) {
          setError('Organization not found')
          return
        }
        
        setOrg(foundOrg)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login')
          return
        }
        setError('Failed to load organization')
        console.error('Org error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrg()
  }, [params.id, router])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const newProject = await api.createProject(params.id, formData)
      console.log('Project created:', newProject)
      
      // Reset form and hide it
      setFormData({ name: '', repoFullName: '', defaultBranch: 'main' })
      setShowCreateForm(false)
      
      // Reload org data
      const orgs = await api.getOrgs()
      const updatedOrg = orgs.find(o => o.id === params.id)
      if (updatedOrg) {
        setOrg(updatedOrg)
      }
    } catch (err) {
      console.error('Failed to create project:', err)
      alert('Failed to create project. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error || 'Organization not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-primary hover:underline"
          >
            Back to Dashboard
          </button>
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
              <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
              <p className="text-muted-foreground">Manage your projects and team</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCreateForm && (
          <div className="mb-8 p-6 border rounded-lg bg-card">
            <h3 className="text-lg font-medium text-foreground mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="My Awesome Project"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Repository (owner/repo)
                </label>
                <input
                  type="text"
                  value={formData.repoFullName}
                  onChange={(e) => setFormData({ ...formData, repoFullName: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="octocat/Hello-World"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Default Branch
                </label>
                <input
                  type="text"
                  value={formData.defaultBranch}
                  onChange={(e) => setFormData({ ...formData, defaultBranch: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="main"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-input rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Projects</h2>
          
          {org.projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No projects</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating your first project.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {org.projects.map((project) => (
                <div
                  key={project.id}
                  className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-foreground">{project.name}</h3>
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <GitBranch className="h-4 w-4 mr-2" />
                      {project.repoFullName}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Created {new Date(project.createdAt).toLocaleDateString()}
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
