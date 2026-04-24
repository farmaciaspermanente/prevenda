import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from("v_produto_filial")
    .select("produto_subgrupo")
    .limit(500);

  if (error) {
    console.error(error);
  } else {
    const subgrupos = [...new Set(data.map(p => p.produto_subgrupo))];
    console.log("Subgrupos encontrados:", subgrupos);
  }
}

test();
