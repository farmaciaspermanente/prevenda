import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking total records in v_produto_filial...");
  const { count, error } = await supabase
    .from("v_produto_filial")
    .select("*", { count: 'exact', head: true });

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Total records in v_produto_filial:", count);
    
    const { data: filiais } = await supabase
      .from("filiais")
      .select("id, nome");
    console.log("Available filiais:", filiais);
  }
}

test();
