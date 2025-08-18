"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, Users, Target, BookOpen, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface StudentReport {
  id: string;
  email: string;
  full_name?: string;
  test_title: string;
  test_id: string;
  attempt_id: string;
  total_score: number;
  total_possible_marks: number;
  percentage: number;
  questions_attempted: number;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  time_taken_minutes: number;
  completed_at: string;
  subject_scores: Record<string, {
    score: number;
    total: number;
    attempted: number;
    correct: number;
  }>;
}

interface AnalyticsData {
  totalStudents: number;
  totalAttempts: number;
  averageScore: number;
  averagePercentage: number;
  averageQuestionsAttempted: number;
  averageTimeSpent: number;
  subjectAnalytics: Record<string, {
    averageScore: number;
    averagePercentage: number;
    totalAttempts: number;
  }>;
  reports: StudentReport[];
}

const ViewReportsPage = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [tests, setTests] = useState<Array<{ id: string; title: string }>>([]);
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  // Chart configuration with neutral colors
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9CA3AF', // neutral-400
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#374151', // neutral-700
        titleColor: '#F9FAFB', // neutral-50
        bodyColor: '#E5E7EB', // neutral-200
        borderColor: '#6B7280', // neutral-500
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF', // neutral-400
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#374151', // neutral-700
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          color: '#9CA3AF', // neutral-400
          font: {
            size: 11,
          },
        },
        grid: {
          color: '#374151', // neutral-700
          drawBorder: false,
        },
      },
    },
  };

  // Prepare data for performance distribution chart
  const getPerformanceDistributionData = () => {
    if (!analyticsData?.reports.length) return null;

    const ranges = ['0-30%', '31-50%', '51-70%', '71-85%', '86-100%'];
    const counts = [0, 0, 0, 0, 0];

    analyticsData.reports.forEach(report => {
      const percentage = report.percentage;
      if (percentage <= 30) counts[0]++;
      else if (percentage <= 50) counts[1]++;
      else if (percentage <= 70) counts[2]++;
      else if (percentage <= 85) counts[3]++;
      else counts[4]++;
    });

    return {
      labels: ranges,
      datasets: [
        {
          label: 'Number of Students',
          data: counts,
          backgroundColor: '#6B7280', // neutral-500
          borderColor: '#9CA3AF', // neutral-400
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  };

  // Prepare data for test-wise performance chart
  const getTestWisePerformanceData = () => {
    if (!analyticsData?.reports.length) return null;

    const testPerformance = analyticsData.reports.reduce((acc, report) => {
      if (!acc[report.test_title]) {
        acc[report.test_title] = {
          totalScore: 0,
          totalAttempts: 0,
          averagePercentage: 0,
        };
      }
      acc[report.test_title].totalScore += report.percentage;
      acc[report.test_title].totalAttempts += 1;
      return acc;
    }, {} as Record<string, { totalScore: number; totalAttempts: number; averagePercentage: number }>);

    const testNames = Object.keys(testPerformance);
    const averagePercentages = testNames.map(test => {
      const perf = testPerformance[test];
      return perf.totalScore / perf.totalAttempts;
    });

    return {
      labels: testNames,
      datasets: [
        {
          label: 'Average Score (%)',
          data: averagePercentages,
          backgroundColor: '#8B5CF6', // neutral with purple tint
          borderColor: '#A78BFA', // lighter purple
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  };

  // Prepare data for time distribution chart
  const getTimeDistributionData = () => {
    if (!analyticsData?.reports.length) return null;

    const timeRanges = ['0-15 min', '16-30 min', '31-60 min', '61-90 min', '90+ min'];
    const counts = [0, 0, 0, 0, 0];

    analyticsData.reports.forEach(report => {
      const time = report.time_taken_minutes;
      if (time <= 15) counts[0]++;
      else if (time <= 30) counts[1]++;
      else if (time <= 60) counts[2]++;
      else if (time <= 90) counts[3]++;
      else counts[4]++;
    });

    return {
      labels: timeRanges,
      datasets: [
        {
          label: 'Number of Students',
          data: counts,
          backgroundColor: '#64748B', // slate-500 (neutral)
          borderColor: '#94A3B8', // slate-400
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch available tests
        const testsResponse = await fetch('/api/tests');
        if (testsResponse.ok) {
          const testsData = await testsResponse.json();
          setTests(testsData.tests || []);
        }

        // Fetch analytics data
        const analyticsResponse = await fetch(`/api/admin/reports${selectedTest !== 'all' ? `?testId=${selectedTest}` : ''}`);
        
        console.log('Analytics response status:', analyticsResponse.status);
        console.log('Analytics response headers:', Object.fromEntries(analyticsResponse.headers.entries()));
        
        if (!analyticsResponse.ok) {
          const errorText = await analyticsResponse.text();
          console.error('Analytics response error:', errorText);
          throw new Error(`HTTP ${analyticsResponse.status}: ${errorText}`);
        }

        const data = await analyticsResponse.json();
        console.log('Analytics data received:', data);
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setError(error instanceof Error ? error.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTest]);

  const handleDownloadCSV = async () => {
    try {
      setDownloadingCSV(true);
      const response = await fetch(`/api/admin/reports/csv${selectedTest !== 'all' ? `?testId=${selectedTest}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `student-reports-${selectedTest !== 'all' ? selectedTest : 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV file');
    } finally {
      setDownloadingCSV(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'No data available'}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Student Analytics & Reports</h1>
            <p className="text-gray-400">Comprehensive performance analysis and data insights</p>
          </div>
          <div className="flex gap-4 items-center">
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="card border border-gray-700 rounded-lg px-4 py-2 text-white"
              aria-label="Select test to filter reports"
            >
              <option value="all">All Tests</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>{test.title}</option>
              ))}
            </select>
            <Button
              onClick={handleDownloadCSV}
              disabled={downloadingCSV}
              className="bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-600"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadingCSV ? 'Downloading...' : 'Download CSV'}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Students</CardTitle>
              <Users className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">{analyticsData.totalStudents}</div>
              <p className="text-xs text-gray-500">
                {analyticsData.totalAttempts} total attempts
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">
                {analyticsData.averageScore.toFixed(1)}/{analyticsData.reports[0]?.total_possible_marks || 0}
              </div>
              <p className="text-xs text-gray-500">
                {analyticsData.averagePercentage.toFixed(1)}% average
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Questions Attempted</CardTitle>
              <Target className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ">
                {analyticsData.averageQuestionsAttempted.toFixed(1)}
              </div>
              <p className="text-xs text-gray-500">
                out of {analyticsData.reports[0]?.total_questions || 0} questions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Avg Time Spent</CardTitle>
              <BarChart3 className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(analyticsData.averageTimeSpent)} min
              </div>
              <p className="text-xs text-gray-500">
                per attempt
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Distribution Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className=" flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-neutral-400" />
                Performance Distribution
              </CardTitle>
              <CardDescription>Score distribution across all students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {getPerformanceDistributionData() && (
                  <Bar 
                    data={getPerformanceDistributionData()!} 
                    options={chartOptions}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Time Distribution Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className=" flex items-center">
                <Target className="w-5 h-5 mr-2 text-neutral-400" />
                Time Distribution
              </CardTitle>
              <CardDescription>Time taken distribution across attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {getTimeDistributionData() && (
                  <Bar 
                    data={getTimeDistributionData()!} 
                    options={chartOptions}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test-wise Performance Chart */}
        {analyticsData.reports.length > 0 && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle className=" flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-neutral-400" />
                Test-wise Average Performance
              </CardTitle>
              <CardDescription>Average performance comparison across different tests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {getTestWisePerformanceData() && (
                  <Bar 
                    data={getTestWisePerformanceData()!} 
                    options={chartOptions}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subject-wise Analytics */}
        {Object.keys(analyticsData.subjectAnalytics).length > 0 && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle className=" flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Subject-wise Performance
              </CardTitle>
              <CardDescription>Average scores and performance by subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analyticsData.subjectAnalytics).map(([subject, stats]) => (
                  <div key={subject} className="card bg-gray-800 p-4 rounded-lg">
                    <h3 className="font-semibold  mb-2">{subject}</h3>
                    <div className="space-y-2">
                      <div  className="flex justify-between">
                        <span className="text-gray-400 text-sm">Average Score:</span>
                        <span className="">{stats.averageScore.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Average %:</span>
                        <span className="">{stats.averagePercentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Attempts:</span>
                        <span className="">{stats.totalAttempts}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Student Reports */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white">Individual Student Reports</CardTitle>
            <CardDescription>Detailed performance data for each student</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-gray-400">Student</th>
                    <th className="text-left p-3 text-gray-400">Test</th>
                    <th className="text-left p-3 text-gray-400">Score</th>
                    <th className="text-left p-3 text-gray-400">Percentage</th>
                    <th className="text-left p-3 text-gray-400">Attempted</th>
                    <th className="text-left p-3 text-gray-400">Correct</th>
                    <th className="text-left p-3 text-gray-400">Time</th>
                    <th className="text-left p-3 text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.reports.map((report) => (
                    <tr key={report.attempt_id} className="border-b border-gray-800 ">
                      <td className="p-3">
                        <div>
                          <div className=" font-medium">
                            {report.full_name || report.email.split('@')[0]}
                          </div>
                          <div className="text-gray-400 text-xs">{report.email}</div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-300">{report.test_title}</td>
                      <td className="p-3">
                        <span className=" font-medium">
                          {parseFloat(String(report.total_score)).toFixed(2)}/{report.total_possible_marks}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={report.percentage >= 70 ? "default" : report.percentage >= 50 ? "secondary" : "destructive"}
                        >
                          {report.percentage.toFixed(1)}%
                        </Badge>
                      </td>
                      
                      <td className="p-3 text-gray-300">
                        {report.questions_attempted}/{report.total_questions}
                      </td>
                      <td className="p-3">
                        <span className="text-green-400">{report.correct_answers}</span>
                        <span className="text-gray-500 mx-1">|</span>
                        <span className="text-red-400">{report.incorrect_answers}</span>
                      </td>
                      <td className="p-3 text-gray-300">{report.time_taken_minutes} min</td>
                      <td className="p-3">
                        <Badge variant="outline">
                          Completed
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewReportsPage;
