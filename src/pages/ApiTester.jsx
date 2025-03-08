import React, { useState, useEffect } from 'react';
import { ApiTest } from '@/api/entities';
import RequestPanel from '../components/api-tester/RequestPanel';
import ResponsePanel from '../components/api-tester/ResponsePanel';
import SavedTests from '../components/api-tester/SavedTests';
import PreBuiltTests from '../components/api-tester/PreBuiltTests';
import { Loader2, Bell, BarChart2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ApiTester() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("test");
  const [sidebarTab, setSidebarTab] = useState("tests");
  const [savedTests, setSavedTests] = useState([]);
  const [currentTest, setCurrentTest] = useState({
    method: 'GET',
    url: '',
    name: '',
    headers: {},
    query_params: {},
    body: '',
    documentation: '',
    tags: []
  });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadSavedTests();
  }, []);

  const loadSavedTests = async () => {
    const tests = await ApiTest.list('-last_tested');
    setSavedTests(tests);
  };

  const handleSendRequest = async () => {
    setIsSending(true);
    try {
      // Prepare URL with query parameters
      const url = new URL(currentTest.url);
      Object.entries(currentTest.query_params || {}).forEach(([key, value]) => {
        if (key && value) url.searchParams.append(key, value);
      });

      // Prepare request options
      const options = {
        method: currentTest.method,
        headers: currentTest.headers || {}
      };

      if (currentTest.body && currentTest.method !== 'GET') {
        options.body = currentTest.body;
      }

      // Send request
      const startTime = performance.now();
      const response = await fetch(url.toString(), options);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      const responseData = await response.text();
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Update current test with response
      const updatedTest = {
        ...currentTest,
        status: response.status,
        response: responseData,
        response_headers: responseHeaders,
        last_tested: new Date().toISOString()
      };
      setCurrentTest(updatedTest);

      // If this is a saved test, update it
      if (currentTest.id) {
        await ApiTest.update(currentTest.id, updatedTest);
        await loadSavedTests();
      }
    } catch (error) {
      setCurrentTest(prev => ({
        ...prev,
        status: 0,
        response: error.message,
        response_headers: {},
        last_tested: new Date().toISOString()
      }));
    }
    setIsSending(false);
  };

  const handleSaveTest = async () => {
    if (!currentTest.name || !currentTest.url) return;

    if (currentTest.id) {
      await ApiTest.update(currentTest.id, currentTest);
    } else {
      await ApiTest.create(currentTest);
    }
    await loadSavedTests();
  };

  const handleDeleteTest = async (id) => {
    await ApiTest.delete(id);
    if (currentTest.id === id) {
      setCurrentTest({
        method: 'GET',
        url: '',
        name: '',
        headers: {},
        query_params: {},
        body: '',
        documentation: '',
        tags: []
      });
    }
    
    await loadSavedTests();
  };

  const handlePreBuiltTestSelect = (testTemplate) => {
    // Remove id to make it a new test
    const { id, category, ...testData } = testTemplate;
    setCurrentTest(testData);
    setActiveTab("test");
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      <div className="w-72 h-screen p-4 border-r bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">API Tester</h2>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => navigate(createPageUrl("ApiMonitoring"))}
              title="Configure API Monitors"
            >
              <Bell className="w-4 h-4" />
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => navigate(createPageUrl("ApiAnalytics"))}
              title="View Analytics"
            >
              <BarChart2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      
        <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="tests" className="mt-4">
            <SavedTests
              tests={savedTests}
              onSelect={(test) => {
                setCurrentTest(test);
                setActiveTab("test");
              }}
              onDelete={handleDeleteTest}
            />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <PreBuiltTests onSelect={handlePreBuiltTestSelect} />
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="flex-1 h-screen p-6 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="test">Test Editor</TabsTrigger>
          </TabsList>
          
          <TabsContent value="test" className="mt-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <RequestPanel
                test={currentTest}
                onTestChange={setCurrentTest}
                onSendRequest={handleSendRequest}
                onSaveTest={handleSaveTest}
                isSending={isSending}
              />

              {isSending && (
                <div className="flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              )}

              <ResponsePanel test={currentTest} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}