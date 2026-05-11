# Notes Feature - Supabase Setup (Critical)

## ⚠️ IMPORTANT: This step MUST be done before Notes feature works

The Notes feature requires a Supabase database table. This guide shows you how to set it up.

---

## Option 1: Using Supabase Dashboard (Easiest)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)

### Step 2: Run the Migration SQL
1. Click **New Query**
2. Copy and paste the SQL from `supabase/migrations/add_notes_table.sql`
3. Click **Run** (blue button)

### Step 3: Verify Table Created
1. Go to **Table Editor** (left sidebar)
2. You should see a **notes** table
3. Click to view columns:
   - `id` (text, primary key)
   - `user_id` (uuid)
   - `title` (text)
   - `content` (text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

---

## Option 2: Using Supabase CLI

### Step 1: Install CLI (if not already installed)
```bash
npm install -g supabase
```

### Step 2: Link to Your Project
```bash
supabase link --project-ref your-project-ref
```

### Step 3: Push Migration
```bash
supabase db push
```

---

## Verification Checklist

After running the migration, verify:

### ✅ Table Exists
In SQL Editor, run:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'notes';
```
Should return 1 row.

### ✅ Columns Exist
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notes';
```
Should show: id, user_id, title, content, created_at, updated_at

### ✅ RLS Policies Exist
```sql
SELECT * FROM auth.policies 
WHERE table_name = 'notes';
```
Should show 4 policies:
- Users can view their own notes
- Users can create notes
- Users can update their own notes
- Users can delete their own notes

### ✅ Indexes Exist
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'notes';
```
Should show at least 2 indexes for performance.

---

## SQL Migration Contents

Here's what gets created:

```sql
-- Table
CREATE TABLE public.notes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT '',
  content text DEFAULT '',
  created_at timestamp WITH TIME ZONE DEFAULT NOW(),
  updated_at timestamp WITH TIME ZONE DEFAULT NOW()
);

-- Security: Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own notes
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX notes_user_id_idx ON public.notes(user_id);
CREATE INDEX notes_updated_at_idx ON public.notes(updated_at DESC);
```

---

## Testing the Setup

### Create a Test Note via Dashboard
1. In Supabase, go to **Table Editor** > **notes**
2. Click **Insert Row**
3. Fill in:
   - id: `test_note_123`
   - user_id: (your user UUID - see below)
   - title: `Test Note`
   - content: `This is a test note`
4. Click **Save**

### Find Your User UUID
In SQL Editor, run:
```sql
SELECT id, email FROM auth.users LIMIT 1;
```
Copy the UUID and use it for the user_id field.

---

## Troubleshooting

### Issue: "relation 'public.notes' does not exist"
**Solution**: The migration hasn't been run. Follow the setup steps above.

### Issue: "new row violates row-level security policy"
**Solution**: The user_id doesn't match the authenticated user. Make sure you're logged in to the app.

### Issue: Can't insert notes from the app
**Solution**: 
- Check RLS policies are enabled
- Verify user is authenticated
- Check browser console for errors
- Verify user UUID matches in database

### Issue: Notes not saving
**Solution**:
- Check Supabase connection string in `.env.local`
- Verify table and columns exist
- Check RLS policies allow writes
- Look for error messages in browser console

---

## Security Notes

✅ **Data is protected by RLS:**
- Users can ONLY see/edit their own notes
- Each user is isolated to their own data
- Authentication required for all operations

✅ **On delete cascade:**
- If user account is deleted, all their notes are automatically deleted
- No orphaned data left behind

---

## Next Steps After Setup

1. ✅ **Table created** - You've done this
2. 🔜 **Test the Notes feature:**
   - Go to `/notes` in your app
   - Type some content
   - Wait 2 seconds for auto-save
   - Refresh page - content should persist
3. 🔜 **Verify in database:**
   - Check Supabase notes table
   - See your note data there

---

## Support

If migration fails:
1. Check you have proper permissions in Supabase
2. Ensure project is properly linked
3. Try running migration in steps (create table first, then policies)
4. Check for SQL syntax errors in error message

---

## Created: May 11, 2026
Last migration file: `supabase/migrations/add_notes_table.sql`
