/**
 * Controlador de Autenticação e Apresentação (MyFinance Landing & Auth)
 * Gerencia Cadastro, Login, Modo Demonstração e Redirecionamentos.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos do Formulário de Auth
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const authFeedback = document.getElementById('auth-feedback');

  // Inputs Login
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const btnSubmitLogin = document.getElementById('btn-submit-login');

  // Inputs Signup
  const signupName = document.getElementById('signup-name');
  const signupBusiness = document.getElementById('signup-business');
  const signupEmail = document.getElementById('signup-email');
  const signupPassword = document.getElementById('signup-password');
  const btnSubmitSignup = document.getElementById('btn-submit-signup');

  // Botões de Demonstração
  const btnDemoMode = document.getElementById('btn-demo-mode');
  const btnHeroDemo = document.getElementById('btn-hero-demo');

  // Alternador de Tema
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

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
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '🌙';
    }
    localStorage.setItem('myfinance_theme', theme);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
  initTheme();

  // ==========================================
  // VERIFICAÇÃO DE SESSÃO ATIVA
  // ==========================================
  if (window.SupabaseBridge) {
    try {
      const session = await window.SupabaseBridge.getSession();
      if (session && session.user) {
        console.log('Sessão ativa detectada:', session.user.email);
        // Atualiza botões da landing para "Acessar Dashboard"
        const navAuthBtn = document.getElementById('nav-auth-btn');
        if (navAuthBtn) {
          navAuthBtn.textContent = 'Acessar Meu Painel →';
          navAuthBtn.href = 'index.html';
        }
      }
    } catch (e) {
      console.warn('Erro ao checar sessão:', e);
    }
  }

  // ==========================================
  // TROCA DE ABAS (LOGIN vs CADASTRO)
  // ==========================================
  function switchTab(target) {
    clearFeedback();
    if (target === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      formLogin.style.display = 'flex';
      formSignup.style.display = 'none';
      if (loginEmail) loginEmail.focus();
    } else {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      formSignup.style.display = 'flex';
      formLogin.style.display = 'none';
      if (signupName) signupName.focus();
    }
  }

  if (tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));
  if (tabSignup) tabSignup.addEventListener('click', () => switchTab('signup'));

  // Feedback Helpers
  function showFeedback(type, message) {
    if (!authFeedback) return;
    authFeedback.className = `auth-feedback-box feedback-${type}`;
    authFeedback.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> <span>${message}</span>`;
    authFeedback.style.display = 'flex';
  }

  function clearFeedback() {
    if (!authFeedback) return;
    authFeedback.style.display = 'none';
    authFeedback.innerHTML = '';
  }

  // ==========================================
  // SUBMIT: LOGIN
  // ==========================================
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFeedback();

      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      if (!email || !password) {
        showFeedback('error', 'Por favor, preencha o email e a senha.');
        return;
      }

      btnSubmitLogin.disabled = true;
      btnSubmitLogin.innerHTML = 'Entrando...';

      try {
        if (!window.SupabaseBridge) {
          throw new Error('Supabase SDK não inicializado.');
        }

        const data = await window.SupabaseBridge.signIn(email, password);

        if (data && data.user) {
          // Salva dados de identificação para a UI
          localStorage.setItem('myfinance_user_email', data.user.email);
          const meta = data.user.user_metadata || {};
          if (meta.full_name) localStorage.setItem('myfinance_user_name', meta.full_name);
          if (meta.business_name) localStorage.setItem('myfinance_business_name', meta.business_name);
          localStorage.removeItem('myfinance_guest_mode');

          showFeedback('success', 'Login realizado com sucesso! Redirecionando...');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 800);
        }
      } catch (err) {
        console.error('Erro no login:', err);
        let msg = err.message || 'Erro ao efetuar login.';
        if (msg.includes('Invalid login credentials')) {
          msg = 'Credenciais inválidas. Verifique seu email e senha.';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Email ainda não confirmado no Supabase. Verifique sua caixa de entrada ou desative a confirmação de email no painel Supabase.';
        }
        showFeedback('error', msg);
      } finally {
        btnSubmitLogin.disabled = false;
        btnSubmitLogin.innerHTML = `
          <span>Acessar Meu Painel</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        `;
      }
    });
  }

  // ==========================================
  // SUBMIT: CADASTRO (CRIAR CONTA)
  // ==========================================
  if (formSignup) {
    formSignup.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFeedback();

      const fullName = signupName.value.trim();
      const businessName = signupBusiness.value.trim();
      const email = signupEmail.value.trim();
      const password = signupPassword.value;

      if (!fullName) {
        showFeedback('error', 'Informe seu nome completo.');
        signupName.focus();
        return;
      }
      if (!businessName) {
        showFeedback('error', 'Informe o nome da sua empresa ou negócio.');
        signupBusiness.focus();
        return;
      }
      if (!email) {
        showFeedback('error', 'Informe um endereço de email válido.');
        signupEmail.focus();
        return;
      }
      if (!password || password.length < 6) {
        showFeedback('error', 'A senha deve conter no mínimo 6 caracteres.');
        signupPassword.focus();
        return;
      }

      btnSubmitSignup.disabled = true;
      btnSubmitSignup.innerHTML = 'Criando sua conta...';

      try {
        if (!window.SupabaseBridge) {
          throw new Error('Supabase SDK não inicializado.');
        }

        const data = await window.SupabaseBridge.signUp(email, password, {
          fullName,
          businessName
        });

        if (data && data.user) {
          localStorage.setItem('myfinance_user_email', data.user.email);
          localStorage.setItem('myfinance_user_name', fullName);
          localStorage.setItem('myfinance_business_name', businessName);
          localStorage.removeItem('myfinance_guest_mode');

          // Se a confirmação de email estiver ativada no Supabase
          if (data.user.identities && data.user.identities.length === 0) {
            showFeedback('error', 'Este email já está cadastrado. Tente fazer login.');
          } else if (data.session) {
            showFeedback('success', 'Conta criada com sucesso! Redirecionando...');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 800);
          } else {
            // Caso exija confirmação por email
            showFeedback('success', 'Conta criada! Se a confirmação de email estiver habilitada, verifique sua caixa de entrada.');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 1500);
          }
        }
      } catch (err) {
        console.error('Erro no cadastro:', err);
        let msg = err.message || 'Erro ao criar conta.';
        if (msg.includes('User already registered')) {
          msg = 'Este email já está cadastrado. Tente entrar na aba de login.';
        }
        showFeedback('error', msg);
      } finally {
        btnSubmitSignup.disabled = false;
        btnSubmitSignup.innerHTML = `
          <span>Criar Minha Conta Grátis</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        `;
      }
    });
  }

  // ==========================================
  // MODO DEMONSTRAÇÃO (SEM LOGIN)
  // ==========================================
  function activateDemoMode() {
    localStorage.setItem('myfinance_guest_mode', 'true');
    window.location.href = 'index.html';
  }

  if (btnDemoMode) btnDemoMode.addEventListener('click', activateDemoMode);
  if (btnHeroDemo) btnHeroDemo.addEventListener('click', activateDemoMode);
});
