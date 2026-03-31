# Gate8 (G8)

A Next.js-based test/quiz platform with AI-powered question generation and advanced security features.

## 📁 Project Structure

```
gate8/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (27 endpoints)
│   ├── auth/              # Authentication pages
│   └── protected/         # Protected user pages
├── components/            # React components
├── lib/                   # Utilities, types, Supabase client
├── docs/                  # 📄 Documentation & guides (14 files)
├── scripts/               # 🔧 Shell scripts (3 files)
├── sql-migrations/        # 🗄️ SQL migration files (6 files)
├── test-files/            # 🧪 Test & debug scripts (9 files)
├── supabase/              # Supabase schema & migrations
└── tests/                 # Unit tests

```

## 🚀 Tech Stack

- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **AI**: Google Generative AI & Groq SDK
- **Styling**: Tailwind CSS
- **Math Rendering**: KaTeX
- **Charts**: Chart.js

## 📋 Features

- ✅ AI-powered question generation
- ✅ LaTeX math equation support
- ✅ Secure test-taking environment (fullscreen enforcement)
- ✅ Admin dashboard for test management
- ✅ Detailed analytics & reports
- ✅ Question shuffling & randomization
- ✅ User authentication & authorization
- ✅ CSV export for reports

## 🛠️ Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 📚 Documentation

All documentation is organized in the `/docs` folder:

- `README.md` - This file
- `LATEX_DOCUMENTATION.md` - LaTeX rendering guide
- `SHUFFLE_DOCUMENTATION.md` - Question shuffling logic
- `DATABASE_FIX_GUIDE.md` - Database troubleshooting
- `SECURITY_FIX_GUIDE.md` - Security implementation
- `TEST_INSTRUCTIONS.md` - Testing guidelines
- And more...

## 🗄️ Database

SQL migration files are in `/sql-migrations`:
- `complete_database_fix.sql` - Complete schema
- `fix_database_schema.sql` - Schema fixes
- `sample_test_data.sql` - Sample data

## 🔧 Scripts

Shell scripts in `/scripts`:
- `setup.sh` - Initial setup
- `setup-db.sh` - Database setup
- `migrate-db.sh` - Run migrations

## 🧪 Testing

Test files in `/test-files`:
- Debug scripts
- API testing utilities
- Database connection tests

## 📡 API Endpoints

### Admin (15 endpoints)
- Question management (8)
- Test management (3)
- Reports (2)
- AI generation (2)

### User (9 endpoints)
- Test taking flow (7)
- User attempts (1)
- Protected AI (1)

### Utility (3 endpoints)
- AI explanations
- Seeding
- Debugging

## 🔐 Environment Variables

Required environment variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `GROQ_API_KEY`

## 📝 License

[Add your license here]

## 👥 Contributors

[Add contributors here]
