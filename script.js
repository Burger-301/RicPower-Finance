// CONFIGURAÇÃO DO FIREBASE COM AS SUAS CHAVES REAIS
const firebaseConfig = {
    apiKey: "AIzaSyAMIo-e1IQVvoVNvHFjyCvQ3mpmA8XpEZU",
    authDomain: "ricpower-finance-4312b.firebaseapp.com",
    projectId: "ricpower-finance-4312b",
    storageBucket: "ricpower-finance-4312b.firebasestorage.app",
    messagingSenderId: "632169254200",
    appId": "1:632169254200:web:776e49224d4f61bc2e05cd"
};

// ESTADO GLOBAL DOS DADOS
let contasPagar = JSON.parse(localStorage.getItem('ricpower_pagar')) || [
    { id: '1', data: '2026-01-15', pessoa: 'LOJA DE ROUPA', descricao: 'FATURA DO CARTÃO', valor: 171.35, status: 'ATRASADO', tipo: 'PIX', centro: 'PESSOAL' },
    { id: '2', data: '2026-01-20', pessoa: 'IMOBILIARIA', descricao: 'FINANCIAMENTO', valor: 1500.00, status: 'PAGO', dataPago: '2026-01-01', tipo: 'TRANSFERENCIA', centro: 'ADMINISTRATIVO' }
];

let contasReceber = JSON.parse(localStorage.getItem('ricpower_receber')) || [
    { id: '1', data: '2026-01-15', pessoa: 'LOJA DE ROUPA', descricao: 'FATURA DO CARTÃO', valor: 171.35, status: 'ATRASADO', tipo: 'PIX', centro: 'PESSOAL' },
    { id: '2', data: '2026-01-20', pessoa: 'IMOBILIARIA', descricao: 'FINANCIAMENTO', valor: 1500.00, status: 'PAGO', dataPago: '2026-01-01', tipo: 'TRANSFERENCIA', centro: 'ADMINISTRATIVO' },
    { id: '3', data: '2026-01-06', pessoa: 'CLIENTE ESPECIAL', descricao: 'PRESTAÇÃO DE SERVIÇO', valor: 1000.00, status: 'ATRASADO', tipo: 'PIX', centro: 'COMERCIAL' }
];

let estoque = JSON.parse(localStorage.getItem('ricpower_estoque')) || [
    { id: '1', sku: 'PEC-001', nome: 'Placa de Circuito RIC-300', qtd: 5, min: 2, custo: 40.00, venda: 120.00 },
    { id: '2', sku: 'PEC-002', nome: 'Fonte Chaveada 12V', qtd: 1, min: 3, custo: 80.00, venda: 180.00 }
];

let chartFluxo = null;
let chartCategoria = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
    renderAll();
});

// AUTENTICAÇÃO LOCAL & DEMO
function checkAuthStatus() {
    const isLogged = localStorage.getItem('ricpower_logged');
    const loginView = document.getElementById('loginView');
    const appView = document.getElementById('appView');

    if (isLogged === 'true') {
        if (loginView) loginView.classList.add('hidden');
        if (appView) appView.classList.remove('hidden');
    } else {
        if (loginView) loginView.classList.remove('hidden');
        if (appView) appView.classList.add('hidden');
    }
}

function handleLogin(e) {
    if (e) e.preventDefault();
    localStorage.setItem('ricpower_logged', 'true');
    checkAuthStatus();
    renderAll();
}

function fillDemo() {
    document.getElementById('email').value = 'admin@richard.com';
    document.getElementById('password').value = 'admin123';
}

function handleLogout() {
    localStorage.removeItem('ricpower_logged');
    checkAuthStatus();
}

// NAVEGAÇÃO DE ABAS
function setupEventListeners() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
            link.parentElement.classList.add('active');

            const tabId = link.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
            const activeTab = document.getElementById(tabId);
            if (activeTab) activeTab.classList.remove('hidden');

            renderAll();
        });
    });
}

// FORMATADORES
function formatMoney(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

// ATUALIZAÇÃO E RENDERS
function renderAll() {
    saveToStorage();
    renderKPIs();
    renderCharts();
    renderTables();
    renderDRE();
}

function saveToStorage() {
    localStorage.setItem('ricpower_pagar', JSON.stringify(contasPagar));
    localStorage.setItem('ricpower_receber', JSON.stringify(contasReceber));
    localStorage.setItem('ricpower_estoque', JSON.stringify(estoque));
}

// KPIS
function renderKPIs() {
    const totalPagar = contasPagar.reduce((acc, c) => acc + Number(c.valor), 0);
    const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0);
    const saldo = totalReceber - totalPagar;
    const valEstoque = estoque.reduce((acc, e) => acc + (Number(e.qtd) * Number(e.custo)), 0);

    const elPagar = document.getElementById('kpiPagar');
    const elReceber = document.getElementById('kpiReceber');
    const elSaldo = document.getElementById('kpiSaldo');
    const elEstoque = document.getElementById('kpiEstoque');

    if (elPagar) elPagar.innerText = formatMoney(totalPagar);
    if (elReceber) elReceber.innerText = formatMoney(totalReceber);
    if (elSaldo) elSaldo.innerText = formatMoney(saldo);
    if (elEstoque) elEstoque.innerText = formatMoney(valEstoque);
}

