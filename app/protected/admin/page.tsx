import { createClient } from "@/lib/supabase/server";
import { stripDomain } from '@/lib/utils';
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import AIQuestionGenerator from '@/components/ai-question-generator';
import TestDurationEditor from '@/components/admin/test-duration-editor';

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
              Logged in as: <span className="font-medium">{stripDomain(user.email)}</span>
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
                          <div className="mt-2">
                            <TestDurationEditor testId={test.id} initialDuration={test.duration_minutes} initialStart={test.start_time} initialEnd={test.end_time} />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-sm px-3 py-1 rounded ${
                            test.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 
                            'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                          }`}>
                            {test.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-sm text-muted-foreground mt-1">
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
          <div className="qc bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/protected/admin/create" className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors">
                <svg className=" text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="font-medium">Create New Test</span>
              </Link>
              
              <Link href="/protected/admin/reports" className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors">
                <svg className=" text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium">View Reports</span>
              </Link>
              
              <Link href="/protected/admin/ai-question-import" className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors">
                <svg viewBox="0 0 5 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path  strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.34317 0.381218C3.0789 0.348675 2.73252 0.348675 2.24246 0.348675H2.17832V0.41841C2.17832 0.736867 2.17832 0.992562 2.14753 1.19479C2.11674 1.404 2.05003 1.58066 1.89609 1.72013C1.74214 1.8596 1.54715 1.92004 1.31623 1.94793C1.09301 1.97583 0.810776 1.97583 0.459269 1.97583H0.382296V2.96606C0.382296 3.40772 0.382296 3.72385 0.418217 3.96095C0.454137 4.1934 0.518281 4.32822 0.626042 4.42817C0.733804 4.52813 0.882617 4.58624 1.14176 4.61878C1.40603 4.65133 1.75241 4.65133 2.2399 4.65133C2.34509 4.65133 2.43233 4.73036 2.43233 4.82566C2.43233 4.92097 2.34509 5 2.2399 5H2.2245C1.75497 5 1.38037 5 1.09044 4.96513C0.79025 4.92794 0.546504 4.85123 0.354073 4.67922C0.161642 4.50256 0.0769725 4.28405 0.0384862 4.00976C2.29396e-08 3.74477 0 3.40772 0 2.98001V1.80381C0 1.755 0.020526 1.71083 0.0564465 1.67596L1.83708 0.0674105C1.873 0.0255695 1.92688 0 1.98845 0H2.26042C2.73252 0 3.10455 2.07827e-08 3.39705 0.0348675C3.69724 0.0720595 3.94099 0.148768 4.13342 0.323106C4.32585 0.497443 4.41052 0.718271 4.45157 0.990237C4.49006 1.25523 4.49006 1.59461 4.49006 2.01999V2.26639C4.49006 2.36169 4.40282 2.44073 4.29763 2.44073C4.19243 2.44073 4.1052 2.36169 4.1052 2.26639V2.03394C4.1052 1.58996 4.1052 1.27615 4.06928 1.03673C4.03336 0.801953 3.96921 0.667132 3.86145 0.569503C3.75369 0.471874 3.60488 0.411437 3.34573 0.381218H3.34317ZM0.6517 1.62715L1.79346 0.597397C1.79346 0.832171 1.78833 1.00883 1.7678 1.15063C1.74214 1.32032 1.69596 1.41097 1.62412 1.47606C1.55228 1.54114 1.45478 1.58298 1.26491 1.60623C1.1084 1.62483 0.913406 1.62947 0.6517 1.62947V1.62715ZM4.77486 4.1934C4.48749 4.29568 4.22579 4.53278 4.11289 4.79312C3.99487 5.06509 3.56895 5.06509 3.45093 4.79312C3.33804 4.53278 3.07633 4.29568 2.78897 4.1934C2.48878 4.08647 2.48878 3.7006 2.78897 3.59368C3.07633 3.4914 3.33804 3.2543 3.45093 2.99396C3.56895 2.72199 3.99487 2.72199 4.11289 2.99396C4.22579 3.2543 4.48749 3.4914 4.77486 3.59368C5.07505 3.7006 5.07505 4.08647 4.77486 4.1934ZM2.99423 3.89354C3.33291 4.03301 3.62797 4.30033 3.78191 4.60716C3.93586 4.30033 4.23092 4.03068 4.5696 3.89354C4.22277 3.74673 3.94395 3.49413 3.78191 3.17992C3.62797 3.48675 3.33291 3.75639 2.99423 3.89354Z" fill="#9333EA"/>
                </svg>

                <span className="font-medium">Ai Question Parser</span>
              </Link>
               <Link href="/protected/admin/debug" className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors">
                <svg viewBox="0 0 16 20" fill="" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9C6 8.73478 6.10536 8.48043 6.29289 8.29289C6.48043 8.10536 6.73478 8 7 8H9C9.26522 8 9.51957 8.10536 9.70711 8.29289C9.89464 8.48043 10 8.73478 10 9C10 9.26522 9.89464 9.51957 9.70711 9.70711C9.51957 9.89464 9.26522 10 9 10H7C6.73478 10 6.48043 9.89464 6.29289 9.70711C6.10536 9.51957 6 9.26522 6 9ZM7 12C6.73478 12 6.48043 12.1054 6.29289 12.2929C6.10536 12.4804 6 12.7348 6 13C6 13.2652 6.10536 13.5196 6.29289 13.7071C6.48043 13.8946 6.73478 14 7 14H9C9.26522 14 9.51957 13.8946 9.70711 13.7071C9.89464 13.5196 10 13.2652 10 13C10 12.7348 9.89464 12.4804 9.70711 12.2929C9.51957 12.1054 9.26522 12 9 12H7Z" fill="#EA580C"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M5.094 2.75C4.39115 2.00692 3.99966 1.02282 4 0H6C6 0.530433 6.21071 1.03914 6.58579 1.41421C6.96086 1.78929 7.46957 2 8 2C8.53043 2 9.03914 1.78929 9.41421 1.41421C9.78929 1.03914 10 0.530433 10 0H12C12.0003 1.02282 11.6089 2.00692 10.906 2.75C12.1891 3.46165 13.168 4.61738 13.659 6H15C15.2652 6 15.5196 6.10536 15.7071 6.29289C15.8946 6.48043 16 6.73478 16 7C16 7.26522 15.8946 7.51957 15.7071 7.70711C15.5196 7.89464 15.2652 8 15 8H14V10H15C15.2652 10 15.5196 10.1054 15.7071 10.2929C15.8946 10.4804 16 10.7348 16 11C16 11.2652 15.8946 11.5196 15.7071 11.7071C15.5196 11.8946 15.2652 12 15 12H14V14H15C15.2652 14 15.5196 14.1054 15.7071 14.2929C15.8946 14.4804 16 14.7348 16 15C16 15.2652 15.8946 15.5196 15.7071 15.7071C15.5196 15.8946 15.2652 16 15 16H13.659C13.2451 17.1703 12.4787 18.1835 11.4651 18.9001C10.4516 19.6167 9.24079 20.0015 7.9995 20.0015C6.75821 20.0015 5.54743 19.6167 4.53389 18.9001C3.52034 18.1835 2.75387 17.1703 2.34 16H1C0.734784 16 0.48043 15.8946 0.292893 15.7071C0.105357 15.5196 0 15.2652 0 15C0 14.7348 0.105357 14.4804 0.292893 14.2929C0.48043 14.1054 0.734784 14 1 14H2V12H1C0.734784 12 0.48043 11.8946 0.292893 11.7071C0.105357 11.5196 0 11.2652 0 11C0 10.7348 0.105357 10.4804 0.292893 10.2929C0.48043 10.1054 0.734784 10 1 10H2V8H1C0.734784 8 0.48043 7.89464 0.292893 7.70711C0.105357 7.51957 0 7.26522 0 7C0 6.73478 0.105357 6.48043 0.292893 6.29289C0.48043 6.10536 0.734784 6 1 6H2.341C2.83196 4.61738 3.81095 3.46165 5.094 2.75ZM4 14V8C4 6.93913 4.42143 5.92172 5.17157 5.17157C5.92172 4.42143 6.93913 4 8 4C9.06087 4 10.0783 4.42143 10.8284 5.17157C11.5786 5.92172 12 6.93913 12 8V14C12 15.0609 11.5786 16.0783 10.8284 16.8284C10.0783 17.5786 9.06087 18 8 18C6.93913 18 5.92172 17.5786 5.17157 16.8284C4.42143 16.0783 4 15.0609 4 14Z" fill="#EA580C"/>
                </svg>

                <span className="font-medium">Debug</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}