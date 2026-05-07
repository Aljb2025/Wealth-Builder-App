import './styles.css';
import { isSupabaseConfigured, supabase, getSessionId } from './supabaseClient.js';

const assetClasses = [
  { key: 'real_estate_home', label: 'Home', group: 'Real estate', liquidity: 'low', color: '#2f5d7c' },
  { key: 'real_estate_rental', label: 'Rental', group: 'Real estate', liquidity: 'low', color: '#3f7899' },
  { key: 'real_estate_land', label: 'Land', group: 'Real estate', liquidity: 'low', color: '#6a8ea4' },
  { key: 'stocks', label: 'Stocks', group: 'Markets', liquidity: 'high', color: '#58bfa3' },
  { key: 'gold_silver', label: 'Gold & silver', group: 'Commodities', liquidity: 'medium', color: '#f2b84b' },
  { key: 'crypto', label: 'Crypto', group: 'Digital', liquidity: 'high', color: '#d96c5f' },
  { key: 'treasury_bills', label: 'Treasury bills', group: 'Cash', liquidity: 'high', color: '#7aa6b8' },
  { key: 'mutual_funds', label: 'Mutual funds', group: 'Markets', liquidity: 'high', color: '#4f9d8a' },
  { key: '401k', label: '401k', group: 'Retirement', liquidity: 'low', color: '#7c8fa3' },
  { key: 'cds', label: 'CDs', group: 'Cash', liquidity: 'medium', color: '#e2a93b' },
  { key: 'business', label: 'Personal business', group: 'Ownership', liquidity: 'low', color: '#b85d56' },
  { key: 'art', label: 'Art', group: 'Collectibles', liquidity: 'low', color: '#8d7a6b' }
];

const defaultBudget = {
  name: 'My wealth plan',
  monthly_income: 9200,
  fixed_expenses: 3650,
  variable_expenses: 1600,
  debt_balance: 4200,
  debt_apr: 12.5,
  emergency_current: 18500,
  emergency_monthly_need: 5200,
  emergency_apy: 4.2,
  monthly_contribution: 1900,
  risk_profile: 'balanced',
  timeline_years: 12
};

const defaultCashflowInputs = {
  income: [
    { key: 'primary_income', label: 'Primary income', amount: 9200 },
    { key: 'side_income', label: 'Side income', amount: 0 },
    { key: 'other_income', label: 'Other income', amount: 0 }
  ],
  fixed: [
    { key: 'housing', label: 'Housing', amount: 2600 },
    { key: 'utilities', label: 'Utilities', amount: 450 },
    { key: 'insurance', label: 'Insurance', amount: 600 }
  ],
  variable: [
    { key: 'food', label: 'Food', amount: 700 },
    { key: 'transportation', label: 'Transportation', amount: 400 },
    { key: 'lifestyle', label: 'Lifestyle', amount: 500 }
  ]
};

const defaultAllocations = assetClasses.map((asset, index) => ({
  asset_key: asset.key,
  asset_label: asset.label,
  current_value: [165000, 0, 0, 18500, 7200, 4800, 11000, 26000, 78000, 9000, 15000, 2500][index],
  owed_debt: 0,
  target_percent: [22, 12, 4, 18, 6, 5, 8, 10, 10, 3, 2, 0][index],
  focus_rank: ['stocks', 'treasury_bills', 'mutual_funds'].includes(asset.key)
    ? ['stocks', 'treasury_bills', 'mutual_funds'].indexOf(asset.key) + 1
    : null,
  account_type: asset.key === '401k' ? 'tax-advantaged' : 'taxable',
  liquidity: asset.liquidity,
  notes: ''
}));

