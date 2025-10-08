'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Play, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DemoStatus {
  demoMode: boolean;
  steps: Array<{
    id: string;
    name: string;
    completed: boolean;
  }>;
}

export function DemoBanner() {
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchDemoStatus();
  }, []);

  const fetchDemoStatus = async () => {
    try {
      const response = await fetch('/api/demo/status');
      if (response.ok) {
        const status = await response.json();
        setDemoStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch demo status:', error);
    }
  };

  const executeDemoAction = async (action: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/demo/${action}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`${action} result:`, result);
        // Refresh demo status
        await fetchDemoStatus();
      } else {
        console.error(`Failed to execute ${action}`);
      }
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!demoStatus?.demoMode || !isVisible) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Play className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Demo Mode: Follow the guided steps
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeDemoAction('open-pr')}
              disabled={isLoading}
              className="text-xs"
            >
              Open PR
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeDemoAction('degrade')}
              disabled={isLoading}
              className="text-xs"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Degrade
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeDemoAction('recover')}
              disabled={isLoading}
              className="text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Recover
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeDemoAction('close-pr')}
              disabled={isLoading}
              className="text-xs"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Close PR
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeDemoAction('reset')}
              disabled={isLoading}
              className="text-xs"
            >
              Reset
            </Button>
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsVisible(false)}
          className="text-blue-600 hover:text-blue-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
