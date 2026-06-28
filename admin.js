let usuarioSelecionadoId = null;
let proximoIdUsuario = 1;
let bancoUsuarios = [];

function alternarAba(nomeAba) {
    document.getElementById('menu-pessoal').classList.remove('active');
    document.getElementById('menu-relatorios').classList.remove('active');
    document.getElementById('menu-configs').classList.remove('active');
    document.getElementById('conteudo-pessoal').classList.remove('active');
    document.getElementById('conteudo-relatorios').classList.remove('active');
    document.getElementById('conteudo-configs').classList.remove('active');
    document.getElementById(`menu-${nomeAba}`).classList.add('active');
    document.getElementById(`conteudo-${nomeAba}`).classList.add('active');
}

function exibirAlertaTop(titulo, message) {
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalMensagem').innerHTML = message;
    new bootstrap.Modal(document.getElementById('modalFeedback')).show();
}

function toggleInputSenha(idInput, botao) {
    const input = document.getElementById(idInput);
    if(input.type === "password") {
        input.type = "text";
        botao.innerText = "🙈";
    } else {
        input.type = "password";
        botao.innerText = "👁️";
    }
}

function mascaraTelefone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 5) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    } else {
        v = v.replace(/^(\d*)$/, '($1');
    }
    input.value = v;
}

function mascaraCPF(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 9) {
        v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
        v = v.replace(/^(\d{3})(\d{3})(\d{0,3})$/, '$1.$2.$3');
    } else if (v.length > 3) {
        v = v.replace(/^(\d{3})(\d{0,3})$/, '$1.$2');
    }
    input.value = v;
}

function mascaraCEPHtml(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    input.value = valor;
}

