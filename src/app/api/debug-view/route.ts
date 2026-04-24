import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  
  // Test 1: Can we get the user?
  const { data: { user } } = await supabase.auth.getUser();
  
  // Test 2: Can we read raw base tables directly?
  const { data: tableData, error: tableError } = await supabase.from('produto_filial').select('id_produto').eq('id_filial', '11').limit(1);
  
  // Test 3: Can we read the view?
  const { data: viewData, error: viewError } = await supabase.from('v_produto_filial').select('id_produto').eq('id_filial', '11').limit(1);

  return NextResponse.json({ 
    user: user ? user.id : 'NOT AUTHENTICATED', 
    tableAccess: { data: tableData, error: tableError },
    viewAccess: { data: viewData, error: viewError }
  });
}