const fallbackNews = [
  {
    title: 'Savings rates remain central to emergency fund decisions in 2026',
    source: 'Bankrate',
    url: 'https://www.bankrate.com/banking/savings/savings-money-market-account-rate-forecast/',
    published_at: '2026-02-03',
    summary: 'High-yield savings may still outpace traditional bank savings, but expected rate cuts can reduce future APY.'
  },
  {
    title: 'CDs, high-yield savings, and money market accounts compete for short-term cash',
    source: 'CBS News',
    url: 'https://www.cbsnews.com/news/18000-cd-vs-high-yield-savings-account-money-market-account-earn-most-2026/',
    published_at: '2026-04-27',
    summary: 'Liquid accounts keep flexibility while CDs can lock yield, making liquidity a key emergency-fund tradeoff.'
  },
  {
    title: 'Treasury issuance and bill yields remain a watch item for cash allocations',
    source: 'Wolf Street',
    url: 'https://wolfstreet.com/2026/05/03/the-us-government-sold-723-billion-of-treasury-securities-this-week-inflation-jumped-and-met-t-bill-yields/',
    published_at: '2026-05-03',
    summary: 'Short-term Treasury supply and yield changes matter for investors comparing bills, CDs, and high-yield savings.'
  },
  {
    title: 'Emergency fund planning starts with matching cash to real expenses',
    source: 'Investopedia',
    url: 'https://www.investopedia.com/terms/e/emergency_fund.asp',
    published_at: '2026-05-04',
    summary: 'Emergency savings targets work best when monthly expenses, debt, and liquidity needs are reviewed together.'
  },
  {
    title: 'Treasury bills remain a flexible short-term cash tool',
    source: 'TreasuryDirect',
    url: 'https://www.treasurydirect.gov/marketable-securities/treasury-bills/',
    published_at: '2026-05-05',
    summary: 'T-bills can support short-term cash planning when investors compare yield, maturity, and liquidity.'
  },
  {
    title: 'High-yield savings accounts remain a core cash option',
    source: 'NerdWallet',
    url: 'https://www.nerdwallet.com/best/banking/high-yield-online-savings-accounts',
    published_at: '2026-05-06',
    summary: 'High-yield savings accounts can keep emergency cash liquid while earning more than many traditional accounts.'
  },
  {
    title: 'Debt payoff strategy can free up investing cash flow',
    source: 'Bankrate',
    url: 'https://www.bankrate.com/personal-finance/debt/how-to-pay-off-debt/',
    published_at: '2026-05-07',
    summary: 'A clear payoff order helps households reduce interest drag before scaling new investing dollars.'
  },
  {
    title: 'Asset allocation connects risk profile with long-term targets',
    source: 'Fidelity',
    url: 'https://www.fidelity.com/learning-center/investment-products/mutual-funds/asset-allocation-mutual-funds',
    published_at: '2026-05-08',
    summary: 'Allocation targets can help balance stocks, cash, real estate, and retirement accounts over time.'
  },
  {
    title: 'CDs can compete with savings accounts for planned cash',
    source: 'CBS News',
    url: 'https://www.cbsnews.com/news/cd-vs-high-yield-savings-account-which-is-better-now/',
    published_at: '2026-05-09',
    summary: 'CDs may offer rate certainty, but emergency money usually benefits from fast access and liquidity.'
  }
];

const state = {
  budget: structuredClone(defaultBudget),
  allocations: structuredClone(defaultAllocations),
  news: fallbackNews,
  cashflowInputs: structuredClone(defaultCashflowInputs),
  profileId: null,
  status: isSupabaseConfigured ? 'Supabase ready' : 'Local draft mode',
  saving: false,
  visibleAssetKeys: defaultAllocations
    .filter((item) => item.focus_rank)
    .sort((a, b) => a.focus_rank - b.focus_rank)
    .map((item) => item.asset_key)
};

const app = document.querySelector('#app');
let saveTimer;
let quickEntry = null;

function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function pct(value) {
  return `${Math.round((Number(value) || 0) * 10) / 10}%`;
}

