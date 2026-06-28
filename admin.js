<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Admin - Ponto Web</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; font-family: 'Segoe UI', Arial, sans-serif; }
        .sidebar { background-color: #0f172a; min-height: 100vh; color: #94a3b8; padding: 20px 10px; position: fixed; width: inherit; max-width: inherit; }
        .sidebar .nav-link { color: #94a3b8; margin-bottom: 10px; border-radius: 6px; padding: 12px 15px; display: flex; align-items: center; gap: 10px; text-decoration: none; cursor: pointer; transition: all 0.2s; }
        .sidebar .nav-link:hover { background-color: #1e293b; color: #fff; }
        .sidebar .nav-link.active { background-color: #1e293b; color: #f97316; font-weight: 600; }
        .main-content { padding: 40px 20px; margin-left: 20px; }
        .card-custom { background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); padding: 35px; border: 1px solid #e2e8f0; }
        .section-title { font-size: 1.15rem; font-weight: 600; color: #1e293b; margin-bottom: 25px; border-left: 4px solid #3b82f6; padding-left: 12px; }
        .endereco-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin-top: 15px; display: none; }
        .endereco-titulo { color: #15803d; font-weight: bold; font-size: 0.9rem; margin-bottom: 3px; }
        .btn-buscar { background-color: #2563eb; color: white; }
        .btn-buscar:hover { background-color: #1d4ed8; color: white; }
        .btn-copiar { background-color: #ea580c; color: white; border: none; width: 100%; padding: 12px; border-radius: 6px; font-weight: 500; margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; }
        .btn-copiar:hover { background-color: #c2410c; color: white; }
        .tab-content-section { display: none; }
        .tab-content-section.active { display: block; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
        <div class="col-md-3 col-lg-2 p-0">
            <div class="sidebar w-100 px-3">
                <h5 class="text-white px-3 mb-4 mt-2 fw-bold">Ponto Web</h5>
                <nav class="nav flex-column">
                    <a class="nav-link active" id="menu-pessoal" onclick="alternarAba('pessoal')">👥 Pessoal</a>
                    <a class="nav-link" id="menu-relatorios" onclick="alternarAba('relatorios')">📊 Relatórios</a>
                    <a class="nav-link" id="menu-configs" onclick="alternarAba('configs')">⚙️ Configs</a>
                </nav>
                <button class="btn-copiar" onclick="copiarLinkColaborador()">
                    🔗 Copiar Link do App
                </button>
            </div>
        </div>

        <div class="col-md-9 col-lg-10 main-content">
            <div class="container" style="max-width: 900px;">
                
                <div id="conteudo-pessoal" class="tab-content-section active">
                    <div class="card-custom mb-4">
                        <div class="section-title">Gestão de Pessoal - Novo Usuário</div>
                        <form id="formUsuario" onsubmit="cadastrarUsuario(event)">
                            <div class="row g-3">
                                <div class="col-12">
                                    <label class="form-label fw-medium">Nome Completo</label>
                                    <input type="text" id="cadNome" placeholder="Ex: João da Silva" class="form-control" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-medium">E-mail de Acesso</label>
                                    <input type="email" id="cadEmail" placeholder="joao@empresa.com" class="form-control" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-medium">Senha Inicial</label>
                                    <input type="password" id="cadSenha" placeholder="Mínimo 6 dígitos" class="form-control" required>
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-medium">Tipo de Acesso / Permissão</label>
                                    <select id="cadPermissao" class="form-select">
                                        <option value="Celular">Colaborador (Apenas Celular)</option>
                                        <option value="PC">Colaborador (Apenas PC)</option>
                                        <option value="Ambos">Ambos (Celular e PC)</option>
                                    </select>
                                </div>
                                <div class="col-12 mt-4">
                                    <button type="submit" class="btn btn-success w-100 py-2 fw-medium">➕ Cadastrar Usuário</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="card-custom">
                        <div class="section-title">Equipe Cadastrada</div>
                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead class="table-light">
                                    <tr>
                                        <th>Nome</th>
                                        <th>E-mail</th>
                                        <th>Permissão</th>
                                        <th>Status</th>
                                        <th class="text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="tabelaEquipe">
                                    <tr id="linha-1">
                                        <td class="fw-medium">João da Silva</td>
                                        <td class="text-muted">joao@empresa.com</td>
                                        <td><span class="badge bg-secondary">Apenas Celular</span></td>
                                        <td><span class="badge bg-success-subtle text-success border border-success-subtle px-2.5">ATIVO</span></td>
                                        <td class="text-center">
                                            <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalAjusteDispositivo(1, 'João da Silva')">📝 Disp</button>
                                            <button class="btn btn-sm btn-outline-danger" onclick="bloquearUsuario(1)">🔒 Bloquear</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div id="conteudo-relatorios" class="tab-content-section">
                    <div class="card-custom">
                        <div class="section-title">Espelhos de Ponto e Relatórios</div>
                        <p class="text-muted">Módulo de extração e fechamento de folha mensal. Escolha um funcionário na aba Pessoal para visualizar os registros consolidados.</p>
                        <div class="alert alert-info py-2">Nenhum registro de ponto pendente para processamento hoje.</div>
                    </div>
                </div>

                <div id="conteudo-configs" class="tab-content-section">
                    <div class="card-custom">
                        <div class="section-title">Configuração da Empresa</div>
                        <div class="mb-4">
                            <label for="nomeEmpresa" class="form-label fw-medium">Nome da Empresa (Aparecerá para o funcionário)</label>
                            <input type="text" id="nomeEmpresa" class="form-control" value="UniCesumar">
                        </div>

                        <div class="section-title">Cerca Virtual Antifraude</div>
                        <div class="mb-4">
                            <button type="button" class="btn btn-outline-primary d-flex align-items-center gap-2 fw-medium" onclick="obterLocalizacaoAtual()">
                                📍 Obter Localização Atual (Dispositivo GPS)
                            </button>
                        </div>

                        <div class="row g-3 mb-4 bg-light p-3 rounded border">
                            <div class="col-12"><span class="text-muted small fw-bold text-uppercase">Buscar Coordenadas por CEP</span></div>
                            <div class="col-md-8">
                                <label for="cepBusca" class="form-label small">Digite o CEP</label>
                                <input type="text" id="cepBusca" placeholder="Ex: 75690-970" class="form-control" maxlength="9" oninput="mascaraCEP(this)">
                            </div>
                            <div class="col-md-4">
                                <label for="numeroBusca" class="form-label small">Número Comercial</label>
                                <input type="text" id="numeroBusca" placeholder="Ex: 120 ou S/N" class="form-control">
                            </div>
                            <div class="col-12">
                                <button type="button" id="btnBuscarCep" onclick="buscarCoordenadasPorCEP()" class="btn btn-buscar w-100 fw-medium">
                                    🔍 Buscar Localização Exata e Gerar Lat/Lng
                                </button>
                            </div>
                        </div>

                        <div class="row g-3 mb-4">
                            <div class="col-md-6">
                                <label for="latitude" class="form-label fw-medium">Latitude</label>
                                <input type="text" id="latitude" class="form-control" placeholder="-17.74189084">
                            </div>
                            <div class="col-md-6">
                                <label for="longitude" class="form-label fw-medium">Longitude</label>
                                <input type="text" id="longitude" class="form-control" placeholder="-48.61485795">
                            </div>
                        </div>

                        <div id="boxEndereco" class="endereco-box">
                            <div class="endereco-titulo">📍 Endereço Identificado:</div>
                            <div id="enderecoTexto" class="text-success small fw-medium"></div>
                        </div>

                        <div class="mb-5 mt-4">
                            <label for="raioTolerancia" class="form-label fw-medium">Raio de Tolerância (metros)</label>
                            <input type="number" id="raioTolerancia" class="form-control" value="50">
                        </div>

                        <button type="button" class="btn btn-primary w-100 py-2.5 fw-bold" onclick="salvarConfiguracoes()">Salvar Configurações</button>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="modalFeedback" window-focused="true" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0 shadow-lg">
      <div class="modal-header bg-dark text-white py-3">
        <h5 class="modal-title d-flex align-items-center gap-2" id="modalTitulo">🔔 Notificação do Sistema</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-4 text-center">
        <p id="modalMensagem" class="fs-6 text-secondary mb-0"></p>
      </div>
      <div class="modal-footer border-0 pt-0 d-flex justify-content-center">
        <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal">Entendido / OK</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="modalDispositivo" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0 shadow-lg">
      <div class="modal-header bg-primary text-white py-3">
        <h5 class="modal-title">⚙️ Alterar Dispositivo Autorizado</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-4">
        <p class="text-muted small">Escolha as novas regras e permissões operacionais de entrada para <strong id="nomeUsuarioModal"></strong>:</p>
        <div class="mb-3">
            <label class="form-label fw-medium small">Selecione o tipo de acesso:</label>
            <select id="selectNovoDispositivo" class="form-select">
                <option value="Celular">Apenas Celular</option>
                <option value="PC">Apenas PC</option>
                <option value="Ambos">Ambos (Celular e PC)</option>
            </select>
        </div>
      </div>
      <div class="modal-footer bg-light py-2">
        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-primary btn-sm px-3" onclick="confirmarTrocaDispositivo()">Salvar Alteração</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="admin.js"></script>
</body>
</html>
