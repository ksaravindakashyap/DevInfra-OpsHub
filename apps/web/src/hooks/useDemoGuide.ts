'use client';

import { useState, useEffect } from 'react';

interface DemoStep {
  id: string;
  name: string;
  completed: boolean;
}

interface DemoStatus {
  demoMode: boolean;
  steps: DemoStep[];
}

export function useDemoGuide() {
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDemoStatus();
  }, []);

  const fetchDemoStatus = async () => {
    try {
      const response = await fetch('/api/demo/status');
      if (response.ok) {
        const status = await response.json();
        setDemoStatus(status);
        setError(null);
      } else {
        setError('Failed to fetch demo status');
      }
    } catch (err) {
      setError('Failed to fetch demo status');
      console.error('Failed to fetch demo status:', err);
    }
  };

  const executeDemoAction = async (action: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/demo/${action}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`${action} result:`, result);
        // Refresh demo status
        await fetchDemoStatus();
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to execute ${action}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to execute ${action}`;
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const runAllSteps = async () => {
    if (!demoStatus?.demoMode) {
      throw new Error('Demo mode is not enabled');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Reset
      await executeDemoAction('reset');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Open PR
      await executeDemoAction('open-pr');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Degrade health
      await executeDemoAction('degrade');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Recover health
      await executeDemoAction('recover');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 5: Close PR
      await executeDemoAction('close-pr');

      return { success: true, message: 'All demo steps completed successfully' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run all demo steps';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    demoStatus,
    isLoading,
    error,
    executeDemoAction,
    runAllSteps,
    refreshStatus: fetchDemoStatus,
  };
}
