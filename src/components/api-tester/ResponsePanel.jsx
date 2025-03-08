import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { FileText } from "lucide-react";

const statusColorMap = {
  '2': 'bg-green-100 text-green-800',
  '3': 'bg-blue-100 text-blue-800',
  '4': 'bg-yellow-100 text-yellow-800',
  '5': 'bg-red-100 text-red-800'
};

export default function ResponsePanel({ test }) {
  if (!test?.status && !test?.documentation) return null;

  const getStatusColor = (status) => {
    const firstDigit = String(status)[0];
    return statusColorMap[firstDigit] || 'bg-gray-100 text-gray-800';
  };

  const formatJson = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue={test?.status ? "response" : "documentation"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="response" disabled={!test?.status}>Response</TabsTrigger>
          <TabsTrigger value="headers" disabled={!test?.status}>Headers</TabsTrigger>
          <TabsTrigger value="documentation" disabled={!test?.documentation}>Documentation</TabsTrigger>
        </TabsList>

        {test?.status && (
          <>
            <TabsContent value="response">
              <div className="flex items-center justify-between mb-2">
                <Badge className={getStatusColor(test.status)}>
                  Status: {test.status}
                </Badge>
                {test.last_tested && (
                  <span className="text-sm text-gray-500">
                    Last tested: {format(new Date(test.last_tested), 'MMM d, yyyy HH:mm:ss')}
                  </span>
                )}
              </div>
              <ScrollArea className="h-96 rounded-md border">
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                  {formatJson(test.response || '')}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="headers">
              <ScrollArea className="h-96 rounded-md border">
                <div className="p-4 space-y-2">
                  {Object.entries(test.response_headers || {}).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-4">
                      <div className="font-medium text-sm">{key}</div>
                      <div className="col-span-2 text-sm font-mono break-all">{value}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </>
        )}

        <TabsContent value="documentation">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-medium">Documentation & Notes</h3>
            </div>
            
            {test.tags && test.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {test.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="px-2 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            <ScrollArea className="h-72 rounded-md border">
              <div className="p-4 whitespace-pre-wrap">
                {test.documentation || 'No documentation provided for this test.'}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}