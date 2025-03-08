import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowRight, Clock, Search, Tag, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SavedTests({ tests, onSelect, onDelete }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);

  // Extract all unique tags from tests
  const allTags = [...new Set(tests.flatMap(test => test.tags || []))];

  // Filter tests based on search query and selected tag
  const filteredTests = tests.filter(test => {
    const matchesSearch = searchQuery === '' || 
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (test.documentation || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = selectedTag === null || 
      (test.tags || []).includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search tests..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={selectedTag === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedTag(null)}
          >
            All
          </Badge>
          {allTags.map(tag => (
            <Badge 
              key={tag} 
              variant={selectedTag === tag ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-2 p-1">
          {filteredTests.map((test) => (
            <div
              key={test.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => onSelect(test)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{test.method}</Badge>
                  <p className="font-medium truncate">{test.name}</p>
                </div>
                <p className="text-sm text-gray-500 truncate mt-1">{test.url}</p>
                {test.tags && test.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Tag className="w-3 h-3 text-gray-400" />
                    <div className="flex gap-1">
                      {test.tags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 px-1 rounded">
                          {tag}
                        </span>
                      ))}
                      {test.tags.length > 2 && (
                        <span className="text-xs text-gray-400">
                          +{test.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {test.last_tested && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {format(new Date(test.last_tested), 'MMM d, yyyy HH:mm')}
                  </div>
                )}
                {test.documentation && (
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {test.documentation.substring(0, 60)}
                    {test.documentation.length > 60 ? '...' : ''}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(test.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </Button>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}

          {filteredTests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || selectedTag ? 'No tests match your search' : 'No saved tests yet'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}