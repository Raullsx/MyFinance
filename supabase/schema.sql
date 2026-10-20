-- ==============================================================================
-- MYFINANCE - SCRIPT DDL E CONFIGURAÇÃO COMPLETA DO SUPABASE
-- Projeto: tjfjpivlqoucmlcadjfk
-- Inclui: Autenticação, Perfis, Categorias, Transações, RLS e Triggers
-- ==============================================================================
-- Instruções:
-- 1. Abra o Supabase Dashboard: https://supabase.com/dashboard/project/tjfjpivlqoucmlcadjfk/sql/new
-- 2. Cole este script completo no SQL Editor.
-- 3. Clique em "Run" (Ctrl+Enter) para criar as tabelas, RLS e gatilhos de perfil.
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

-- 4. ÍNDICES DE ALTA PERFORMANCE (Supabase Postgres Best Practices)
create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_transactions_date on public.transactions (date desc);
create index if not exists idx_transactions_type on public.transactions (type);
create index if not exists idx_transactions_created_at on public.transactions (created_at desc);
create index if not exists idx_categories_user_id on public.categories (user_id);
create index if not exists idx_categories_type on public.categories (type);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- 6. POLÍTICAS DE ACESSO (RLS)
-- Perfis:
drop policy if exists "Perfis - Leitura pelo próprio usuário" on public.profiles;
create policy "Perfis - Leitura pelo próprio usuário" on public.profiles
    for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Perfis - Atualização pelo próprio usuário" on public.profiles;
create policy "Perfis - Atualização pelo próprio usuário" on public.profiles
    for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Perfis - Inserção pelo próprio usuário" on public.profiles;
create policy "Perfis - Inserção pelo próprio usuário" on public.profiles
    for insert to authenticated with check ((select auth.uid()) = id);

-- Categorias (Isolamento por Usuário + Suporte a Demonstração Pública):
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

-- Transações (Isolamento por Usuário + Suporte a Demonstração Pública):
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

-- 7. PERMISSÕES EXPLÍCITAS PARA OS ROLES DA API (anon e authenticated)
grant all on public.profiles to anon, authenticated;
grant all on public.categories to anon, authenticated;
grant all on public.transactions to anon, authenticated;

-- 8. TRIGGER AUTOMÁTICO: Cria o perfil de usuário ao se cadastrar no auth.users
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

-- 10. CARGA INICIAL DE CATEGORIAS PADRÃO (Para demonstração / template)
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
on conflict (id) do nothing;
