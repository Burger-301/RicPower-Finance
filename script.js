// 1. CONFIGURAÇÃO OFICIAL DO FIREBASE COM REALTIME DATABASE
const firebaseConfig = {
  apiKey: "AIzaSyAMIo-e1IQVvoVNvHfjyCvQ3mpmA8XpEZU",
  authDomain: "ricpower-finance-4312b.firebaseapp.com",
  databaseURL: "https://ricpower-finance-4312b-default-rtdb.firebaseio.com",
  projectId: "ricpower-finance-4312b",
  storageBucket: "ricpower-finance-4312b.firebasestorage.app",
  messagingSenderId: "632169254200",
  appId: "1:632169254200:web:776e49224d4f61bc2e05cd"
};

// Inicialização da base de dados Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = (typeof firebase !== 'undefined') ? firebase.database() : null;

// HELPERS DE DATA E FORMATAÇÃO
const getMesAtualStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const mesAtual = getMesAtualStr();

// DADOS LOCAIS DE ARMAZENAMENTO E BACKUP
let contasPagar = JSON.parse(localStorage.getItem('ricpower_pagar')) || [
    { id: '1', vencimento: `${mesAtual}-15`, fornecedor: 'RGE Energia', descricao: 'Conta de Energia Elétrica', valor: 1000.00, categoria: 'Custos Fixos', status: 'PAGO', dataPagamento: `${mesAtual}-15`, tipoPagamento: 'PIX' },
    { id: '2', vencimento: `${mesAtual}-21`, fornecedor: 'AliExpress', descricao: 'Lote de Placas e Chips', valor: 850.00, categoria: 'Peças Novas', status: 'PENDENTE', dataPagamento: '', tipoPagamento: 'PIX' },
    { id: '3', vencimento: `${mesAtual}-28`, fornecedor: 'Imobiliária', descricao: 'Aluguel do Galpão', valor: 1270.00, categoria: 'Custos Fixos', status: 'PENDENTE', dataPagamento: '', tipoPagamento: 'Transferência' }
];

let contasReceber = JSON.parse(localStorage.getItem('ricpower_receber')) || [
    { id: '1', vencimento: `${mesAtual}-18`, cliente: 'Gabi', descricao: 'Reparo de GPU RTX 3080', valor: 450.00, categoria: 'Reparos', status: 'PAGO', dataPagamento: `${mesAtual}-18`, tipoPagamento: 'PIX' },
    { id: '2', vencimento: `${mesAtual}-20`, cliente: 'Yuri', descricao: 'Troca de Telas e Peças', valor: 280.00, categoria: 'Peças Novas', status: 'PENDENTE', dataPagamento: '', tipoPagamento: 'PIX' }
];

let estoque = JSON.parse(localStorage.getItem('ricpower_estoque')) || [
    { id: '1', sku: 'PEC-001', nome: 'Chip Mosfet VRM 40V', categoria: 'Componentes', qtd: 14, qtdMin: 10, precoCusto: 12.50, precoVenda: 45.00 },
    { id: '2', sku: 'PEC-002', nome: 'Pasta Térmica Alta Condutividade', categoria: 'Insumos', qtd: 3, qtdMin: 5, precoCusto: 35.00, precoVenda: 90.00 }
];

let filtroDataAtivo = 'Este Mês';
let dataInicioCustom = '';
let dataFimCustom = '';
let fluxoCaixaChartInstance = null;
let centroCustoChartInstance = null;

// GUARDA LOCALMENTE E SINCRONIZA COM A NUVEM
function salvarDadosLocal(skipNuvem = false) {
    localStorage.setItem('ricpower_pagar', JSON.stringify(contasPagar));
    localStorage.setItem('ricpower_receber', JSON.stringify(contasReceber));
    localStorage.setItem('ricpower_estoque', JSON.stringify(estoque));

    if (db && !skipNuvem) {
        db.ref('ricpower_dados').set({
            contasPagar: contasPagar,
            contasReceber: contasReceber,
            estoque: estoque
        }).catch(err => console.error("Erro ao enviar para o Firebase:", err));
    }
}

