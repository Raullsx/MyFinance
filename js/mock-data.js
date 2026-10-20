/**
 * Dados simulados e categorias padrão para pequenas empresas (MyFinance)
 */

const INITIAL_CATEGORIES = [
  // Categorias de Receita
  { id: 'cat-inc-1', name: 'Venda de Produtos', type: 'income', icon: '🛍️' },
  { id: 'cat-inc-2', name: 'Prestação de Serviços', type: 'income', icon: '💼' },
  { id: 'cat-inc-3', name: 'Consultoria & Projetos', type: 'income', icon: '📊' },
  { id: 'cat-inc-4', name: 'Rendimentos / Outros', type: 'income', icon: '📈' },

  // Categorias de Despesa
  { id: 'cat-exp-1', name: 'Aluguel & Condomínio', type: 'expense', icon: '🏢' },
  { id: 'cat-exp-2', name: 'Água, Luz, Internet', type: 'expense', icon: '⚡' },
  { id: 'cat-exp-3', name: 'Fornecedores & Insumos', type: 'expense', icon: '📦' },
  { id: 'cat-exp-4', name: 'Marketing & Anúncios', type: 'expense', icon: '📢' },
  { id: 'cat-exp-5', name: 'Folha & Pró-labore', type: 'expense', icon: '👥' },
  { id: 'cat-exp-6', name: 'Taxas & Impostos', type: 'expense', icon: '📑' },
  { id: 'cat-exp-7', name: 'Despesas Gerais', type: 'expense', icon: '💳' }
];

const INITIAL_MOCK_TRANSACTIONS = [
  {
    id: "tx-1",
    description: "Venda de Produtos - Pedido #1042",
    amount: 3450.00,
    type: "income",
    category: "Venda de Produtos",
    date: "2026-10-18",
    createdAt: new Date("2026-10-18T14:30:00").toISOString()
  },
  {
    id: "tx-2",
    description: "Prestação de Serviço de Consultoria",
    amount: 1800.00,
    type: "income",
    category: "Consultoria & Projetos",
    date: "2026-10-17",
    createdAt: new Date("2026-10-17T11:15:00").toISOString()
  },
  {
    id: "tx-3",
    description: "Aluguel Comercial do Espaço",
    amount: 1450.00,
    type: "expense",
    category: "Aluguel & Condomínio",
    date: "2026-10-15",
    createdAt: new Date("2026-10-15T09:00:00").toISOString()
  },
  {
    id: "tx-4",
    description: "Campanha de Tráfego Pago (Instagram & Google)",
    amount: 450.00,
    type: "expense",
    category: "Marketing & Anúncios",
    date: "2026-10-14",
    createdAt: new Date("2026-10-14T16:20:00").toISOString()
  },
  {
    id: "tx-5",
    description: "Contrato Mensal de Manutenção TI",
    amount: 2200.00,
    type: "income",
    category: "Prestação de Serviços",
    date: "2026-10-12",
    createdAt: new Date("2026-10-12T10:00:00").toISOString()
  },
  {
    id: "tx-6",
    description: "Reposição de Insumos e Embalagens",
    amount: 680.50,
    type: "expense",
    category: "Fornecedores & Insumos",
    date: "2026-10-10",
    createdAt: new Date("2026-10-10T15:45:00").toISOString()
  },
  {
    id: "tx-7",
    description: "Internet Fibra e Telefonia",
    amount: 199.90,
    type: "expense",
    category: "Água, Luz, Internet",
    date: "2026-10-08",
    createdAt: new Date("2026-10-08T08:30:00").toISOString()
  }
];

window.INITIAL_CATEGORIES = INITIAL_CATEGORIES;
window.INITIAL_MOCK_TRANSACTIONS = INITIAL_MOCK_TRANSACTIONS;
