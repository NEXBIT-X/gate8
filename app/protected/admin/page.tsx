import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";


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
  const allowedEmails = ["abhijeethvn2006@gmail.com","pavan03062006@gmail.com"];
  if (!user?.email || !allowedEmails.includes(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Your account is not authorized to view this page.</p>
        </div>
      </div>
    );
  }

  let tests: Test[] = [];
  const errors: string[] = [];

  // Initialize stats that will be computed
  let totalTests = 0;
  let activeTests = 0;
  const totalUsers = 0; // Can't reliably query this
  const totalAttempts = 0; // Can't reliably query this

  try {
    // Get test statistics
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (testError) {
      console.error('Error fetching tests:', testError);
      errors.push(`Failed to fetch tests: ${testError.message}`);
    } else {
      tests = testData || [];
      totalTests = tests.length;
      activeTests = tests.filter(t => t.is_active).length;
    }

  } catch (error) {
    console.error('Admin dashboard error:', error);
    errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Compute final stats
  const stats: AdminStats = {
    totalUsers,
    totalTests,
    totalAttempts,
    activeTests
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>
          <div className="text-sm text-muted-foreground">
            Logged in as: <span className="font-medium">{user.email}</span>
          </div>
        </header>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">System Errors</h3>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-red-700 dark:text-red-300 text-sm">• {error}</li>
              ))}
            </ul>
          </div>
        )}

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Tests</p>
                <p className="text-2xl font-bold">{stats.activeTests}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Test Attempts</p>
                <p className="text-2xl font-bold">{stats.totalAttempts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <p className="text-sm text-muted-foreground">Latest created tests</p>
            </div>
            <div className="p-6">
              {tests.length > 0 ? (
                <div className="space-y-3">
                  {tests.slice(0, 5).map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{test.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {test.duration_minutes} min • {test.total_questions} questions
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
            <Link  href="/protected/admin/create" className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-medium">Create New Test</span>
            </Link>
            
            <button className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">View Reports</span>
            </button>
            
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
  );
}