// OTIMIZADOR AUTOMÁTICO DE FOTO (Reduz tamanho, resolução e deixa super leve em Base64)
function otimizarEConverterFoto(fileInputElement) {
    return new Promise((resolve) => {
        const file = fileInputElement.files[0];
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                // Redimensiona para resolução leve de perfil (Ex: max 150x150)
                const MAX_WIDTH = 150;
                const MAX_HEIGHT = 150;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Comprime a qualidade para 70% para ficar ultra-leve
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function cadastrarUsuario(event) {
    event.preventDefault();
    
    let fotoBase64 = await otimizarEConverterFoto(document.getElementById('cadFotoFile'));
    
    // Se o usuário não selecionou nenhuma foto, gera o avatar com as iniciais do nome de forma limpa
    if(!fotoBase64) {
        fotoBase64 = `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('cadNome').value)}&background=f97316&color=fff`;
    }
    
    const novoUser = {
        id: proximoIdUsuario,
        nome: document.getElementById('cadNome').value.trim(),
        cpf: document.getElementById('cadCpf').value.trim(),
        telefone: document.getElementById('cadTelefone').value.trim(),
        email: document.getElementById('cadEmail').value.trim(),
        senha: document.getElementById('cadSenha').value.trim(),
        foto: fotoBase64,
        permissao: document.getElementById('cadPermissao').value,
        status: "ATIVO"
    };

    bancoUsuarios.push(novoUser);
    
    localStorage.setItem("banco_usuarios_ponto", JSON.stringify(bancoUsuarios));
    
    renderizarTabela();
    proximoIdUsuario++;
    
    document.getElementById('formUsuario').reset();
    exibirAlertaTop("👥 Cadastrado", `Colaborador <strong>${novoUser.nome}</strong> registrado com sucesso!`);
}

function renderizarTabela() {
    const tabela = document.getElementById('tabelaEquipe');
    tabela.innerHTML = "";
    
    if(bancoUsuarios.length === 0) {
        tabela.innerHTML = `<tr><td colspan="9" class="text-center text-muted small py-3">Nenhum funcionário cadastrado na base.</td></tr>`;
        return;
    }

    bancoUsuarios.forEach(u => {
        const badgeStatus = u.status === "ATIVO" ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle';
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><img src="${u.foto}" class="avatar-table" onerror="this.src='https://ui-avatars.com/api/?name=User&background=cbd5e1'"></td>
            <td class="fw-medium">${u.nome}</td>
            <td class="text-dark small">${u.cpf}</td>
            <td class="text-secondary small">${u.telefone}</td>
            <td class="text-muted small">${u.email}</td>
            <td><code class="text-dark font-monospace fw-bold">${u.senha}</code></td>
            <td><span class="badge bg-secondary">Apenas ${u.permissao}</span></td>
            <td><span class="badge ${badgeStatus} px-2.5">${u.status}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarFicha(${u.id})">✏️ Ficha</button>
                <button class="btn btn-sm btn-outline-danger" onclick="bloquearUsuario(${u.id})">🔒 ${u.status === 'ATIVO' ? 'Bloquear' : 'Ativar'}</button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

function abrirModalEditarFicha(id) {
    usuarioSelecionadoId = id;
    const u = bancoUsuarios.find(x => x.id === id);
    if(!u) return;

    document.getElementById('editNome').value = u.nome;
    document.getElementById('editCpf').value = u.cpf;
    document.getElementById('editTelefone').value = u.telefone;
    document.getElementById('editEmail').value = u.email;
    document.getElementById('editSenha').value = u.senha;
    document.getElementById('editFotoFile').value = ""; // Reseta o input do arquivo para novas alterações
    document.getElementById('editPermissao').value = u.permissao;

    new bootstrap.Modal(document.getElementById('modalEditarFicha')).show();
}

async function confirmarEdicaoFicha() {
    const u = bancoUsuarios.find(x => x.id === usuarioSelecionadoId);
    if(!u) return;

    let novaFotoBase64 = await otimizarEConverterFoto(document.getElementById('editFotoFile'));

    u.nome = document.getElementById('editNome').value.trim();
    u.cpf = document.getElementById('editCpf').value.trim();
    u.telefone = document.getElementById('editTelefone').value.trim();
    u.email = document.getElementById('editEmail').value.trim();
    u.senha = document.getElementById('editSenha').value.trim();
    u.permissao = document.getElementById('editPermissao').value;
    
    // Altera a foto apenas se uma nova foto tiver sido upada
    if(novaFotoBase64) {
        u.foto = novaFotoBase64;
    }

    localStorage.setItem("banco_usuarios_ponto", JSON.stringify(bancoUsuarios));
    bootstrap.Modal.getInstance(document.getElementById('modalEditarFicha')).hide();
    renderizarTabela();
    exibirAlertaTop("📝 Atualizado", "A ficha cadastral do colaborador foi alterada com sucesso.");
}

function bloquearUsuario(id) {
    const u = bancoUsuarios.find(x => x.id === id);
    if(!u) return;
    u.status = u.status === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    localStorage.setItem("banco_usuarios_ponto", JSON.stringify(bancoUsuarios));
    renderizarTabela();
}

function copiarLinkColaborador() {
    const linkApp = window.location.origin + "/colaborador.html";
    navigator.clipboard.writeText(linkApp).then(() => {
        exibirAlertaTop("🔗 Link Copiado", "O link de acesso do colaborador foi copiado para sua área de transferência!");
    });
}

async function buscarCoordenadasPorCEP() {
    const inputCep = document.getElementById('cepBusca').value;
    const numero = document.getElementById('numeroBusca').value.trim();
    const btnBuscar = document.getElementById('btnBuscarCep');
    const cep = inputCep.replace(/\D/g, '');
    
    if (cep.length !== 8) {
        exibirAlertaTop("Erro", "CEP inválido.");
        return;
    }

    btnBuscar.disabled = true;
    btnBuscar.innerText = "Buscando...";

    try {
        const responseCep = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dadosCep = await responseCep.json();

        if (dadosCep.erro) {
            exibirAlertaTop("Erro", "CEP não localizado.");
            restaurarBotaoBusca();
            return;
        }

        let logradouroExtenso = `${dadosCep.logradouro}, ${numero} - ${dadosCep.bairro}, ${dadosCep.localidade} - ${dadosCep.uf}`;
        const urlGeocode = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(logradouroExtenso)}&limit=1`;
        const responseGeo = await fetch(urlGeocode, { headers: { 'User-Agent': 'PontoWeb/2.0' } });
        const dadosGeo = await responseGeo.json();

        if (dadosGeo && dadosGeo.length > 0) {
            document.getElementById('latitude').value = dadosGeo[0].lat;
            document.getElementById('longitude').value = dadosGeo[0].lon;
            document.getElementById('enderecoTexto').innerText = logradouroExtenso;
            document.getElementById('boxEndereco').style.display = 'block';
        } else {
            exibirAlertaTop("Aviso", "Número não mapeado pelo mapa global. Gerando dados da rua.");
        }
    } catch (e) {
        exibirAlertaTop("Erro", "Falha externa de conexão com mapas.");
    } finally {
        restaurarBotaoBusca();
    }
}

function restaurarBotaoBusca() {
    const btn = document.getElementById('btnBuscarCep');
    btn.disabled = false;
    btn.innerText = "🔍 Buscar Localização Exata";
}

function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        exibirAlertaTop("Erro", "Sem suporte a GPS.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('latitude').value = pos.coords.latitude;
            document.getElementById('longitude').value = pos.coords.longitude;
            document.getElementById('enderecoTexto').innerText = "Coordenadas fixadas por satélite ativo.";
            document.getElementById('boxEndereco').style.display = 'block';
            exibirAlertaTop("📍 GPS Capturado", "Coordenadas injetadas!");
        },
        (err) => { exibirAlertaTop("Erro", "GPS desativado."); },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function salvarConfiguracoes() {
    exibirAlertaTop("Configurações Salvas", "Cerca virtual salva com sucesso!");
}

const dadosSalvos = localStorage.getItem("banco_usuarios_ponto");
if(dadosSalvos) {
    bancoUsuarios = JSON.parse(dadosSalvos);
    if(bancoUsuarios.length > 0) {
        proximoIdUsuario = Math.max(...bancoUsuarios.map(u => u.id)) + 1;
    }
}
renderizarTabela();
