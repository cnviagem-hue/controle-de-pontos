// Controle de estado dinâmico dos modais e usuários em memória
let usuarioSelecionadoId = null;
let proximoIdUsuario = 2;

/**
 * Alterna as abas visuais do painel administrativo
 */
function alternarAba(nomeAba) {
    // Remove classe ativa de todos os botões do menu lateral
    document.getElementById('menu-pessoal').classList.remove('active');
    document.getElementById('menu-relatorios').classList.remove('active');
    document.getElementById('menu-configs').classList.remove('active');

    // Oculta todas as seções de conteúdo
    document.getElementById('conteudo-pessoal').classList.remove('active');
    document.getElementById('conteudo-relatorios').classList.remove('active');
    document.getElementById('conteudo-configs').classList.remove('active');

    // Ativa o botão e a seção correspondente
    document.getElementById(`menu-${nomeAba}`).classList.add('active');
    document.getElementById(`conteudo-${nomeAba}`).classList.add('active');
}

/**
 * Exibe um modal Bootstrap estilizado de forma assíncrona substituindo o alert antigo
 */
function exibirAlertaTop(titulo, mensagem) {
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalMensagem').innerHTML = mensagem;
    
    const elementoModal = document.getElementById('modalFeedback');
    const modalBootstrap = new bootstrap.Modal(elementoModal);
    modalBootstrap.show();
}

/**
 * Executa a cópia do link do colaborador para a área de transferência
 */
function copiarLinkColaborador() {
    const linkApp = "https://controle-de-pontos-phi.vercel.app/colaborador.html";
    
    navigator.clipboard.writeText(linkApp).then(() => {
        exibirAlertaTop(
            "🔗 Link Copiado com Sucesso!", 
            `O link do aplicativo foi transferido para a sua área de transferência.<br><br><strong>Agora é só enviar no WhatsApp do colaborador:</strong><br><span class='text-primary small'>${linkApp}</span>`
        );
    }).catch(err => {
        console.error("Erro ao copiar link: ", err);
        exibirAlertaTop("Erro", "Não foi possível copiar automaticamente. Selecione e copie manualmente o endereço do colaborador.");
    });
}

/**
 * Cadastra um novo usuário adicionando-o em tempo de execução na tabela
 */
function cadastrarUsuario(event) {
    event.preventDefault();
    
    const nome = document.getElementById('cadNome').value;
    const email = document.getElementById('cadEmail').value;
    const permissao = document.getElementById('cadPermissao').value;

    const tabela = document.getElementById('tabelaEquipe');
    const novaLinha = document.createElement('tr');
    novaLinha.id = `linha-${proximoIdUsuario}`;
    
    novaLinha.innerHTML = `
        <td class="fw-medium">${nome}</td>
        <td class="text-muted">${email}</td>
        <td><span class="badge bg-secondary">Apenas ${permissao}</span></td>
        <td><span class="badge bg-success-subtle text-success border border-success-subtle px-2.5">ATIVO</span></td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalAjusteDispositivo(${proximoIdUsuario}, '${nome}')">📝 Disp</button>
            <button class="btn btn-sm btn-outline-danger" onclick="bloquearUsuario(${proximoIdUsuario})">🔒 Bloquear</button>
        </td>
    `;
    
    tabela.appendChild(novaLinha);
    proximoIdUsuario++;
    
    // Reseta o formulário e gera feedback visual
    document.getElementById('formUsuario').reset();
    exibirAlertaTop("👥 Usuário Adicionado", `O colaborador <strong>${nome}</strong> foi registrado no ecossistema e já está apto a bater ponto.`);
}

/**
 * Abre o modal personalizado para troca de dispositivo
 */
function abrirModalAjusteDispositivo(id, nome) {
    usuarioSelecionadoId = id;
    document.getElementById('nomeUsuarioModal').innerText = nome;
    
    const elementoModal = document.getElementById('modalDispositivo');
    const modalBootstrap = new bootstrap.Modal(elementoModal);
    modalBootstrap.show();
}

/**
 * Consolida a alteração de dispositivo na linha correspondente da tabela
 */
function confirmarTrocaDispositivo() {
    if (!usuarioSelecionadoId) return;

    const novoDispositivo = document.getElementById('selectNovoDispositivo').value;
    const linha = document.getElementById(`linha-${usuarioSelecionadoId}`);
    
    if (linha) {
        const celulaPermissao = linha.cells[2];
        celulaPermissao.innerHTML = `<span class="badge bg-secondary">Apenas ${novoDispositivo}</span>`;
        
        // Fecha o modal de forma limpa através da instância do Bootstrap
        const elementoModal = document.getElementById('modalDispositivo');
        const modalInstance = bootstrap.Modal.getInstance(elementoModal);
        modalInstance.hide();
        
        exibirAlertaTop("⚙️ Dispositivo Atualizado", "As regras de hardware para autenticação do colaborador foram modificadas com sucesso.");
    }
}

/**
 * Altera visualmente o status do colaborador para bloqueado
 */
