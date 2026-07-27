// ═══════════════════════════════════════════════
// SUPABASE — CONFIGURAÇÃO
// ═══════════════════════════════════════════════
const SUPABASE_URL  = 'https://pmgemcvsobonypojltpw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ2VtY3Zzb2Jvbnlwb2psdHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjE1MTcsImV4cCI6MjA5NjYzNzUxN30.3SBG5Lm3A039MprUG4Ea_WVs29iAMtODBE6s3KpoRLg';

// Se estiver rodando local (file://) o Supabase não funciona — usa modo offline
const IS_LOCAL = location.protocol === 'file:';
// Renomeado para evitar conflito com o global window.supabase injetado pelo CDN
const supabaseClient = IS_LOCAL ? null : (window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON) ?? null);

let currentUser = null;
let authMode    = 'login'; // 'login' | 'signup'

// ── INICIALIZAÇÃO AUTH ──────────────────────────
