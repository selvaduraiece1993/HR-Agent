/**
 * Environment Variables Diagnostic Script
 * Run this to check if all required environment variables are set correctly
 */

console.log('\n🔍 Checking Environment Variables...\n');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_USERS_TABLE_NAME',
  'NEXT_PUBLIC_INTERVIEWS_TABLE_NAME',
  'NEXT_PUBLIC_INTERVIEW_RESULTS_TABLE_NAME',
  'OPENROUTER_API_KEY',
  'VAPI_API_KEY',
];

let allPresent = true;

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const display = value ? `${value.substring(0, 20)}...` : 'NOT SET';

  console.log(`${status} ${varName}: ${display}`);

  if (!value) {
    allPresent = false;
  }
});

console.log('\n');

if (allPresent) {
  console.log('✅ All required environment variables are set!\n');
} else {
  console.log('❌ Some environment variables are missing!');
  console.log('Please check your .env.local file.\n');
  process.exit(1);
}

// Test Supabase connection
console.log('🔗 Testing Supabase connection...\n');

import { createClient } from '@supabase/supabase-js';

try {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Try a simple query
  supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Supabase connection failed:', error.message);
        process.exit(1);
      } else {
        console.log('✅ Supabase connection successful!');
        console.log('Session:', data.session ? 'Active' : 'No active session');
        console.log(
          '\n✅ All checks passed! Your environment is configured correctly.\n'
        );
      }
    })
    .catch((err) => {
      console.log('❌ Supabase connection error:', err.message);
      process.exit(1);
    });
} catch (err) {
  console.log('❌ Failed to initialize Supabase client:', err.message);
  process.exit(1);
}
