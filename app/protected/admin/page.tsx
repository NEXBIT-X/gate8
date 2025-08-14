import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import AIQuestionGenerator from '@/components/ai-question-generator';

interface AdminStats {
  totalUsers: number;
  totalTests: number;
  totalAttempts: number;
  activeTests: number;
}

interface Test {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  total_questions: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  
  // Check if user is authenticated and is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Authorization: only allow specific emails
  const allowedEmails = [
    "abhijeethvn2006@gmail.com",
    "pavan03062006@gmail.com",
    "devash217@gmail.com",
    "b.lakshminarayanan2007@gmail.com"
  ];

  if (!allowedEmails.includes(user.email || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the admin dashboard.
          </p>
          <Link 
            href="/protected" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  let stats: AdminStats = {
    totalUsers: 0,
    totalTests: 0,
    totalAttempts: 0,
    activeTests: 0
  };

  let recentTests: Test[] = [];
  let errors: string[] = [];

  try {
    // Use service role client for admin queries to bypass RLS
    const adminSupabase = createServiceRoleClient();

    // Fetch total users
    const { count: usersCount, error: usersError } = await adminSupabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) {
      errors.push(`Users query failed: ${usersError.message}`);
    } else {
      stats.totalUsers = usersCount || 0;
    }

    // Fetch total tests
    const { count: testsCount, error: testsError } = await adminSupabase
      .from('tests')
      .select('*', { count: 'exact', head: true });
    
    if (testsError) {
      errors.push(`Tests query failed: ${testsError.message}`);
    } else {
      stats.totalTests = testsCount || 0;
    }

    // Fetch total attempts
    const { count: attemptsCount, error: attemptsError } = await adminSupabase
      .from('user_test_attempts')
      .select('*', { count: 'exact', head: true });
    
    if (attemptsError) {
      errors.push(`Attempts query failed: ${attemptsError.message}`);
    } else {
      stats.totalAttempts = attemptsCount || 0;
    }

    // Fetch active tests count - using current time to determine if test is active
    const now = new Date().toISOString();
    const { count: activeCount, error: activeError } = await adminSupabase
      .from('tests')
      .select('*', { count: 'exact', head: true })
      .lte('start_time', now)
      .gte('end_time', now);
    
    if (activeError) {
      errors.push(`Active tests query failed: ${activeError.message}`);
    } else {
      stats.activeTests = activeCount || 0;
    }

    // Fetch recent tests
    const { data: testsData, error: recentTestsError } = await adminSupabase
      .from('tests')
      .select('id, title, duration_minutes, questions, start_time, end_time, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentTestsError) {
      errors.push(`Recent tests query failed: ${recentTestsError.message}`);
    } else {
      recentTests = (testsData || []).map(test => ({
        id: test.id,
        title: test.title,
        description: '', // Not available in schema
        duration_minutes: test.duration_minutes,
        total_questions: test.questions ? test.questions.length : 0,
        start_time: test.start_time,
        end_time: test.end_time,
        is_active: new Date(test.start_time) <= new Date() && new Date() <= new Date(test.end_time),
        created_at: test.created_at
      }));
    }

  } catch (error) {
    console.error('Dashboard error:', error);
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="mt-2 text-muted-foreground">
                Manage tests, users, and system settings
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Logged in as: <span className="font-medium">{user.email}</span>
            </div>
          </div>
        </header>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">System Errors</h3>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-red-700 dark:text-red-300 text-sm">• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                  <p className="text-2xl font-bold">{stats.totalTests}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5a2 2 0 012 2v6a2 2 0 01-2 2H9m4-2V7a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Attempts</p>
                  <p className="text-2xl font-bold">{stats.totalAttempts}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Tests</p>
                  <p className="text-2xl font-bold">{stats.activeTests}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Question Generator */}
          <div className="col-span-full">
            <AIQuestionGenerator />
          </div>

          {/* System Status and Recent Tests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* System Status */}
            <div className="bg-card rounded-lg border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">System Status</h2>
                <p className="text-sm text-muted-foreground">Application health and status</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Database Connection</span>
                    </div>
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">Authentication Service</span>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Running</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-medium">Test Engine</span>
                    </div>
                    <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">Online</span>
                  </div>
                  
                  {errors.length === 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Overall Status</span>
                      </div>
                      <span className="text-green-600 dark:text-green-400 text-sm font-medium">All Systems Operational</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Tests */}
            <div className="bg-card rounded-lg border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Recent Tests</h2>
                <p className="text-sm text-muted-foreground">Latest test activities</p>
              </div>
              <div className="p-6">
                {recentTests.length > 0 ? (
                  <div className="space-y-4">
                    {recentTests.map((test) => (
                      <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium">{test.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {test.total_questions} questions • {test.duration_minutes} minutes
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            test.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 
                            'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                          }`}>
                            {test.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(test.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No tests found</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/protected/admin/create" className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="font-medium">Create New Test</span>
              </Link>
              
              <Link href="/protected/admin/reports" className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">View Reports</span>
              </Link>
              
              <button className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">System Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}