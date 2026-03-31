#!/bin/bash

echo "🔧 GATE Exam System Setup"
echo "========================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo ""
    echo "📋 Required environment variables:"
    echo "NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key"
    echo ""
    echo "1. Create a .env.local file in the project root"
    echo "2. Add the above environment variables with your Supabase details"
    echo "3. You can find these in your Supabase project settings > API"
    echo ""
    echo "Example .env.local file:"
    echo "------------------------"
    cat .env.example
    echo ""
    exit 1
fi

echo "✅ .env.local file found"

# Check if required variables are set
source .env.local

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Missing required environment variables in .env.local"
    echo "Make sure you have set:"
    echo "- NEXT_PUBLIC_SUPABASE_URL"
    echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Check if the database migration has been run
echo "📊 To complete setup:"
echo "1. Run the database migration in your Supabase SQL editor"
echo "2. The migration file is: supabase/final_schema.sql"
echo "3. Start the dev server: npm run dev"
echo "4. Visit: http://localhost:3000/protected/dash"
echo ""

echo "🎯 Ready to test your GATE exam system!"
