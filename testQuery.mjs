import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing query on v_produto_filial...");
  const { data, error } = await supabase
    .from("v_produto_filial")
    .select("*")
    .eq("id_filial", "11")
    .limit(5);

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Success! Found", data?.length, "records.");
    console.log(data);
  }
}

test();