// ESCUTA EM TEMPO REAL (SINCRONIZAÇÃO PC <-> TELEMÓVEL)
function escutarSincronizacaoNuvem() {
    if (db) {
        db.ref('ricpower_dados').on('value', (snapshot) => {
            const dadosNuvem = snapshot.val();
            if (dadosNuvem) {
                contasPagar = dadosNuvem.contasPagar || [];
                contasReceber = dadosNuvem.contasReceber || [];
                estoque = dadosNuvem.estoque || [];

                salvarDadosLocal(true); // Atualiza localStorage sem duplicar envio
                renderizarTudo();
            } else {
                // Se a nuvem estiver vazia na primeira execução, envia os dados locais
                salvarDadosLocal();
            }
        });
    }
}

function formatarMoeda(valor) {
    return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBR(dataIso) {
    if (!dataIso) return '-';
    const partes = dataIso.split('-');
    if (partes.length !== 3) return dataIso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/* AUTENTICAÇÃO E SESSÃO */
function realizarLogin(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const alertBox = document.getElementById('loginAlert');

    if (email === 'admin@richard.com' && senha === 'admin123') {
        localStorage.setItem('ricpower_logged_user', email);
        alertBox.style.display = 'none';
        iniciarAplicacao();
    } else {
        alertBox.className = 'login-alert error';
        alertBox.innerText = 'E-mail ou senha incorretos!';
        alertBox.style.display = 'block';
    }
}

function preencherLoginDemo() {
    document.getElementById('loginEmail').value = 'admin@richard.com';
    document.getElementById('loginSenha').value = 'admin123';
}

function logout() {
    localStorage.removeItem('ricpower_logged_user');
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

function verificarSessao() {
    const user = localStorage.getItem('ricpower_logged_user');
    if (user) {
        iniciarAplicacao();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appScreen').style.display = 'none';
    }
}

function iniciarAplicacao() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';
    document.getElementById('userEmailDisplay').innerText = localStorage.getItem('ricpower_logged_user') || 'admin@richard.com';
    escutarSincronizacaoNuvem();
    renderizarTudo();
}

/* NAVEGAÇÃO DE ABAS */
function showTab(tabId, navElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    const selectedTab = document.getElementById(`tab-${tabId}`);
    if (selectedTab) selectedTab.classList.add('active');

    if (navElement) {
        navElement.classList.add('active');
    }

    const titles = {
        'dashboard': 'Visão Geral Financeira',
        'pagar': 'Contas a Pagar (Saídas)',
        'receber': 'Contas a Receber (Entradas)',
        'estoque': 'Controle de Estoque (Peças)',
        'dre': 'Demonstrativo do Resultado do Exercício (DRE)',
        'extensao': 'Extensão Chrome & Integrações'
    };
    document.getElementById('pageTitle').innerText = titles[tabId] || 'RICPOWER';
    renderizarTudo();
}

/* FILTROS DE PERÍODO */
function toggleDateFilter() {
    document.getElementById('dateFilterDropdown').classList.toggle('show');
}

function selectPredefinedPeriod(element, periodName) {
    filtroDataAtivo = periodName;
    dataInicioCustom = '';
    dataFimCustom = '';

    document.getElementById('currentPeriodText').innerText = periodName;
    document.querySelectorAll('.filter-option').forEach(el => el.classList.remove('active-filter'));
    if (element) element.classList.add('active-filter');

    document.getElementById('dateFilterDropdown').classList.remove('show');
    renderizarTudo();
}

function aplicarFiltroPersonalizado() {
    const dtInicio = document.getElementById('dataInicioFiltro').value;
    const dtFim = document.getElementById('dataFimFiltro').value;

    if (!dtInicio || !dtFim) {
        alert("Por favor, selecione as datas de início e fim.");
        return;
    }

    filtroDataAtivo = 'Customizado';
    dataInicioCustom = dtInicio;
    dataFimCustom = dtFim;

    const textoFiltro = `${formatarDataBR(dtInicio)} até ${formatarDataBR(dtFim)}`;
    document.getElementById('currentPeriodText').innerText = textoFiltro;
    document.querySelectorAll('.filter-option').forEach(el => el.classList.remove('active-filter'));
    document.getElementById('dateFilterDropdown').classList.remove('show');

    renderizarTudo();
}

function limparFiltro() {
    document.getElementById('dataInicioFiltro').value = '';
    document.getElementById('dataFimFiltro').value = '';
    const btnPadrao = document.getElementById('opt-mes-atual');
    selectPredefinedPeriod(btnPadrao, 'Este Mês');
}

function filtrarPorPeriodo(lista, campoData = 'vencimento') {
    if (filtroDataAtivo === 'Todos os Registros') return lista;

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtualIndex = agora.getMonth();

    return lista.filter(item => {
        if (!item[campoData]) return true;
        const dataItem = new Date(item[campoData] + 'T00:00:00');
        const anoItem = dataItem.getFullYear();
        const mesItem = dataItem.getMonth();

        if (filtroDataAtivo === 'Este Mês') {
            return anoItem === anoAtual && mesItem === mesAtualIndex;
        } else if (filtroDataAtivo === 'Mês Passado') {
            const mesPassado = mesAtualIndex === 0 ? 11 : mesAtualIndex - 1;
            const anoPassado = mesAtualIndex === 0 ? anoAtual - 1 : anoAtual;
            return anoItem === anoPassado && mesItem === mesPassado;
        } else if (filtroDataAtivo === 'Últimos 3 Meses') {
            const limite3Meses = new Date();
            limite3Meses.setMonth(limite3Meses.getMonth() - 3);
            return dataItem >= limite3Meses;
        } else if (filtroDataAtivo === 'Este Ano') {
            return anoItem === anoAtual;
        } else if (filtroDataAtivo === 'Customizado' && dataInicioCustom && dataFimCustom) {
            const dtI = new Date(dataInicioCustom + 'T00:00:00');
            const dtF = new Date(dataFimCustom + 'T23:59:59');
            return dataItem >= dtI && dataItem <= dtF;
        }
        return true;
    });
}

/* RENDERIZAÇÃO E GRÁFICOS */
function renderizarTudo() {
    renderizarDashboard();
    renderizarContasPagar();
    renderizarContasReceber();
    renderizarEstoque();
    renderizarDRE();
}

function renderizarDashboard() {
    const pagarFiltrado = filtrarPorPeriodo(contasPagar);
    const receberFiltrado = filtrarPorPeriodo(contasReceber);

    const totalReceber = receberFiltrado.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    const totalPagar = pagarFiltrado.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    const saldoPrevisto = totalReceber - totalPagar;

    const patrimonioEstoque = estoque.reduce((acc, p) => acc + ((parseFloat(p.qtd) || 0) * (parseFloat(p.precoCusto) || 0)), 0);

    document.getElementById('cardReceberLabel').innerText = `A Receber (${filtroDataAtivo})`;
    document.getElementById('cardPagarLabel').innerText = `A Pagar (${filtroDataAtivo})`;
    document.getElementById('dashTotalReceber').innerText = formatarMoeda(totalReceber);
    document.getElementById('dashTotalPagar').innerText = formatarMoeda(totalPagar);
    document.getElementById('dashSaldoPrevisto').innerText = formatarMoeda(saldoPrevisto);
    document.getElementById('dashValorEstoque').innerText = formatarMoeda(patrimonioEstoque);

    const proximosTable = document.getElementById('tableProximosVencimentos');
    if (proximosTable) {
        const uniao = [
            ...pagarFiltrado.map(p => ({ ...p, tipoConta: 'SAIDA', nome: p.fornecedor })),
            ...receberFiltrado.map(r => ({ ...r, tipoConta: 'ENTRADA', nome: r.cliente }))
        ].sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 5);

        if (uniao.length === 0) {
            proximosTable.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum lançamento no período.</td></tr>`;
        } else {
            proximosTable.innerHTML = uniao.map(item => `
                <tr>
                    <td>${formatarDataBR(item.vencimento)}</td>
                    <td><span class="badge ${item.tipoConta === 'ENTRADA' ? 'badge-success' : 'badge-danger'}">${item.tipoConta}</span></td>
                    <td><strong>${item.nome}</strong></td>
                    <td class="${item.tipoConta === 'ENTRADA' ? 'text-success' : 'text-danger'} font-bold">${formatarMoeda(item.valor)}</td>
                    <td><span class="status ${item.status.toLowerCase()}">${item.status}</span></td>
                </tr>
            `).join('');
        }
    }

    const painelAlertas = document.getElementById('painelAlertasEstoque');
    if (painelAlertas) {
        const itensCriticos = estoque.filter(p => p.qtd <= p.qtdMin);
        if (itensCriticos.length === 0) {
            painelAlertas.innerHTML = `<p class="text-success font-bold"><i class="fas fa-check-circle"></i> Todos os produtos com estoque saudável!</p>`;
        } else {
            painelAlertas.innerHTML = itensCriticos.map(p => `
                <div class="alert-item">
                    <div>
                        <strong>${p.sku} - ${p.nome}</strong><br>
                        <small>Qtd Atual: <b class="text-danger">${p.qtd}</b> / Mínima: ${p.qtdMin}</small>
                    </div>
                    <span class="badge badge-danger">${p.qtd === 0 ? 'ESGOTADO' : 'BAIXO'}</span>
                </div>
            `).join('');
        }
    }

    renderizarGraficosSeguro(receberFiltrado, pagarFiltrado);
}

function renderizarGraficosSeguro(receberList, pagarList) {
    if (typeof Chart === 'undefined') return;

    try {
        const ctxFluxo = document.getElementById('fluxoCaixaChart');
        if (ctxFluxo && ctxFluxo.offsetParent !== null) {
            if (fluxoCaixaChartInstance) fluxoCaixaChartInstance.destroy();

            const recTotal = receberList.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
            const pagTotal = pagarList.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);

            fluxoCaixaChartInstance = new Chart(ctxFluxo.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Entradas (A Receber)', 'Saídas (A Pagar)'],
                    datasets: [{
                        label: 'Valor Total (R$)',
                        data: [recTotal, pagTotal],
                        backgroundColor: ['#2ecc71', '#e74c3c'],
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }

        const ctxCusto = document.getElementById('centroCustoChart');
        if (ctxCusto && ctxCusto.offsetParent !== null) {
            if (centroCustoChartInstance) centroCustoChartInstance.destroy();

            const categoriasMap = {};
            pagarList.forEach(p => {
                categoriasMap[p.categoria] = (categoriasMap[p.categoria] || 0) + (parseFloat(p.valor) || 0);
            });

            const labels = Object.keys(categoriasMap);
            const data = Object.values(categoriasMap);

            centroCustoChartInstance = new Chart(ctxCusto.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: labels.length ? labels : ['Sem Saídas'],
                    datasets: [{
                        data: data.length ? data : [1],
                        backgroundColor: ['#FFD500', '#111111', '#e74c3c', '#3498db', '#9b59b6'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
            });
        }
    } catch (err) {
        console.warn("Erro ao renderizar gráficos:", err);
    }
}

/* TABELAS E OPERAÇÕES */
function renderizarContasPagar() {
    const tbody = document.getElementById('tableContasPagar');
    if (!tbody) return;

    const termo = (document.getElementById('searchPagar')?.value || '').toLowerCase();
    const statusFiltro = document.getElementById('filterStatusPagar')?.value || 'todos';

    let filtradas = filtrarPorPeriodo(contasPagar);

    if (termo) {
        filtradas = filtradas.filter(p => p.fornecedor.toLowerCase().includes(termo) || p.descricao.toLowerCase().includes(termo));
    }
    if (statusFiltro !== 'todos') {
        filtradas = filtradas.filter(p => p.status === statusFiltro);
    }

    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Nenhuma conta a pagar encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtradas.map(p => `
        <tr>
            <td>${formatarDataBR(p.vencimento)}</td>
            <td><strong>${p.fornecedor}</strong></td>
            <td>${p.descricao}</td>
            <td class="text-danger font-bold">${formatarMoeda(p.valor)}</td>
            <td><span class="category-badge">${p.categoria}</span></td>
            <td><span class="status ${p.status.toLowerCase()}">${p.status}</span></td>
            <td>${formatarDataBR(p.dataPagamento)}</td>
            <td>
                ${p.status !== 'PAGO' ? `<button class="btn-action btn-success" title="Dar Baixa" onclick="darBaixaPagar('${p.id}')"><i class="fas fa-check"></i></button>` : ''}
                <button class="btn-action btn-secondary" title="Editar" onclick="editarPagar('${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-danger" title="Excluir" onclick="excluirPagar('${p.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderizarContasReceber() {
    const tbody = document.getElementById('tableContasReceber');
    if (!tbody) return;

    const termo = (document.getElementById('searchReceber')?.value || '').toLowerCase();
    const statusFiltro = document.getElementById('filterStatusReceber')?.value || 'todos';

    let filtradas = filtrarPorPeriodo(contasReceber);

    if (termo) {
        filtradas = filtradas.filter(r => r.cliente.toLowerCase().includes(termo) || r.descricao.toLowerCase().includes(termo));
    }
    if (statusFiltro !== 'todos') {
        filtradas = filtradas.filter(r => r.status === statusFiltro);
    }

    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Nenhuma conta a receber encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtradas.map(r => `
        <tr>
            <td>${formatarDataBR(r.vencimento)}</td>
            <td><strong>${r.cliente}</strong></td>
            <td>${r.descricao}</td>
            <td class="text-success font-bold">${formatarMoeda(r.valor)}</td>
            <td><span class="category-badge">${r.categoria}</span></td>
            <td><span class="status ${r.status.toLowerCase()}">${r.status}</span></td>
            <td>${formatarDataBR(r.dataPagamento)}</td>
            <td>
                ${r.status !== 'PAGO' ? `<button class="btn-action btn-success" title="Dar Baixa" onclick="darBaixaReceber('${r.id}')"><i class="fas fa-check"></i></button>` : ''}
                <button class="btn-action btn-secondary" title="Editar" onclick="editarReceber('${r.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-danger" title="Excluir" onclick="excluirReceber('${r.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function salvarContaPagar(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('pagId').value;
    const conta = {
        id: id || Date.now().toString(),
        fornecedor: document.getElementById('pagFornecedor').value.trim(),
        descricao: document.getElementById('pagDescricao').value.trim(),
        valor: parseFloat(document.getElementById('pagValor').value) || 0,
        vencimento: document.getElementById('pagVencimento').value,
        categoria: document.getElementById('pagCategoria').value,
        status: document.getElementById('pagStatus').value,
        dataPagamento: document.getElementById('pagDataPagamento').value,
        tipoPagamento: document.getElementById('pagTipoPagamento').value
    };

    if (id) {
        const idx = contasPagar.findIndex(p => p.id === id);
        if (idx !== -1) contasPagar[idx] = conta;
    } else {
        contasPagar.push(conta);
    }

    const filterStatusP = document.getElementById('filterStatusPagar');
    if (filterStatusP) filterStatusP.value = 'todos';

    salvarDadosLocal();
    fecharModal('modalSaida');
    renderizarTudo();
}

function salvarContaReceber(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('entId').value;
    const conta = {
        id: id || Date.now().toString(),
        cliente: document.getElementById('entCliente').value.trim(),
        descricao: document.getElementById('entDescricao').value.trim(),
        valor: parseFloat(document.getElementById('entValor').value) || 0,
        vencimento: document.getElementById('entVencimento').value,
        categoria: document.getElementById('entCategoria').value,
        status: document.getElementById('entStatus').value,
        dataPagamento: document.getElementById('entDataPagamento').value,
        tipoPagamento: document.getElementById('entTipoPagamento').value
    };

    if (id) {
        const idx = contasReceber.findIndex(r => r.id === id);
        if (idx !== -1) contasReceber[idx] = conta;
    } else {
        contasReceber.push(conta);
    }

    const filterStatusR = document.getElementById('filterStatusReceber');
    if (filterStatusR) filterStatusR.value = 'todos';

    salvarDadosLocal();
    fecharModal('modalEntrada');
    renderizarTudo();
}

function darBaixaPagar(id) {
    const item = contasPagar.find(p => p.id === id);
    if (item) {
        item.status = 'PAGO';
        item.dataPagamento = new Date().toISOString().split('T')[0];
        salvarDadosLocal();
        renderizarTudo();
    }
}

function editarPagar(id) {
    const p = contasPagar.find(item => item.id === id);
    if (!p) return;

    document.getElementById('pagId').value = p.id;
    document.getElementById('pagFornecedor').value = p.fornecedor;
    document.getElementById('pagDescricao').value = p.descricao;
    document.getElementById('pagValor').value = p.valor;
    document.getElementById('pagVencimento').value = p.vencimento;
    document.getElementById('pagCategoria').value = p.categoria;
    document.getElementById('pagStatus').value = p.status;
    document.getElementById('pagDataPagamento').value = p.dataPagamento || '';
    document.getElementById('pagTipoPagamento').value = p.tipoPagamento || 'PIX';

    abrirModal('modalSaida');
}

function excluirPagar(id) {
    if (confirm('Deseja realmente excluir esta conta a pagar?')) {
        contasPagar = contasPagar.filter(p => p.id !== id);
        salvarDadosLocal();
        renderizarTudo();
    }
}

function darBaixaReceber(id) {
    const item = contasReceber.find(r => r.id === id);
    if (item) {
        item.status = 'PAGO';
        item.dataPagamento = new Date().toISOString().split('T')[0];
        salvarDadosLocal();
        renderizarTudo();
    }
}

function editarReceber(id) {
    const r = contasReceber.find(item => item.id === id);
    if (!r) return;

    document.getElementById('entId').value = r.id;
    document.getElementById('entCliente').value = r.cliente;
    document.getElementById('entDescricao').value = r.descricao;
    document.getElementById('entValor').value = r.valor;
    document.getElementById('entVencimento').value = r.vencimento;
    document.getElementById('entCategoria').value = r.categoria;
    document.getElementById('entStatus').value = r.status;
    document.getElementById('entDataPagamento').value = r.dataPagamento || '';
    document.getElementById('entTipoPagamento').value = r.tipoPagamento || 'PIX';

    abrirModal('modalEntrada');
}

function excluirReceber(id) {
    if (confirm('Deseja realmente excluir esta conta a receber?')) {
        contasReceber = contasReceber.filter(r => r.id !== id);
        salvarDadosLocal();
        renderizarTudo();
    }
}

/* CONTROLE DE ESTOQUE */
function renderizarEstoque() {
    const tbody = document.getElementById('tableEstoque');
    if (!tbody) return;

    const termo = (document.getElementById('searchEstoque')?.value || '').toLowerCase();
    const filtroAlerta = document.getElementById('filterAlertaEstoque')?.value || 'todos';

    let filtrados = [...estoque];

    if (termo) {
        filtrados = filtrados.filter(p => p.sku.toLowerCase().includes(termo) || p.nome.toLowerCase().includes(termo));
    }

    if (filtroAlerta === 'alerta') {
        filtrados = filtrados.filter(p => p.qtd <= p.qtdMin && p.qtd > 0);
    } else if (filtroAlerta === 'zerado') {
        filtrados = filtrados.filter(p => p.qtd === 0);
    }

    const patrimonioTotal = estoque.reduce((acc, p) => acc + (p.qtd * p.precoCusto), 0);
    const totalCriticos = estoque.filter(p => p.qtd <= p.qtdMin).length;

    document.getElementById('stkPatrimonioTotal').innerText = formatarMoeda(patrimonioTotal);
    document.getElementById('stkTotalSkus').innerText = estoque.length;
    document.getElementById('stkTotalAlertas').innerText = totalCriticos;

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;">Nenhum produto cadastrado no estoque.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(p => {
        const margemLucro = p.precoCusto > 0 ? (((p.precoVenda - p.precoCusto) / p.precoCusto) * 100).toFixed(1) : 0;
        const totalInvestidoItem = p.qtd * p.precoCusto;
        const isBaixo = p.qtd <= p.qtdMin;

        return `
            <tr>
                <td><strong>${p.sku}</strong></td>
                <td>${p.nome}</td>
                <td><span class="category-badge">${p.categoria}</span></td>
                <td class="${isBaixo ? 'text-danger font-bold' : ''}">${p.qtd} ${isBaixo ? '<i class="fas fa-exclamation-circle"></i>' : ''}</td>
                <td>${p.qtdMin}</td>
                <td>${formatarMoeda(p.precoCusto)}</td>
                <td>${formatarMoeda(p.precoVenda)}</td>
                <td><span class="badge badge-success">+${margemLucro}%</span></td>
                <td><strong>${formatarMoeda(totalInvestidoItem)}</strong></td>
                <td>
                    <button class="btn-action btn-primary" title="Movimentar (+/-)" onclick="abrirModalMovimentacao('${p.id}')"><i class="fas fa-exchange-alt"></i></button>
                    <button class="btn-action btn-secondary" title="Editar" onclick="editarProduto('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-danger" title="Excluir" onclick="excluirProduto('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function salvarProduto(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('prodId').value;
    const prod = {
        id: id || Date.now().toString(),
        sku: document.getElementById('prodSku').value.trim(),
        categoria: document.getElementById('prodCategoria').value.trim(),
        nome: document.getElementById('prodNome').value.trim(),
        qtd: parseInt(document.getElementById('prodQtd').value) || 0,
        qtdMin: parseInt(document.getElementById('prodQtdMin').value) || 0,
        precoCusto: parseFloat(document.getElementById('prodPrecoCusto').value) || 0,
        precoVenda: parseFloat(document.getElementById('prodPrecoVenda').value) || 0
    };

    if (id) {
        const idx = estoque.findIndex(p => p.id === id);
        if (idx !== -1) estoque[idx] = prod;
    } else {
        estoque.push(prod);
    }

    salvarDadosLocal();
    fecharModal('modalProduto');
    renderizarTudo();
}

function editarProduto(id) {
    const p = estoque.find(item => item.id === id);
    if (!p) return;

    document.getElementById('prodId').value = p.id;
    document.getElementById('prodSku').value = p.sku;
    document.getElementById('prodCategoria').value = p.categoria;
    document.getElementById('prodNome').value = p.nome;
    document.getElementById('prodQtd').value = p.qtd;
    document.getElementById('prodQtdMin').value = p.qtdMin;
    document.getElementById('prodPrecoCusto').value = p.precoCusto;
    document.getElementById('prodPrecoVenda').value = p.precoVenda;

    abrirModal('modalProduto');
}

function excluirProduto(id) {
    if (confirm('Deseja realmente remover este item do estoque?')) {
        estoque = estoque.filter(p => p.id !== id);
        salvarDadosLocal();
        renderizarTudo();
    }
}

function abrirModalMovimentacao(id) {
    const p = estoque.find(item => item.id === id);
    if (!p) return;

    document.getElementById('movProdId').value = p.id;
    document.getElementById('movItemInfo').innerText = `Item: ${p.sku} - ${p.nome} (Qtd Atual: ${p.qtd})`;
    abrirModal('modalMovimentacao');
}

function salvarMovimentacaoEstoque(event) {
    if (event) event.preventDefault();
    const id = document.getElementById('movProdId').value;
    const tipo = document.getElementById('movTipo').value;
    const qtd = parseInt(document.getElementById('movQtd').value) || 0;

    const p = estoque.find(item => item.id === id);
    if (p) {
        if (tipo === 'SAIDA' && p.qtd < qtd) {
            alert('Quantidade insuficiente em estoque para esta saída!');
            return;
        }
        p.qtd = tipo === 'ENTRADA' ? p.qtd + qtd : p.qtd - qtd;
        salvarDadosLocal();
        fecharModal('modalMovimentacao');
        renderizarTudo();
    }
}

/* DEMONSTRATIVO DRE */
function renderizarDRE() {
    const elText = document.getElementById('drePeriodoText');
    if (elText) elText.innerText = filtroDataAtivo;

    const receberFiltrado = filtrarPorPeriodo(contasReceber);
    const pagarFiltrado = filtrarPorPeriodo(contasPagar);

    const receitaBruta = receberFiltrado.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    const cmv = pagarFiltrado.filter(p => p.categoria === 'Peças Novas').reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    const lucroBruto = receitaBruta - cmv;
    const despesasOp = pagarFiltrado.filter(p => p.categoria !== 'Peças Novas').reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    const resultadoLiquido = lucroBruto - despesasOp;
    const margemLiquida = receitaBruta > 0 ? ((resultadoLiquido / receitaBruta) * 100).toFixed(1) : 0;

    document.getElementById('dreReceitaBruta').innerText = formatarMoeda(receitaBruta);
    document.getElementById('dreCMV').innerText = `- ${formatarMoeda(cmv)}`;
    document.getElementById('dreLucroBruto').innerText = formatarMoeda(lucroBruto);
    document.getElementById('dreDespesasOp').innerText = `- ${formatarMoeda(despesasOp)}`;
    document.getElementById('dreResultadoLiquido').innerText = formatarMoeda(resultadoLiquido);
    document.getElementById('dreMargemLiquida').innerText = `${margemLiquida}%`;
}

/* EXTENSÃO CHROME & BACKUP */
function lancamentoRapidoExtensao() {
    const tipo = document.getElementById('extTipo').value;
    const pessoa = document.getElementById('extPessoa').value.trim();
    const desc = document.getElementById('extDescricao').value.trim();
    const valor = parseFloat(document.getElementById('extValor').value) || 0;
    const hoje = new Date().toISOString().split('T')[0];

    if (tipo === 'RECEBER') {
        contasReceber.push({
            id: Date.now().toString(),
            cliente: pessoa,
            descricao: desc,
            valor: valor,
            vencimento: hoje,
            categoria: 'Reparos',
            status: 'PENDENTE',
            dataPagamento: '',
            tipoPagamento: 'PIX'
        });
    } else {
        contasPagar.push({
            id: Date.now().toString(),
            fornecedor: pessoa,
            descricao: desc,
            valor: valor,
            vencimento: hoje,
            categoria: 'Custos Fixos',
            status: 'PENDENTE',
            dataPagamento: '',
            tipoPagamento: 'PIX'
        });
    }

    salvarDadosLocal();
    alert('Lançamento efetuado com sucesso!');
    document.getElementById('extPessoa').value = '';
    document.getElementById('extDescricao').value = '';
    document.getElementById('extValor').value = '';
    renderizarTudo();
}

function exportarBackupJSON() {
    const data = { contasPagar, contasReceber, estoque, exportDate: new Date().toISOString() };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ricpower_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}

function importarBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.contasPagar && data.contasReceber && data.estoque) {
                contasPagar = data.contasPagar;
                contasReceber = data.contasReceber;
                estoque = data.estoque;
                salvarDadosLocal();
                renderizarTudo();
                alert('Backup restaurado com sucesso!');
            } else {
                alert('Formato de arquivo JSON inválido.');
            }
        } catch (err) {
            alert('Erro ao processar o arquivo JSON.');
        }
    };
    reader.readAsText(file);
}

