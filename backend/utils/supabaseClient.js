const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_KEY are required");
}

module.exports = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);
