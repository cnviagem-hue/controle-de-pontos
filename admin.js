/**
 * Aplica máscara de CEP em tempo de digitação (XXXXX-XXX)
 */
function mascaraCEP(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) {
        valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    input.value = valor;
}

/**
 * Faz a busca híbrida via ViaCEP + OpenStreetMap Nominatim
 */
async function buscarCoordenadasPorCEP() {
    const inputCep = document.getElementById('cepBusca').value;
    const numero = document.getElementById('numeroBusca').value.trim();
    const btnBuscar = document.getElementById('btnBuscarCep');
    
    // Limpa caracteres especiais do CEP
    const cep = inputCep.replace(/\D/g, '');
    
    if (cep.length !== 8) {
        alert("Por favor, informe um CEP válido contendo 8 algarismos.");
        return;
    }

    // Altera o estado do botão para indicar processamento
    btnBuscar.disabled = true;
    btnBuscar.innerText = "Consultando rotas e mapas...";

    try {
        // Passo 1: Busca o endereço textual com base no CEP no serviço ViaCEP
        const responseCep = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dadosCep = await responseCep.json();

        if (dadosCep.erro) {
            alert("CEP não encontrado nas bases de dados dos Correios.");
            restaurarBotaoBusca();
            return;
        }

        // Constrói a consulta de localização da maneira mais descritiva possível
        let enderecoFormatado = `${dadosCep.logradouro}`;
        if (numero && numero.toLowerCase() !== 's/n') {
            enderecoFormatado += `, ${numero}`;
        }
        enderecoFormatado += ` - ${dadosCep.bairro}, ${dadosCep.localidade} - ${dadosCep.uf}, ${dadosCep.cep}, Brasil`;

        // Passo 2: Executa o Geocoding (Conversão de Texto para Coordenadas Lat/Lng) via Nominatim
        const urlGeocode = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoFormatado)}&limit=1`;
        
        const responseGeo = await fetch(urlGeocode, {
            headers: {
                'User-Agent': 'SistemaPontoWeb/2.0 (contato@pontoweb.com.br)'
            }
        });
        const dadosGeo = await responseGeo.json();

        if (dadosGeo && dadosGeo.length > 0) {
            // Sucesso absoluto: Encontrou com o número inserido
            const localizacaoExata = dadosGeo[0];
            document.getElementById('latitude').value = localizacaoExata.lat;
            document.getElementById('longitude').value = localizacaoExata.lon;
            
            exibirPainelEndereco(enderecoFormatado);
        } else {
            // Fallback: Tenta buscar sem o número (pelo meio da rua) se o número exato não estiver indexado
            console.warn("A numeração exata falhou no mapa. Tentando aproximação pelo logradouro...");
            const urlFallback = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${dadosCep.logradouro}, ${dadosCep.localidade} - ${dadosCep.uf}, Brasil`)}&limit=1`;
            
            const responseFallback = await fetch(urlFallback, { headers: { 'User-Agent': 'SistemaPontoWeb/2.0' } });
            const dadosFallback = await responseFallback.json();

            if (dadosFallback && dadosFallback.length > 0) {
                document.getElementById('latitude').value = dadosFallback[0].lat;
                document.getElementById('longitude').value = dadosFallback[0].lon;
                
                const endereçoAproximado = `${dadosCep.logradouro}, (Número aproximado) - ${dadosCep.bairro} - ${dadosCep.localidade}`;
                exibirPainelEndereco(endereçoAproximado);
                alert("Aviso: Mapeamos a rua com sucesso, mas a numeração exata não consta nos mapas globais. A coordenada foi fixada no centro da via pública.");
            } else {
                alert("Não foi possível gerar as coordenadas automáticas para este CEP. Insira os valores ou use o GPS nativo.");
            }
        }

    } catch (error) {
        console.error("Erro no processamento da geolocalização:", error);
        alert("O serviço de mapas está temporariamente instável. Caso necessário, digite as coordenadas manualmente.");
    } finally {
        restaurarBotaoBusca();
    }
}

/**
 * Exibe a caixinha verde informativa de endereço idêntica à visualizada na imagem original
 */
function exibirPainelEndereco(texto) {
    const box = document.getElementById('boxEndereco');
    const boxTexto = document.getElementById('enderecoTexto');
    boxTexto.innerText = texto;
    box.style.display = 'block';
}

/**
 * Restaura o estado visual padrão do botão de pesquisa
 */
function restaurarBotaoBusca() {
    const btnBuscar = document.getElementById('btnBuscarCep');
    btnBuscar.disabled = false;
    btnBuscar.innerText = "🔍 Buscar Localização Exata e Gerar Lat/Lng";
}

/**
 * Captura as coordenadas brutas via Hardware GPS do Usuário Administrador
 */
function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        alert("Geolocalização nativa não suportada ou desativada pelo seu navegador.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('latitude').value = position.coords.latitude;
            document.getElementById('longitude').value = position.coords.longitude;
            exibirPainelEndereco("Localização estabelecida diretamente via receptor de satélite / GPS do dispositivo.");
            alert("Coordenadas obtidas via hardware com sucesso!");
        },
        (error) => {
            console.error(error);
            alert("Falha ao acessar o GPS interno. Verifique as permissões de privacidade do seu navegador.");
        },
        { enableHighAccuracy: true, timeout: 12000 }
    );
}

/**
 * Coleta os dados configurados e simula a requisição de salvamento no backend
 */
function salvarConfiguracoes() {
    const config = {
        nomeEmpresa: document.getElementById('nomeEmpresa').value,
        latitude: document.getElementById('latitude').value,
        longitude: document.getElementById('longitude').value,
        raioTolerancia: document.getElementById('raioTolerancia').value
    };

    if (!config.latitude || !config.longitude) {
        alert("Por favor, preencha a Latitude e a Longitude antes de salvar.");
        return;
    }

    console.log("Payload pronto para envio:", config);
    
    // Aqui entra o seu código de comunicação com banco de dados/API, ex:
    // fetch('/api/empresa/config', { method: 'POST', body: JSON.stringify(config) })

    alert("Configurações atualizadas e cerca de segurança salva com sucesso!");
}
