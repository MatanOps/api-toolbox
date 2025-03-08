import React, { useState, useEffect } from 'react';
import { ApiTest } from '@/api/entities';
import { ApiMonitor } from '@/api/entities';
import { SendEmail } from '@/api/integrations';
import MonitoringPanel from '../components/api-tester/MonitoringPanel';
import { Loader2, ArrowLeft, BarChart2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ApiMonitoring() {
  const navigate = useNavigate();
  const [apiTests, setApiTests] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tests, monitorList] = await Promise.all([
        ApiTest.list(),
        ApiMonitor.list('-created_date')
      ]);
      
      setApiTests(tests);
      setMonitors(monitorList);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load monitoring data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMonitor = async (monitorData) => {
    setIsProcessing(true);
    try {
      await ApiMonitor.create(monitorData);
      await loadData();
    } catch (error) {
      console.error("Error creating monitor:", error);
      setError("Failed to create monitor. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateMonitor = async (monitorData) => {
    setIsProcessing(true);
    try {
      await ApiMonitor.update(monitorData.id, monitorData);
      await loadData();
    } catch (error) {
      console.error("Error updating monitor:", error);
      setError("Failed to update monitor. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMonitor = async (monitorId) => {
    setIsProcessing(true);
    try {
      await ApiMonitor.delete(monitorId);
      await loadData();
    } catch (error) {
      console.error("Error deleting monitor:", error);
      setError("Failed to delete monitor. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunMonitor = async (monitor) => {
    setIsProcessing(true);
    try {
      // Find the test
      const test = apiTests.find(t => t.id === monitor.test_id);
      if (!test) {
        throw new Error("Test not found");
      }

      // Run the test
      const startTime = performance.now();
      
      // Prepare URL with query parameters
      const url = new URL(test.url);
      Object.entries(test.query_params || {}).forEach(([key, value]) => {
        if (key && value) url.searchParams.append(key, value);
      });

      // Prepare request options
      const options = {
        method: test.method,
        headers: test.headers || {}
      };

      if (test.body && test.method !== 'GET') {
        options.body = test.body;
      }

      // Send request
      const response = await fetch(url.toString(), options);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      // Determine if successful
      const isSuccessful = response.status >= 200 && response.status < 300 && 
                          responseTime <= (monitor.success_threshold || 200);

      // Get response as text (for potential error messages)
      const responseText = await response.text();
      
      // Update test record
      await ApiTest.update(test.id, {
        ...test,
        status: response.status,
        response: responseText,
        response_headers: Object.fromEntries([...response.headers.entries()]),
        last_tested: new Date().toISOString()
      });

      // Create history record
      const updatedHistory = [
        {
          timestamp: new Date().toISOString(),
          status: response.status,
          response_time: responseTime,
          success: isSuccessful,
          success_threshold: monitor.success_threshold || 200
        },
        ...(monitor.history || []).slice(0, 99) // Keep last 100 records
      ];

      // If not successful, send notification
      if (!isSuccessful && monitor.notification_email) {
        await SendEmail({
          to: monitor.notification_email,
          subject: `⚠️ API Monitor Alert: ${monitor.name}`,
          body: `
            <h2>API Monitor Alert</h2>
            <p>Your API monitor "${monitor.name}" detected an issue:</p>
            
            <ul>
              <li><strong>Status Code:</strong> ${response.status}</li>
              <li><strong>Response Time:</strong> ${responseTime}ms (threshold: ${monitor.success_threshold}ms)</li>
              <li><strong>URL:</strong> ${test.url}</li>
              <li><strong>Method:</strong> ${test.method}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            
            <p>Please check your API and resolve any issues.</p>
          `
        });
      }

      // Calculate next run time based on frequency
      const now = new Date();
      let nextRun;
      
      switch (monitor.frequency) {
        case 'hourly':
          nextRun = new Date(now.setHours(now.getHours() + 1));
          break;
        case 'daily':
          nextRun = new Date(now.setDate(now.getDate() + 1));
          break;
        case 'weekly':
          nextRun = new Date(now.setDate(now.getDate() + 7));
          break;
        default:
          nextRun = new Date(now.setDate(now.getDate() + 1));
      }

      // Update monitor with results and next run time
      await ApiMonitor.update(monitor.id, {
        ...monitor,
        history: updatedHistory,
        last_run: new Date().toISOString(),
        next_run: nextRun.toISOString()
      });

      await loadData();
    } catch (error) {
      console.error("Error running monitor:", error);
      setError(`Failed to run monitor: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("ApiTester")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">API Monitoring</h1>
              <p className="text-gray-500">Schedule and monitor your critical API tests</p>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate(createPageUrl("ApiAnalytics"))}
            className="gap-2"
          >
            <BarChart2 className="w-4 h-4" />
            Analytics Dashboard
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : (
          <MonitoringPanel
            apiTests={apiTests}
            monitors={monitors}
            onCreateMonitor={handleCreateMonitor}
            onUpdateMonitor={handleUpdateMonitor}
            onDeleteMonitor={handleDeleteMonitor}
            onRunMonitor={handleRunMonitor}
          />
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span>Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}