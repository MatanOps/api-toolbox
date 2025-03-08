import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Copy, Database, Globe, Package, Server, ShieldCheck } from "lucide-react";

// Pre-built test templates
const preBuiltTests = [
  {
    id: 'get-users',
    name: 'Get Users',
    category: 'REST APIs',
    description: 'Fetch a list of users from a REST API',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users',
    headers: {
      'Accept': 'application/json'
    },
    query_params: {},
    body: '',
    documentation: 'This test fetches users from the JSONPlaceholder API, which is a free fake API for testing and prototyping.',
    tags: ['example', 'users', 'rest']
  },
  {
    id: 'post-user',
    name: 'Create User',
    category: 'REST APIs',
    description: 'Create a new user via POST request',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/users',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    query_params: {},
    body: JSON.stringify({
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      address: {
        street: 'Main St',
        suite: 'Apt 123',
        city: 'Anytown',
        zipcode: '12345'
      },
      phone: '555-123-4567',
      website: 'johndoe.com'
    }, null, 2),
    documentation: 'This test creates a new user via a POST request to the JSONPlaceholder API.',
    tags: ['example', 'users', 'rest', 'post']
  },
  {
    id: 'weather-api',
    name: 'Get Weather',
    category: 'Weather APIs',
    description: 'Get current weather data for a location',
    method: 'GET',
    url: 'https://api.openweathermap.org/data/2.5/weather',
    headers: {},
    query_params: {
      q: 'London,uk',
      appid: 'YOUR_API_KEY', // User needs to replace with their own API key
      units: 'metric'
    },
    body: '',
    documentation: 'This test fetches current weather data from the OpenWeatherMap API. You need to replace YOUR_API_KEY with your actual OpenWeatherMap API key.',
    tags: ['weather', 'example', 'get']
  },
  {
    id: 'authentication',
    name: 'OAuth 2.0 Token',
    category: 'Authentication',
    description: 'Request an OAuth 2.0 token using client credentials',
    method: 'POST',
    url: 'https://example.com/oauth/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    query_params: {},
    body: 'grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET',
    documentation: 'This is an example of how to request an OAuth 2.0 token using the client credentials grant type. Replace the URL, client ID, and client secret with your actual values.',
    tags: ['oauth', 'authentication', 'security']
  },
  {
    id: 'graphql-query',
    name: 'GraphQL Query',
    category: 'GraphQL',
    description: 'Example GraphQL query',
    method: 'POST',
    url: 'https://api.github.com/graphql',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_GITHUB_TOKEN'
    },
    query_params: {},
    body: JSON.stringify({
      query: `{
  viewer {
    login
    name
    repositories(first: 5) {
      edges {
        node {
          name
          description
          stargazerCount
        }
      }
    }
  }
}`
    }, null, 2),
    documentation: 'This is an example of a GitHub GraphQL API query. Replace YOUR_GITHUB_TOKEN with your actual GitHub personal access token.',
    tags: ['graphql', 'github', 'example']
  },
  {
    id: 'put-update',
    name: 'Update Resource',
    category: 'REST APIs',
    description: 'Update a resource using PUT',
    method: 'PUT',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    query_params: {},
    body: JSON.stringify({
      id: 1,
      title: 'Updated Title',
      body: 'This is the updated content of the post.',
      userId: 1
    }, null, 2),
    documentation: 'This test demonstrates how to update an existing resource using the HTTP PUT method.',
    tags: ['put', 'update', 'rest']
  },
  {
    id: 'delete-resource',
    name: 'Delete Resource',
    category: 'REST APIs',
    description: 'Delete a resource using DELETE',
    method: 'DELETE',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: {
      'Accept': 'application/json'
    },
    query_params: {},
    body: '',
    documentation: 'This test demonstrates how to delete a resource using the HTTP DELETE method.',
    tags: ['delete', 'rest']
  },
  {
    id: 'cors-test',
    name: 'CORS Test',
    category: 'Security',
    description: 'Test if an API supports CORS',
    method: 'OPTIONS',
    url: 'https://api.example.com/data',
    headers: {
      'Origin': 'https://yourapplication.com',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    },
    query_params: {},
    body: '',
    documentation: 'This test checks if an API supports Cross-Origin Resource Sharing (CORS) by sending an OPTIONS preflight request. Replace the URL and Origin header with your actual values.',
    tags: ['security', 'cors', 'options']
  }
];

// Group tests by category
const groupedTests = preBuiltTests.reduce((groups, test) => {
  if (!groups[test.category]) {
    groups[test.category] = [];
  }
  groups[test.category].push(test);
  return groups;
}, {});

export default function PreBuiltTests({ onSelect }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Pre-built Test Templates</h2>
        <p className="text-gray-500 text-sm">
          Start quickly with these sample API test templates. Click any template to load it into the editor.
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-6 pr-4">
          {Object.entries(groupedTests).map(([category, tests]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                {category === 'REST APIs' && <Globe className="w-5 h-5 text-blue-500" />}
                {category === 'Weather APIs' && <Server className="w-5 h-5 text-cyan-500" />}
                {category === 'Authentication' && <ShieldCheck className="w-5 h-5 text-green-500" />}
                {category === 'GraphQL' && <Database className="w-5 h-5 text-purple-500" />}
                {category === 'Security' && <ShieldCheck className="w-5 h-5 text-red-500" />}
                <h3 className="text-lg font-medium">{category}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests.map((test) => (
                  <Card 
                    key={test.id} 
                    className="hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => onSelect(test)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-md">{test.name}</CardTitle>
                          <CardDescription>{test.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{test.method}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 truncate">{test.url}</div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex flex-wrap gap-1">
                          {test.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Copy className="w-3 h-3" />
                          <span className="text-xs">Use</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}