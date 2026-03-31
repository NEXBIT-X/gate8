# Code Cleanup & Minimization Plan

## 🎯 Objectives
- Remove unused/duplicate files
- Clean up empty test files
- Optimize bundle size
- Keep only production-necessary code

## 📋 Files to Remove

### 1. Empty Test Files (0 bytes)
- `test-files/test-api.js` ❌
- `test-files/test-cpp-parsing.js` ❌
- `test-files/test-db.js` ❌
- `components/admin-ai-generator.tsx` ❌
- `components/graphy-footer-integrated.tsx` ❌

### 2. Duplicate/Unused Components
- `components/deploy-button.tsx` ❌ (Vercel template leftover)
- `components/env-var-warning.tsx` ❌ (Development only)
- `components/next-logo.tsx` ❌ (Unused template file)
- `components/supabase-logo.tsx` ❌ (Unused template file)
- `components/hero.tsx` ❌ (Unused template file)
- `components/cool-footer.tsx` ❌ (Duplicate of graphy-footer)
- `components/tutorial/` folder ❌ (Tutorial components not needed)

### 3. Development/Debug Files
- `test-files/debug_api.js` ❌
- `test-files/run-fix-script.js` ❌
- `test-files/test-json-fix.js` ❌
- `test-files/test-reports-logic.js` ❌
- `test-files/linear_algebra_questions_input.txt` ❌

### 4. Build Artifacts (can be regenerated)
- `.next/` folder ❌ (auto-generated)
- `next-env.d.ts` ❌ (auto-generated)

## ✅ Files to Keep

### Essential Components
- ✅ All auth forms (login, signup, password)
- ✅ AI question generator
- ✅ LaTeX editor/renderer
- ✅ Test-taking components
- ✅ Admin dashboard components
- ✅ UI components (buttons, modals, etc.)

### Essential Config
- ✅ package.json
- ✅ next.config.ts
- ✅ tailwind.config.ts
- ✅ tsconfig.json
- ✅ middleware.ts

### Documentation
- ✅ docs/ folder (all guides)
- ✅ README.md

### Database
- ✅ sql-migrations/ (keep for reference)
- ✅ supabase/ folder

## 📊 Expected Savings

| Category | Before | After | Saved |
|----------|--------|-------|-------|
| Components | 47 files | ~35 files | ~12 files |
| Test files | 9 files | 1 file | 8 files |
| Total size | ~2.5 MB | ~2.2 MB | ~300 KB |

## 🚀 Optimization Steps

1. Remove unused files
2. Clean empty files
3. Remove .next build cache
4. Update imports (remove references to deleted files)
5. Run build to verify
6. Update .gitignore

## ⚠️ Safety Notes

- All deletions are reversible via git
- Keep one test file for database connection testing
- Backup important data before cleanup
