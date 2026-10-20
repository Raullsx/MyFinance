/**
 * Controlador Principal da Interface (MyFinance App)
 * Suporte a Dark Mode, Event Delegation para Edição e Exclusão,
 * Gerenciador de Categorias e Relatórios Financeiros com Exportação.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // ELEMENTOS DO DOM
  // ==========================================

  // Tema
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  // KPIs
  const currentBalanceEl = document.getElementById('current-balance');
  const totalIncomeEl = document.getElementById('total-income');
  const totalExpensesEl = document.getElementById('total-expenses');
  const incomeCountBadgeEl = document.getElementById('income-count-badge');
  const expenseCountBadgeEl = document.getElementById('expense-count-badge');
  const balanceStatusBadgeEl = document.getElementById('balance-status-badge');
  const currentDateDisplay = document.getElementById('current-date-display');

  // Lista de Transações & Filtros
  const transactionsListEl = document.getElementById('transactions-list');
  const emptyStateEl = document.getElementById('empty-state');
  const searchInputEl = document.getElementById('search-input');
  const filterPills = document.querySelectorAll('.filter-pill');

  // Modal de Transação (Novo / Editar)
  const modalTransaction = document.getElementById('modal-transaction');
  const modalTitle = document.getElementById('modal-title');
  const btnOpenModal = document.getElementById('btn-open-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const formTransaction = document.getElementById('form-transaction');
  const toggleIncomeBtn = document.getElementById('toggle-income');
  const toggleExpenseBtn = document.getElementById('toggle-expense');
  const txTypeInput = document.getElementById('tx-type');
  const txCategorySelect = document.getElementById('tx-category');
  const txDateInput = document.getElementById('tx-date');
  const txAmountInput = document.getElementById('tx-amount');
  const txDescriptionInput = document.getElementById('tx-description');
  const btnSubmitTx = document.getElementById('btn-submit-tx');

  // Modal de Gerenciamento de Categorias
  const modalCategories = document.getElementById('modal-categories');
  const btnOpenCategories = document.getElementById('btn-open-categories');
  const btnCloseCategories = document.getElementById('btn-close-categories');
  const catToggleIncome = document.getElementById('cat-toggle-income');
  const catToggleExpense = document.getElementById('cat-toggle-expense');
  const formAddCategory = document.getElementById('form-add-category');
  const newCatNameInput = document.getElementById('new-cat-name');
  const newCatIconInput = document.getElementById('new-cat-icon');
  const categoriesChipsList = document.getElementById('categories-chips-list');

  // Modal de Relatórios & Exportação
  const modalReport = document.getElementById('modal-report');
  const btnOpenReport = document.getElementById('btn-open-report');
  const btnCloseReport = document.getElementById('btn-close-report');
  const reportPeriodSelect = document.getElementById('report-period');
  const reportTypeSelect = document.getElementById('report-type');
  const reportCustomDates = document.getElementById('report-custom-dates');
  const reportStartDate = document.getElementById('report-start-date');
  const reportEndDate = document.getElementById('report-end-date');
  const reportIncomeTotalEl = document.getElementById('report-income-total');
  const reportExpenseTotalEl = document.getElementById('report-expense-total');
  const reportBalanceTotalEl = document.getElementById('report-balance-total');
  const reportTableBody = document.getElementById('report-table-body');
  const btnExportCSV = document.getElementById('btn-export-csv');
  const btnPrintReport = document.getElementById('btn-print-report');

  // Toast Notification
  const toastNotification = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  // Supabase Cloud & Modal
  const btnSupabaseStatus = document.getElementById('btn-supabase-status');
  const supabaseStatusLabel = document.getElementById('supabase-status-label');
  const modalSupabase = document.getElementById('modal-supabase');
  const btnCloseSupabase = document.getElementById('btn-close-supabase');
  const btnCloseSupabaseModal = document.getElementById('btn-close-supabase-modal');
  const supabaseModalStatusBadge = document.getElementById('supabase-modal-status-badge');
  const supabaseModalStatusText = document.getElementById('supabase-modal-status-text');
  const supabaseSetupAlert = document.getElementById('supabase-setup-alert');
  const supabaseSuccessCard = document.getElementById('supabase-success-card');
  const btnCopySql = document.getElementById('btn-copy-sql');
  const btnRefreshSupabase = document.getElementById('btn-refresh-supabase');

  // Perfil do Usuário na Sidebar
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarUserBusiness = document.getElementById('sidebar-user-business');
  const sidebarUserName = document.getElementById('sidebar-user-name');
  const btnLogout = document.getElementById('btn-logout');

  // ==========================================
  // ESTADO DA APLICAÇÃO
  // ==========================================
  let currentFilter = 'all'; // 'all' | 'income' | 'expense'
  let currentSearchQuery = '';
  let editingTransactionId = null; // null se novo, string id se edição
  let currentCategoryTypeView = 'income'; // 'income' | 'expense'

  // Formatador de Moeda BRL
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  // ==========================================
  // GERENCIAMENTO DE TEMA (DARK / LIGHT)
  // ==========================================
  function initTheme() {
    const savedTheme = localStorage.getItem('myfinance_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(initialTheme);
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeToggleBtn) themeToggleBtn.setAttribute('title', 'Alternar para Modo Claro');
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeToggleBtn) themeToggleBtn.setAttribute('title', 'Alternar para Modo Escuro');
    }
    localStorage.setItem('myfinance_theme', theme);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
      showToast(current === 'dark' ? 'Modo Claro ativado' : 'Modo Escuro ativado');
    });
  }

  // ==========================================
  // NOTIFICAÇÕES TOAST
  // ==========================================
  let toastTimer = null;
  function showToast(msg) {
    if (!toastNotification || !toastMessage) return;
    toastMessage.textContent = msg;
    toastNotification.classList.add('active');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotification.classList.remove('active');
    }, 2800);
  }

  // ==========================================
  // CABEÇALHO & DATA
  // ==========================================
  function initHeaderDate() {
    if (currentDateDisplay) {
      const today = new Date();
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const formatted = today.toLocaleDateString('pt-BR', options);
      currentDateDisplay.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
  }

  // ==========================================
  // ATUALIZAÇÃO DE KPIS
  // ==========================================
  function updateKPICards() {
    const summary = window.FinanceStorage.calculateSummary();

    if (currentBalanceEl) {
      currentBalanceEl.textContent = currencyFormatter.format(summary.balance);
    }
    if (totalIncomeEl) {
      totalIncomeEl.textContent = currencyFormatter.format(summary.totalIncome);
    }
    if (totalExpensesEl) {
      totalExpensesEl.textContent = currencyFormatter.format(summary.totalExpenses);
    }
    if (incomeCountBadgeEl) {
      incomeCountBadgeEl.textContent = `${summary.incomeCount} entrada${summary.incomeCount === 1 ? '' : 's'}`;
    }
    if (expenseCountBadgeEl) {
      expenseCountBadgeEl.textContent = `${summary.expenseCount} saída${summary.expenseCount === 1 ? '' : 's'}`;
    }
    if (balanceStatusBadgeEl) {
      if (summary.balance > 0) {
        balanceStatusBadgeEl.textContent = '● Saudável';
      } else if (summary.balance === 0) {
        balanceStatusBadgeEl.textContent = '● Em Equilíbrio';
      } else {
        balanceStatusBadgeEl.textContent = '● Atenção (Negativo)';
      }
    }
  }

  // Formata data para pt-BR
  function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Helper para obter ícone de categoria
  function getCategoryIcon(catName, type) {
    const categories = window.FinanceStorage.getCategories();
    const found = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (found && found.icon) return found.icon;
    return type === 'income' ? '💰' : '💸';
  }

  // ==========================================
  // RENDERIZAÇÃO DA LISTA DE TRANSAÇÕES
  // ==========================================
  function renderTransactions() {
    const allTransactions = window.FinanceStorage.getTransactions();

    const filtered = allTransactions.filter(tx => {
      const matchesType = currentFilter === 'all' || tx.type === currentFilter;
      const q = currentSearchQuery.toLowerCase();
      const matchesSearch = q === '' ||
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q) ||
        tx.date.includes(q);

      return matchesType && matchesSearch;
    });

    if (filtered.length === 0) {
      transactionsListEl.innerHTML = '';
      emptyStateEl.style.display = 'flex';
      return;
    }

    emptyStateEl.style.display = 'none';

    transactionsListEl.innerHTML = filtered.map(tx => {
      const isIncome = tx.type === 'income';
      const icon = getCategoryIcon(tx.category, tx.type);
      const amountSign = isIncome ? '+ ' : '- ';
      const amountClass = isIncome ? 'amount-income' : 'amount-expense';

      return `
        <div class="transaction-item" data-id="${tx.id}">
          <div class="item-left">
            <div class="category-icon-box" title="${escapeHtml(tx.category)}">
              ${icon}
            </div>
            <div class="item-info">
              <div class="item-title">${escapeHtml(tx.description)}</div>
              <div class="item-meta">
                <span class="item-badge">${escapeHtml(tx.category)}</span>
                <span class="item-date">${formatDisplayDate(tx.date)}</span>
              </div>
            </div>
          </div>
          <div class="item-right">
            <span class="item-amount ${amountClass}">
              ${amountSign}${currencyFormatter.format(tx.amount)}
            </span>
            <div class="item-actions">
              <button class="btn-icon-action btn-edit-item" data-action="edit" data-id="${tx.id}" title="Editar lançamento" aria-label="Editar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
              <button class="btn-icon-action btn-delete-item" data-action="delete" data-id="${tx.id}" title="Excluir lançamento" aria-label="Excluir">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Modal de Confirmação de Exclusão
  const modalConfirmDelete = document.getElementById('modal-confirm-delete');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const deleteConfirmText = document.getElementById('delete-confirm-text');
  let pendingDeleteId = null;

  function openDeleteConfirm(id) {
    const tx = window.FinanceStorage.getTransactionById(id);
    pendingDeleteId = id;
    if (deleteConfirmText) {
      deleteConfirmText.textContent = tx ? `Deseja realmente remover o lançamento "${tx.description}"?` : 'Deseja realmente remover este lançamento?';
    }
    if (modalConfirmDelete) {
      modalConfirmDelete.classList.add('active');
    }
  }

  function closeDeleteConfirm() {
    if (modalConfirmDelete) {
      modalConfirmDelete.classList.remove('active');
    }
    pendingDeleteId = null;
  }

  if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteConfirm);
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', () => {
      if (pendingDeleteId) {
        window.FinanceStorage.deleteTransaction(pendingDeleteId);
        updateKPICards();
        renderTransactions();
        showToast('Lançamento removido com sucesso!');
        closeDeleteConfirm();
      }
    });
  }

  // ==========================================
  // EVENT DELEGATION PARA LISTA (DELETE E EDIT)
  // ==========================================
  if (transactionsListEl) {
    transactionsListEl.addEventListener('click', (e) => {
      // 1. Ação de Exclusão
      const deleteBtn = e.target.closest('.btn-delete-item');
      if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.getAttribute('data-id');
        if (id) {
          openDeleteConfirm(id);
        }
        return;
      }

      // 2. Ação de Edição
      const editBtn = e.target.closest('.btn-edit-item');
      if (editBtn) {
        e.stopPropagation();
        const id = editBtn.getAttribute('data-id');
        if (id) {
          openEditModal(id);
        }
        return;
      }
    });
  }

  // ==========================================
  // MODAL DE TRANSAÇÃO (NOVO & EDITAR)
  // ==========================================
  function updateCategoryOptions(type, selectedCategory = null) {
    if (!txCategorySelect) return;
    txCategorySelect.innerHTML = '';
    const categories = window.FinanceStorage.getCategories(type);
    
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = `${cat.icon || '🏷️'} ${cat.name}`;
      if (selectedCategory && cat.name.toLowerCase() === selectedCategory.toLowerCase()) {
        opt.selected = true;
      }
      txCategorySelect.appendChild(opt);
    });

    if (categories.length === 0) {
      const opt = document.createElement('option');
      opt.value = 'Geral';
      opt.textContent = '🏷️ Geral';
      txCategorySelect.appendChild(opt);
    }
  }

  function setTransactionType(type) {
    txTypeInput.value = type;
    if (type === 'income') {
      toggleIncomeBtn.classList.add('active-income');
      toggleExpenseBtn.classList.remove('active-expense');
    } else {
      toggleExpenseBtn.classList.add('active-expense');
      toggleIncomeBtn.classList.remove('active-income');
    }
    updateCategoryOptions(type);
  }

  function openCreateModal() {
    editingTransactionId = null;
    modalTitle.textContent = 'Novo Lançamento';
    btnSubmitTx.textContent = 'Salvar Lançamento';
    formTransaction.reset();
    txDateInput.value = new Date().toISOString().split('T')[0];
    setTransactionType('income');
    modalTransaction.classList.add('active');
    setTimeout(() => txDescriptionInput.focus(), 80);
  }

  function openEditModal(id) {
    const tx = window.FinanceStorage.getTransactionById(id);
    if (!tx) return;

    editingTransactionId = id;
    modalTitle.textContent = 'Editar Lançamento';
    btnSubmitTx.textContent = 'Salvar Alterações';

    txDescriptionInput.value = tx.description;
    txAmountInput.value = tx.amount;
    txDateInput.value = tx.date;
    setTransactionType(tx.type);
    updateCategoryOptions(tx.type, tx.category);

    modalTransaction.classList.add('active');
    setTimeout(() => txDescriptionInput.focus(), 80);
  }

  function closeTransactionModal() {
    modalTransaction.classList.remove('active');
    editingTransactionId = null;
  }

  if (btnOpenModal) btnOpenModal.addEventListener('click', openCreateModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeTransactionModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeTransactionModal);

  toggleIncomeBtn.addEventListener('click', () => setTransactionType('income'));
  toggleExpenseBtn.addEventListener('click', () => setTransactionType('expense'));

  formTransaction.addEventListener('submit', (e) => {
    e.preventDefault();

    const description = txDescriptionInput.value.trim();
    const amount = parseFloat(txAmountInput.value);
    const type = txTypeInput.value;
    const category = txCategorySelect.value;
    const date = txDateInput.value;

    if (!description) {
      alert('Por favor, informe a descrição do lançamento.');
      txDescriptionInput.focus();
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, informe um valor positivo válido.');
      txAmountInput.focus();
      return;
    }

    if (editingTransactionId) {
      window.FinanceStorage.updateTransaction(editingTransactionId, {
        description,
        amount,
        type,
        category,
        date
      });
      showToast('Lançamento atualizado com sucesso!');
    } else {
      window.FinanceStorage.addTransaction({
        description,
        amount,
        type,
        category,
        date
      });
      showToast('Novo lançamento cadastrado com sucesso!');
    }

    closeTransactionModal();
    updateKPICards();
    renderTransactions();
  });

  // ==========================================
  // GERENCIADOR DE CATEGORIAS
  // ==========================================
  function openCategoriesModal() {
    setCategoryViewType('income');
    modalCategories.classList.add('active');
  }

  function closeCategoriesModal() {
    modalCategories.classList.remove('active');
    // Atualiza o select do modal de transação caso esteja aberto
    updateCategoryOptions(txTypeInput.value);
  }

  function setCategoryViewType(type) {
    currentCategoryTypeView = type;
    if (type === 'income') {
      catToggleIncome.classList.add('active-income');
      catToggleExpense.classList.remove('active-expense');
    } else {
      catToggleExpense.classList.add('active-expense');
      catToggleIncome.classList.remove('active-income');
    }
    renderCategoriesChips();
  }

  function renderCategoriesChips() {
    if (!categoriesChipsList) return;
    const list = window.FinanceStorage.getCategories(currentCategoryTypeView);

    if (list.length === 0) {
      categoriesChipsList.innerHTML = `<p style="font-size: 13px; color: var(--color-text-secondary);">Nenhuma categoria cadastrada para ${currentCategoryTypeView === 'income' ? 'receitas' : 'despesas'}.</p>`;
      return;
    }

    categoriesChipsList.innerHTML = list.map(cat => `
      <div class="category-chip" data-id="${cat.id}">
        <span>${cat.icon || '🏷️'}</span>
        <span>${escapeHtml(cat.name)}</span>
        <button type="button" class="btn-remove-chip" data-cat-id="${cat.id}" title="Excluir categoria">✕</button>
      </div>
    `).join('');
  }

  if (btnOpenCategories) btnOpenCategories.addEventListener('click', openCategoriesModal);
  if (btnCloseCategories) btnCloseCategories.addEventListener('click', closeCategoriesModal);
  if (catToggleIncome) catToggleIncome.addEventListener('click', () => setCategoryViewType('income'));
  if (catToggleExpense) catToggleExpense.addEventListener('click', () => setCategoryViewType('expense'));

  // Adicionar Categoria
  if (formAddCategory) {
    formAddCategory.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = newCatNameInput.value.trim();
      const icon = newCatIconInput.value.trim() || '🏷️';

      if (!name) {
        alert('Informe o nome da categoria.');
        newCatNameInput.focus();
        return;
      }

      window.FinanceStorage.addCategory({
        name,
        type: currentCategoryTypeView,
        icon
      });

      newCatNameInput.value = '';
      renderCategoriesChips();
      showToast(`Categoria "${name}" adicionada!`);
    });
  }

  // Excluir Categoria (Event Delegation)
  if (categoriesChipsList) {
    categoriesChipsList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-chip');
      if (btn) {
        const id = btn.getAttribute('data-cat-id');
        if (id) {
          if (confirm('Deseja excluir esta categoria?')) {
            window.FinanceStorage.deleteCategory(id);
            renderCategoriesChips();
            showToast('Categoria removida.');
          }
        }
      }
    });
  }

  // ==========================================
  // RELATÓRIOS & EXPORTAÇÃO
  // ==========================================
  function openReportModal() {
    updateReportPreview();
    modalReport.classList.add('active');
  }

  function closeReportModal() {
    modalReport.classList.remove('active');
  }

  function getReportFilters() {
    const period = reportPeriodSelect.value;
    const type = reportTypeSelect.value;
    const customStart = reportStartDate.value;
    const customEnd = reportEndDate.value;
    return { period, type, customStart, customEnd };
  }

  function updateReportPreview() {
    const filters = getReportFilters();

    // Exibe ou oculta inputs de data personalizada
    if (filters.period === 'custom') {
      reportCustomDates.style.display = 'grid';
    } else {
      reportCustomDates.style.display = 'none';
    }

    const filtered = window.FinanceStorage.getFilteredTransactions(filters);
    const summary = window.FinanceStorage.calculateSummary(filtered);

    // Atualiza cards de resumo
    if (reportIncomeTotalEl) reportIncomeTotalEl.textContent = currencyFormatter.format(summary.totalIncome);
    if (reportExpenseTotalEl) reportExpenseTotalEl.textContent = currencyFormatter.format(summary.totalExpenses);
    if (reportBalanceTotalEl) {
      reportBalanceTotalEl.textContent = currencyFormatter.format(summary.balance);
      reportBalanceTotalEl.style.color = summary.balance >= 0 ? '#10B981' : '#F43F5E';
    }

    // Atualiza tabela prévia
    if (reportTableBody) {
      if (filtered.length === 0) {
        reportTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--color-text-secondary);">Nenhuma movimentação encontrada para o período selecionado.</td></tr>`;
        return;
      }

      reportTableBody.innerHTML = filtered.map(tx => {
        const isInc = tx.type === 'income';
        const color = isInc ? '#10B981' : '#F43F5E';
        const sign = isInc ? '+ ' : '- ';
        return `
          <tr>
            <td>${formatDisplayDate(tx.date)}</td>
            <td><strong>${isInc ? 'Receita' : 'Despesa'}</strong></td>
            <td>${escapeHtml(tx.category)}</td>
            <td>${escapeHtml(tx.description)}</td>
            <td style="color: ${color}; font-weight: 700;">${sign}${currencyFormatter.format(tx.amount)}</td>
          </tr>
        `;
      }).join('');
    }
  }

  if (btnOpenReport) btnOpenReport.addEventListener('click', openReportModal);
  if (btnCloseReport) btnCloseReport.addEventListener('click', closeReportModal);
  if (reportPeriodSelect) reportPeriodSelect.addEventListener('change', updateReportPreview);
  if (reportTypeSelect) reportTypeSelect.addEventListener('change', updateReportPreview);
  if (reportStartDate) reportStartDate.addEventListener('change', updateReportPreview);
  if (reportEndDate) reportEndDate.addEventListener('change', updateReportPreview);

  // Exportar CSV
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => {
      const filters = getReportFilters();
      const list = window.FinanceStorage.getFilteredTransactions(filters);
      window.FinanceStorage.exportCSV(list);
      showToast('Relatório CSV exportado com sucesso!');
    });
  }

  // Imprimir / Salvar PDF
  if (btnPrintReport) {
    btnPrintReport.addEventListener('click', () => {
      window.print();
    });
  }

  // ==========================================
  // FILTROS & BUSCA EM TEMPO REAL
  // ==========================================
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter') || 'all';
      renderTransactions();
    });
  });

  if (searchInputEl) {
    searchInputEl.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim();
      renderTransactions();
    });
  }

  // Fechar modais no backdrop ou ESC
  const allModals = [modalTransaction, modalCategories, modalReport, modalConfirmDelete, modalSupabase];
  allModals.forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      allModals.forEach(m => m && m.classList.remove('active'));
    }
  });

  // ==========================================
  // CONTROLES E MODAL DO SUPABASE
  // ==========================================
  function updateSupabaseStatusUI() {
    const status = window.FinanceStorage.supabaseStatus;

    if (btnSupabaseStatus && supabaseStatusLabel) {
      btnSupabaseStatus.classList.remove('status-connected', 'status-warning', 'status-offline');

      if (status === 'connected') {
        btnSupabaseStatus.classList.add('status-connected');
        supabaseStatusLabel.textContent = 'Supabase Nuvem';
        btnSupabaseStatus.setAttribute('title', 'Supabase Cloud Conectado e Sincronizado');
      } else if (status === 'tables_missing') {
        btnSupabaseStatus.classList.add('status-warning');
        supabaseStatusLabel.textContent = 'Supabase: SQL Pendente';
        btnSupabaseStatus.setAttribute('title', 'Tabelas do Supabase não encontradas. Clique para ver instruções.');
      } else if (status === 'offline') {
        btnSupabaseStatus.classList.add('status-offline');
        supabaseStatusLabel.textContent = 'Modo Local (Offline)';
        btnSupabaseStatus.setAttribute('title', 'Supabase desconectado. Operando localmente.');
      } else {
        btnSupabaseStatus.classList.add('status-warning');
        supabaseStatusLabel.textContent = 'Supabase: Conectando...';
      }
    }

    if (supabaseModalStatusText && supabaseModalStatusBadge) {
      const dot = supabaseModalStatusBadge.querySelector('.status-dot');
      if (status === 'connected') {
        supabaseModalStatusText.textContent = 'Conectado e Pronto';
        supabaseModalStatusBadge.style.color = '#10B981';
        if (dot) dot.style.backgroundColor = '#10B981';
        if (supabaseSetupAlert) supabaseSetupAlert.style.display = 'none';
        if (supabaseSuccessCard) supabaseSuccessCard.style.display = 'block';
      } else if (status === 'tables_missing') {
        supabaseModalStatusText.textContent = 'Tabelas Pendentes no SQL Editor';
        supabaseModalStatusBadge.style.color = '#F59E0B';
        if (dot) dot.style.backgroundColor = '#F59E0B';
        if (supabaseSetupAlert) supabaseSetupAlert.style.display = 'block';
        if (supabaseSuccessCard) supabaseSuccessCard.style.display = 'none';
      } else {
        supabaseModalStatusText.textContent = 'Desconectado / Modo Local';
        supabaseModalStatusBadge.style.color = '#94A3B8';
        if (dot) dot.style.backgroundColor = '#9CA3AF';
        if (supabaseSetupAlert) supabaseSetupAlert.style.display = 'none';
        if (supabaseSuccessCard) supabaseSuccessCard.style.display = 'none';
      }
    }
  }

  function openSupabaseModal() {
    updateSupabaseStatusUI();
    if (modalSupabase) modalSupabase.classList.add('active');
  }

  function closeSupabaseModal() {
    if (modalSupabase) modalSupabase.classList.remove('active');
  }

  if (btnSupabaseStatus) {
    btnSupabaseStatus.addEventListener('click', openSupabaseModal);
  }
  if (btnCloseSupabase) {
    btnCloseSupabase.addEventListener('click', closeSupabaseModal);
  }
  if (btnCloseSupabaseModal) {
    btnCloseSupabaseModal.addEventListener('click', closeSupabaseModal);
  }

  if (btnCopySql) {
    btnCopySql.addEventListener('click', async () => {
      const sqlContent = window.SupabaseBridge ? window.SupabaseBridge.schemaSql : '';
      if (!sqlContent) {
        showToast('Erro ao carregar script SQL.');
        return;
      }

      try {
        await navigator.clipboard.writeText(sqlContent);
        const originalText = btnCopySql.innerHTML;
        btnCopySql.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Script SQL Copiado!
        `;
        showToast('Script SQL copiado com sucesso!');
        setTimeout(() => {
          btnCopySql.innerHTML = originalText;
        }, 3000);
      } catch (err) {
        console.error('Falha ao copiar SQL:', err);
        showToast('Não foi possível copiar automaticamente.');
      }
    });
  }

  if (btnRefreshSupabase) {
    btnRefreshSupabase.addEventListener('click', async () => {
      btnRefreshSupabase.disabled = true;
      btnRefreshSupabase.style.opacity = '0.6';
      showToast('Verificando conexão com Supabase...');

      try {
        if (window.FinanceStorage && window.FinanceStorage.init) {
          window.FinanceStorage.isInitialized = false;
          await window.FinanceStorage.init();
        }
        updateSupabaseStatusUI();
        showToast(`Status: ${window.FinanceStorage.supabaseStatus === 'connected' ? 'Conectado com Sucesso!' : 'Verificado'}`);
      } catch (e) {
        console.error(e);
        showToast('Erro ao verificar conexão.');
      } finally {
        btnRefreshSupabase.disabled = false;
        btnRefreshSupabase.style.opacity = '1';
      }
    });
  }

  // Listener para sincronização automática de dados da nuvem / realtime
  window.addEventListener('myfinance:data-changed', () => {
    updateSupabaseStatusUI();
    updateKPICards();
    renderTransactions();
    updateCategoryOptions(txTypeInput ? txTypeInput.value : 'income');
    renderCategoriesChips();
  });

  // Previne injeção de HTML
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // PERFIL DO USUÁRIO & LOGOUT
  // ==========================================
  async function initUserProfile() {
    let userName = localStorage.getItem('myfinance_user_name');
    let businessName = localStorage.getItem('myfinance_business_name');
    let userEmail = localStorage.getItem('myfinance_user_email');

    if (window.SupabaseBridge) {
      try {
        const user = await window.SupabaseBridge.getCurrentUser();
        if (user) {
          userEmail = user.email || userEmail;
          const meta = user.user_metadata || {};
          userName = meta.full_name || userName || userEmail.split('@')[0];
          businessName = meta.business_name || businessName || 'Meu Negócio';
        }
      } catch (e) {
        console.warn('Erro ao carregar usuário autenticado:', e);
      }
    }

    if (userName || businessName) {
      if (sidebarUserBusiness) sidebarUserBusiness.textContent = businessName || 'Meu Negócio';
      if (sidebarUserName) sidebarUserName.textContent = userName || userEmail || 'Plano Pro';
      if (sidebarAvatar) {
        const initials = (userName || 'SB').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        sidebarAvatar.textContent = initials || 'MF';
      }
      if (btnLogout) {
        btnLogout.setAttribute('title', `Sair da Conta (${userEmail || userName})`);
      }
    } else {
      if (sidebarUserBusiness) sidebarUserBusiness.textContent = 'Studio Criativo';
      if (sidebarUserName) sidebarUserName.textContent = 'Modo Demonstração';
      if (sidebarAvatar) sidebarAvatar.textContent = 'DM';
      if (btnLogout) {
        btnLogout.setAttribute('title', 'Voltar para a Página de Login / Apresentação');
      }
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        if (confirm('Deseja encerrar a sessão e voltar para a página inicial?')) {
          if (window.SupabaseBridge) {
            await window.SupabaseBridge.signOut();
          }
          localStorage.removeItem('myfinance_user_email');
          localStorage.removeItem('myfinance_user_name');
          localStorage.removeItem('myfinance_business_name');
          localStorage.removeItem('myfinance_guest_mode');
          window.location.href = 'landing.html';
        }
      });
    }
  }

  // ==========================================
  // INICIALIZAÇÃO GERAL
  // ==========================================
  initTheme();
  initHeaderDate();
  initUserProfile();
  setTransactionType('income');
  updateKPICards();
  renderTransactions();
  updateSupabaseStatusUI();

  // Inicializa o armazenamento Supabase de forma assíncrona
  if (window.FinanceStorage && window.FinanceStorage.init) {
    window.FinanceStorage.init().then(() => {
      updateSupabaseStatusUI();
      updateKPICards();
      renderTransactions();
    });
  }
});
