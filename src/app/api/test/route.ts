import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || 'pressao';
  const filial = searchParams.get('filial') || '11';

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('v_produto_filial')
    .select('id_produto, descricao, quantidade')
    .eq('filial_id', filial)
    .or(`produto_descricao.ilike.%${q}%,produto_principio_ativo.ilike.%${q}%`)
    .limit(10);

  return NextResponse.json({ query: q, data, error });
}
