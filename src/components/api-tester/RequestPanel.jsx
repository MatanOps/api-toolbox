import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyValueInput } from "./KeyValueInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Send, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RequestPanel({ 
  test, 
  onTestChange, 
  onSendRequest,
  onSaveTest,
  isSending 
}) {
  const handleInputChange = (field, value) => {
    onTestChange({ ...test, [field]: value });
  };

  const handleTagRemove = (tagToRemove) => {
    const newTags = (test.tags || []).filter(tag => tag !== tagToRemove);
    handleInputChange('tags', newTags);
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      const newTag = e.target.value.trim();
      if (newTag && !(test.tags || []).includes(newTag)) {
        handleInputChange('tags', [...(test.tags || []), newTag]);
        e.target.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select
          value={test.method}
          onValueChange={(value) => handleInputChange('method', value)}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="HEAD">HEAD</SelectItem>
            <SelectItem value="OPTIONS">OPTIONS</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={test.url}
          onChange={(e) => handleInputChange('url', e.target.value)}
          placeholder="Enter API URL"
          className="flex-1"
        />
      </div>

      <Input
        value={test.name}
        onChange={(e) => handleInputChange('name', e.target.value)}
        placeholder="Test name"
      />

      <Tabs defaultValue="headers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="params">Query Params</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="headers">
          <ScrollArea className="h-64 rounded-md border p-4">
            <KeyValueInput
              pairs={test.headers || {}}
              onChange={(headers) => handleInputChange('headers', headers)}
              placeholder="header"
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="params">
          <ScrollArea className="h-64 rounded-md border p-4">
            <KeyValueInput
              pairs={test.query_params || {}}
              onChange={(params) => handleInputChange('query_params', params)}
              placeholder="parameter"
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="body">
          <Textarea
            value={test.body || ''}
            onChange={(e) => handleInputChange('body', e.target.value)}
            placeholder="Request body (JSON)"
            className="h-64 font-mono"
          />
        </TabsContent>

        <TabsContent value="documentation">
          <div className="space-y-4">
            <Textarea
              value={test.documentation || ''}
              onChange={(e) => handleInputChange('documentation', e.target.value)}
              placeholder="Add documentation, instructions or notes about this test..."
              className="h-36"
            />
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Tag className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium">Tags</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-2">
                {(test.tags || []).map((tag, index) => (
                  <Badge key={index} variant="outline" className="px-2 py-1">
                    {tag}
                    <button 
                      className="ml-2 text-gray-500 hover:text-gray-700"
                      onClick={() => handleTagRemove(tag)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              
              <Input
                placeholder="Add tag (press Enter)"
                onKeyDown={handleTagAdd}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onSaveTest}
          className="gap-2"
        >
          <Save className="w-4 h-4" /> Save Test
        </Button>
        <Button 
          onClick={onSendRequest}
          disabled={isSending}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          {isSending ? 'Sending...' : 'Send Request'}
        </Button>
      </div>
    </div>
  );
}