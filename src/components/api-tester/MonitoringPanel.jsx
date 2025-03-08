import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInHours, parseISO, formatDistanceToNow } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  Eye, 
  CheckCircle, 
  XCircle, 
  BarChart as BarChartIcon, 
  Sliders, 
  Mail, 
  Calendar, 
  StopCircle,
  Trash2,
  Activity,
  Play,
  Plus,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';

export default function MonitoringPanel({ 
  apiTests, 
  monitors, 
  onCreateMonitor, 
  onUpdateMonitor, 
  onDeleteMonitor, 
  onRunMonitor 
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    test_id: '',
    frequency: 'daily',
    notification_email: '',
    active: true,
    success_threshold: 200
  });

  const handleCreateOrUpdateMonitor = () => {
    if (!formData.name || !formData.test_id || !formData.notification_email) return;

    if (editingMonitor) {
      onUpdateMonitor({
        ...editingMonitor,
        ...formData
      });
    } else {
      // Calculate next run time based on frequency
      const now = new Date();
      let nextRun;
      
      switch (formData.frequency) {
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

      onCreateMonitor({
        ...formData,
        history: [],
        next_run: nextRun.toISOString()
      });
    }

    setIsCreateDialogOpen(false);
    setEditingMonitor(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      test_id: '',
      frequency: 'daily',
      notification_email: '',
      active: true,
      success_threshold: 200
    });
  };

  const handleEditMonitor = (monitor) => {
    setFormData({
      name: monitor.name,
      description: monitor.description || '',
      test_id: monitor.test_id,
      frequency: monitor.frequency,
      notification_email: monitor.notification_email,
      active: monitor.active,
      success_threshold: monitor.success_threshold || 200
    });
    setEditingMonitor(monitor);
    setIsCreateDialogOpen(true);
  };

  const getMonitorStatus = (monitor) => {
    if (!monitor.active) return "inactive";
    if (!monitor.history || monitor.history.length === 0) return "pending";
    return monitor.history[0].success ? "healthy" : "failing";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case "failing":
        return <Badge className="bg-red-100 text-red-800">Failing</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getNextRunText = (monitor) => {
    if (!monitor.active) return "Monitor inactive";
    if (!monitor.next_run) return "Not scheduled";
    
    try {
      const nextRunDate = parseISO(monitor.next_run);
      return `Next run: ${formatDistanceToNow(nextRunDate, { addSuffix: true })}`;
    } catch (e) {
      return "Schedule unknown";
    }
  };

  const calculateMonitorMetrics = (monitor) => {
    if (!monitor.history || monitor.history.length === 0) {
      return {
        avgResponseTime: 0,
        successRate: 0,
        trend: 'neutral',
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0
      };
    }

    const totalRuns = monitor.history.length;
    const successfulRuns = monitor.history.filter(run => run.success).length;
    const failedRuns = totalRuns - successfulRuns;
    
    // Calculate success rate
    const successRate = (successfulRuns / totalRuns) * 100;
    
    // Calculate average response time
    const totalResponseTime = monitor.history.reduce((sum, run) => sum + (run.response_time || 0), 0);
    const avgResponseTime = totalResponseTime / totalRuns;
    
    // Calculate trend (comparing last 5 runs to previous 5)
    let trend = 'neutral';
    if (totalRuns >= 10) {
      const recent5Avg = monitor.history.slice(0, 5).reduce((sum, run) => sum + (run.response_time || 0), 0) / 5;
      const previous5Avg = monitor.history.slice(5, 10).reduce((sum, run) => sum + (run.response_time || 0), 0) / 5;
      
      if (recent5Avg < previous5Avg) {
        trend = 'improving'; // Lower response time is better
      } else if (recent5Avg > previous5Avg) {
        trend = 'degrading'; // Higher response time is worse
      }
    }
    
    return {
      avgResponseTime,
      successRate,
      trend,
      totalRuns,
      successfulRuns,
      failedRuns
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">API Monitors</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => {
          setIsCreateDialogOpen(isOpen);
          if (!isOpen) {
            resetForm();
            setEditingMonitor(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Monitor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMonitor ? 'Edit Monitor' : 'Create API Monitor'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="monitor-name">Monitor Name</Label>
                <Input 
                  id="monitor-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Critical Login API"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monitor-description">Description</Label>
                <Textarea 
                  id="monitor-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What this monitor checks"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monitor-test">Select API Test</Label>
                <Select 
                  value={formData.test_id} 
                  onValueChange={(value) => setFormData({...formData, test_id: value})}
                >
                  <SelectTrigger id="monitor-test">
                    <SelectValue placeholder="Select a test" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiTests.map(test => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.name} ({test.method})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monitor-frequency">Frequency</Label>
                  <Select 
                    value={formData.frequency} 
                    onValueChange={(value) => setFormData({...formData, frequency: value})}
                  >
                    <SelectTrigger id="monitor-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="success-threshold">Response Time Threshold (ms)</Label>
                  <Input 
                    id="success-threshold"
                    type="number"
                    value={formData.success_threshold}
                    onChange={(e) => setFormData({...formData, success_threshold: parseInt(e.target.value)})}
                    min={100}
                    step={100}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notification-email">Notification Email</Label>
                <Input 
                  id="notification-email"
                  type="email"
                  value={formData.notification_email}
                  onChange={(e) => setFormData({...formData, notification_email: e.target.value})}
                  placeholder="Where to send alerts"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="active-status"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                />
                <Label htmlFor="active-status">Active</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrUpdateMonitor}>
                {editingMonitor ? 'Update Monitor' : 'Create Monitor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {monitors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-gray-500">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p>No API monitors configured yet.</p>
            <p className="text-sm mt-2">Set up monitoring for your critical API endpoints.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Status Card */}
          <Card className="lg:col-span-3 shadow-md">
            <CardHeader>
              <CardTitle>API Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-gray-500">Total Monitors</span>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">{monitors.length}</div>
                    <div className="ml-2 flex space-x-1">
                      <Badge className="bg-green-100 text-green-800">
                        {monitors.filter(m => getMonitorStatus(m) === "healthy").length} healthy
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-gray-500">Success Rate</span>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold">
                      {Math.round(
                        monitors.reduce((acc, monitor) => {
                          const metrics = calculateMonitorMetrics(monitor);
                          return acc + (metrics.successRate || 0);
                        }, 0) / monitors.length
                      )}%
                    </div>
                    <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${Math.round(
                            monitors.reduce((acc, monitor) => {
                              const metrics = calculateMonitorMetrics(monitor);
                              return acc + (metrics.successRate || 0);
                            }, 0) / monitors.length
                          )}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-gray-500">Avg Response Time</span>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">
                      {Math.round(
                        monitors.reduce((acc, monitor) => {
                          const metrics = calculateMonitorMetrics(monitor);
                          return acc + (metrics.avgResponseTime || 0);
                        }, 0) / monitors.length
                      )} ms
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <span className="text-sm font-medium text-gray-500">Failed Monitors</span>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold text-red-600">
                      {monitors.filter(m => getMonitorStatus(m) === "failing").length}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Overall Health Graph */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Health Trend (Last 7 days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={generateOverallHealthData(monitors)}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(parseISO(date), 'MM/dd')}
                      />
                      <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tickFormatter={(value) => `${value}ms`} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'successRate') return [`${value}%`, 'Success Rate'];
                          if (name === 'avgResponseTime') return [`${value}ms`, 'Avg Response Time'];
                          return [value, name];
                        }}
                        labelFormatter={(date) => format(parseISO(date), 'yyyy-MM-dd')}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="successRate" 
                        name="Success Rate" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.2} 
                        yAxisId="left"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgResponseTime" 
                        name="Avg Response Time" 
                        stroke="#6366f1" 
                        yAxisId="right"
                        dot={{ r: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Monitor Cards */}
          {monitors.map(monitor => (
            <Card 
              key={monitor.id} 
              className={`hover:shadow-md transition-all border-l-4 ${
                getMonitorStatus(monitor) === 'healthy' ? 'border-l-green-500' :
                getMonitorStatus(monitor) === 'failing' ? 'border-l-red-500' :
                getMonitorStatus(monitor) === 'inactive' ? 'border-l-gray-300' :
                'border-l-yellow-500'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle>{monitor.name}</CardTitle>
                    <CardDescription>{monitor.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(getMonitorStatus(monitor))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="mr-2">Frequency: {monitor.frequency}</span>
                    {monitor.active && (
                      <Badge variant="outline" className="ml-auto">
                        {getNextRunText(monitor)}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Mail className="w-4 h-4 mr-2" />
                    {monitor.notification_email}
                  </div>
                  
                  {monitor.history && monitor.history.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {/* Metrics row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {(() => {
                          const metrics = calculateMonitorMetrics(monitor);
                          return (
                            <>
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-500">Success Rate</div>
                                <div className="text-lg font-semibold">{Math.round(metrics.successRate)}%</div>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-500">Avg Response</div>
                                <div className="text-lg font-semibold">{Math.round(metrics.avgResponseTime)}ms</div>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <div className="text-xs text-gray-500">Total Runs</div>
                                <div className="text-lg font-semibold">{metrics.totalRuns}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      
                      {/* Sparkline chart */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Response Time (Last 10 runs)</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              monitor.history[0].response_time > monitor.success_threshold
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            Latest: {monitor.history[0].response_time}ms
                          </Badge>
                        </div>
                        <div className="h-16 mt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart 
                              data={[...monitor.history.slice(0, 10)].reverse()}
                            >
                              <Line 
                                type="monotone" 
                                dataKey="response_time" 
                                stroke="#6366f1" 
                                strokeWidth={2}
                                dot={{ r: 1 }}
                                isAnimationActive={false}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="success_threshold" 
                                stroke="#ef4444" 
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                dot={false}
                                isAnimationActive={false}
                              />
                              <YAxis domain={['dataMin', 'auto']} hide />
                              <Tooltip 
                                formatter={(value) => `${value}ms`}
                                labelFormatter={(_, payload) => {
                                  if (payload && payload.length > 0) {
                                    try {
                                      return format(parseISO(payload[0].payload.timestamp), 'yyyy-MM-dd HH:mm:ss');
                                    } catch (e) {
                                      return 'Unknown date';
                                    }
                                  }
                                  return '';
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      {/* Status Distribution */}
                      <div className="pt-2">
                        <div className="text-xs text-gray-500 mb-1">Status Distribution</div>
                        <div className="flex items-center">
                          <div className="w-full h-4 rounded-full overflow-hidden bg-gray-200 flex">
                            {(() => {
                              const counts = countStatusCodes(monitor.history);
                              const total = monitor.history.length;
                              return (
                                <>
                                  {counts['2'] > 0 && (
                                    <div 
                                      className="h-full bg-green-500" 
                                      style={{width: `${(counts['2'] / total) * 100}%`}}
                                      title={`${counts['2']} OK responses (${Math.round((counts['2'] / total) * 100)}%)`}
                                    ></div>
                                  )}
                                  {counts['3'] > 0 && (
                                    <div 
                                      className="h-full bg-blue-500" 
                                      style={{width: `${(counts['3'] / total) * 100}%`}}
                                      title={`${counts['3']} Redirect responses (${Math.round((counts['3'] / total) * 100)}%)`}
                                    ></div>
                                  )}
                                  {counts['4'] > 0 && (
                                    <div 
                                      className="h-full bg-yellow-500" 
                                      style={{width: `${(counts['4'] / total) * 100}%`}}
                                      title={`${counts['4']} Client Error responses (${Math.round((counts['4'] / total) * 100)}%)`}
                                    ></div>
                                  )}
                                  {counts['5'] > 0 && (
                                    <div 
                                      className="h-full bg-red-500" 
                                      style={{width: `${(counts['5'] / total) * 100}%`}}
                                      title={`${counts['5']} Server Error responses (${Math.round((counts['5'] / total) * 100)}%)`}
                                    ></div>
                                  )}
                                  {counts['0'] > 0 && (
                                    <div 
                                      className="h-full bg-gray-500" 
                                      style={{width: `${(counts['0'] / total) * 100}%`}}
                                      title={`${counts['0']} Other responses (${Math.round((counts['0'] / total) * 100)}%)`}
                                    ></div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2 px-2" 
                            onClick={() => setSelectedMonitor(monitor)}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center bg-gray-50 rounded-md p-4 mt-2">
                      <span className="text-gray-500 text-sm">No monitoring data available</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedMonitor(monitor)}
                >
                  <Eye className="w-4 h-4 mr-1" /> Details
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditMonitor(monitor)}
                  >
                    <Sliders className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={monitor.active ? "outline" : "default"} 
                    size="sm"
                    onClick={() => onUpdateMonitor({...monitor, active: !monitor.active})}
                  >
                    {monitor.active ? (
                      <StopCircle className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onRunMonitor(monitor)}
                  >
                    <Activity className="w-4 h-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedMonitor && (
        <Dialog open={!!selectedMonitor} onOpenChange={(isOpen) => !isOpen && setSelectedMonitor(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selectedMonitor.name}</span>
                {getStatusBadge(getMonitorStatus(selectedMonitor))}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-2">
              <Tabs defaultValue="performance">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="performance" className="pt-4">
                  {selectedMonitor.history && selectedMonitor.history.length > 0 ? (
                    <div className="space-y-6">
                      {/* Performance metrics summary */}
                      <div className="grid grid-cols-3 gap-4">
                        {(() => {
                          const metrics = calculateMonitorMetrics(selectedMonitor);
                          return (
                            <>
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Success Rate</p>
                                      <p className="text-2xl font-bold mt-1">{Math.round(metrics.successRate)}%</p>
                                    </div>
                                    <div className={`p-2 rounded-full ${
                                      metrics.successRate >= 90 ? 'bg-green-100' : 
                                      metrics.successRate >= 75 ? 'bg-yellow-100' : 'bg-red-100'
                                    }`}>
                                      <CheckCircle className={`h-5 w-5 ${
                                        metrics.successRate >= 90 ? 'text-green-500' : 
                                        metrics.successRate >= 75 ? 'text-yellow-500' : 'text-red-500'
                                      }`} />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                    <span>{metrics.successfulRuns} successful</span>
                                    <span>|</span>
                                    <span>{metrics.failedRuns} failed</span>
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                                      <p className="text-2xl font-bold mt-1">{Math.round(metrics.avgResponseTime)}ms</p>
                                    </div>
                                    <div className={`p-2 rounded-full ${
                                      metrics.trend === 'improving' ? 'bg-green-100' : 
                                      metrics.trend === 'degrading' ? 'bg-red-100' : 'bg-gray-100'
                                    }`}>
                                      {metrics.trend === 'improving' ? (
                                        <TrendingDown className="h-5 w-5 text-green-500" />
                                      ) : metrics.trend === 'degrading' ? (
                                        <TrendingUp className="h-5 w-5 text-red-500" />
                                      ) : (
                                        <Clock className="h-5 w-5 text-gray-500" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 text-sm">
                                    {metrics.trend === 'improving' ? (
                                      <span className="text-green-500">Improving</span>
                                    ) : metrics.trend === 'degrading' ? (
                                      <span className="text-red-500">Degrading</span>
                                    ) : (
                                      <span className="text-gray-500">Stable</span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Status Breakdown</p>
                                      <p className="text-2xl font-bold mt-1">{metrics.totalRuns} runs</p>
                                    </div>
                                    <div className="p-2 rounded-full bg-gray-100">
                                      <Activity className="h-5 w-5 text-blue-500" />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-3">
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                      {(() => {
                                        const counts = countStatusCodes(selectedMonitor.history);
                                        const total = selectedMonitor.history.length;
                                        return (
                                          <>
                                            {counts['2'] > 0 && (
                                              <div 
                                                className="h-full bg-green-500 float-left" 
                                                style={{width: `${(counts['2'] / total) * 100}%`}}
                                              ></div>
                                            )}
                                            {counts['3'] > 0 && (
                                              <div 
                                                className="h-full bg-blue-500 float-left" 
                                                style={{width: `${(counts['3'] / total) * 100}%`}}
                                              ></div>
                                            )}
                                            {counts['4'] > 0 && (
                                              <div 
                                                className="h-full bg-yellow-500 float-left" 
                                                style={{width: `${(counts['4'] / total) * 100}%`}}
                                              ></div>
                                            )}
                                            {counts['5'] > 0 && (
                                              <div 
                                                className="h-full bg-red-500 float-left" 
                                                style={{width: `${(counts['5'] / total) * 100}%`}}
                                              ></div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </>
                          );
                        })()}
                      </div>

                      {/* Response Time Chart */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Response Time Trend</CardTitle>
                          <CardDescription>
                            Response time over last {Math.min(30, selectedMonitor.history.length)} runs with success threshold
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={[...selectedMonitor.history.slice(0, 30)].reverse()}
                                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="timestamp" 
                                  tickFormatter={(timestamp) => {
                                    try {
                                      return format(parseISO(timestamp), 'MM/dd HH:mm');
                                    } catch (e) {
                                      return '';
                                    }
                                  }}
                                  minTickGap={30}
                                />
                                <YAxis />
                                <Tooltip 
                                  formatter={(value, name) => {
                                    if (name === 'response_time') return [`${value}ms`, 'Response Time'];
                                    if (name === 'success_threshold') return [`${value}ms`, 'Threshold'];
                                    return [value, name];
                                  }}
                                  labelFormatter={(timestamp) => {
                                    try {
                                      return format(parseISO(timestamp), 'yyyy-MM-dd HH:mm:ss');
                                    } catch (e) {
                                      return timestamp;
                                    }
                                  }}
                                />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="response_time" 
                                  name="Response Time" 
                                  stroke="#6366f1" 
                                  strokeWidth={2}
                                  activeDot={{ r: 6 }}
                                  dot={(props) => {
                                    const { cx, cy, payload } = props;
                                    if (!payload.success) {
                                      return (
                                        <circle 
                                          cx={cx} 
                                          cy={cy} 
                                          r={4} 
                                          fill="#ef4444" 
                                          stroke="none" 
                                        />
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="success_threshold" 
                                  name="Threshold" 
                                  stroke="#ef4444" 
                                  strokeDasharray="5 5"
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Status Distribution */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Status Code Distribution</CardTitle>
                            <CardDescription>
                              Breakdown of HTTP status codes
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={generateStatusData(selectedMonitor.history)}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {generateStatusData(selectedMonitor.history).map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={
                                          entry.name.startsWith('2') ? '#10b981' :
                                          entry.name.startsWith('3') ? '#3b82f6' :
                                          entry.name.startsWith('4') ? '#f59e0b' :
                                          entry.name.startsWith('5') ? '#ef4444' : '#6b7280'
                                        } 
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value, name) => ([`${value} requests`, name])} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Success/Failure Distribution</CardTitle>
                            <CardDescription>
                              Monitor results over time
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={generateSuccessData(selectedMonitor.history)}
                                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis 
                                    dataKey="date"
                                    tickFormatter={(date) => format(parseISO(date), 'MM/dd')}
                                  />
                                  <YAxis />
                                  <Tooltip 
                                    formatter={(value, name) => {
                                      if (name === 'success') return [value, 'Successful'];
                                      if (name === 'failure') return [value, 'Failed'];
                                      return [value, name];
                                    }}
                                    labelFormatter={(date) => format(parseISO(date), 'yyyy-MM-dd')}
                                  />
                                  <Legend />
                                  <Bar dataKey="success" name="Success" stackId="a" fill="#10b981" />
                                  <Bar dataKey="failure" name="Failure" stackId="a" fill="#ef4444" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                      <p>No performance data available for this monitor yet.</p>
                      <Button
                        className="mt-4"
                        onClick={() => onRunMonitor(selectedMonitor)}
                      >
                        Run Now
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="pt-4">
                  {selectedMonitor.history && selectedMonitor.history.length > 0 ? (
                    <ScrollArea className="h-[60vh]">
                      <div className="space-y-3 pr-4">
                        {selectedMonitor.history.map((record, index) => (
                          <Card 
                            key={index} 
                            className={`border-l-4 ${
                              record.success ? 'border-l-green-500' : 'border-l-red-500'
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between">
                                <div className="flex items-center gap-3">
                                  {record.success ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                  )}
                                  <div>
                                    <div className="font-medium flex items-center">
                                      Status: 
                                      <Badge 
                                        className={`ml-2 ${
                                          String(record.status)[0] === '2' ? 'bg-green-100 text-green-800' : 
                                          String(record.status)[0] === '3' ? 'bg-blue-100 text-blue-800' :
                                          String(record.status)[0] === '4' ? 'bg-yellow-100 text-yellow-800' :
                                          String(record.status)[0] === '5' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}
                                      >
                                        {record.status}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                      {record.timestamp ? format(parseISO(record.timestamp), "yyyy-MM-dd HH:mm:ss") : 'Unknown time'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-medium ${
                                    record.response_time > (record.success_threshold || selectedMonitor.success_threshold) 
                                      ? 'text-red-600' 
                                      : 'text-green-600'
                                  }`}>
                                    Response time: {record.response_time}ms
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Threshold: {record.success_threshold || selectedMonitor.success_threshold}ms
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                      <p>No history available for this monitor yet.</p>
                      <Button
                        className="mt-4"
                        onClick={() => onRunMonitor(selectedMonitor)}
                      >
                        Run Now
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="details" className="pt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Test Name</label>
                        <p>{apiTests.find(t => t.id === selectedMonitor.test_id)?.name || "Unknown"}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Method & URL</label>
                        <p>
                          <Badge variant="outline" className="mr-2">
                            {apiTests.find(t => t.id === selectedMonitor.test_id)?.method || "GET"}
                          </Badge>
                          {apiTests.find(t => t.id === selectedMonitor.test_id)?.url || "No URL"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Frequency</label>
                        <p className="capitalize">{selectedMonitor.frequency}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="flex items-center">
                          {getStatusBadge(getMonitorStatus(selectedMonitor))}
                          {selectedMonitor.active && selectedMonitor.next_run && (
                            <span className="ml-3 text-sm text-gray-500">
                              {getNextRunText(selectedMonitor)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Notification Email</label>
                        <p>{selectedMonitor.notification_email}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-500">Response Time Threshold</label>
                        <p>{selectedMonitor.success_threshold || 200}ms</p>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p>{selectedMonitor.description || "No description provided."}</p>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          onDeleteMonitor(selectedMonitor.id);
                          setSelectedMonitor(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Monitor
                      </Button>
                      <Button onClick={() => {
                        handleEditMonitor(selectedMonitor);
                        setSelectedMonitor(null);
                      }}>
                        <Sliders className="w-4 h-4 mr-2" />
                        Edit Monitor
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Helper function to count status codes distribution
function countStatusCodes(history) {
  const counts = { '2': 0, '3': 0, '4': 0, '5': 0, '0': 0 };
  
  history.forEach(entry => {
    const firstDigit = String(entry.status || 0)[0] || '0';
    counts[firstDigit] = (counts[firstDigit] || 0) + 1;
  });
  
  return counts;
}

// Generate data for status code pie chart
function generateStatusData(history) {
  const statusCounts = {};
  
  history.forEach(entry => {
    const status = entry.status || 0;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  return Object.entries(statusCounts).map(([status, count]) => ({
    name: String(status),
    value: count
  }));
}

// Generate daily success/failure data
function generateSuccessData(history) {
  const dailyData = {};
  
  history.forEach(entry => {
    try {
      const day = format(parseISO(entry.timestamp), 'yyyy-MM-dd');
      
      if (!dailyData[day]) {
        dailyData[day] = { date: day, success: 0, failure: 0 };
      }
      
      if (entry.success) {
        dailyData[day].success++;
      } else {
        dailyData[day].failure++;
      }
    } catch (e) {
      console.error("Error processing date:", e);
    }
  });
  
  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
}

// Generate overall health trend data from all monitors
function generateOverallHealthData(monitors) {
  const dailyData = {};
  
  // Process each monitor's history
  monitors.forEach(monitor => {
    if (!monitor.history || monitor.history.length === 0) return;
    
    monitor.history.forEach(entry => {
      try {
        const day = format(parseISO(entry.timestamp), 'yyyy-MM-dd');
        
        if (!dailyData[day]) {
          dailyData[day] = { 
            date: day, 
            successCount: 0, 
            failureCount: 0,
            totalResponseTime: 0,
            totalRequests: 0
          };
        }
        
        if (entry.success) {
          dailyData[day].successCount++;
        } else {
          dailyData[day].failureCount++;
        }
        
        dailyData[day].totalResponseTime += entry.response_time || 0;
        dailyData[day].totalRequests++;
      } catch (e) {
        console.error("Error processing date:", e);
      }
    });
  });
  
  // Calculate daily averages and rates
  return Object.values(dailyData)
    .map(day => ({
      date: day.date,
      successRate: day.totalRequests > 0 
        ? (day.successCount / day.totalRequests) * 100 
        : 0,
      avgResponseTime: day.totalRequests > 0 
        ? day.totalResponseTime / day.totalRequests 
        : 0,
      totalRequests: day.totalRequests
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7); // Last 7 days
}