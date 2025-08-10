# Production Authentication Fix Guide

## Problem
The deployment on Render is showing authentication errors:
```
Error checking existing attempt: {
  code: '42501',
  details: null,
  hint: null,
  message: 'permission denied for table users'
}
```

## Root Cause
This error occurs because:
1. Row Level Security (RLS) policies are not properly configured in production
2. The Supabase project might not have the correct policies for authenticated users
3. Environment variables might not be properly set

## Solution Steps

### 1. Fix Database Policies
Run the `fix_production_auth.sql` script in your production Supabase SQL Editor:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your production project
3. Go to SQL Editor
4. Copy and paste the entire contents of `fix_production_auth.sql`
5. Execute the script

### 2. Verify Environment Variables
Ensure these environment variables are set in your Render dashboard:

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (if using admin functions)

**To set in Render:**
1. Go to your Render dashboard
2. Select your web service (gate8)
3. Go to Environment tab
4. Add each environment variable
5. Deploy the service again

### 3. Check Supabase Project Configuration

**Verify in Supabase Dashboard:**
1. **Authentication → Settings**: Ensure site URL includes your Render domain
2. **Authentication → URL Configuration**: Add `https://gate8.onrender.com` to redirect URLs
3. **API → Settings**: Verify your API keys are correct

### 4. Test the Fix

After running the SQL script and updating environment variables:

1. **Redeploy** your Render service
2. **Test authentication** by visiting: https://gate8.onrender.com/auth/login
3. **Test API endpoints** by checking the logs for any remaining errors

### 5. Common Issues and Solutions

**Issue: Still getting "permission denied"**
- Solution: The RLS policies might not be applied correctly. Re-run the SQL script.

**Issue: "User not found" errors**
- Solution: Check if the `auth.users` table is accessible. This might indicate environment variable issues.

**Issue: "Table does not exist"**
- Solution: The database schema wasn't created properly. Run the complete schema setup.

### 6. Monitoring

**Check Render Logs:**
```bash
# View real-time logs
https://dashboard.render.com/web/srv-YOUR-SERVICE-ID/logs
```

**Check Supabase Logs:**
1. Go to Supabase Dashboard → Logs
2. Look for authentication and API errors
3. Monitor the logs while testing

### 7. Admin Access

The system includes admin functionality for users with these emails:
- examapp109@gmail.com
- abhijeethvn@gmail.com
- admin@gate8.onrender.com

To add more admin users, update the `is_admin` function in the SQL script.

### 8. Final Verification

After implementing all fixes, test these endpoints:
- `/api/tests` - Should return available tests
- `/api/tests/start` - Should allow starting a test
- `/protected/dash` - Should show dashboard for authenticated users
- `/protected/admin` - Should show admin panel for admin users

## Success Indicators

✅ No "permission denied" errors in logs  
✅ Users can log in successfully  
✅ Dashboard loads and shows available tests  
✅ Test starting works without errors  
✅ Admin users can access admin panel  

## Support

If issues persist:
1. Check the complete error logs in both Render and Supabase
2. Verify all environment variables are correctly set
3. Ensure the SQL script was executed without errors
4. Test with a fresh user registration to isolate authentication issues
