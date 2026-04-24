import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing common products in filial 11...");
  const { data, error } = await supabase
    .from("v_produto_filial")
    .select("produto_descricao, quantidade, preco_venda, produto_subgrupo")
    .eq("id_filial", "11")
    .gt("quantidade", 0)
    .limit(20);

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Products found:", data?.map(p => p.produto_descricao).join(", "));
  }
}

test();
