'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Settings, Activity, ExternalLink, Copy, Check } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

interface Project {
  id: string
  name: string
  repoFullName: string
  defaultBranch: string
  providerConfig?: {
    provider: string
    vercelProjectId?: string
  }
  notifications?: Array<{
    type: string
    slackChannel?: string
  }>
}

interface Deployment {
  id: string
  prNumber: number
  branch: string
  status: string
  url?: string
  createdAt: string
  destroyedAt?: string
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'deployments' | 'environments' | 'health' | 'analytics' | 'settings'>('deployments')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectData, deploymentsData] = await Promise.all([
          api.getProject(params.id),
          api.getDeployments(params.id),
        ])
        
        setProject(projectData)
        setDeployments(deploymentsData)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push('/login')
          return
        }
        setError('Failed to load project data')
        console.error('Project error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [params.id, router])

  const copyWebhookUrl = () => {
    const webhookUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/webhooks/github`
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-100 text-green-800'
      case 'BUILDING':
        return 'bg-blue-100 text-blue-800'
      case 'ERROR':
        return 'bg-red-100 text-red-800'
      case 'DESTROYED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error || 'Project not found'}</p>
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
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <p className="text-muted-foreground">{project.repoFullName}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('deployments')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'deployments'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Activity className="h-4 w-4 mr-2 inline" />
                Deployments
              </button>
              <button
                onClick={() => setActiveTab('environments')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'environments'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Building2 className="h-4 w-4 mr-2 inline" />
                Environments
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'health'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Activity className="h-4 w-4 mr-2 inline" />
                Health
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'analytics'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2 inline" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-md ${
                  activeTab === 'settings'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Settings className="h-4 w-4 mr-2 inline" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'deployments' && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Preview Deployments</h2>
            
            {deployments.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">No deployments</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deployments will appear here when PRs are opened or updated.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deployments.map((deployment) => (
                      <tr key={deployment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{deployment.prNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {deployment.branch}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deployment.status)}`}>
                            {deployment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {deployment.url ? (
                            <a
                              href={deployment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(deployment.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'environments' && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Environment Variables</h2>
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Environment Management</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Environment variables and secret management will be available in the next update.
              </p>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Features coming soon:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Encrypted environment variable storage</li>
                  <li>Secret rotation policies</li>
                  <li>Environment-specific configurations (Preview/Staging/Production)</li>
                  <li>Automatic injection into preview deployments</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Health Monitoring</h2>
            <div className="text-center py-12">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Health Monitoring</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Health checks and monitoring will be available in the next update.
              </p>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Features coming soon:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Automated health checks for preview deployments</li>
                  <li>Latency monitoring and uptime tracking</li>
                  <li>Slack alerts for degraded services</li>
                  <li>Performance charts and analytics</li>
                  <li>Custom health check endpoints</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Deploy Analytics</h2>
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Deploy Analytics</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Performance metrics and analytics will be available in the next update.
              </p>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Features coming soon:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Success rate tracking and P95 create times</li>
                  <li>Error taxonomy and failure analysis</li>
                  <li>Performance charts and time-series data</li>
                  <li>Weekly digest reports via Slack</li>
                  <li>Deployment lifecycle event tracking</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">GitHub Webhook</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Webhook URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/webhooks/github`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted"
                    />
                    <button
                      onClick={copyWebhookUrl}
                      className="px-3 py-2 border border-input border-l-0 rounded-r-md hover:bg-muted"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Secret
                  </label>
                  <input
                    type="text"
                    value="GITHUB_WEBHOOK_SECRET from your .env"
                    readOnly
                    className="w-full px-3 py-2 border border-input rounded-md bg-muted"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>To set up the webhook in GitHub:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to your repository settings → Webhooks</li>
                    <li>Click "Add webhook"</li>
                    <li>Set Payload URL to the URL above</li>
                    <li>Set Content type to "application/json"</li>
                    <li>Set Secret to your GITHUB_WEBHOOK_SECRET</li>
                    <li>Select "Let me select individual events" → Pull requests</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Provider Configuration</h3>
              <div className="text-sm text-muted-foreground">
                <p>Provider configuration will be available in the next update.</p>
                <p>This will allow you to configure Vercel or Netlify credentials for automatic deployments.</p>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Slack Notifications</h3>
              <div className="text-sm text-muted-foreground">
                <p>Slack notification configuration will be available in the next update.</p>
                <p>This will allow you to receive notifications when deployments start, succeed, or fail.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
