"use client";

import React, { useState, useEffect } from 'react';
import { stripDomain } from '@/lib/utils';
import ReportDetailsModal from '@/components/report-details-modal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, Users, Target, BookOpen, BarChart3, Filter, RefreshCw } from 'lucide-react';
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
  reg_no?: string;
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
  per_question_time_seconds?: Record<string, number>;
  total_positive_marks?: number;
  total_negative_marks?: number;
  final_score?: number;
  responses?: Array<{
    id: string;
    question_id: number;
    question_type?: string | null;
  user_answer?: unknown;
    is_correct?: boolean;
    marks_obtained?: number;
    time_spent_seconds?: number;
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

// Function to escape CSV values
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

// Function to extract department from email
function extractDepartment(email: string): string {
  if (!email) return 'N/A';
  
  // Get the part before @ symbol
  const emailPrefix = email.split('@')[0]?.toLowerCase() || '';
  
  // Split by fullstop to get parts
  const parts = emailPrefix.split('.');
  
  // Look for department in the parts after fullstop
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Extract department name (letters only, before any numbers)
    const deptMatch = part.match(/^([a-zA-Z]+)/);
    if (deptMatch) {
      const deptName = deptMatch[1].toUpperCase();
      
      // Check if it's a known department
      if (['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'BMECH', 'CHEM', 'AIML', 'AIDS', 'CSBS', 'CYBER'].includes(deptName)) {
        return deptName;
      }
      
      // Handle common variations
      if (deptName === 'CS') return 'CSE';
      if (deptName === 'EC') return 'ECE';
      if (deptName === 'EE') return 'EEE';
      if (deptName === 'ME') return 'MECH';
      if (deptName === 'CE') return 'CIVIL';
      if (deptName === 'BME') return 'BMECH';
      if (deptName === 'CH') return 'CHEM';
      
      // If it's a valid department-like string (3-5 letters), return it
      if (deptName.length >= 2 && deptName.length <= 5) {
        return deptName;
      }
    }
  }
  
  // Fallback: try the old method if no department found after fullstop
  if (emailPrefix.includes('cse') || emailPrefix.includes('cs')) return 'CSE';
  if (emailPrefix.includes('ece') || emailPrefix.includes('ec')) return 'ECE';
  if (emailPrefix.includes('eee') || emailPrefix.includes('ee')) return 'EEE';
  if (emailPrefix.includes('mech') || emailPrefix.includes('me')) return 'MECH';
  if (emailPrefix.includes('civil') || emailPrefix.includes('ce')) return 'CIVIL';
  if (emailPrefix.includes('it')) return 'IT';
  if (emailPrefix.includes('bmech') || emailPrefix.includes('bme')) return 'BMECH';
  if (emailPrefix.includes('chem') || emailPrefix.includes('ch')) return 'CHEM';
  if (emailPrefix.includes('aiml')) return 'AIML';
  if (emailPrefix.includes('aids')) return 'AIDS';
  if (emailPrefix.includes('csbs')) return 'CSBS';
  if (emailPrefix.includes('cyber')) return 'CYBER';
  
  return 'N/A';
}

// Function to generate full report CSV with individual test scores
function generateFullReportCSVWithIndividualScores(allTestReports: any[], tests: any[], departmentFilter: string = 'all'): string {
  // Collect all unique students from all test reports
  const studentsMap = new Map();
  
  allTestReports.forEach(testData => {
    testData.reports.forEach((report: StudentReport) => {
      if (!studentsMap.has(report.email)) {
        const dept = extractDepartment(report.email);
        // Filter by department if specified
        if (departmentFilter === 'all' || dept === departmentFilter) {
          studentsMap.set(report.email, {
            email: report.email,
            full_name: report.full_name || stripDomain(report.email),
            reg_no: report.reg_no || 'N/A',
            dept: dept
          });
        }
      }
    });
  });

  // Create test scores map - organized by email and test ID
  const testScoresMap = new Map();
  allTestReports.forEach(testData => {
    testData.reports.forEach((report: StudentReport) => {
      // Only include scores for students in the filtered department
      if (studentsMap.has(report.email)) {
        const key = `${report.email}_${testData.testId}`;
        testScoresMap.set(key, {
          score: report.total_score || 0,
          totalMarks: report.total_possible_marks || 100
        });
      }
    });
  });

  // Build CSV header
  let csvContent = 'S.No,Name,Registration No,Email,Dept';
  tests.forEach(test => {
    csvContent += `,${escapeCsvValue(test.title)}`;
  });
  csvContent += '\n';

  // Build CSV rows
  const students = Array.from(studentsMap.values());
  students.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  students.forEach((student, index) => {
    csvContent += `${index + 1},`;
    csvContent += `${escapeCsvValue(student.full_name)},`;
    csvContent += `${escapeCsvValue(student.reg_no)},`;
    csvContent += `${escapeCsvValue(student.email)},`;
    csvContent += `${escapeCsvValue(student.dept)}`;

    // Add scores for each test using individual test data
    tests.forEach(test => {
      const scoreKey = `${student.email}_${test.id}`;
      const testScore = testScoresMap.get(scoreKey);
      
      if (testScore) {
        csvContent += `,${testScore.score}/${testScore.totalMarks}`;
      } else {
        csvContent += ',AB';
      }
    });

    csvContent += '\n';
  });

  return csvContent;
}

// Function to generate full report CSV
function generateFullReportCSV(reports: StudentReport[], tests: any[]): string {
  // Get unique students
  const studentsMap = new Map();
  reports.forEach(report => {
    if (!studentsMap.has(report.email)) {
      studentsMap.set(report.email, {
        email: report.email,
        full_name: report.full_name || stripDomain(report.email),
        reg_no: report.reg_no || 'N/A',
        dept: extractDepartment(report.email)
      });
    }
  });

  // Create test attempts map
  const attemptsMap = new Map();
  reports.forEach(report => {
    const key = `${report.email}_${report.test_id}`;
    attemptsMap.set(key, {
      score: report.total_score || 0,
      totalMarks: report.total_possible_marks || 100
    });
  });

  // Build CSV header
  let csvContent = 'S.No,Name,Registration No,Email,Dept';
  tests.forEach(test => {
    csvContent += `,${escapeCsvValue(test.title)}`;
  });
  csvContent += '\n';

  // Build CSV rows
  const students = Array.from(studentsMap.values());
  students.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  students.forEach((student, index) => {
    csvContent += `${index + 1},`;
    csvContent += `${escapeCsvValue(student.full_name)},`;
    csvContent += `${escapeCsvValue(student.reg_no)},`;
    csvContent += `${escapeCsvValue(student.email)},`;
    csvContent += `${escapeCsvValue(student.dept)}`;

    // Add scores for each test (without percentage)
    tests.forEach(test => {
      const attemptKey = `${student.email}_${test.id}`;
      const attempt = attemptsMap.get(attemptKey);
      
      if (attempt) {
        csvContent += `,${attempt.score}/${attempt.totalMarks}`;
      } else {
        csvContent += ',AB';
      }
    });

    csvContent += '\n';
  });

  return csvContent;
}

const ViewReportsPage = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  // expandedAttempt removed (unused)
  const [query, setQuery] = useState<string>('');
  const [selectedReports, setSelectedReports] = useState<StudentReport[] | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [tests, setTests] = useState<Array<{ id: string; title: string }>>([]);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [downloadingFullReport, setDownloadingFullReport] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const PAGE_SIZE = 50;

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

  // Single data fetch effect (fetch tests list and analytics)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const testsResponse = await fetch('/api/tests');
        if (testsResponse.ok) {
          const testsData = await testsResponse.json();
          setTests(testsData || []);
        }

        const analyticsResponse = await fetch(`/api/admin/reports${selectedTest !== 'all' ? `?testId=${selectedTest}` : ''}`);
        if (!analyticsResponse.ok) {
          const errorText = await analyticsResponse.text();
          throw new Error(`HTTP ${analyticsResponse.status}: ${errorText}`);
        }

        const data = await analyticsResponse.json();
        setAnalyticsData(data);
        setPage(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTest]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const testsResponse = await fetch('/api/tests');
      if (testsResponse.ok) {
        const testsData = await testsResponse.json();
        setTests(testsData || []);
      }
    } catch (error) {
      console.error('Error refreshing tests:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh tests every 30 seconds (optional)
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Prepare data for performance distribution chart
  const getPerformanceDistributionData = React.useCallback(() => {
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
  }, [analyticsData]);

  // Prepare data for test-wise performance chart
  const getTestWisePerformanceData = React.useCallback(() => {
    if (!analyticsData?.reports.length) return null;

    const testPerformance = analyticsData.reports.reduce((acc, report) => {
      if (!acc[report.test_title]) {
        acc[report.test_title] = {
          totalScore: 0,
          totalAttempts: 0,
        };
      }
      acc[report.test_title].totalScore += report.percentage;
      acc[report.test_title].totalAttempts += 1;
      return acc;
    }, {} as Record<string, { totalScore: number; totalAttempts: number }>);

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
  }, [analyticsData]);

  // Prepare data for time distribution chart
  const getTimeDistributionData = React.useCallback(() => {
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
  }, [analyticsData]);

  // Memoize chart data to avoid recomputation
  const memoPerformanceData = React.useMemo(() => getPerformanceDistributionData(), [getPerformanceDistributionData]);
  const memoTestWiseData = React.useMemo(() => getTestWisePerformanceData(), [getTestWisePerformanceData]);
  const memoTimeData = React.useMemo(() => getTimeDistributionData(), [getTimeDistributionData]);
  // Filter reports client-side for quick searching by name, email or test title
  const filteredReports = (analyticsData?.reports || []).filter(r => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (r.full_name || r.email || r.test_title || '').toLowerCase().includes(q);
  });
  const pagedFilteredReports = filteredReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      
      // Generate filename based on selected test with date
      let fileName;
      const currentDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      if (selectedTest !== 'all') {
        const selectedTestTitle = tests.find(t => t.id === selectedTest)?.title || 'SelectedTest';
        // Clean the test title for filename use
        const cleanTitle = selectedTestTitle.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        fileName = `${cleanTitle}-Report-${currentDate}.csv`;
      } else {
        fileName = `AllTests-Report-${currentDate}.csv`;
      }
      a.download = fileName;
      
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

  const handleDownloadFullReport = async () => {
    try {
      setDownloadingFullReport(true);
      
      // First, get all available tests
      const testsResponse = await fetch('/api/tests');
      if (!testsResponse.ok) {
        throw new Error('Failed to fetch tests');
      }
      const testsData = await testsResponse.json();
      
      // Fetch reports for EACH test individually to get accurate scores
      const testReportsPromises = testsData.map(async (test: any) => {
        const response = await fetch(`/api/admin/reports?testId=${test.id}`);
        if (response.ok) {
          const data = await response.json();
          return { testId: test.id, testTitle: test.title, reports: data.reports || [] };
        }
        return { testId: test.id, testTitle: test.title, reports: [] };
      });
      
      const allTestReports = await Promise.all(testReportsPromises);
      
      // Generate CSV content with individual test scores and department filter
      let csvContent = generateFullReportCSVWithIndividualScores(allTestReports, testsData, selectedDepartment);
      
      // Add BOM for proper Excel encoding
      const BOM = '\uFEFF';
      csvContent = BOM + csvContent;
      
      // Download the CSV with department-specific filename with date
      const currentDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
      const fileName = selectedDepartment !== 'all' ? 
        `${selectedDepartment}-TestReport-${currentDate}.csv` : 
        `AllDepartments-TestReport-${currentDate}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error generating full report:', error);
      alert('Failed to generate full report');
    } finally {
      setDownloadingFullReport(false);
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
        {/* View Full Report Card */}
        <Card className="mb-6 bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">Full Student Report</h2>
                <p className="text-gray-400 text-sm">
                    CSV report with all students test scores with Respective Department!
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="border border-gray-600 rounded-lg px-4 py-2.5 bg-gray-800 text-white text-sm min-w-[160px] focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all duration-200 hover:border-gray-500"
                    aria-label="Select department to filter"
                  >
                    <option value="all">All Departments</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="IT">IT</option>
                    <option value="BMECH">BMECH</option>
                    <option value="CHEM">CHEM</option>
                    <option value="AIML">AIML</option>
                    <option value="AIDS">AIDS</option>
                    <option value="CSBS">CSBS</option>
                    <option value="CYBER">CYBER</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <Button
                    onClick={handleDownloadFullReport}
                    disabled={downloadingFullReport}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-500 min-w-[100px] h-[42px] transition-all duration-200"
                    title="Download comprehensive report with all students and test scores"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloadingFullReport ? 'Generating...' : 'View'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Student Analytics & Reports</h1>
            <p className="text-gray-400">Comprehensive performance analysis and data insights</p>
            {selectedTest !== 'all' && (
              <div className="mt-2 flex items-center text-sm text-blue-400 bg-blue-900/20 px-3 py-1 rounded-lg w-fit">
                <Filter className="w-4 h-4 mr-2" />
                Showing data for: {tests.find(t => t.id === selectedTest)?.title || 'Selected Test'}
              </div>
            )}
          </div>
          <div className="flex gap-4 items-center">
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="border border-gray-700 rounded-lg px-4 py-2 "
              aria-label="Select test to filter reports"
            >
              <option value="all">Choose Test</option>
              {tests.length === 0 ? (
                <option disabled>No tests available</option>
              ) : (
                tests.map(test => (
                  <option key={test.id} value={test.id}>{test.title}</option>
                ))
              )}
            </select>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
              title="Refresh test list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleDownloadCSV}
              disabled={downloadingCSV}
              className="bg-neutral-700 hover:bg-neutral-600 text-white border-neutral-600"
              title="Download CSV for current filter"
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
              <CardDescription>
                Score distribution across {selectedTest === 'all' ? 'all students' : 'students for selected test'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {memoPerformanceData && (
                  <Bar 
                    data={memoPerformanceData!} 
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
              <CardDescription>
                Time taken distribution across {selectedTest === 'all' ? 'all attempts' : 'attempts for selected test'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {memoTimeData && (
                  <Bar 
                    data={memoTimeData!} 
                    options={chartOptions}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test-wise Performance Chart - Only show when viewing all tests */}
        {analyticsData.reports.length > 0 && selectedTest === 'all' && (
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
                {memoTestWiseData && (
                  <Bar 
                    data={memoTestWiseData!} 
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
              <CardDescription>
                Average scores and performance by subject {selectedTest === 'all' ? 'across all tests' : 'for selected test'}
              </CardDescription>
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
        {selectedTest !== 'all' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-white">Individual Student Reports</CardTitle>
            <CardDescription>
              Detailed performance data for {selectedTest === 'all' ? 'all students across all tests' : 'students on selected test'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search student, email or test..."
                className="bg-gray-800 border border-gray-700 text-sm rounded-lg px-3 py-2 text-white w-72"
                aria-label="Search reports"
              />
              <div className="text-sm text-gray-400">Showing {filteredReports.length} results</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-gray-400">Student</th>
                    <th className="text-left p-3 text-gray-400">Test</th>
                    <th className="text-left p-3 text-gray-400">Score</th>
                    <th className="text-left p-3 text-gray-400">Percentage</th>
                    <th className="text-left p-3 text-gray-400">Correct</th>
                    <th className="text-left p-3 text-gray-400">Time</th>
                    <th className="text-left p-3 text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFilteredReports.map((report) => (
                    <React.Fragment key={report.attempt_id}>
                      <tr className="border-b border-gray-800 hover:bg-gray-900 transition-colors">
                      <td className="p-3">
                        <div>
                          <div className="font-medium cursor-pointer text-blue-400 hover:underline truncate max-w-xs" onClick={() => { setSelectedReports(analyticsData.reports.filter(r => r.id === report.id)); setShowReportModal(true); }}>
                            {report.full_name || stripDomain(report.email)}
                          </div>
                          <div className="text-gray-400 text-xs truncate max-w-xs">{stripDomain(report.email)}</div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-300 truncate max-w-xs">{report.test_title}</td>
                      <td className="p-3">
                        <span className="font-medium">
                          {parseFloat(String(report.total_score)).toFixed(2)}/{report.total_possible_marks}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={report.percentage >= 70 ? "default" : report.percentage >= 50 ? "secondary" : "destructive"}
                          title={`${report.percentage.toFixed(1)}%`}
                        >
                          {report.percentage.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-green-400">{report.correct_answers}</span>
                        <span className="text-gray-500 mx-1">|</span>
                        <span className="text-red-400">{report.incorrect_answers}</span>
                      </td>
                      <td className="p-3 text-gray-300">{report.time_taken_minutes} min</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => { setSelectedReports([report]); setShowReportModal(true); }}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { window.open(`/api/admin/reports/csv?testId=${report.test_id}`, '_blank'); }}>CSV</Button>
                          <Badge variant="outline">Completed</Badge>
                        </div>
                      </td>
                    </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-400">Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredReports.length)} - {Math.min(page * PAGE_SIZE, filteredReports.length)} of {filteredReports.length} results</div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Previous</Button>
                <div className="text-sm text-gray-300">Page {page}</div>
                <Button size="sm" onClick={() => setPage(page + 1)} disabled={page * PAGE_SIZE >= filteredReports.length}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>)}
      <ReportDetailsModal
        isOpen={showReportModal}
        onClose={() => { setShowReportModal(false); setSelectedReports(null); }}
        reports={selectedReports}
      />
      </div>
    </div>
  );
};

export default ViewReportsPage;
