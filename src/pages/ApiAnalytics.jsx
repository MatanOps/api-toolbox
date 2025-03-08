import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ApiTest } from '@/api/entities';
import { ApiMonitor } from '@/api/entities';
import { 
  ArrowLeft, 
  Loader2, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Filter,
  Calendar,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip as TooltipComponent, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, subDays, isAfter, parseISO, formatDistanceToNow } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

export default function ApiAnalytics() {
  const [apiTests, setApiTests] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMonitor, setSelectedMonitor] = useState('all');
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const [aggregatedData, setAggregatedData] = useState({
    totals: {
      monitors: 0,
      tests: 0,
      total_requests: 0,
      success_requests: 0,
      failed_requests: 0
    },
    response_times: [],
    success_rates: [],
    status_distribution: [],
    monitor_performance: [],
    uptime_percentage: 100,
    performance_score: 0
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Process analytics data when time range or selected monitor changes
  useEffect(() => {
    if (monitors.length > 0) {
      processAnalyticsData();
    }
  }, [timeRange, selectedMonitor, monitors]);

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
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [tests, monitorList] = await Promise.all([
        ApiTest.list(),
        ApiMonitor.list('-created_date')
      ]);
      
      setApiTests(tests);
      setMonitors(monitorList);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh analytics data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTimeRangeDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '24h': return subDays(now, 1);
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      default: return subDays(now, 7);
    }
  };

  const processAnalyticsData = () => {
    try {
      const timeRangeDate = getTimeRangeDate();
      let filteredMonitors = monitors;
      
      // Filter by selected monitor if not "all"
      if (selectedMonitor !== 'all') {
        filteredMonitors = monitors.filter(m => m.id === selectedMonitor);
      }

      // Initialize aggregated data
      const aggregated = {
        totals: {
          monitors: filteredMonitors.length,
          tests: new Set(filteredMonitors.map(m => m.test_id)).size,
          total_requests: 0,
          success_requests: 0,
          failed_requests: 0
        },
        response_times: [],
        success_rates: [],
        status_distribution: {},
        monitor_performance: [],
        uptime_percentage: 0,
        performance_score: 0,
        peak_times: [],
        hourly_distribution: Array(24).fill(0).map((_, i) => ({ hour: i, count: 0, avgResponse: 0 }))
      };

      // Time series data for charts (daily buckets)
      const dailyResponseTimes = {};
      const dailySuccessRates = {};
      let totalStatuses = {};

      let totalSuccessPercentages = 0;
      let totalResponseTimes = 0;
      let monitorCount = 0;

      // Process each monitor's history
      filteredMonitors.forEach(monitor => {
        if (!monitor.history || monitor.history.length === 0) return;
        
        // Filter history entries by time range
        const filteredHistory = monitor.history.filter(entry => {
          if (!entry.timestamp) return false;
          try {
            return isAfter(parseISO(entry.timestamp), timeRangeDate);
          } catch (e) {
            return false;
          }
        });

        // Skip if no history in time range
        if (filteredHistory.length === 0) return;
        monitorCount++;

        // Calculate monitor-specific metrics
        let monitorSuccessCount = 0;
        let monitorTotalResponseTime = 0;

        filteredHistory.forEach(entry => {
          // Update totals
          aggregated.totals.total_requests++;
          if (entry.success) {
            aggregated.totals.success_requests++;
            monitorSuccessCount++;
          } else {
            aggregated.totals.failed_requests++;
          }

          // Update status distribution
          const statusFirstDigit = String(entry.status || 0)[0] || '0';
          totalStatuses[statusFirstDigit] = (totalStatuses[statusFirstDigit] || 0) + 1;

          // Accumulate response times
          monitorTotalResponseTime += entry.response_time || 0;

          // Process time of day distribution
          try {
            const date = parseISO(entry.timestamp);
            const hour = date.getHours();
            aggregated.hourly_distribution[hour].count++;
            aggregated.hourly_distribution[hour].avgResponse += entry.response_time || 0;
          } catch (e) {
            console.error("Error processing hour:", e);
          }

          // Process daily data
          try {
            const day = format(parseISO(entry.timestamp), 'yyyy-MM-dd');
            
            // Response times by day
            if (!dailyResponseTimes[day]) {
              dailyResponseTimes[day] = { day, count: 0, total: 0 };
            }
            dailyResponseTimes[day].count++;
            dailyResponseTimes[day].total += entry.response_time || 0;
            
            // Success rates by day
            if (!dailySuccessRates[day]) {
              dailySuccessRates[day] = { day, success: 0, failure: 0 };
            }
            if (entry.success) {
              dailySuccessRates[day].success++;
            } else {
              dailySuccessRates[day].failure++;
            }
          } catch (e) {
            console.error("Error processing date:", e);
          }
        });

        // Calculate and accumulate metrics for overall performance score
        const monitorSuccessRate = filteredHistory.length > 0 
          ? (monitorSuccessCount / filteredHistory.length) * 100 
          : 0;
        
        const monitorAvgResponseTime = filteredHistory.length > 0 
          ? monitorTotalResponseTime / filteredHistory.length 
          : 0;
        
        totalSuccessPercentages += monitorSuccessRate;
        totalResponseTimes += monitorAvgResponseTime;

        // Add monitor performance data
        aggregated.monitor_performance.push({
          id: monitor.id,
          name: monitor.name,
          success_rate: monitorSuccessRate,
          avg_response_time: monitorAvgResponseTime,
          total_requests: filteredHistory.length,
          last_status: filteredHistory[0]?.status || "N/A",
          last_success: filteredHistory[0]?.success || false
        });
      });

      // Calculate hourly averages
      aggregated.hourly_distribution = aggregated.hourly_distribution.map(hour => ({
        ...hour,
        avgResponse: hour.count > 0 ? Math.round(hour.avgResponse / hour.count) : 0
      }));

      // Find peak hours (top 3 busiest hours)
      aggregated.peak_times = [...aggregated.hourly_distribution]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(hour => ({
          hour: hour.hour,
          count: hour.count,
          formattedHour: `${hour.hour}:00 - ${hour.hour+1}:00`
        }));

      // Convert daily data to arrays for charts
      aggregated.response_times = Object.values(dailyResponseTimes)
        .map(day => ({
          date: day.day,
          avg_time: day.count > 0 ? Math.round(day.total / day.count) : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      aggregated.success_rates = Object.values(dailySuccessRates)
        .map(day => {
          const total = day.success + day.failure;
          return {
            date: day.day,
            success_rate: total > 0 ? Math.round((day.success / total) * 100) : 0,
            success: day.success,
            failure: day.failure
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      // Convert status distribution to array for pie chart
      aggregated.status_distribution = Object.entries(totalStatuses).map(([status, count]) => {
        let label;
        switch (status) {
          case '2': label = '2xx (Success)'; break;
          case '3': label = '3xx (Redirect)'; break;
          case '4': label = '4xx (Client Error)'; break;
          case '5': label = '5xx (Server Error)'; break;
          default: label = 'Other';
        }
        return { status: label, count };
      });

      // Sort monitor performance by success rate
      aggregated.monitor_performance.sort((a, b) => b.success_rate - a.success_rate);
      
      // Calculate uptime percentage (based on success rate)
      aggregated.uptime_percentage = aggregated.totals.total_requests > 0
        ? Math.round((aggregated.totals.success_requests / aggregated.totals.total_requests) * 100)
        : 100;
      
      // Calculate performance score (weighted average of success rate and response time)
      if (monitorCount > 0) {
        const avgSuccessRate = totalSuccessPercentages / monitorCount;
        const avgResponseTime = totalResponseTimes / monitorCount;
        
        // Score calculation: 60% weight on success rate, 40% weight on response time (inverted, faster is better)
        // Response time score is calculated relative to a 1000ms baseline (better if lower)
        const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 10));
        
        aggregated.performance_score = Math.round((avgSuccessRate * 0.6) + (responseTimeScore * 0.4));
      }

      setAggregatedData(aggregated);
    } catch (error) {
      console.error("Error processing analytics data:", error);
      setError("Error processing analytics data. Some charts may not display correctly.");
    }
  };

  const downloadCSV = () => {
    try {
      // Create CSV header
      let csvContent = "Monitor Name,Date,Status,Response Time (ms),Success\n";
      
      // Get appropriate monitors
      let dataMonitors = selectedMonitor === 'all' ? monitors : monitors.filter(m => m.id === selectedMonitor);
      
      // Get time range date
      const timeRangeDate = getTimeRangeDate();
      
      // Add data rows
      dataMonitors.forEach(monitor => {
        if (!monitor.history || monitor.history.length === 0) return;
        
        const filteredHistory = monitor.history.filter(entry => {
          if (!entry.timestamp) return false;
          try {
            return isAfter(parseISO(entry.timestamp), timeRangeDate);
          } catch (e) {
            return false;
          }
        });
        
        filteredHistory.forEach(entry => {
          const row = [
            `"${monitor.name.replace(/"/g, '""')}"`,
            entry.timestamp ? format(parseISO(entry.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
            entry.status || 'N/A',
            entry.response_time || 0,
            entry.success ? 'Success' : 'Failure'
          ];
          csvContent += row.join(',') + "\n";
        });
      });
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `api-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Error downloading CSV:", error);
      setError("Failed to download CSV data.");
    }
  };

  // Helper function to format number with K, M suffix
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("ApiMonitoring")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">API Analytics</h1>
              <p className="text-gray-500">Performance insights for your API endpoints</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={selectedMonitor} onValueChange={setSelectedMonitor}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by Monitor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Monitors</SelectItem>
                  {monitors.map(monitor => (
                    <SelectItem key={monitor.id} value={monitor.id}>
                      {monitor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              onClick={refreshData} 
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={downloadCSV} 
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
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
        ) : monitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow">
            <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">No Monitors Available</h2>
            <p className="text-gray-500 mt-2 text-center">
              You need to set up API monitors before you can view analytics.
            </p>
            <Link to={createPageUrl("ApiMonitoring")} className="mt-6">
              <Button>Set Up Monitors</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Performance Score Card */}
            <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-blue-50">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex flex-col justify-center">
                    <h2 className="text-lg font-semibold text-blue-700 mb-2">Overall API Performance Score</h2>
                    <div className="flex items-end gap-3">
                      <div className="text-5xl font-bold">{aggregatedData.performance_score}</div>
                      <div className="text-xl font-semibold text-gray-500 mb-1">/100</div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Score based on success rate, response time and uptime
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 md:gap-8">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Uptime</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{aggregatedData.uptime_percentage}%</span>
                        <div 
                          className={`w-3 h-3 rounded-full ${
                            aggregatedData.uptime_percentage >= 99 ? 'bg-green-500' :
                            aggregatedData.uptime_percentage >= 95 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} 
                        />
                      </div>
                      <span className="text-xs text-gray-500">Last {timeRange}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Avg Response Time</span>
                      <span className="text-2xl font-bold">
                        {aggregatedData.response_times.length > 0
                          ? Math.round(
                              aggregatedData.response_times.reduce((sum, day) => sum + day.avg_time, 0) / 
                              aggregatedData.response_times.length
                            )
                          : 0} ms
                      </span>
                      <span className="text-xs text-gray-500">Average across all APIs</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Success Rate</span>
                      <span className="text-2xl font-bold">
                        {aggregatedData.totals.total_requests > 0 
                          ? Math.round((aggregatedData.totals.success_requests / aggregatedData.totals.total_requests) * 100) 
                          : 0}%
                      </span>
                      <span className="text-xs text-gray-500">Based on {formatNumber(aggregatedData.totals.total_requests)} requests</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Peak Traffic Hour</span>
                      <span className="text-2xl font-bold">
                        {aggregatedData.peak_times.length > 0
                          ? `${aggregatedData.peak_times[0].hour}:00`
                          : "N/A"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {aggregatedData.peak_times.length > 0
                          ? `${formatNumber(aggregatedData.peak_times[0].count)} requests`
                          : "No data"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Monitors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {aggregatedData.totals.monitors}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>{monitors.filter(m => m.history?.[0]?.success).length} healthy</span>
                    </div>
                    <span className="mx-1">•</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>{monitors.filter(m => m.history?.length && !m.history[0].success).length} failing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Total Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(aggregatedData.totals.total_requests)}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <span>{timeRange === '24h' ? 'Last 24 hours' : 
                           timeRange === '7d' ? 'Last 7 days' :
                           timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">
                      {aggregatedData.totals.total_requests > 0 
                        ? Math.round((aggregatedData.totals.success_requests / aggregatedData.totals.total_requests) * 100) 
                        : 0}%
                    </div>
                    <div className="flex items-center text-sm">
                      <TooltipProvider>
                        <TooltipComponent>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-xs">{formatNumber(aggregatedData.totals.success_requests)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Successful requests</p>
                          </TooltipContent>
                        </TooltipComponent>
                      </TooltipProvider>
                      <span className="mx-1">•</span>
                      <TooltipProvider>
                        <TooltipComponent>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              <span className="text-xs">{formatNumber(aggregatedData.totals.failed_requests)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Failed requests</p>
                          </TooltipContent>
                        </TooltipComponent>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${aggregatedData.totals.total_requests > 0 
                          ? Math.round((aggregatedData.totals.success_requests / aggregatedData.totals.total_requests) * 100) 
                          : 0}%`
                      }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Avg Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold mr-1">
                      {aggregatedData.response_times.length > 0
                        ? Math.round(
                            aggregatedData.response_times.reduce((sum, day) => sum + day.avg_time, 0) / 
                            aggregatedData.response_times.length
                          )
                        : 0}
                    </div>
                    <div className="text-sm text-gray-500">ms</div>
                  </div>
                  {aggregatedData.response_times.length > 1 && (
                    <div className="h-10 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={aggregatedData.response_times} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <Line 
                            type="monotone" 
                            dataKey="avg_time" 
                            stroke="#6366f1" 
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Time Range
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-md font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {timeRange === '24h' ? 'Last 24 Hours' : 
                     timeRange === '7d' ? 'Last 7 Days' :
                     timeRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format(getTimeRangeDate(), 'MMM d, yyyy')} - {format(new Date(), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Dashboard */}
            <Tabs defaultValue="performance">
              <TabsList className="mb-6">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="status">Status Analysis</TabsTrigger>
                <TabsTrigger value="monitors">Monitor Ranking</TabsTrigger>
                <TabsTrigger value="patterns">Traffic Patterns</TabsTrigger>
              </TabsList>
              
              <TabsContent value="performance">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Response Time Chart */}
                  <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Response Time Trend</CardTitle>
                          <CardDescription>Average response time in milliseconds</CardDescription>
                        </div>
                        <Badge variant="outline" className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Response Time
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={aggregatedData.response_times}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                            />
                            <YAxis unit="ms" />
                            <Tooltip 
                              labelFormatter={(date) => format(parseISO(date), 'MMM dd, yyyy')}
                              formatter={(value) => [`${value} ms`, 'Avg Response Time']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="avg_time" 
                              stroke="#8884d8" 
                              fillOpacity={1} 
                              fill="url(#colorResponseTime)" 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="avg_time" 
                              stroke="#8884d8" 
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Success Rate Chart */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Success Rate Trend</CardTitle>
                          <CardDescription>Percentage of successful API calls</CardDescription>
                        </div>
                        <Badge variant="outline" className="flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Success %
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={aggregatedData.success_rates}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorSuccessRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                            />
                            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                            <Tooltip 
                              labelFormatter={(date) => format(parseISO(date), 'MMM dd, yyyy')}
                              formatter={(value) => [`${value}%`, 'Success Rate']}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="success_rate" 
                              stroke="#10b981" 
                              fillOpacity={1}
                              fill="url(#colorSuccessRate)" 
                              activeDot={{ r: 6 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Request Volume Chart */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Request Volume</CardTitle>
                          <CardDescription>Success vs. Failure counts</CardDescription>
                        </div>
                        <Badge variant="outline" className="flex items-center">
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Requests
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={aggregatedData.success_rates}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(date) => format(parseISO(date), 'MMM dd, yyyy')}
                              formatter={(value, name) => {
                                if (name === 'success') return [value, 'Successful Requests'];
                                if (name === 'failure') return [value, 'Failed Requests'];
                                return [value, name];
                              }}
                            />
                            <Legend />
                            <Bar dataKey="success" name="Success" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="failure" name="Failure" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="status">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status Distribution Chart */}
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle>HTTP Status Distribution</CardTitle>
                      <CardDescription>Distribution of HTTP status codes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={aggregatedData.status_distribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="count"
                              nameKey="status"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {aggregatedData.status_distribution.map((entry, index) => {
                                const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Pie>
                            <Tooltip formatter={(value, name, props) => [`${value} requests`, props.payload.status]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {aggregatedData.status_distribution.map((entry, index) => {
                          const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: colors[index % colors.length] }}
                              ></div>
                              <span className="text-sm">{entry.status}: {entry.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Status Code Over Time */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Status Codes Analysis</CardTitle>
                      <CardDescription>Detailed breakdown of API responses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries({
                            '2xx': { label: 'Success', color: 'bg-green-100 text-green-800', icon: CheckCircle },
                            '4xx': { label: 'Client Error', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
                            '5xx': { label: 'Server Error', color: 'bg-red-100 text-red-800', icon: XCircle },
                            '3xx': { label: 'Redirect', color: 'bg-blue-100 text-blue-800', icon: ArrowLeft },
                          }).map(([key, { label, color, icon: Icon }]) => {
                            const entry = aggregatedData.status_distribution.find(e => e.status.startsWith(key[0]));
                            const count = entry ? entry.count : 0;
                            const percent = aggregatedData.totals.total_requests > 0 
                              ? Math.round((count / aggregatedData.totals.total_requests) * 100) 
                              : 0;
                            
                            return (
                              <Card key={key} className="border-none shadow-sm">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <Badge className={color}>
                                      {key}
                                    </Badge>
                                    <Icon className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <div className="mt-3">
                                    <div className="text-2xl font-bold">{count}</div>
                                    <div className="text-sm text-gray-500">{label} ({percent}%)</div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                        
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2 text-gray-600 w-full justify-center">
                              <Info className="w-4 h-4" />
                              <span>What These Status Codes Mean</span>
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border rounded-lg p-4 mt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                <div>
                                  <span className="font-semibold">2xx (Success):</span> The request was successful.
                                  <div className="ml-4 mt-1 text-xs text-gray-500">
                                    <div>200: OK - Standard success response</div>
                                    <div>201: Created - Resource created successfully</div>
                                    <div>204: No Content - Request succeeded with no response body</div>
                                  </div>
                                </div>
                                <div>
                                  <span className="font-semibold">3xx (Redirect):</span> Further action needed to complete the request.
                                  <div className="ml-4 mt-1 text-xs text-gray-500">
                                    <div>301: Moved Permanently - Resource has new permanent URI</div>
                                    <div>302: Found - Resource temporarily moved</div>
                                    <div>304: Not Modified - Resource hasn't changed</div>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="font-semibold">4xx (Client Error):</span> The request contains bad syntax or cannot be fulfilled.
                                  <div className="ml-4 mt-1 text-xs text-gray-500">
                                    <div>400: Bad Request - Server couldn't understand request</div>
                                    <div>401: Unauthorized - Authentication required</div>
                                    <div>403: Forbidden - Server refuses to fulfill request</div>
                                    <div>404: Not Found - Resource not found</div>
                                    <div>429: Too Many Requests - Rate limit exceeded</div>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="font-semibold">5xx (Server Error):</span> The server failed to fulfill a valid request.
                                  <div className="ml-4 mt-1 text-xs text-gray-500">
                                    <div>500: Internal Server Error - Unexpected server condition</div>
                                    <div>502: Bad Gateway - Invalid response from upstream server</div>
                                    <div>503: Service Unavailable - Server temporarily unavailable</div>
                                    <div>504: Gateway Timeout - Upstream server timeout</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="monitors">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Monitor Performance Ranking</CardTitle>
                        <CardDescription>Comparison of all monitored APIs</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Showing</span>
                        <Badge variant="outline">{aggregatedData.monitor_performance.length}</Badge>
                        <span className="text-sm text-gray-500">monitors</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {aggregatedData.monitor_performance.length > 0 ? (
                      <div className="space-y-6">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left font-medium py-3 px-4">Monitor</th>
                                <th className="text-left font-medium py-3 px-4">Success Rate</th>
                                <th className="text-left font-medium py-3 px-4">Avg Response Time</th>
                                <th className="text-left font-medium py-3 px-4">Requests</th>
                                <th className="text-left font-medium py-3 px-4">Last Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aggregatedData.monitor_performance.map((monitor, index) => (
                                <tr 
                                  key={monitor.id} 
                                  className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                                >
                                  <td className="py-3 px-4 font-medium">{monitor.name}</td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full ${
                                            monitor.success_rate >= 90 ? 'bg-green-500' : 
                                            monitor.success_rate >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{width: `${monitor.success_rate}%`}}
                                        ></div>
                                      </div>
                                      <span>{monitor.success_rate.toFixed(1)}%</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-gray-400" />
                                      {monitor.avg_response_time.toFixed(0)} ms
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">{monitor.total_requests}</td>
                                  <td className="py-3 px-4">
                                    <Badge 
                                      className={`
                                        ${String(monitor.last_status)[0] === '2' ? 'bg-green-100 text-green-800' : 
                                          String(monitor.last_status)[0] === '3' ? 'bg-blue-100 text-blue-800' :
                                          String(monitor.last_status)[0] === '4' ? 'bg-yellow-100 text-yellow-800' :
                                          String(monitor.last_status)[0] === '5' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'}
                                      `}
                                    >
                                      {monitor.last_status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Success Rates Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={aggregatedData.monitor_performance.map(m => ({
                                      name: m.name.length > 15 ? m.name.substring(0, 12) + '...' : m.name,
                                      fullName: m.name,
                                      rate: parseFloat(m.success_rate.toFixed(1))
                                    }))}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                  >
                                    <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <Tooltip 
                                      formatter={(value) => [`${value}%`, 'Success Rate']}
                                      labelFormatter={(name, payload) => payload[0]?.payload?.fullName || name}
                                    />
                                    <Bar 
                                      dataKey="rate" 
                                      name="Success Rate" 
                                      fill="#10b981" 
                                      radius={[0, 4, 4, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Response Time Comparison</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={aggregatedData.monitor_performance.map(m => ({
                                      name: m.name.length > 15 ? m.name.substring(0, 12) + '...' : m.name,
                                      fullName: m.name,
                                      time: parseFloat(m.avg_response_time.toFixed(0))
                                    }))}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                  >
                                    <XAxis type="number" tickFormatter={(value) => `${value}ms`} />
                                    <YAxis type="category" dataKey="name" width={100} />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <Tooltip 
                                      formatter={(value) => [`${value}ms`, 'Avg Response Time']}
                                      labelFormatter={(name, payload) => payload[0]?.payload?.fullName || name}
                                    />
                                    <Bar 
                                      dataKey="time" 
                                      name="Response Time" 
                                      fill="#6366f1" 
                                      radius={[0, 4, 4, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                        <p>No monitor performance data available for the selected time range.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="patterns">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Traffic by Hour of Day</CardTitle>
                      <CardDescription>API request volume distribution throughout the day</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={aggregatedData.hourly_distribution}
                            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="hour" 
                              tickFormatter={(hour) => `${hour}:00`}
                            />
                            <YAxis />
                            <Tooltip 
                              formatter={(value, name) => {
                                if (name === 'count') return [value, 'Requests'];
                                return [value, name];
                              }}
                              labelFormatter={(hour) => `${hour}:00 - ${hour+1}:00`}
                            />
                            <Bar 
                              dataKey="count" 
                              name="Request Count" 
                              fill="#6366f1" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Peak Traffic Hours</h3>
                        <div className="flex flex-wrap gap-2">
                          {aggregatedData.peak_times.map((peak, index) => (
                            <Badge 
                              key={index} 
                              className="bg-indigo-100 text-indigo-800 border-indigo-200"
                            >
                              {peak.formattedHour}: {formatNumber(peak.count)} requests
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Response Time by Hour</CardTitle>
                      <CardDescription>Average API response times throughout the day</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={aggregatedData.hourly_distribution.filter(h => h.count > 0)}
                            margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="hour" 
                              tickFormatter={(hour) => `${hour}:00`}
                            />
                            <YAxis tickFormatter={(value) => `${value}ms`} />
                            <Tooltip 
                              formatter={(value) => [`${value}ms`, 'Avg Response Time']}
                              labelFormatter={(hour) => `${hour}:00 - ${hour+1}:00`}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="avgResponse" 
                              name="Response Time" 
                              stroke="#ef4444" 
                              strokeWidth={2}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <Card className="bg-gray-50 border-none">
                          <CardContent className="p-4">
                            <div className="text-sm font-medium text-gray-500">Fastest Hour</div>
                            <div className="text-xl font-bold mt-1">
                              {(() => {
                                const dataPoints = aggregatedData.hourly_distribution.filter(h => h.count > 0);
                                if (dataPoints.length === 0) return "N/A";
                                const fastest = dataPoints.reduce((min, h) => 
                                  h.avgResponse < min.avgResponse ? h : min, dataPoints[0]);
                                return `${fastest.hour}:00`;
                              })()}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {(() => {
                                const dataPoints = aggregatedData.hourly_distribution.filter(h => h.count > 0);
                                if (dataPoints.length === 0) return "";
                                const fastest = dataPoints.reduce((min, h) => 
                                  h.avgResponse < min.avgResponse ? h : min, dataPoints[0]);
                                return `${fastest.avgResponse}ms average`;
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gray-50 border-none">
                          <CardContent className="p-4">
                            <div className="text-sm font-medium text-gray-500">Slowest Hour</div>
                            <div className="text-xl font-bold mt-1">
                              {(() => {
                                const dataPoints = aggregatedData.hourly_distribution.filter(h => h.count > 0);
                                if (dataPoints.length === 0) return "N/A";
                                const slowest = dataPoints.reduce((max, h) => 
                                  h.avgResponse > max.avgResponse ? h : max, dataPoints[0]);
                                return `${slowest.hour}:00`;
                              })()}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {(() => {
                                const dataPoints = aggregatedData.hourly_distribution.filter(h => h.count > 0);
                                if (dataPoints.length === 0) return "";
                                const slowest = dataPoints.reduce((max, h) => 
                                  h.avgResponse > max.avgResponse ? h : max, dataPoints[0]);
                                return `${slowest.avgResponse}ms average`;
                              })()}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <div className="col-span-1 lg:col-span-2">
                        <Button 
                          variant="outline" 
                          className="w-full flex items-center justify-center gap-2"
                          onClick={() => setShowAdvancedView(!showAdvancedView)}
                        >
                          {showAdvancedView ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide Advanced Analytics
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show Advanced Analytics
                            </>
                          )}
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>API Performance Radar</CardTitle>
                            <CardDescription>Multi-dimensional performance view</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart 
                                  outerRadius={90} 
                                  width={730} 
                                  height={250} 
                                  data={[
                                    {
                                      subject: 'Success Rate',
                                      A: aggregatedData.uptime_percentage,
                                      fullMark: 100,
                                    },
                                    {
                                      subject: 'Response Time',
                                      A: Math.max(0, 100 - (aggregatedData.response_times.length > 0
                                        ? Math.round(
                                            aggregatedData.response_times.reduce((sum, day) => sum + day.avg_time, 0) / 
                                            aggregatedData.response_times.length
                                          ) / 10
                                        : 0)),
                                      fullMark: 100,
                                    },
                                    {
                                      subject: 'Availability',
                                      A: Math.min(100, 100 - (aggregatedData.monitor_performance.filter(m => !m.last_success).length / Math.max(1, aggregatedData.monitor_performance.length) * 100)),
                                      fullMark: 100,
                                    },
                                    {
                                      subject: '2xx Responses',
                                      A: (() => {
                                        const entry = aggregatedData.status_distribution.find(e => e.status.startsWith('2'));
                                        return entry && aggregatedData.totals.total_requests
                                          ? (entry.count / aggregatedData.totals.total_requests) * 100
                                          : 0;
                                      })(),
                                      fullMark: 100,
                                    },
                                    {
                                      subject: 'Consistency',
                                      A: (() => {
                                        // Calculate consistency score based on standard deviation of response times
                                        if (aggregatedData.response_times.length <= 1) return 100;
                                        
                                        const times = aggregatedData.response_times.map(r => r.avg_time);
                                        const mean = times.reduce((sum, val) => sum + val, 0) / times.length;
                                        
                                        const variance = times.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / times.length;
                                        const stdDev = Math.sqrt(variance);
                                        
                                        // Lower standard deviation means higher consistency
                                        // Scale to 0-100 where 0 std dev = 100% consistency
                                        return Math.max(0, 100 - (stdDev / mean * 100));
                                      })(),
                                      fullMark: 100,
                                    },
                                  ]}
                                >
                                  <PolarGrid />
                                  <PolarAngleAxis dataKey="subject" />
                                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                  <Radar 
                                    name="API Performance" 
                                    dataKey="A" 
                                    stroke="#8884d8" 
                                    fill="#8884d8" 
                                    fillOpacity={0.6} 
                                  />
                                  <Tooltip />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle>Response Time vs Success Rate</CardTitle>
                            <CardDescription>Correlation analysis</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart
                                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                >
                                  <CartesianGrid />
                                  <XAxis 
                                    type="number" 
                                    dataKey="avg_response_time" 
                                    name="Response Time" 
                                    unit="ms" 
                                    label={{ 
                                      value: 'Response Time (ms)', 
                                      position: 'insideBottomRight', 
                                      offset: -10 
                                    }}
                                  />
                                  <YAxis 
                                    type="number" 
                                    dataKey="success_rate" 
                                    name="Success Rate" 
                                    unit="%" 
                                    label={{ 
                                      value: 'Success Rate (%)', 
                                      angle: -90, 
                                      position: 'insideLeft' 
                                    }}
                                  />
                                  <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    formatter={(value, name) => {
                                      if (name === 'Response Time') return [`${value}ms`, name];
                                      if (name === 'Success Rate') return [`${value}%`, name];
                                      return [value, name];
                                    }}
                                    labelFormatter={(_, payload) => payload[0]?.payload?.name || "Unknown"}
                                  />
                                  <Scatter 
                                    name="Monitor Performance" 
                                    data={aggregatedData.monitor_performance} 
                                    fill="#8884d8"
                                  />
                                </ScatterChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

// Custom Scatter chart with named import from recharts
const ScatterChart = ({ children, ...props }) => {
  return (
    <ComposedChart {...props}>
      {children}
    </ComposedChart>
  );
};