// ==========================================
// CONFIGURAÇÃO DOS MENUS DE NAVEGAÇÃO (SPA)
// ==========================================
const btnCadastro = document.getElementById('menu-cadastro');
const btnRelatorios = document.getElementById('menu-relatorios');
const btnConfig = document.getElementById('menu-config');
const btnSair = document.getElementById('btnSair');

const liCadastro = document.getElementById('li-cadastro');
const liRelatorios = document.getElementById('li-relatorios');
const liConfig = document.getElementById('li-config');

const boxCadastro = document.getElementById('sec-cadastro');
const boxRelatorios = document.getElementById('sec-relatorios');
const boxConfig = document.getElementById('sec-config');
const txtTitulo = document.getElementById('titulo-pagina');

function alternarTela(telaVisivel, liAtivo, textoTitulo) {
    if (boxCadastro) boxCadastro.style.display = 'none';
    if (boxRelatorios) boxRelatorios.style.display = 'none';
    if (boxConfig) boxConfig.style.display = 'none';
    
    if (liCadastro) liCadastro.classList.remove('active');
    if (liRelatorios) liRelatorios.classList.remove('active');
    if (liConfig) liConfig.classList.remove('active');

    if (telaVisivel) telaVisivel.style.display = 'block';
    if (liAtivo) liAtivo.classList.add('active');
    if (txtTitulo) txtTitulo.textContent = textoTitulo;
}

if (btnCadastro) {
    btnCadastro.onclick = function(e) {
        e.preventDefault();
        alternarTela(boxCadastro, liCadastro, 'Gestão de Pessoas');
    };
}

if (btnRelatorios) {
    btnRelatorios.onclick = function(e) {
        e.preventDefault();
        alternarTela(boxRelatorios, liRelatorios, 'Relatórios e Fechamento');
    };
}

if (btnConfig) {
    btnConfig.onclick = function(e) {
        e.preventDefault();
        alternarTela(boxConfig, liConfig, 'Configurações do Sistema');
    };
}

if (btnSair) {
    btnSair.onclick = function(e) {
        e.preventDefault();
        window.location.href = 'index.html';
    };
}

// ==========================================
// FUNÇÃO: CAPTURAR GPS ATUAL AUTOMATICAMENTE
// ==========================================
const btnCapturarGps = document.getElementById('btnCapturarGps');
if (btnCapturarGps) {
    btnCapturarGps.onclick = function() {
        if (!navigator.geolocation) {
            alert("Seu navegador não suporta geolocalização.");
            return;
        }
        btnCapturarGps.textContent = "⌛ Capturando...";
        navigator.geolocation.getCurrentPosition(function(posicao) {
            document.getElementById('latEmpresa').value = posicao.coords.latitude;
            document.getElementById('lngEmpresa').value = posicao.coords.longitude;
            btnCapturarGps.textContent = "📍 Obter Localização Atual";
        }, function(erro) {
            alert("Erro ao obter localização. Ative o GPS nas configurações do seu aparelho.");
            btnCapturarGps.textContent = "📍 Obter Localização Atual";
        });
    };
}