function bloquearUsuario(id) {
    const linha = document.getElementById(`linha-${id}`);
    if (linha) {
        const celulaStatus = linha.cells[3];
        celulaStatus.innerHTML = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2.5">BLOQUEADO</span>`;
        exibirAlertaTop("🔒 Usuário Bloqueado", "O acesso do funcionário selecionado foi revogado temporariamente das plataformas.");
    }
}

/**
 * Mascara a digitação do CEP
 */
function mascaraCEP(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) {
        valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    input.value = valor;
}

/**
 * Consulta CEP e gera Geocodificação Automática
 */
async function buscarCoordenadasPorCEP() {
    const inputCep = document.getElementById('cepBusca').value;
    const numero = document.getElementById('numeroBusca').value.trim();
    const btnBuscar = document.getElementById('btnBuscarCep');
    const cep = inputCep.replace(/\D/g, '');
    
    if (cep.length !== 8) {
        exibirAlertaTop("Erro de Validação", "Por favor, insira um CEP válido contendo 8 dígitos numéricos.");
        return;
    }

    btnBuscar.disabled = true;
    btnBuscar.innerText = "Consultando barramentos de mapas globais...";

    try {
        const responseCep = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dadosCep = await responseCep.json();

        if (dadosCep.erro) {
            exibirAlertaTop("Não Encontrado", "O CEP inserido não retornou registros válidos na base postal indexada.");
            restaurarBotaoBusca();
            return;
        }

        let logradouroExtenso = `${dadosCep.logradouro}`;
        if (numero && numero.toLowerCase() !== 's/n') {
            logradouroExtenso += `, ${numero}`;
        }
        logradouroExtenso += ` - ${dadosCep.bairro}, ${dadosCep.localidade} - ${dadosCep.uf}, ${dadosCep.cep}, Brasil`;

        const urlGeocode = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(logradouroExtenso)}&limit=1`;
        const responseGeo = await fetch(urlGeocode, { headers: { 'User-Agent': 'SistemaPontoWeb/2.0' } });
        const dadosGeo = await responseGeo.json();

        if (dadosGeo && dadosGeo.length > 0) {
            document.getElementById('latitude').value = dadosGeo[0].lat;
            document.getElementById('longitude').value = dadosGeo[0].lon;
            exibirPainelEndereco(logradouroExtenso);
        } else {
            // Tentativa aproximada
            const urlFallback = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${dadosCep.logradouro}, ${dadosCep.localidade}, Brasil`)}&limit=1`;
            const responseFallback = await fetch(urlFallback, { headers: { 'User-Agent': 'SistemaPontoWeb/2.0' } });
            const dadosFallback = await responseFallback.json();

            if (dadosFallback && dadosFallback.length > 0) {
                document.getElementById('latitude').value = dadosFallback[0].lat;
                document.getElementById('longitude').value = dadosFallback[0].lon;
                exibirPainelEndereco(`${dadosCep.logradouro} (Número aproximado), ${dadosCep.localidade}`);
                exibirAlertaTop("Aviso de Aproximação", "A rua foi encontrada, porém a numeração específica não está registrada nos mapas públicos. Fixamos a coordenada no centro da via pública.");
            } else {
                exibirAlertaTop("Erro de Mapa", "Não conseguimos gerar a latitude e longitude automáticas para este logradouro. Insira os valores manualmente.");
            }
        }
    } catch (e) {
        console.error(e);
        exibirAlertaTop("Serviço Instável", "Houve um erro técnico temporário ao se comunicar com os servidores do OpenStreetMap.");
    } finally {
        restaurarBotaoBusca();
    }
}

function exibirPainelEndereco(texto) {
    const box = document.getElementById('boxEndereco');
    const boxTexto = document.getElementById('enderecoTexto');
    boxTexto.innerText = texto;
    box.style.display = 'block';
}

function restaurarBotaoBusca() {
    const btn = document.getElementById('btnBuscarCep');
    btn.disabled = false;
    btn.innerText = "🔍 Buscar Localização Exata e Gerar Lat/Lng";
}

function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        exibirAlertaTop("Erro de Recursos", "Seu navegador não possui ou está bloqueando os barramentos de hardware de GPS.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('latitude').value = pos.coords.latitude;
            document.getElementById('longitude').value = pos.coords.longitude;
            exibirPainelEndereco("Localização obtida em tempo de execução via hardware ativo.");
            exibirAlertaTop("📍 GPS Capturado", "Coordenadas exatas injetadas no formulário com sucesso!");
        },
        (err) => {
            exibirAlertaTop("Permissão Negada", "O acesso ao GPS foi rejeitado. Libere o cadeado na barra de endereços.");
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function salvarConfiguracoes() {
    const lat = document.getElementById('latitude').value;
    const lng = document.getElementById('longitude').value;
    
    if (!lat || !lng) {
        exibirAlertaTop("Dados Incompletos", "Por favor, defina a latitude e longitude antes de persistir.");
        return;
    }
    
    exibirAlertaTop("Configurações Salvas", "Configurações atualizadas e cerca de segurança salva com sucesso!");
}
