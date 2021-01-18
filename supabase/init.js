import config from "../config"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  config.supabaseURL,
  config.supabaseKey
)

export { supabase }