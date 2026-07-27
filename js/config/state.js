// ESTADO
// ═══════════════════════════════════════════════
// expenses é carregado do Supabase após login (veja loadFromSupabase)
let expenses = [];
let pixKeys = []; // chaves Pix cadastradas pelo usuário: {id, apelido, tipo, chave, nome, cidade}

let currentMonth  = new Date().getMonth();
let currentYear   = new Date().getFullYear();
let activeFilter  = 'all';
let currentTab    = 'despesas';
let editingId     = null;
let repeatType    = 'fixo';
let repeatOn      = false;
let selectedCat   = 'outros';
let inlineEditId  = null;

// ═══════════════════════════════════════════════