// GRÁFICOS
function renderCharts() {
    const ctx1 = document.getElementById('chartFluxo');
    const ctx2 = document.getElementById('chartCategoria');

    if (!ctx1 || !ctx2) return;

    const totalPagar = contasPagar.reduce((acc, c) => acc + Number(c.valor), 0);
    const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0);

    if (chartFluxo) chartFluxo.destroy();
    chartFluxo = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Entradas (A Receber)', 'Saídas (A Pagar)'],
            datasets: [{
                data: [totalReceber, totalPagar],
                backgroundColor: ['#2ecc71', '#e74c3c']
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    if (chartCategoria) chartCategoria.destroy();
    chartCategoria = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Custos Fixos', 'Peças & Equipamentos', 'Comercial'],
            datasets: [{
                data: [1500, 171.35, 1000],
                backgroundColor: ['#FFD500', '#252525', '#e74c3c']
            }]
        },
        options: { responsive: true }
    });
}

// TABELAS
function renderTables() {
    // Tabela Contas a Pagar
    const tbodyPagar = document.getElementById('tbodyPagar');
    if (tbodyPagar) {
        tbodyPagar.innerHTML = contasPagar.map(c => `
            <tr>
                <td>${c.data}</td>
                <td><b>${c.pessoa}</b></td>
                <td>${c.descricao}</td>
                <td>${formatMoney(c.valor)}</td>
                <td><span class="badge badge-${c.status.toLowerCase()}">${c.status}</span></td>
                <td>${c.centro}</td>
                <td class="actions">
                    <i class="fas fa-trash" onclick="deleteItem('pagar', '${c.id}')"></i>
                </td>
            </tr>
        `).join('');
    }

    // Tabela Contas a Receber
    const tbodyReceber = document.getElementById('tbodyReceber');
    if (tbodyReceber) {
        tbodyReceber.innerHTML = contasReceber.map(c => `
            <tr>
                <td>${c.data}</td>
                <td><b>${c.pessoa}</b></td>
                <td>${c.descricao}</td>
                <td>${formatMoney(c.valor)}</td>
                <td><span class="badge badge-${c.status.toLowerCase()}">${c.status}</span></td>
                <td>${c.centro}</td>
                <td class="actions">
                    <i class="fas fa-trash" onclick="deleteItem('receber', '${c.id}')"></i>
                </td>
            </tr>
        `).join('');
    }

    // Tabela Estoque
    const tbodyEstoque = document.getElementById('tbodyEstoque');
    if (tbodyEstoque) {
        tbodyEstoque.innerHTML = estoque.map(e => `
            <tr>
                <td><code>${e.sku}</code></td>
                <td><b>${e.nome}</b></td>
                <td><span style="color:${e.qtd <= e.min ? 'red' : 'green'}; font-weight:bold">${e.qtd}</span></td>
                <td>${formatMoney(e.custo)}</td>
                <td>${formatMoney(e.venda)}</td>
                <td>${formatMoney(e.qtd * e.custo)}</td>
                <td class="actions">
                    <i class="fas fa-trash" onclick="deleteItem('estoque', '${e.id}')"></i>
                </td>
            </tr>
        `).join('');
    }
}

// EXCLUIR ITEM
function deleteItem(type, id) {
    if (type === 'pagar') contasPagar = contasPagar.filter(i => i.id !== id);
    if (type === 'receber') contasReceber = contasReceber.filter(i => i.id !== id);
    if (type === 'estoque') estoque = estoque.filter(i => i.id !== id);
    renderAll();
}

// DRE
function renderDRE() {
    const revBruta = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0);
    const custoPecas = estoque.reduce((acc, e) => acc + (Number(e.qtd) * Number(e.custo)), 0);
    const despesas = contasPagar.reduce((acc, c) => acc + Number(c.valor), 0);
    const lucroBruto = revBruta - custoPecas;
    const lucroLiquido = lucroBruto - despesas;

    const elDRE = document.getElementById('dreContent');
    if (elDRE) {
        elDRE.innerHTML = `
            <div class="dre-row"><span>Receita Bruta Total</span> <b>${formatMoney(revBruta)}</b></div>
            <div class="dre-row"><span>(-) Custos de Peças (Estoque)</span> <b style="color:red">${formatMoney(custoPecas)}</b></div>
            <div class="dre-row total"><span>(=) Lucro Bruto</span> <b>${formatMoney(lucroBruto)}</b></div>
            <div class="dre-row"><span>(-) Despesas Operacionais / Fixas</span> <b style="color:red">${formatMoney(despesas)}</b></div>
            <div class="dre-row total"><span>(=) Lucro Líquido Final</span> <b style="color:${lucroLiquido >= 0 ? 'green' : 'red'}">${formatMoney(lucroLiquido)}</b></div>
        `;
    }
}

// EXPORTAÇÕES E IMPORTS
function exportDataJSON() {
    const data = { contasPagar, contasReceber, estoque };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup_ricpower.json';
    a.click();
}