function formatDate(value) {
  if (!value) return '';

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function numberValue(value) {
  return Number(value) || 0;
}

function editableValue(value) {
  return value ?? '';
}

function makeCashflowKey(type) {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function totalCashflowItems(group) {
  return group.reduce((sum, item) => sum + numberValue(item.amount), 0);
}

function updateBudgetFromCashflowInputs() {
  state.budget.monthly_income = totalCashflowItems(state.cashflowInputs.income);
  state.budget.fixed_expenses = totalCashflowItems(state.cashflowInputs.fixed);
  state.budget.variable_expenses = totalCashflowItems(state.cashflowInputs.variable);
}

function ensureCashflowInputs() {
  if (state.cashflowInputs?.income?.length && state.cashflowInputs?.fixed?.length && state.cashflowInputs?.variable?.length) return;

  state.cashflowInputs = cashflowInputsFromBudget(state.budget);
}

function normalizeCashflowInputs(inputs) {
  return {
    income: (inputs?.income?.length ? inputs.income : defaultCashflowInputs.income).map((item, index) => ({
      key: item.key || `income_${index}`,
      label: item.label || `Income ${index + 1}`,
      amount: editableValue(item.amount)
    })),
    fixed: (inputs?.fixed?.length ? inputs.fixed : defaultCashflowInputs.fixed).map((item, index) => ({
      key: item.key || `fixed_${index}`,
      label: item.label || `Fixed expense ${index + 1}`,
      amount: editableValue(item.amount)
    })),
    variable: (inputs?.variable?.length ? inputs.variable : defaultCashflowInputs.variable).map((item, index) => ({
      key: item.key || `variable_${index}`,
      label: item.label || `Variable expense ${index + 1}`,
      amount: editableValue(item.amount)
    }))
  };
}

function cashflowInputsFromBudget(budget) {
  const inputs = structuredClone(defaultCashflowInputs);
  inputs.income[0].amount = budget.monthly_income;
  inputs.income[1].amount = 0;
  inputs.income[2].amount = 0;
  inputs.fixed[0].amount = budget.fixed_expenses;
  inputs.fixed[1].amount = 0;
  inputs.fixed[2].amount = 0;
  inputs.variable[0].amount = budget.variable_expenses;
  inputs.variable[1].amount = 0;
  inputs.variable[2].amount = 0;
  return inputs;
}

function activeAllocations() {
  return state.allocations.filter((item) => state.visibleAssetKeys.includes(item.asset_key));
}

function netAssetValue(item) {
  return Math.max(numberValue(item.current_value) - numberValue(item.owed_debt), 0);
}

function calculatePlan() {
  const activeAssets = activeAllocations();
  const income = numberValue(state.budget.monthly_income);
  const expenses = numberValue(state.budget.fixed_expenses) + numberValue(state.budget.variable_expenses);
  const monthlyFunFund = numberValue(state.budget.emergency_monthly_need);
  const cashflow = income - expenses - monthlyFunFund;
  const monthlyNeed = Math.max(expenses, 1);
  const emergencyCurrent = numberValue(state.budget.emergency_current);
  const emergencyMonths = emergencyCurrent / monthlyNeed;
  const debt = numberValue(state.budget.debt_balance);
  const contribution = Math.max(numberValue(state.budget.monthly_contribution), 0);
  const portfolioTotal = activeAssets.reduce((sum, item) => sum + netAssetValue(item), 0);
  const readiness = {
    cashflow: cashflow > 0,
    debt: debt < 5000,
    emergency: emergencyMonths >= 3
  };
  const investReady = readiness.cashflow && readiness.debt && readiness.emergency;

  const emergencyContribution = Math.min(contribution, Math.max(cashflow, 0));
  const debtContribution = 0;
  const investContribution = Math.max(cashflow - emergencyContribution - debtContribution, 0);

  return {
    income,
    expenses,
    cashflow,
    monthlyFunFund,
    monthlyNeed,
    emergencyMonths,
    debt,
    contribution,
    portfolioTotal,
    readiness,
    investReady,
    emergencyContribution,
    debtContribution,
    investContribution
  };
}

function allocationSegments(total) {
  if (!total) return '';

  let cursor = 0;
  return activeAllocations()
    .filter((item) => netAssetValue(item) > 0)
    .map((item) => {
      const asset = assetClasses.find((entry) => entry.key === item.asset_key);
      const value = netAssetValue(item);
      const span = (value / total) * 100;
      const segment = `${asset?.color || '#7aa6b8'} ${cursor}% ${cursor + span}%`;
      cursor += span;
      return segment;
    })
    .join(', ');
}

function readinessItem(label, passed, detail) {
  return `
    <div class="gate ${passed ? 'passed' : 'blocked'}">
      <span>${passed ? '✓' : '!'}</span>
      <div>
        <strong>${label}</strong>
        <small>${detail}</small>
      </div>
    </div>
  `;
}

function nextBestMove(plan) {
  if (!plan.readiness.cashflow) {
    return {
      title: 'Increase monthly cashflow',
      detail: 'Reduce expenses or add income until money is left after expenses and fun fund.',
      metric: money(Math.abs(plan.cashflow)),
      label: 'gap to cover'
    };
  }

  if (!plan.readiness.debt) {
    return {
      title: 'Pay debt below $5,000',
      detail: 'Route extra cash toward debt first so future dollars can move into savings and investments faster.',
      metric: money(Math.max(plan.debt - 5000, 0)),
      label: 'above threshold'
    };
  }

  if (!plan.readiness.emergency) {
    const target = plan.monthlyNeed * 3;
    return {
      title: 'Build the 3-month emergency fund',
      detail: 'Keep cash liquid while building the base emergency fund before prioritizing new investing dollars.',
      metric: money(Math.max(target - numberValue(state.budget.emergency_current), 0)),
      label: 'needed for 3 months'
    };
  }

  return {
    title: 'Invest toward your selected assets',
    detail: 'The core readiness checks are passing, so new dollars can focus on the asset classes you picked.',
    metric: money(plan.investContribution),
    label: 'monthly investing'
  };
}

function cashflowItems(type) {
  if (type === 'income') return state.cashflowInputs.income.map((item) => ({ ...item, type: 'income' }));

  return [
    ...state.cashflowInputs.fixed.map((item) => ({ ...item, type: 'fixed' })),
    ...state.cashflowInputs.variable.map((item) => ({ ...item, type: 'variable' }))
  ];
}

function cashflowSummaryGroup(title, type, items, total) {
  const singularTitle = type === 'income' ? 'Income' : 'Expense';
  return `
    <div class="cashflow-summary-group">
      <div class="cashflow-summary-head">
        <div>
          <h3>${title}</h3>
          <strong>${money(total)}</strong>
        </div>
        <button class="cashflow-add-btn" type="button" data-action="open-quick-entry" data-entry-type="${type}">
          Add ${singularTitle}
        </button>
      </div>
      <div class="cashflow-list">
        ${items.length ? items.map((item) => `
          <button class="cashflow-list-item" type="button" data-action="open-quick-entry" data-entry-type="${type}" data-source-type="${item.type}" data-key="${item.key}">
            <span>${item.label || 'Unnamed item'}</span>
            <strong>${money(item.amount)}</strong>
          </button>
        `).join('') : `<p class="empty-note">No ${title.toLowerCase()} entered yet.</p>`}
      </div>
    </div>
  `;
}

function getDailyNewsItems(items) {
  if (items.length <= 3) return items.slice(0, 3);

  const dayIndex = Math.floor(Date.now() / 86400000) % items.length;
  return [0, 1, 2].map((offset) => items[(dayIndex + offset) % items.length]);
}

function mergeNewsItems(primary, fallback) {
  const seen = new Set();
  return [...primary, ...fallback].filter((item) => {
    if (!item?.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function quickEntryOverlay() {
  if (!quickEntry) return '';

  const isIncome = quickEntry.entryType === 'income';
  const items = cashflowItems(quickEntry.entryType);
  const selected = items.find((item) => item.key === quickEntry.key && item.type === quickEntry.sourceType);
  const title = `${selected ? 'Edit' : 'Add'} ${isIncome ? 'Income' : 'Expense'}`;

  return `
    <div class="quick-entry-layer" data-action="close-quick-entry">
      <section class="quick-entry-panel" role="dialog" aria-modal="false" aria-label="${title}">
        <div class="quick-entry-title">
          <strong>${title}</strong>
          <button type="button" data-action="close-quick-entry" aria-label="Close quick entry">Close</button>
        </div>
        <label>
          <span>Name</span>
          <input data-quick-name type="text" value="${editableValue(selected?.label)}" placeholder="${isIncome ? 'Income name' : 'Expense name'}">
        </label>
        <label>
          <span>Amount</span>
          <input data-quick-amount type="number" min="0" step="any" inputmode="decimal" value="${editableValue(selected?.amount)}" placeholder="Amount">
        </label>
        <div class="quick-entry-actions">
          <button class="cashflow-add-btn" type="button" data-action="save-quick-entry">Add</button>
          <button class="expense-remove-btn" type="button" data-action="remove-quick-entry" ${selected ? '' : 'disabled'}>Remove</button>
        </div>
      </section>
    </div>
  `;
}

function render() {
  ensureCashflowInputs();
  updateBudgetFromCashflowInputs();
  const plan = calculatePlan();
  const activeAssets = activeAllocations();
  const focus = state.allocations
    .filter((item) => item.focus_rank)
    .sort((a, b) => a.focus_rank - b.focus_rank);
  const topAssets = [...activeAssets]
    .sort((a, b) => netAssetValue(b) - netAssetValue(a))
    .slice(0, 6);
  const totalTarget = activeAssets.reduce((sum, item) => sum + numberValue(item.target_percent), 0);
  const cashflowPercent = Math.max(0, Math.min(100, (plan.cashflow / Math.max(plan.income, 1)) * 100));
  const emergencyPercent = Math.max(0, Math.min(100, (plan.emergencyMonths / 12) * 100));
  const debtPercent = Math.max(0, Math.min(100, 100 - (plan.debt / Math.max(plan.income * 2, 1)) * 100));
  const dailyNews = getDailyNewsItems(state.news);
  const move = nextBestMove(plan);
  const debtSnapshotPayment = Math.max(plan.debtContribution || Math.min(Math.max(plan.cashflow, 0), plan.debt), 0);
  const debtSnapshotMonths = debtSnapshotPayment > 0 && plan.debt > 0 ? Math.ceil(plan.debt / debtSnapshotPayment) : 0;
  const incomeItems = cashflowItems('income');
  const expenseItems = cashflowItems('expense');

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <a class="brand-mark" href="#" aria-label="Back to top">
            <img src="/assets/dollar_sign_crown_logo.png" alt="Wealth Tracker logo">
          </a>
        </div>
        <nav>
          <a href="#budget-section">Budget</a>
          <a href="#readiness">Readiness</a>
          <a href="#assets">Assets</a>
          <a href="#news">Research</a>
        </nav>
      </aside>

      <main>
          <header class="hero">
            <div class="hero-content">
              <h1>Wealth Tracker</h1>
              <h2>Online Personal Finance</h2>
            </div>
          </header>

        <section class="metric-grid" aria-label="Plan metrics">
          <article class="metric-card featured">
            <span>Monthly cashflow</span>
            <strong>${money(plan.cashflow)}</strong>
            <div class="bar"><i style="width:${cashflowPercent}%"></i></div>
          </article>
          <article class="metric-card">
            <span>Emergency runway</span>
            <strong>${plan.emergencyMonths.toFixed(1)} months</strong>
            <div class="bar mint"><i style="width:${emergencyPercent}%"></i></div>
          </article>
          <article class="metric-card">
            <span>Debt threshold</span>
            <strong>${money(plan.debt)}</strong>
            <div class="bar coral"><i style="width:${debtPercent}%"></i></div>
          </article>
          <article class="metric-card">
            <span>Portfolio tracked</span>
            <strong>${money(plan.portfolioTotal)}</strong>
            <small>${pct(totalTarget)} target assigned</small>
          </article>
        </section>

        <section id="budget-section" class="workbench anchored-section">
          <section class="panel cashflow-panel">
            <div class="section-title">
              <strong>Income And Expenses</strong>
            </div>
            ${cashflowSummaryGroup('Income', 'income', incomeItems, plan.income)}
            ${cashflowSummaryGroup('Expenses', 'expense', expenseItems, plan.expenses)}
          </section>

          <section class="budget-column">
            <form id="budget" class="panel budget-form">
              <div class="section-title">
                <strong>Budget Calculator</strong>
              </div>
              ${field('Plan name', 'name', 'text')}
              ${field('Monthly income', 'monthly_income')}
              ${monthlyExpensesField(plan.expenses)}
              ${field('Debt balance', 'debt_balance')}
              ${field('Debt APR', 'debt_apr')}
              ${field('Emergency Fund', 'emergency_current')}
              ${field('Monthly Fun Fund', 'emergency_monthly_need')}
              ${field('Emergency Fund Savings Account APY', 'emergency_apy')}
              ${field('Monthly contribution', 'monthly_contribution')}
              <label>
                <span>Risk profile</span>
                <select name="risk_profile">
                  ${['conservative', 'balanced', 'growth'].map((item) => `<option value="${item}" ${state.budget.risk_profile === item ? 'selected' : ''}>${item}</option>`).join('')}
                </select>
              </label>
              ${field('Timeline years', 'timeline_years')}
            </form>
            <section class="panel guidance-panel">
              <div class="section-title">
                <strong>Next Best Move</strong>
              </div>
              <div class="guidance-card">
                <span>${move.label}</span>
                <strong>${move.metric}</strong>
                <h3>${move.title}</h3>
                <p>${move.detail}</p>
              </div>
            </section>
          </section>
        </section>

        <section class="portfolio-grid anchored-section">
          <div class="readiness-left-stack">
            <article class="panel chart-panel">
              <div class="section-title">
                <strong>Allocation map</strong>
              </div>
              <div class="donut" style="background: conic-gradient(${allocationSegments(plan.portfolioTotal) || '#dbe5eb 0 100%'})">
                <div><strong>${money(plan.portfolioTotal)}</strong><span>Total</span></div>
              </div>
              <div class="legend">
                ${topAssets.map((item) => {
                  const asset = assetClasses.find((entry) => entry.key === item.asset_key);
                  const percent = plan.portfolioTotal ? (netAssetValue(item) / plan.portfolioTotal) * 100 : 0;
                  return `<div><i style="background:${asset?.color || '#7aa6b8'}"></i><span>${item.asset_label}</span><strong>${pct(percent)}</strong></div>`;
                }).join('')}
              </div>
            </article>
            <section class="panel debt-snapshot-panel">
              <div class="section-title">
                <strong>Debt Payoff Snapshot</strong>
              </div>
              <div class="debt-snapshot-grid">
                <div>
                  <span>Current debt</span>
                  <strong>${money(plan.debt)}</strong>
                </div>
                <div>
                  <span>APR</span>
                  <strong>${pct(state.budget.debt_apr)}</strong>
                </div>
                <div>
                  <span>Suggested payoff</span>
                  <strong>${money(debtSnapshotPayment)}</strong>
                </div>
                <div>
                  <span>Estimated payoff</span>
                  <strong>${debtSnapshotMonths ? `${debtSnapshotMonths} mo` : 'Ready'}</strong>
                </div>
              </div>
              <p class="note">${plan.debt > 0 ? 'Paying down debt below $5,000 unlocks more of the plan for investing.' : 'Debt is clear, so available dollars can move toward savings and investing.'}</p>
            </section>
          </div>
          <section id="readiness" class="panel readiness-panel">
            <div class="section-title">
              <strong>Financial Health</strong>
            </div>
            <div class="gates">
              ${readinessItem('Cashflow positive', plan.readiness.cashflow, `${money(plan.cashflow)} after expenses`)}
              ${readinessItem('Debt under $5,000', plan.readiness.debt, `${money(plan.debt)} current balance`)}
              ${readinessItem('3 months saved', plan.readiness.emergency, `${plan.emergencyMonths.toFixed(1)} months in liquid savings`)}
            </div>
            <div class="split-plan">
              <div>
                <span>Emergency Fund Monthly Allocation</span>
                <strong>${money(plan.emergencyContribution)}</strong>
              </div>
              <div>
                <span>Debt Payoff</span>
                <strong>${money(plan.debtContribution)}</strong>
              </div>
              <div>
                <span>Monthly Investing Amount</span>
                <strong>${money(plan.investContribution)}</strong>
              </div>
            </div>
            <div class="tier-track">
              <span style="left:25%">3 mo</span>
              <span style="left:50%">6 mo</span>
              <span style="left:100%">1 yr</span>
              <i style="width:${emergencyPercent}%"></i>
            </div>
            <p class="note">Emergency contributions automatically step down after 3 and 6 months. At 12 months, new emergency-fund allocation drops to zero.</p>
          </section>
        </section>

        <section id="assets" class="panel asset-editor anchored-section">
          <div class="section-title asset-editor-title">
            <strong>Asset Classes</strong>
          </div>
          <div class="asset-summary">
            <h3>My Top Performing Assets</h3>
            <div class="focus-list">
              ${focus.map((item) => `<div><span>${item.focus_rank}</span><strong>${item.asset_label}</strong><small>${money(netAssetValue(item))} net</small></div>`).join('')}
            </div>
          </div>
          <div class="asset-table">
            ${state.visibleAssetKeys.map((assetKey, index) => {
              const rank = index + 1;
              const item = state.allocations.find((allocation) => allocation.asset_key === assetKey) || state.allocations[0];
              const asset = assetClasses.find((entry) => entry.key === item.asset_key);
              return `
                <div class="asset-row">
                  <div class="asset-name">
                    <i style="background:${asset?.color || '#7aa6b8'}"></i>
                    <div><strong>${item.asset_label}</strong><span>${asset?.group || 'Asset'} · ${item.liquidity} liquidity</span></div>
                  </div>
                  <label><span>Asset class</span><select data-focus-slot="${rank}">
                    <option value="__remove__">Remove</option>
                    ${assetClasses.map((option) => `<option value="${option.key}" ${item.asset_key === option.key ? 'selected' : ''}>${option.label}</option>`).join('')}
                  </select></label>
                  <label><span>Value</span><input data-asset="${item.asset_key}" data-field="current_value" type="number" min="0" step="any" inputmode="decimal" value="${editableValue(item.current_value)}"></label>
                  <label><span>Owed Debt</span><input data-asset="${item.asset_key}" data-field="owed_debt" type="number" min="0" step="any" inputmode="decimal" value="${editableValue(item.owed_debt)}"></label>
                  <label><span>Target %</span><input data-asset="${item.asset_key}" data-field="target_percent" type="number" min="0" max="100" step="any" inputmode="decimal" value="${editableValue(item.target_percent)}"></label>
                </div>
              `;
            }).join('')}
          </div>
          <button class="add-asset-btn" type="button" data-action="add-asset">Add</button>
        </section>

        <section id="news" class="panel news-panel">
          <div class="section-title">
            <span class="news-title">Wealth Builder News</span>
          </div>
          <div class="news-list">
            ${dailyNews.map((item) => `
              <a href="${item.url}" rel="noreferrer" title="Read article: ${item.title}">
                <span>${item.source} · ${formatDate(item.published_at)}</span>
                <strong>${item.title}</strong>
                <small>${item.summary}</small>
                <em>Read article</em>
              </a>
            `).join('')}
          </div>
        </section>

        <footer>
          Planning tool only. It does not provide personalized financial, investment, tax, or legal advice.
        </footer>
      </main>
      ${quickEntryOverlay()}
    </div>
  `;

  bindEvents();
}

function field(label, name, type = 'number') {
  return `
    <label>
      <span>${label}</span>
      <input name="${name}" type="${type}" ${type === 'number' ? 'min="0" step="any" inputmode="decimal"' : ''} value="${editableValue(state.budget[name])}">
    </label>
  `;
}

function monthlyExpensesField(value) {
  return `
    <label>
      <span>Monthly expenses</span>
      <input type="number" min="0" step="any" inputmode="decimal" value="${editableValue(value)}" readonly aria-readonly="true">
    </label>
  `;
}

function bindEvents() {
  document.querySelectorAll('#budget input, #budget select').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { name, value, type } = event.target;
      state.budget[name] = value;
      persistLocal();
      scheduleSave();
    });
    input.addEventListener('change', render);
  });

  document.querySelectorAll('[data-action="open-quick-entry"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const { entryType, sourceType, key } = event.currentTarget.dataset;
      quickEntry = {
        entryType,
        sourceType: sourceType || (entryType === 'income' ? 'income' : 'variable'),
        key: key || null
      };
      render();
      window.setTimeout(() => document.querySelector('[data-quick-name]')?.focus(), 0);
    });
  });

  document.querySelectorAll('[data-action="close-quick-entry"]').forEach((element) => {
    element.addEventListener('click', (event) => {
      if (event.target !== event.currentTarget && event.currentTarget.classList.contains('quick-entry-layer')) return;
      quickEntry = null;
      render();
    });
  });

  document.querySelector('[data-action="save-quick-entry"]')?.addEventListener('click', () => {
    if (!quickEntry) return;

    const label = document.querySelector('[data-quick-name]')?.value?.trim() || 'Unnamed item';
    const amount = document.querySelector('[data-quick-amount]')?.value ?? '';
    const sourceType = quickEntry.sourceType || (quickEntry.entryType === 'income' ? 'income' : 'variable');
    const group = state.cashflowInputs[sourceType];
    const existing = group?.find((item) => item.key === quickEntry.key);
    if (!group) return;

    if (existing) {
      existing.label = label;
      existing.amount = amount;
    } else {
      group.push({ key: makeCashflowKey(sourceType), label, amount });
    }

    quickEntry = null;
    updateBudgetFromCashflowInputs();
    persistLocal();
    scheduleSave();
    render();
  });

  document.querySelector('[data-action="remove-quick-entry"]')?.addEventListener('click', () => {
    if (!quickEntry?.key) return;

    state.cashflowInputs[quickEntry.sourceType] = state.cashflowInputs[quickEntry.sourceType].filter((item) => item.key !== quickEntry.key);
    quickEntry = null;
    updateBudgetFromCashflowInputs();
    persistLocal();
    scheduleSave();
    render();
  });

  document.querySelectorAll('[data-focus-slot]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const rank = Number(event.target.dataset.focusSlot);
      const selectedKey = event.target.value;
      const previousKey = state.visibleAssetKeys[rank - 1];
      const existingIndex = state.visibleAssetKeys.indexOf(selectedKey);

      if (selectedKey === '__remove__') {
        const removedAllocation = state.allocations.find((item) => item.asset_key === previousKey);
        if (removedAllocation) {
          removedAllocation.current_value = '';
          removedAllocation.owed_debt = '';
          removedAllocation.target_percent = 0;
          removedAllocation.focus_rank = null;
        }

        state.visibleAssetKeys = state.visibleAssetKeys.filter((_, index) => index !== rank - 1);
        syncVisibleAssets();
        persistLocal();
        scheduleSave();
        render();
        return;
      }

      const selectedAllocation = state.allocations.find((item) => item.asset_key === selectedKey);

      state.allocations.forEach((item) => {
        if (item.focus_rank === rank || item.asset_key === selectedKey) item.focus_rank = null;
      });

      if (rank <= 3) selectedAllocation.focus_rank = rank;

      if (existingIndex >= 0 && existingIndex !== rank - 1) {
        state.visibleAssetKeys[existingIndex] = previousKey;
      }

      state.visibleAssetKeys[rank - 1] = selectedKey;
      syncVisibleAssets();
      persistLocal();
      scheduleSave();
      render();
    });
  });

  document.querySelector('[data-action="add-asset"]')?.addEventListener('click', () => {
    const unusedAsset = state.allocations.find((item) => !state.visibleAssetKeys.includes(item.asset_key));
    if (!unusedAsset) return;

    state.visibleAssetKeys.push(unusedAsset.asset_key);
    syncVisibleAssets();
    persistLocal();
    scheduleSave();
    render();
  });

  document.querySelectorAll('[data-asset]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { asset, field: assetField } = event.target.dataset;
      const allocation = state.allocations.find((item) => item.asset_key === asset);
      const value = event.target.value;

      if (assetField === 'focus_rank') {
        const rank = value ? Number(value) : null;
        if (rank) {
          state.allocations.forEach((item) => {
            if (item.asset_key !== asset && item.focus_rank === rank) item.focus_rank = null;
          });
        }
        allocation.focus_rank = rank;
      } else {
        allocation[assetField] = value;
      }

      persistLocal();
      scheduleSave();
    });
    input.addEventListener('change', render);
  });
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(savePlan, 700);
}

function syncVisibleAssets() {
  state.visibleAssetKeys = state.visibleAssetKeys.filter((key, index, keys) => (
    key && keys.indexOf(key) === index && state.allocations.some((item) => item.asset_key === key)
  ));

  state.allocations.forEach((item) => {
    const visibleIndex = state.visibleAssetKeys.indexOf(item.asset_key);
    item.focus_rank = visibleIndex >= 0 && visibleIndex < 3 ? visibleIndex + 1 : null;
  });
}

function isEditingFormInput() {
  return Boolean(document.activeElement?.matches?.('#budget input, #budget select, [data-cashflow], [data-cashflow-name]'));
}

function persistLocal() {
  localStorage.setItem('wealthbuilder-plan', JSON.stringify({
    budget: state.budget,
    allocations: state.allocations,
    cashflowInputs: state.cashflowInputs,
    profileId: state.profileId,
    visibleAssetKeys: state.visibleAssetKeys
  }));
}

function loadLocal() {
  const saved = localStorage.getItem('wealthbuilder-plan');
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.budget = { ...state.budget, ...parsed.budget };
    state.cashflowInputs = normalizeCashflowInputs(parsed.cashflowInputs || cashflowInputsFromBudget(state.budget));
    state.allocations = state.allocations.map((item) => ({
      ...item,
      ...(parsed.allocations || []).find((savedItem) => savedItem.asset_key === item.asset_key)
    }));
    state.profileId = parsed.profileId || null;
    state.visibleAssetKeys = Array.isArray(parsed.visibleAssetKeys)
      ? parsed.visibleAssetKeys
      : state.allocations.filter((item) => item.focus_rank).sort((a, b) => a.focus_rank - b.focus_rank).map((item) => item.asset_key);
    syncVisibleAssets();
  } catch {
    state.status = 'Local draft mode';
  }
}

async function loadSupabaseData() {
  if (!supabase) return;

  const sessionId = getSessionId();
  const { data: profile, error } = await supabase
    .from('wealth_profiles')
    .select('*, asset_allocations(*)')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    state.status = 'Supabase needs schema';
    render();
    return;
  }

  if (profile) {
    const localVisibleAssetKeys = [...state.visibleAssetKeys];
    state.profileId = profile.id;
    Object.keys(state.budget).forEach((key) => {
      if (profile[key] !== undefined && profile[key] !== null) state.budget[key] = profile[key];
    });

    state.allocations = state.allocations.map((item) => ({
      ...item,
      ...(profile.asset_allocations || []).find((savedItem) => savedItem.asset_key === item.asset_key)
    }));
    const profileFocusAssetKeys = state.allocations
      .filter((item) => item.focus_rank)
      .sort((a, b) => a.focus_rank - b.focus_rank)
      .map((item) => item.asset_key);
    state.visibleAssetKeys = localVisibleAssetKeys.length ? localVisibleAssetKeys : profileFocusAssetKeys;
    syncVisibleAssets();
    state.status = 'Synced with Supabase';
  }

  const { data: news } = await supabase
    .from('news_items')
    .select('title, source, url, published_at, summary')
    .order('published_at', { ascending: false })
    .limit(12);

  if (news?.length) state.news = mergeNewsItems(news, fallbackNews);
  render();
}

async function savePlan() {
  persistLocal();

  if (!supabase) {
    state.status = 'Saved locally';
    if (!isEditingFormInput()) render();
    return;
  }

  state.saving = true;
  if (!isEditingFormInput()) render();

  const sessionId = getSessionId();
  const payload = {
    session_id: sessionId,
    ...state.budget,
    updated_at: new Date().toISOString()
  };

  const { data: profile, error } = await supabase
    .from('wealth_profiles')
    .upsert(payload, { onConflict: 'session_id' })
    .select('id')
    .single();

  if (error) {
    state.status = 'Supabase save failed';
    state.saving = false;
    if (!isEditingFormInput()) render();
    return;
  }

  state.profileId = profile.id;

  const allocationPayload = state.allocations.map((item) => ({
    profile_id: profile.id,
    asset_key: item.asset_key,
    asset_label: item.asset_label,
    current_value: item.current_value,
    owed_debt: item.owed_debt,
    target_percent: item.target_percent,
    focus_rank: item.focus_rank,
    account_type: item.account_type,
    liquidity: item.liquidity,
    notes: item.notes,
    updated_at: new Date().toISOString()
  }));

  let { error: allocationError } = await supabase
    .from('asset_allocations')
    .upsert(allocationPayload, { onConflict: 'profile_id,asset_key' });

  if (allocationError && String(allocationError.message || '').includes('owed_debt')) {
    const fallbackPayload = allocationPayload.map(({ owed_debt: _owedDebt, ...item }) => item);
    const fallbackResult = await supabase
      .from('asset_allocations')
      .upsert(fallbackPayload, { onConflict: 'profile_id,asset_key' });

    allocationError = fallbackResult.error;
    state.status = allocationError ? 'Allocation save failed' : 'Supabase needs owed debt column';
  } else {
    state.status = allocationError ? 'Allocation save failed' : 'Synced with Supabase';
  }

  state.saving = false;
  persistLocal();
  if (!isEditingFormInput()) render();
}

loadLocal();
render();
loadSupabaseData();
