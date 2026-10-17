const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || "TaskFlow";

let supabase = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        isSupabaseConfigured = true;
    } catch (err) {
        console.error("Failed to initialize Supabase client:", err.message);
    }
}

module.exports = {
    supabase,
    supabaseBucket,
    isSupabaseConfigured
};