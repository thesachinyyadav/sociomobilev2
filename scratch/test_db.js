
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vkappuaapscvteexogtp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrYXBwdWFhcHNjdnRlZXhvZ3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTQwOTIsImV4cCI6MjA2MTgzMDA5Mn0.ILq6Aho_0xGW3JtbhXWpB-0AkJAN70-3q2abplZ3fbA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('clubs').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Data count:', data ? data.length : 0);
    if (data && data.length > 0) {
      console.log('Sample Row:', JSON.stringify(data[0], null, 2));
    }
  }
}

test();
