'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDemoGuide } from '@/hooks/useDemoGuide';
import { 
  Play, 
  RotateCcw, 
  GitBranch, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Loader2,
  Check,
  X
} from 'lucide-react';

export default function DemoPage() {
  const { demoStatus, isLoading, error, executeDemoAction, runAllSteps } = useDemoGuide();
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  if (!demoStatus?.demoMode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Demo Mode Not Available</CardTitle>
            <CardDescription>
              Demo mode is not enabled. Please contact your administrator to enable demo mode.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const steps = [
    {
      id: 'reset',
      name: 'Reset Demo Data',
      description: 'Clear existing demo data and prepare fresh environment',
      icon: RotateCcw,
      action: () => executeDemoAction('reset'),
    },
    {
      id: 'open-pr',
      name: 'Open Pull Request',
      description: 'Simulate opening a GitHub pull request',
      icon: GitBranch,
      action: () => executeDemoAction('open-pr'),
    },
    {
      id: 'degrade',
      name: 'Degrade Health Check',
      description: 'Temporarily degrade health check to demonstrate monitoring',
      icon: AlertTriangle,
      action: () => executeDemoAction('degrade'),
    },
    {
      id: 'recover',
      name: 'Recover Health Check',
      description: 'Restore health check to normal operation',
      icon: CheckCircle,
      action: () => executeDemoAction('recover'),
    },
    {
      id: 'close-pr',
      name: 'Close Pull Request',
      description: 'Simulate closing the GitHub pull request',
      icon: XCircle,
      action: () => executeDemoAction('close-pr'),
    },
  ];

  const handleStepClick = async (stepId: string, action: () => Promise<any>) => {
    setCurrentStep(stepId);
    try {
      await action();
    } catch (err) {
      console.error(`Step ${stepId} failed:`, err);
    } finally {
      setCurrentStep(null);
    }
  };

  const handleRunAll = async () => {
    setCurrentStep('all');
    try {
      await runAllSteps();
    } catch (err) {
      console.error('Run all steps failed:', err);
    } finally {
      setCurrentStep(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Guided Demo</h1>
          <p className="text-gray-600 mt-2">
            Follow these steps to experience the full DevInfra OpsHub workflow
          </p>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <Button
            onClick={handleRunAll}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading && currentStep === 'all' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run All Steps
          </Button>
        </div>

        <div className="grid gap-4">
          {steps.map((step, index) => {
            const isCompleted = demoStatus.steps.find(s => s.id === step.id)?.completed || false;
            const isRunning = currentStep === step.id;
            const Icon = step.icon;

            return (
              <Card key={step.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-600" />
                          </div>
                        ) : isRunning ? (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <Icon className="h-4 w-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{step.name}</CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isCompleted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Completed
                        </Badge>
                      )}
                      <Button
                        onClick={() => handleStepClick(step.id, step.action)}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                      >
                        {isRunning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Run'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Demo Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Watch the Deployments tab to see preview environments being created</li>
            <li>• Check the Health tab to see health check status changes</li>
            <li>• View Analytics to see deployment metrics and success rates</li>
            <li>• All demo actions are logged in the audit trail</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
