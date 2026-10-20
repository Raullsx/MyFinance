/**
 * Camada de Armazenamento Híbrida (FinanceStorage)
 * Conexão com Supabase PostgreSQL Cloud + Cache LocalStorage com suporte a Offline-First,
 * Sincronização em Tempo Real (Supabase Realtime), filtros e exportação CSV.
 */

const STORAGE_KEY_TX = 'myfinance_transactions_v2';
const STORAGE_KEY_CAT = 'myfinance_categories_v2';

const FinanceStorage = {
  isSupabaseActive: false,
  supabaseStatus: 'initializing', // 'connected' | 'tables_missing' | 'offline' | 'error'
  isInitialized: false,

  /**
   * Inicializa o armazenamento, verifica a saúde do Supabase e sincroniza dados
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Garante que os dados locais existam imediatamente para renderização ultrarrápida
    this.ensureLocalCache();

    // 2. Verifica a conexão com o Supabase
    if (window.SupabaseBridge) {
      try {
        const health = await window.SupabaseBridge.checkHealth();
        this.supabaseStatus = health.status;

        if (health.ok) {
          this.isSupabaseActive = true;
          console.log('✅ Supabase conectado com sucesso ao projeto:', window.SupabaseBridge.projectId);

          // Verifica se precisa de carga inicial (seed)
          await window.SupabaseBridge.seedIfEmpty(
            window.INITIAL_MOCK_TRANSACTIONS,
            window.INITIAL_CATEGORIES
          );

          // Puxa os dados mais recentes do Supabase para atualizar a aplicação
          await this.pullFromSupabase();

          // Configura sincronização em tempo real (Realtime)
          this.setupRealtimeListeners();
        } else {
          this.isSupabaseActive = false;
          console.warn('ℹ️ Supabase em modo fallback:', health.status, health.message);
        }
      } catch (err) {
        console.error('Erro na inicialização do Supabase:', err);
        this.supabaseStatus = 'offline';
        this.isSupabaseActive = false;
      }
    } else {
      this.supabaseStatus = 'offline';
    }

    this.notifyDataChange('init');
  },

  /**
   * Garante que o LocalStorage contenha dados válidos
   */
  ensureLocalCache() {
    try {
      if (!localStorage.getItem(STORAGE_KEY_TX)) {
        const initialTx = window.INITIAL_MOCK_TRANSACTIONS || [];
        localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(initialTx));
      }
      if (!localStorage.getItem(STORAGE_KEY_CAT)) {
        const initialCat = window.INITIAL_CATEGORIES || [];
        localStorage.setItem(STORAGE_KEY_CAT, JSON.stringify(initialCat));
      }
    } catch (e) {
      console.warn('LocalStorage inacessível:', e);
    }
  },

  /**
   * Puxa transações e categorias do Supabase e sincroniza o cache local
   */
  async pullFromSupabase() {
    if (!this.isSupabaseActive || !window.SupabaseBridge) return;

    try {
      const [remoteTx, remoteCat] = await Promise.all([
        window.SupabaseBridge.getTransactions(),
        window.SupabaseBridge.getCategories()
      ]);

      if (remoteTx && Array.isArray(remoteTx)) {
        this.saveTransactions(remoteTx);
      }
      if (remoteCat && Array.isArray(remoteCat) && remoteCat.length > 0) {
        this.saveCategories(remoteCat);
      }

      this.notifyDataChange('pull');
    } catch (err) {
      console.error('Erro ao puxar dados do Supabase:', err);
    }
  },

  /**
   * Configura listeners de mudanças em tempo real via Supabase Realtime
   */
  setupRealtimeListeners() {
    if (!window.SupabaseBridge) return;

    window.SupabaseBridge.subscribeRealtime(
      // On Transaction Change
      async (payload) => {
        console.log('⚡ Atualização remota recebida (Transactions):', payload.eventType);
        await this.pullFromSupabase();
      },
      // On Category Change
      async (payload) => {
        console.log('⚡ Atualização remota recebida (Categories):', payload.eventType);
        await this.pullFromSupabase();
      }
    );
  },

  /**
   * Dispara evento para avisar a interface que os dados foram atualizados
   */
  notifyDataChange(source = 'local') {
    window.dispatchEvent(new CustomEvent('myfinance:data-changed', {
      detail: {
        source,
        supabaseStatus: this.supabaseStatus,
        isSupabaseActive: this.isSupabaseActive
      }
    }));
  },

  // ==========================================
  // TRANSAÇÕES
  // ==========================================

  getTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TX);
      if (!raw) {
        const initial = window.INITIAL_MOCK_TRANSACTIONS || [];
        this.saveTransactions(initial);
        return initial;
      }
      const data = JSON.parse(raw);
      return data.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (e) {
      console.error('Erro ao ler transações:', e);
      return window.INITIAL_MOCK_TRANSACTIONS || [];
    }
  },

  getTransactionById(id) {
    const list = this.getTransactions();
    return list.find(tx => tx.id === id) || null;
  },

  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
    } catch (e) {
      console.error('Erro ao salvar transações:', e);
    }
  },

  /**
   * Adiciona uma transação (otimista local + persistência remota no Supabase)
   */
  async addTransaction({ description, amount, type, category, date }) {
    const newTx = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      description: description.trim(),
      amount: parseFloat(amount),
      type: type === 'expense' ? 'expense' : 'income',
      category: category ? category.trim() : 'Geral',
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // 1. Atualização Otimista no Cache Local
    const transactions = this.getTransactions();
    transactions.unshift(newTx);
    this.saveTransactions(transactions);

    // 2. Persistência assíncrona no Supabase se ativo
    if (this.isSupabaseActive && window.SupabaseBridge) {
      try {
        await window.SupabaseBridge.insertTransaction(newTx);
        console.log('☁️ Transação salva no Supabase:', newTx.id);
      } catch (err) {
        console.error('Falha ao salvar transação no Supabase (mantida local):', err);
      }
    }

    this.notifyDataChange('addTransaction');
    return newTx;
  },

  /**
   * Atualiza transação (otimista local + persistência remota no Supabase)
   */
  async updateTransaction(id, updatedData) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(tx => tx.id === id);
    if (index === -1) return null;

    const modified = {
      ...transactions[index],
      description: updatedData.description.trim(),
      amount: parseFloat(updatedData.amount),
      type: updatedData.type === 'expense' ? 'expense' : 'income',
      category: updatedData.category ? updatedData.category.trim() : 'Geral',
      date: updatedData.date,
      updatedAt: new Date().toISOString()
    };

    // 1. Atualização Local
    transactions[index] = modified;
    this.saveTransactions(transactions);

    // 2. Persistência assíncrona no Supabase se ativo
    if (this.isSupabaseActive && window.SupabaseBridge) {
      try {
        await window.SupabaseBridge.updateTransaction(id, modified);
        console.log('☁️ Transação atualizada no Supabase:', id);
      } catch (err) {
        console.error('Falha ao atualizar transação no Supabase (mantida local):', err);
      }
    }

    this.notifyDataChange('updateTransaction');
    return modified;
  },

  /**
   * Exclui transação (otimista local + persistência remota no Supabase)
   */
  async deleteTransaction(id) {
    const transactions = this.getTransactions();
    const initialLen = transactions.length;
    const filtered = transactions.filter(tx => tx.id !== id);

    if (filtered.length !== initialLen) {
      // 1. Atualização Local
      this.saveTransactions(filtered);

      // 2. Persistência assíncrona no Supabase se ativo
      if (this.isSupabaseActive && window.SupabaseBridge) {
        try {
          await window.SupabaseBridge.deleteTransaction(id);
          console.log('☁️ Transação excluída do Supabase:', id);
        } catch (err) {
          console.error('Falha ao excluir transação no Supabase:', err);
        }
      }

      this.notifyDataChange('deleteTransaction');
      return true;
    }
    return false;
  },

  calculateSummary(transactionsList = null) {
    const list = transactionsList || this.getTransactions();
    let totalIncome = 0;
    let totalExpenses = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    list.forEach(tx => {
      const val = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        totalIncome += val;
        incomeCount++;
      } else {
        totalExpenses += val;
        expenseCount++;
      }
    });

    const balance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      balance,
      incomeCount,
      expenseCount,
      totalCount: list.length
    };
  },

  // ==========================================
  // CATEGORIAS
  // ==========================================

  getCategories(type = null) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CAT);
      let list = [];
      if (!raw) {
        list = window.INITIAL_CATEGORIES || [];
        this.saveCategories(list);
      } else {
        list = JSON.parse(raw);
      }

      if (type) {
        return list.filter(c => c.type === type);
      }
      return list;
    } catch (e) {
      console.error('Erro ao ler categorias:', e);
      return window.INITIAL_CATEGORIES || [];
    }
  },

  saveCategories(categories) {
    try {
      localStorage.setItem(STORAGE_KEY_CAT, JSON.stringify(categories));
    } catch (e) {
      console.error('Erro ao salvar categorias:', e);
    }
  },

  async addCategory({ name, type, icon }) {
    const categories = this.getCategories();
    const newCat = {
      id: 'cat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      name: name.trim(),
      type: type === 'expense' ? 'expense' : 'income',
      icon: icon && icon.trim() ? icon.trim() : '🏷️'
    };

    categories.push(newCat);
    this.saveCategories(categories);

    if (this.isSupabaseActive && window.SupabaseBridge) {
      try {
        await window.SupabaseBridge.insertCategory(newCat);
        console.log('☁️ Categoria salva no Supabase:', newCat.id);
      } catch (err) {
        console.error('Falha ao salvar categoria no Supabase:', err);
      }
    }

    this.notifyDataChange('addCategory');
    return newCat;
  },

  async deleteCategory(id) {
    const categories = this.getCategories();
    const filtered = categories.filter(c => c.id !== id);
    if (filtered.length !== categories.length) {
      this.saveCategories(filtered);

      if (this.isSupabaseActive && window.SupabaseBridge) {
        try {
          await window.SupabaseBridge.deleteCategory(id);
          console.log('☁️ Categoria excluída do Supabase:', id);
        } catch (err) {
          console.error('Falha ao excluir categoria no Supabase:', err);
        }
      }

      this.notifyDataChange('deleteCategory');
      return true;
    }
    return false;
  },

  // ==========================================
  // RELATÓRIOS E FILTROS POR PERÍODO
  // ==========================================

  getFilteredTransactions({ period = 'all', customStart = '', customEnd = '', type = 'all' }) {
    const all = this.getTransactions();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return all.filter(tx => {
      // 1. Filtro de Tipo
      if (type !== 'all' && tx.type !== type) {
        return false;
      }

      // 2. Filtro de Período
      if (period === 'all') return true;

      const txDate = tx.date;

      if (period === 'today') {
        return txDate === todayStr;
      }

      if (period === 'current_month') {
        const curYear = now.getFullYear();
        const curMonth = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${curYear}-${curMonth}`;
        return txDate.startsWith(prefix);
      }

      if (period === 'last_month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lmYear = lastMonthDate.getFullYear();
        const lmMonth = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
        const prefix = `${lmYear}-${lmMonth}`;
        return txDate.startsWith(prefix);
      }

      if (period === 'last_30_days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const txD = new Date(txDate);
        return txD >= thirtyDaysAgo && txD <= now;
      }

      if (period === 'current_year') {
        const curYear = String(now.getFullYear());
        return txDate.startsWith(curYear);
      }

      if (period === 'custom') {
        if (customStart && txDate < customStart) return false;
        if (customEnd && txDate > customEnd) return false;
        return true;
      }

      return true;
    });
  },

  // ==========================================
  // EXPORTAÇÃO CSV
  // ==========================================

  exportCSV(transactions) {
    if (!transactions || transactions.length === 0) {
      alert('Nenhum dado encontrado para exportar.');
      return;
    }

    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)'];
    const rows = transactions.map(tx => {
      const typeLabel = tx.type === 'income' ? 'Receita' : 'Despesa';
      const cleanDesc = `"${tx.description.replace(/"/g, '""')}"`;
      const cleanCat = `"${tx.category.replace(/"/g, '""')}"`;
      const formattedAmount = tx.amount.toFixed(2).replace('.', ',');
      return [tx.date, typeLabel, cleanCat, cleanDesc, formattedAmount].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MyFinance_Relatorio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

window.FinanceStorage = FinanceStorage;