function exportarCSV(tipo) {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (tipo === 'pagar') {
        csvContent += "Vencimento;Fornecedor;Descrição;Valor;Categoria;Status\n";
        contasPagar.forEach(p => {
            csvContent += `${p.vencimento};${p.fornecedor};${p.descricao};${p.valor};${p.categoria};${p.status}\n`;
        });
    } else {
        csvContent += "Vencimento;Cliente;Descrição;Valor;Categoria;Status\n";
        contasReceber.forEach(r => {
            csvContent += `${r.vencimento};${r.cliente};${r.descricao};${r.valor};${r.categoria};${r.status}\n`;
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ricpower_${tipo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* MODAIS */
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function abrirModalEntrada() {
    document.getElementById('formEntrada').reset();
    document.getElementById('entId').value = '';
    document.getElementById('entVencimento').value = new Date().toISOString().split('T')[0];
    abrirModal('modalEntrada');
}

function abrirModalSaida() {
    document.getElementById('formSaida').reset();
    document.getElementById('pagId').value = '';
    document.getElementById('pagVencimento').value = new Date().toISOString().split('T')[0];
    abrirModal('modalSaida');
}

function abrirModalProduto() {
    document.getElementById('formProduto').reset();
    document.getElementById('prodId').value = '';
    abrirModal('modalProduto');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
    if (!event.target.closest('.modern-filter-container')) {
        const dropdown = document.getElementById('dateFilterDropdown');
        if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    verificarSessao();
});
