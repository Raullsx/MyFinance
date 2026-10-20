/**
 * Cliente e Conector do Supabase com Suporte a Autenticação (MyFinance)
 * Gerencia comunicação REST, autenticação (Cadastro e Login) e Realtime.
 */

(function () {
  const SUPABASE_URL = 'https://tjfjpivlqoucmlcadjfk.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_hRIq389g-2186S1MPaHmoA_bWIQ9lxk';
  const PROJECT_ID = 'tjfjpivlqoucmlcadjfk';

  let client = null;
  let realtimeChannel = null;
  let currentUser = null;

  // Inicializa o cliente do Supabase SDK
  function getClient() {
    if (!client) {
      if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      } else {
        console.warn('Supabase SDK não carregado no window.supabase');
      }
    }
    return client;
  }

  const SupabaseBridge = {
    projectId: PROJECT_ID,
    projectUrl: SUPABASE_URL,
    apiKey: SUPABASE_ANON_KEY,
    status: 'initializing', // 'connected' | 'tables_missing' | 'offline' | 'error'

    schemaSql: `-- ==============================================================================
-- MYFINANCE - SCRIPT DDL E CONFIGURAÇÃO COMPLETA DO SUPABASE
-- Projeto: tjfjpivlqoucmlcadjfk
-- Inclui: Autenticação, Perfis, Categorias, Transações, RLS e Triggers
-- ==============================================================================

-- 1. TABELA DE PERFIS DE USUÁRIO (Vinculada ao auth.users)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    business_name text,
    avatar_url text,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. TABELA DE CATEGORIAS
create table if not exists public.categories (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade default auth.uid(),
    name text not null,
    type text not null check (type in ('income', 'expense')),
    icon text not null default '🏷️',
    created_at timestamptz not null default timezone('utc'::text, now())
);

-- 3. TABELA DE TRANSAÇÕES
create table if not exists public.transactions (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade default auth.uid(),
    description text not null,
    amount numeric(12, 2) not null check (amount > 0),
    type text not null check (type in ('income', 'expense')),
    category text not null,
    date date not null default current_date,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 4. ÍNDICES DE ALTA PERFORMANCE
create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_transactions_date on public.transactions (date desc);
create index if not exists idx_transactions_type on public.transactions (type);
create index if not exists idx_transactions_created_at on public.transactions (created_at desc);
create index if not exists idx_categories_user_id on public.categories (user_id);
create index if not exists idx_categories_type on public.categories (type);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- 6. POLÍTICAS DE ACESSO (RLS)
drop policy if exists "Perfis - Leitura pelo próprio usuário" on public.profiles;
create policy "Perfis - Leitura pelo próprio usuário" on public.profiles
    for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Perfis - Atualização pelo próprio usuário" on public.profiles;
create policy "Perfis - Atualização pelo próprio usuário" on public.profiles
    for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Perfis - Inserção pelo próprio usuário" on public.profiles;
create policy "Perfis - Inserção pelo próprio usuário" on public.profiles
    for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "Categorias - Leitura" on public.categories;
create policy "Categorias - Leitura" on public.categories
    for select to anon, authenticated 
    using (auth.uid() = user_id or user_id is null);

drop policy if exists "Categorias - Inserção" on public.categories;
create policy "Categorias - Inserção" on public.categories
    for insert to anon, authenticated 
    with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Categorias - Atualização" on public.categories;
create policy "Categorias - Atualização" on public.categories
    for update to anon, authenticated 
    using (auth.uid() = user_id or user_id is null)
    with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Categorias - Exclusão" on public.categories;
create policy "Categorias - Exclusão" on public.categories
    for delete to anon, authenticated 
    using (auth.uid() = user_id or user_id is null);

drop policy if exists "Transações - Leitura" on public.transactions;
create policy "Transações - Leitura" on public.transactions
    for select to anon, authenticated 
    using (auth.uid() = user_id or user_id is null);

drop policy if exists "Transações - Inserção" on public.transactions;
create policy "Transações - Inserção" on public.transactions
    for insert to anon, authenticated 
    with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Transações - Atualização" on public.transactions;
create policy "Transações - Atualização" on public.transactions
    for update to anon, authenticated 
    using (auth.uid() = user_id or user_id is null)
    with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Transações - Exclusão" on public.transactions;
create policy "Transações - Exclusão" on public.transactions
    for delete to anon, authenticated 
    using (auth.uid() = user_id or user_id is null);

-- 7. PERMISSÕES EXPLÍCITAS
grant all on public.profiles to anon, authenticated;
grant all on public.categories to anon, authenticated;
grant all on public.transactions to anon, authenticated;

-- 8. TRIGGER AUTOMÁTICO: Cria o perfil ao se cadastrar no auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'business_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. HABILITAR SUPABASE REALTIME
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;

-- 10. CATEGORIAS PADRÃO TEMPLATE
insert into public.categories (id, name, type, icon)
values
  ('cat-inc-1', 'Venda de Produtos', 'income', '🛍️'),
  ('cat-inc-2', 'Prestação de Serviços', 'income', '💼'),
  ('cat-inc-3', 'Consultoria & Projetos', 'income', '📊'),
  ('cat-inc-4', 'Rendimentos / Outros', 'income', '📈'),
  ('cat-exp-1', 'Aluguel & Condomínio', 'expense', '🏢'),
  ('cat-exp-2', 'Água, Luz, Internet', 'expense', '⚡'),
  ('cat-exp-3', 'Fornecedores & Insumos', 'expense', '📦'),
  ('cat-exp-4', 'Marketing & Anúncios', 'expense', '📢'),
  ('cat-exp-5', 'Folha & Pró-labore', 'expense', '👥'),
  ('cat-exp-6', 'Taxas & Impostos', 'expense', '📑'),
  ('cat-exp-7', 'Despesas Gerais', 'expense', '💳')
on conflict (id) do nothing;`,

    getClient,

    // ==========================================
    // AUTENTICAÇÃO (CADASTRO, LOGIN, LOGOUT)
    // ==========================================

    /**
     * Cadastra um novo usuário com Nome e Empresa
     */
    async signUp(email, password, { fullName = '', businessName = '' } = {}) {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase indisponível');

      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            business_name: businessName.trim()
          }
        }
      });

      if (error) throw error;
      if (data && data.user) {
        currentUser = data.user;
      }
      return data;
    },

    /**
     * Efetua login com email e senha
     */
    async signIn(email, password) {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase indisponível');

      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;
      if (data && data.user) {
        currentUser = data.user;
      }
      return data;
    },

    /**
     * Encerra a sessão do usuário
     */
    async signOut() {
      const sb = getClient();
      if (!sb) return;

      const { error } = await sb.auth.signOut();
      currentUser = null;
      if (error) console.error('Erro ao encerrar sessão:', error);
      return !error;
    },

    /**
     * Retorna a sessão ativa atual
     */
    async getSession() {
      const sb = getClient();
      if (!sb) return null;

      try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (error) return null;
        if (session && session.user) {
          currentUser = session.user;
        }
        return session;
      } catch (e) {
        return null;
      }
    },

    /**
     * Retorna o usuário logado atualmente
     */
    async getCurrentUser() {
      if (currentUser) return currentUser;
      const session = await this.getSession();
      return session ? session.user : null;
    },

    /**
     * Busca dados do perfil na tabela 'profiles'
     */
    async getProfile(userId) {
      const sb = getClient();
      if (!sb || !userId) return null;

      try {
        const { data, error } = await sb
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) return null;
        return data;
      } catch (e) {
        return null;
      }
    },

    /**
     * Monitora mudanças de estado de autenticação
     */
    onAuthStateChange(callback) {
      const sb = getClient();
      if (!sb) return { unsubscribe: () => {} };

      const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
        currentUser = session ? session.user : null;
        if (typeof callback === 'function') {
          callback(event, session);
        }
      });

      return subscription;
    },

    // ==========================================
    // DIAGNÓSTICO E SAÚDE DO BANCO
    // ==========================================

    /**
     * Verifica se o banco de dados está online e se as tabelas foram criadas
     */
    async checkHealth() {
      const sb = getClient();
      if (!sb) {
        this.status = 'offline';
        return { ok: false, status: 'offline', message: 'Biblioteca Supabase JS indisponível' };
      }

      try {
        const { data, error, status } = await sb
          .from('transactions')
          .select('id')
          .limit(1);

        if (error || status === 404) {
          if (
            status === 404 ||
            (error && (error.code === 'PGRST205' || (error.message && error.message.includes('Could not find the table'))))
          ) {
            this.status = 'tables_missing';
            return {
              ok: false,
              status: 'tables_missing',
              code: error ? error.code : 'PGRST205',
              message: 'Conectado ao Supabase, mas a tabela "transactions" ainda não foi criada no SQL Editor.'
            };
          }
          this.status = 'error';
          return { ok: false, status: 'error', error, message: error ? error.message : 'Status ' + status };
        }

        this.status = 'connected';
        return { ok: true, status: 'connected', message: 'Supabase conectado e pronto!' };
      } catch (err) {
        console.error('Falha ao checar saúde do Supabase:', err);
        this.status = 'offline';
        return { ok: false, status: 'offline', error: err, message: 'Sem resposta do servidor Supabase' };
      }
    },

    // ==========================================
    // OPERAÇÕES DE DADOS (TRANSAÇÕES & CATEGORIAS)
    // ==========================================

    /**
     * Busca transações ordenadas cronologicamente
     */
    async getTransactions() {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase não inicializado');

      const user = await this.getCurrentUser();
      let query = sb.from('transactions').select('*');

      // Se usuário autenticado, filtra pelas transações dele
      if (user && user.id) {
        query = query.or(`user_id.eq.${user.id},user_id.is.null`);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        description: row.description,
        amount: Number(row.amount),
        type: row.type,
        category: row.category,
        date: row.date,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    },

    /**
     * Cria uma nova transação no Supabase
     */
    async insertTransaction(tx) {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase não inicializado');

      const user = await this.getCurrentUser();
      const payload = {
        id: tx.id,
        user_id: user ? user.id : null,
        description: tx.description,
        amount: Number(tx.amount),
        type: tx.type,
        category: tx.category,
        date: tx.date,
        created_at: tx.createdAt || new Date().toISOString()
      };

      const { data, error } = await sb
        .from('transactions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        date: data.date,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },

    /**
     * Atualiza transação existente no Supabase
     */
    async updateTransaction(id, updatedData) {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase não inicializado');

      const payload = {
        description: updatedData.description,
        amount: Number(updatedData.amount),
        type: updatedData.type,
        category: updatedData.category,
        date: updatedData.date,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await sb
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        date: data.date,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },

    /**
     * Exclui transação no Supabase
     */
    async deleteTransaction(id) {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase não inicializado');

      const { error } = await sb
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },

    /**
     * Busca categorias cadastradas no Supabase
     */
    async getCategories() {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase não inicializado');

      const user = await this.getCurrentUser();
      let query = sb.from('categories').select('*');

      if (user && user.id) {
        query = query.or(`user_id.eq.${user.id},user_id.is.null`);
      }

      const { data, error } = await query
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        icon: row.icon
      }));
    },

    /**
     * Cria nova categoria no Supabase
     */
    async insertCategory(cat) {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase não inicializado');

      const user = await this.getCurrentUser();
      const payload = {
        id: cat.id,
        user_id: user ? user.id : null,
        name: cat.name,
        type: cat.type,
        icon: cat.icon || '🏷️'
      };

      const { data, error } = await sb
        .from('categories')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    /**
     * Exclui categoria no Supabase
     */
    async deleteCategory(id) {
      const sb = getClient();
      if (!sb) throw new Error('Cliente Supabase não inicializado');

      const { error } = await sb
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },

    /**
     * Carga inicial (seed) de dados para o Supabase caso o banco esteja vazio
     */
    async seedIfEmpty(mockTransactions, mockCategories) {
      const sb = getClient();
      if (!sb) return;

      try {
        const { count: catCount } = await sb
          .from('categories')
          .select('id', { count: 'exact', head: true });

        if (catCount === 0 && mockCategories && mockCategories.length > 0) {
          await sb.from('categories').insert(
            mockCategories.map(c => ({
              id: c.id,
              name: c.name,
              type: c.type,
              icon: c.icon
            }))
          );
        }

        const { count: txCount } = await sb
          .from('transactions')
          .select('id', { count: 'exact', head: true });

        if (txCount === 0 && mockTransactions && mockTransactions.length > 0) {
          await sb.from('transactions').insert(
            mockTransactions.map(tx => ({
              id: tx.id,
              description: tx.description,
              amount: tx.amount,
              type: tx.type,
              category: tx.category,
              date: tx.date,
              created_at: tx.createdAt
            }))
          );
        }
      } catch (err) {
        console.warn('Não foi possível verificar seed:', err);
      }
    },

    /**
     * Assina atualizações em tempo real (Supabase Realtime)
     */
    subscribeRealtime(onTransactionChange, onCategoryChange) {
      const sb = getClient();
      if (!sb) return null;

      if (realtimeChannel) {
        sb.removeChannel(realtimeChannel);
      }

      realtimeChannel = sb
        .channel('myfinance-realtime-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          payload => {
            if (typeof onTransactionChange === 'function') {
              onTransactionChange(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          payload => {
            if (typeof onCategoryChange === 'function') {
              onCategoryChange(payload);
            }
          }
        )
        .subscribe();

      return realtimeChannel;
    }
  };

  window.SupabaseBridge = SupabaseBridge;
})();
