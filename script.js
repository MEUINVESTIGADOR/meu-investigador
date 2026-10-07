const API = "https://api.meuinvestigador.com.br";

let usuarioAtual = null;

let investigacoes = [];
let investigacaoAtual = null;
let clientes = [];
let clienteAtual = null;
let clienteEditandoId = null;
let investigacaoEditandoId = null;
let retornoProcessoClienteId = null;

const CAMPOS_CONTATO_CLIENTE_UI = [
  { campo: "celular1", id: "clienteCelular1", rotulo: "Celular 1" },
  { campo: "celular2", id: "clienteCelular2", rotulo: "Celular 2" },
  { campo: "email1", id: "clienteEmail1", rotulo: "E-mail 1" },
  { campo: "email2", id: "clienteEmail2", rotulo: "E-mail 2" }
];

const ENDERECOS_CLIENTE_UI = [
  {
    titulo: "Endereço 1",
    campos: [
      { campo: "endereco1Cep", id: "clienteEndereco1Cep", rotulo: "CEP" },
      { campo: "endereco1Logradouro", id: "clienteEndereco1Logradouro", rotulo: "Logradouro" },
      { campo: "endereco1Numero", id: "clienteEndereco1Numero", rotulo: "Número" },
      { campo: "endereco1Complemento", id: "clienteEndereco1Complemento", rotulo: "Complemento" },
      { campo: "endereco1Bairro", id: "clienteEndereco1Bairro", rotulo: "Bairro" },
      { campo: "endereco1Cidade", id: "clienteEndereco1Cidade", rotulo: "Cidade" },
      { campo: "endereco1Uf", id: "clienteEndereco1Uf", rotulo: "UF" }
    ]
  },
  {
    titulo: "Endereço 2",
    campos: [
      { campo: "endereco2Cep", id: "clienteEndereco2Cep", rotulo: "CEP" },
      { campo: "endereco2Logradouro", id: "clienteEndereco2Logradouro", rotulo: "Logradouro" },
      { campo: "endereco2Numero", id: "clienteEndereco2Numero", rotulo: "Número" },
      { campo: "endereco2Complemento", id: "clienteEndereco2Complemento", rotulo: "Complemento" },
      { campo: "endereco2Bairro", id: "clienteEndereco2Bairro", rotulo: "Bairro" },
      { campo: "endereco2Cidade", id: "clienteEndereco2Cidade", rotulo: "Cidade" },
      { campo: "endereco2Uf", id: "clienteEndereco2Uf", rotulo: "UF" }
    ]
  }
];

let imoveis = [];
let imovelAtual = null;
let imovelEditandoId = null;

let veiculos = [];
let veiculoAtual = null;
let veiculoEditandoId = null;

let pessoas = [];
let pessoaAtual = null;
let pessoaEditandoId = null;

let relatorioImoveis = [];
let relatorioVeiculos = [];
let relatorioPessoas = [];


/* =========================
   UTILITÁRIOS
========================= */

function $(id){
  return document.getElementById(id);
}


function mostrar(el){
  if(el){
    el.classList.remove("hidden");
  }
}


function esconder(el){
  if(el){
    el.classList.add("hidden");
  }
}


function escapeHtml(valor){

  return String(valor ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function mostrarMsg(
  id,
  texto,
  tipo="notice"
){

  const el = $(id);

  if(!el){
    return;
  }

  el.className = tipo;
  el.textContent = texto;

}


/* =========================
   API
========================= */

async function api(
  path,
  options={}
){

  const config = {

    ...options,

    credentials:"include",

    headers:{
      ...(options.body
        ? {"Content-Type":"application/json"}
        : {}),

      ...(options.headers || {})
    }

  };


  const resposta =
    await fetch(
      API + path,
      config
    );


  let dados = null;


  try{

    dados =
      await resposta.json();

  }catch(e){}


  if(!resposta.ok){

    throw new Error(
      dados?.erro ||
      "Erro na comunicação com o servidor."
    );

  }


  return dados;

}


/* =========================
   CONTROLE DE TELAS
========================= */

function mostrarSomente(id){

  const telas = [

    "dashboardScreen",
    "clientesScreen",
    "clienteDetalheScreen",
    "homeScreen",
    "investigacaoScreen",
    "imoveisScreen",
    "imovelDetalheScreen",
    "veiculosScreen",
    "veiculoDetalheScreen",
    "pessoasScreen",
    "pessoaDetalheScreen",
    "relatorioScreen"

  ];


  telas.forEach(
    function(tela){

      esconder(
        $(tela)
      );

    }
  );


  mostrar(
    $(id)
  );

}


/* =========================
   INICIALIZAÇÃO / SESSÃO
========================= */

function mostrarCadastro(){
  esconder($("loginScreen"));
  esconder($("appScreen"));
  mostrar($("cadastroScreen"));
  $("cadastroNome").focus();
}

function mostrarLogin(){
  esconder($("cadastroScreen"));
  mostrar($("loginScreen"));
  $("loginEmail").focus();
}

$("cadastroForm").addEventListener(
  "submit",
  async function(e){
    e.preventDefault();

    const nome = $("cadastroNome").value.trim();
    const email = $("cadastroEmail").value.trim();
    const senha = $("cadastroSenha").value;
    const confirmarSenha = $("cadastroConfirmarSenha").value;

    if(senha !== confirmarSenha){
      mostrarMsg("cadastroMsg", "A confirmação de senha não corresponde.", "error");
      return;
    }

    try{
      mostrarMsg("cadastroMsg", "Criando conta...", "notice");
      const dados = await api("/cadastro", {
        method: "POST",
        body: JSON.stringify({ nome, email, senha, confirmarSenha })
      });

      $("cadastroForm").reset();
      mostrarLogin();
      $("loginEmail").value = email;
      $("loginSenha").value = "";
      mostrarMsg(
        "loginMsg",
        dados.mensagem || "Conta criada. Faça login para continuar.",
        "success"
      );
    }catch(erro){
      mostrarMsg("cadastroMsg", erro.message, "error");
    }
  }
);

async function iniciar(){

  try{

    const dados =
      await api(
        "/usuario"
      );


    usuarioAtual =
      dados.usuario;


    $("usuarioNome").textContent =
      usuarioAtual.nome ||
      usuarioAtual.email;


    esconder(
      $("loginScreen")
    );


    mostrar(
      $("appScreen")
    );


    mostrarSomente(
      "dashboardScreen"
    );


    await carregarInvestigacoes();


    await carregarDashboard();

  }catch(e){

    mostrar(
      $("loginScreen")
    );

    esconder(
      $("appScreen")
    );

  }

}


$("loginForm").addEventListener(
  "submit",
  async function(e){

    e.preventDefault();


    try{

      mostrarMsg(
        "loginMsg",
        "Entrando...",
        "notice"
      );


      const dados =
        await api(
          "/login",
          {
            method:"POST",

            body:JSON.stringify({

              email:
                $("loginEmail")
                  .value
                  .trim(),

              senha:
                $("loginSenha")
                  .value

            })
          }
        );


      usuarioAtual =
        dados.usuario;


      $("usuarioNome").textContent =
        usuarioAtual.nome ||
        usuarioAtual.email;


      esconder(
        $("loginScreen")
      );


      mostrar(
        $("appScreen")
      );


      mostrarSomente(
        "dashboardScreen"
      );


      await carregarInvestigacoes();


      await carregarDashboard();

    }catch(e){

      mostrarMsg(
        "loginMsg",
        e.message,
        "error"
      );

    }

  }
);


async function logout(){

  try{

    await api(
      "/logout",
      {
        method:"POST"
      }
    );

  }catch(e){}


  location.reload();

}


/* =========================
   CLIENTES
========================= */

async function carregarClientes(){
  const dados = await api("/clientes");
  clientes = Array.isArray(dados) ? dados : (dados.results || []);
  renderizarClientes();
  preencherSelecaoClientes();
  return clientes;
}

function preencherSelecaoClientes(selecionadoId){
  const select = $("invClienteId");
  if(!select) return;

  const atual = selecionadoId ?? select.value;
  select.innerHTML = '<option value="">Selecione um cliente</option>' +
    clientes.map(function(cliente){
      return '<option value="' + Number(cliente.id) + '">' +
        escapeHtml(cliente.nome) +
        (cliente.documento ? ' — ' + escapeHtml(cliente.documento) : '') +
        '</option>';
    }).join("");
  if(atual) select.value = String(atual);
}

function renderizarClientes(){
  const lista = $("listaClientes");
  if(!lista) return;

  if(!clientes.length){
    lista.innerHTML = '<div class="empty">Nenhum cliente cadastrado.</div>';
    return;
  }

  lista.innerHTML = clientes.map(function(cliente){
    return `
      <div class="item">
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(cliente.nome)}</div>
            <div class="muted">Documento: ${escapeHtml(cliente.documento || "-")}</div>
            <div class="muted">Processos: ${Number(cliente.totalProcessos) || 0}</div>
          </div>
          <div class="actions" style="margin-top:0">
            <button class="btn btn-primary" onclick="abrirCliente(${Number(cliente.id)})">Abrir cliente</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

async function abrirClientes(){
  mostrarSomente("clientesScreen");
  esconder($("clienteFormCard"));
  try{
    await carregarClientes();
  }catch(e){
    $("listaClientes").innerHTML = '<div class="error">Erro ao carregar clientes: ' +
      escapeHtml(e.message) + '</div>';
  }
}

function renderizarProcessosDoCliente(processos){
  const lista = $("clienteInvestigacoes");
  if(!lista) return;
  if(!processos.length){
    lista.innerHTML = '<div class="empty">Este cliente ainda não tem processos cadastrados.</div>';
    return;
  }

  lista.innerHTML = processos.map(function(inv){
    return `
      <div class="item">
        <div class="item-head">
          <div>
            <div class="item-title">Processo: ${escapeHtml(inv.processo || "Não informado")}</div>
            <div class="muted">Advogado: ${escapeHtml(inv.advogado || "-")}</div>
            <div class="muted">Criado em: ${escapeHtml(formatarData(inv.data_criacao))}</div>
          </div>
          <div class="actions" style="margin-top:0">
            <button class="btn btn-primary" onclick="abrirInvestigacao(${Number(inv.id)}, ${Number(clienteAtual && clienteAtual.id)})">Abrir processo</button>
            <button class="btn btn-secondary" onclick="editarInvestigacao(${Number(inv.id)})">Editar</button>
            <button class="btn btn-danger" onclick="excluirInvestigacao(${Number(inv.id)})">Excluir</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

function renderizarGrupoDetalhesCliente(titulo, campos, cliente){
  const preenchidos = campos.filter(campo =>
    String(cliente[campo.campo] ?? "").trim()
  );
  if(!preenchidos.length) return "";

  return `
    <div class="cliente-detalhe-grupo">
      <h3>${escapeHtml(titulo)}</h3>
      <div class="detail-grid">
        ${preenchidos.map(campo => `
          <div class="detail">
            <span class="muted">${escapeHtml(campo.rotulo)}</span>
            <strong>${escapeHtml(String(cliente[campo.campo]).trim())}</strong>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderizarDadosCliente(cliente, totalProcessos){
  const dadosPrincipais = [
    { campo: "nome", rotulo: "Nome" },
    { campo: "documento", rotulo: "Documento" }
  ].filter(campo => String(cliente[campo.campo] ?? "").trim());

  return `
    <h2>Dados do cliente</h2>
    <div class="detail-grid">
      ${dadosPrincipais.map(campo => `
        <div class="detail">
          <span class="muted">${campo.rotulo}</span>
          <strong>${escapeHtml(String(cliente[campo.campo]).trim())}</strong>
        </div>`).join("")}
      <div class="detail">
        <span class="muted">Processos cadastrados</span>
        <strong>${totalProcessos}</strong>
      </div>
    </div>
    ${renderizarGrupoDetalhesCliente(
      "Contatos",
      CAMPOS_CONTATO_CLIENTE_UI,
      cliente
    )}
    ${ENDERECOS_CLIENTE_UI.map(grupo =>
      renderizarGrupoDetalhesCliente(grupo.titulo, grupo.campos, cliente)
    ).join("")}`;
}

async function abrirCliente(id){
  try{
    const dados = await api("/clientes/" + encodeURIComponent(id));
    clienteAtual = dados.cliente;
    const processos = Array.isArray(dados.investigacoes) ? dados.investigacoes : [];
    $("clienteDetalheTitulo").textContent = clienteAtual.nome || "Cliente";
    $("clienteDetalheInfo").innerHTML = renderizarDadosCliente(
      clienteAtual,
      processos.length
    );
    renderizarProcessosDoCliente(processos);
    mostrarSomente("clienteDetalheScreen");
  }catch(e){
    alert("Não foi possível abrir o cliente: " + e.message);
  }
}

function abrirCadastroCliente(preservarRetorno){
  if(!preservarRetorno) retornoProcessoClienteId = null;
  clienteEditandoId = null;
  $("clienteForm").reset();
  $("clienteFormTitulo").textContent = "Cadastrar cliente";
  $("clienteNome").value = "";
  $("clienteDocumento").value = "";
  mostrarSomente("clientesScreen");
  mostrar($("clienteFormCard"));
  $("clienteNome").focus();
}

function fecharCadastroCliente(){
  esconder($("clienteFormCard"));
  $("clienteForm").reset();
  clienteEditandoId = null;
  retornoProcessoClienteId = null;
}

function editarClienteAtual(){
  if(!clienteAtual) return;
  clienteEditandoId = Number(clienteAtual.id);
  $("clienteForm").reset();
  $("clienteFormTitulo").textContent = "Editar cliente";
  $("clienteNome").value = clienteAtual.nome || "";
  $("clienteDocumento").value = clienteAtual.documento || "";
  CAMPOS_CONTATO_CLIENTE_UI.forEach(campo => {
    $(campo.id).value = clienteAtual[campo.campo] || "";
  });
  ENDERECOS_CLIENTE_UI.forEach(grupo => {
    grupo.campos.forEach(campo => {
      $(campo.id).value = clienteAtual[campo.campo] || "";
    });
  });
  retornoProcessoClienteId = Number(clienteAtual.id);
  mostrarSomente("clientesScreen");
  mostrar($("clienteFormCard"));
  $("clienteNome").focus();
}

$("clienteForm").addEventListener("submit", async function(e){
  e.preventDefault();
  const editando = clienteEditandoId;
  try{
    const dados = await api(
      editando ? "/clientes/" + editando : "/clientes",
      {
        method: editando ? "PUT" : "POST",
        body: JSON.stringify({
          nome: $("clienteNome").value.trim(),
          documento: $("clienteDocumento").value.trim(),
          ...Object.fromEntries(
            CAMPOS_CONTATO_CLIENTE_UI
              .concat(ENDERECOS_CLIENTE_UI.flatMap(grupo => grupo.campos))
              .map(campo => [campo.campo, $(campo.id).value.trim()])
          )
        })
      }
    );
    const id = dados.id || editando || retornoProcessoClienteId;
    clienteEditandoId = null;
    esconder($("clienteFormCard"));
    await carregarClientes();
    if(editando) await carregarInvestigacoes();
    if(retornoProcessoClienteId){
      const clienteId = Number(retornoProcessoClienteId);
      retornoProcessoClienteId = null;
      if(editando){
        await abrirCliente(clienteId);
      }else{
        await mostrarNovaInvestigacao(clienteId);
      }
      return;
    }
    if(id) await abrirCliente(id);
  }catch(e){
    mostrarMsg("clienteMsg", e.message, "error");
  }
});


/* =========================
   INVESTIGAÇÕES
========================= */

async function carregarInvestigacoes(){

  const lista =
    $("listaInvestigacoes");


  if(lista){

    lista.innerHTML =
      '<div class="loading">Carregando...</div>';

  }


  try{

    const dados =
      await api(
        "/investigacoes"
      );


    investigacoes =
      Array.isArray(dados)
        ? dados
        : (
            dados.results ||
            []
          );


    renderizarInvestigacoes();

  }catch(e){

    if(lista){

      lista.innerHTML =
        '<div class="error">' +
        'Erro: ' +
        escapeHtml(
          e.message
        ) +
        '</div>';

    }

  }

}


function renderizarInvestigacoes(){

  const el =
    $("listaInvestigacoes");


  if(!el){
    return;
  }


  if(!investigacoes.length){

    el.innerHTML =
      '<div class="empty">' +
      'Nenhum processo cadastrado.' +
      '</div>';

    return;

  }


  el.innerHTML =
    agruparInvestigacoesPorCliente(investigacoes)
      .map(function(grupo){
        const listaProcessos = grupo.processos.map(function(inv, indice){
          return `
            <div class="item-head" style="${indice ? "border-top:1px solid var(--line);padding-top:14px;margin-top:14px" : "margin-top:14px"}">
              <div>
                <div class="item-title">Processo: ${escapeHtml(inv.processo || "Não informado")}</div>
                <div class="muted">Advogado: ${escapeHtml(inv.advogado || "-")}</div>
              </div>
              <div class="actions" style="margin-top:0">
                <button class="btn btn-primary" onclick="abrirInvestigacao(${Number(inv.id)}, ${Number(grupo.clienteId) || "null"})">Abrir processo</button>
                <button class="btn btn-secondary" onclick="editarInvestigacao(${Number(inv.id)})">Editar processo</button>
                <button class="btn btn-danger" onclick="excluirInvestigacao(${Number(inv.id)})">Excluir processo</button>
              </div>
            </div>`;
        }).join("");

        return `
          <div class="item">
            <div class="item-head">
              <div>
                <div class="item-title">Cliente: ${escapeHtml(grupo.nome || "-")}</div>
                <div class="muted">Documento: ${escapeHtml(grupo.documento || "-")}</div>
                <div class="muted">Processos cadastrados: ${grupo.processos.length}</div>
              </div>
              ${grupo.clienteId ? `
                <div class="actions" style="margin-top:0">
                  <button class="btn btn-secondary" onclick="abrirCliente(${Number(grupo.clienteId)})">Abrir cadastro do cliente</button>
                </div>` : ""}
            </div>
            <div style="border-top:1px solid var(--line);margin-top:14px;padding-top:2px">
              ${listaProcessos}
            </div>
          </div>`;
      })
      .join("");

}


function dataInvestigacaoOrdem(inv){
  const data = new Date(String(inv.data_criacao || "").replace(" ", "T")).getTime();
  return Number.isFinite(data) && data ? data : (Number(inv.id) || 0);
}


function agruparInvestigacoesPorCliente(registros){
  const grupos = new Map();

  (Array.isArray(registros) ? registros : []).forEach(function(inv){
    const clienteId = Number(inv.clienteId) || null;
    const chave = clienteId ? "cliente:" + clienteId : "processo:" + Number(inv.id);
    let grupo = grupos.get(chave);

    if(!grupo){
      grupo = {
        clienteId,
        nome: inv.nome || "",
        documento: inv.documento || "",
        processos: [],
        dataOrdem: 0
      };
      grupos.set(chave, grupo);
    }

    grupo.processos.push(inv);
    grupo.dataOrdem = Math.max(grupo.dataOrdem, dataInvestigacaoOrdem(inv));
    if(!grupo.nome && inv.nome) grupo.nome = inv.nome;
    if(!grupo.documento && inv.documento) grupo.documento = inv.documento;
  });

  return Array.from(grupos.values())
    .map(function(grupo){
      grupo.processos.sort(function(a, b){
        return dataInvestigacaoOrdem(b) - dataInvestigacaoOrdem(a);
      });
      const maisRecente = grupo.processos[0];
      return {
        ...grupo,
        nome: maisRecente && maisRecente.nome || grupo.nome,
        documento: maisRecente && maisRecente.documento || grupo.documento
      };
    })
    .sort(function(a, b){ return b.dataOrdem - a.dataOrdem; });
}


async function mostrarNovaInvestigacao(clienteId){
  investigacaoEditandoId = null;
  if(clienteId == null) retornoProcessoClienteId = null;
  $("investigacaoForm").reset();
  $("investigacaoFormTitulo").textContent = "Novo processo";
  $("investigacaoSalvar").textContent = "Salvar processo";
  $("invClienteId").disabled = false;
  if(clienteId != null){
    retornoProcessoClienteId = Number(clienteId);
  }
  mostrarSomente("homeScreen");
  mostrar($("novaInvestigacaoCard"));
  try{
    await carregarClientes();
  }catch(e){
    mostrarMsg("homeMsg", "Não foi possível carregar os clientes: " + e.message, "error");
  }
  if(clienteId != null) $("invClienteId").value = String(clienteId);
  $("invClienteId").focus();
}

function abrirCadastroClienteParaProcesso(){
  retornoProcessoClienteId = -1;
  abrirCadastroCliente(true);
}

function fecharNovaInvestigacao(){
  const clienteId = retornoProcessoClienteId;
  retornoProcessoClienteId = null;
  esconder($("novaInvestigacaoCard"));
  $("investigacaoForm").reset();
  investigacaoEditandoId = null;
  if(clienteId && clienteId > 0) abrirCliente(clienteId);
}


$("investigacaoForm").addEventListener(
  "submit",
  async function(e){

    e.preventDefault();


    try{

      const editando = investigacaoEditandoId;
      const clienteId = Number($("invClienteId").value);
      if(!editando && (!Number.isInteger(clienteId) || clienteId <= 0)){
        throw new Error("Selecione um cliente para o processo.");
      }
      const dados = await api(
        editando ? "/investigacoes/" + editando : "/investigacoes",
        {
          method: editando ? "PUT" : "POST",
          body: JSON.stringify({
            ...(editando ? {} : { clienteId }),
            processo: $("invProcesso").value.trim(),
            advogado: $("invAdvogado").value.trim(),
            fontes: $("invFontes").value.trim()
          })
        }
      );

      const retornoCliente = retornoProcessoClienteId;
      retornoProcessoClienteId = null;
      esconder($("novaInvestigacaoCard"));
      $("investigacaoForm").reset();
      investigacaoEditandoId = null;
      await carregarInvestigacoes();
      await carregarDashboard();
      if(retornoCliente && retornoCliente > 0){
        await abrirCliente(retornoCliente);
      }else{
        mostrarSomente("homeScreen");
        mostrarMsg("homeMsg", dados.mensagem || "Processo salvo com sucesso.", "success");
      }

    }catch(e){

      mostrarMsg(
        "homeMsg",
        e.message,
        "error"
      );

    }

  }
);


async function editarInvestigacao(id){
  const inv = investigacoes.find(function(item){
    return Number(item.id) === Number(id);
  });
  if(!inv) return;
  investigacaoEditandoId = Number(inv.id);
  retornoProcessoClienteId = Number(inv.clienteId) || null;
  $("investigacaoForm").reset();
  $("investigacaoFormTitulo").textContent = "Editar processo";
  $("investigacaoSalvar").textContent = "Salvar alterações";
  mostrarSomente("homeScreen");
  mostrar($("novaInvestigacaoCard"));
  try{
    await carregarClientes();
    $("invClienteId").value = String(inv.clienteId || "");
  }catch(e){
    mostrarMsg("homeMsg", "Não foi possível carregar o cliente do processo: " + e.message, "error");
  }
  $("invClienteId").disabled = true;
  $("invProcesso").value = inv.processo || "";
  $("invAdvogado").value = inv.advogado || "";
  $("invFontes").value = inv.fontes || "";
}


async function excluirInvestigacao(id){

  const investigacaoExcluida = investigacoes.find(function(item){
    return Number(item.id) === Number(id);
  });
  const clienteId = Number(investigacaoExcluida && investigacaoExcluida.clienteId) || null;

  if(
    !confirm(
      "Excluir este processo? Os imóveis, veículos e Pessoas vinculados serão excluídos. " +
      "O cadastro do cliente será mantido."
    )
  ){

    return;

  }


  try{

    const dados =
      await api(
        "/investigacoes/" +
        id,
        {
          method:"DELETE"
        }
      );


    if(
      investigacaoAtual &&
      Number(
        investigacaoAtual.id
      ) === Number(id)
    ){

      investigacaoAtual = null;

    }


    await carregarInvestigacoes();


    await carregarDashboard();


    if(clienteId && clienteAtual && Number(clienteAtual.id) === clienteId){
      await abrirCliente(clienteId);
      mostrarMsg("clienteDetalheMensagem", dados.mensagem || "Processo excluído. O cliente foi mantido.", "success");
    }else{
      mostrarSomente("homeScreen");
      mostrarMsg("homeMsg", dados.mensagem || "Processo excluído. O cliente foi mantido.", "success");
    }

  }catch(e){

    mostrarMsg(
      "homeMsg",
      e.message,
      "error"
    );

  }

}


function abrirInvestigacao(id, clienteContextoId){

  investigacaoAtual =
    investigacoes.find(
      function(x){

        return Number(x.id) ===
          Number(id);

      }
    );


  if(!investigacaoAtual){
    return;
  }

  retornoProcessoClienteId = Number(clienteContextoId) || null;


  $("investigacaoTitulo").textContent =
    investigacaoAtual.processo
      ? "Processo " + investigacaoAtual.processo
      : "Processo";


  $("investigacaoInfo").innerHTML = `

    <div class="detail-grid">

      <div class="detail">

        <span class="muted">
          Cliente
        </span>

        <strong>
          ${escapeHtml(investigacaoAtual.nome || "-")}
        </strong>

      </div>


      <div class="detail">

        <span class="muted">
          Documento do cliente
        </span>

        <strong>
          ${escapeHtml(
            investigacaoAtual.documento ||
            "-"
          )}
        </strong>

      </div>


      <div class="detail">

        <span class="muted">
          Processo
        </span>

        <strong>
          ${escapeHtml(
            investigacaoAtual.processo ||
            "-"
          )}
        </strong>

      </div>


      <div class="detail">

        <span class="muted">
          Advogado
        </span>

        <strong>
          ${escapeHtml(
            investigacaoAtual.advogado ||
            "-"
          )}
        </strong>

      </div>


      <div class="detail">

        <span class="muted">
          Data de criação
        </span>

        <strong>
          ${formatarData(
            investigacaoAtual.data_criacao
          )}
        </strong>

      </div>


      <div
        class="detail"
        style="grid-column:1/-1"
      >

        <span class="muted">
          Fontes
        </span>

        <strong>
          ${escapeHtml(
            investigacaoAtual.fontes ||
            "-"
          )}
        </strong>

      </div>

    </div>

  `;


  mostrarSomente(
    "investigacaoScreen"
  );

}


/* =========================
   DASHBOARD
========================= */

async function abrirDashboard(){

  investigacaoAtual = null;
  retornoProcessoClienteId = null;
  imovelAtual = null;
  veiculoAtual = null;


  mostrarSomente(
    "dashboardScreen"
  );


  $("dashboardRecentes")
    .innerHTML =
    '<div class="loading">' +
    'Carregando...' +
    '</div>';


  await carregarDashboard();

}


async function carregarDashboard(){

  if(
    !investigacoes.length
  ){

    try{

      await carregarInvestigacoes();

    }catch(e){}

  }


  const recentes =
    agruparInvestigacoesPorCliente(investigacoes)
      .slice(0, 5);


  if(
    !recentes.length
  ){

    $("dashboardRecentes")
      .innerHTML = `

        <div class="empty">
          Nenhum cliente com processos cadastrados.
        </div>

      `;


    return;

  }


  $("dashboardRecentes")
    .innerHTML =

    recentes.map(
      function(grupo){
        const processoRecente = grupo.processos[0];
        const acaoAbrir = grupo.clienteId
          ? `abrirCliente(${Number(grupo.clienteId)})`
          : `abrirInvestigacao(${Number(processoRecente && processoRecente.id)})`;

        return `

          <div class="item">

            <div class="item-head">

              <div>

                <div class="item-title">
                  Cliente: ${escapeHtml(grupo.nome || "-")}
                </div>

                <div class="muted">
                  Processos cadastrados: ${grupo.processos.length}
                </div>

                <div class="muted">
                  Processo mais recente: ${escapeHtml(processoRecente && processoRecente.processo || "Não informado")}
                </div>

                <div class="muted">
                  Documento: ${escapeHtml(grupo.documento || "-")}
                </div>

              </div>


              <div
                class="actions"
                style="margin-top:0"
              >

                <button
                  class="btn btn-primary"
                  onclick="${acaoAbrir}"
                >
                  ${grupo.clienteId ? "Abrir cliente" : "Abrir processo"}
                </button>

              </div>

            </div>

          </div>

        `;

      }
    )
    .join("");


}


function voltarInicio(){

  retornoProcessoClienteId = null;

  mostrarSomente(
    "homeScreen"
  );


  carregarInvestigacoes();

}


function voltarDaTelaPatrimonial(){

  if(
    !investigacaoAtual
  ){

    voltarInicio();
    return;

  }


  abrirInvestigacao(
    investigacaoAtual.id,
    retornoProcessoClienteId
  );

}


/* =========================
   IMÓVEIS
========================= */

async function abrirImoveis(){

  if(
    !investigacaoAtual
  ){

    return;

  }


  $("imoveisSubtitulo")
    .textContent =
    "Processo: " + (investigacaoAtual.processo || "Sem número");


  mostrarSomente(
    "imoveisScreen"
  );


  fecharFormImovel();


  await carregarImoveis();

}


async function carregarImoveis(){

  $("listaImoveis")
    .innerHTML =
    '<div class="loading">' +
    'Carregando...' +
    '</div>';


  try{

    const dados =
      await api(
        "/imoveis?investigacao_id=" +
        encodeURIComponent(
          investigacaoAtual.id
        )
      );


    imoveis =
      Array.isArray(dados)
        ? dados
        : (
            dados.results ||
            []
          );


    renderizarImoveis();

  }catch(e){

    $("listaImoveis")
      .innerHTML =
      '<div class="error">' +
      'Erro: ' +
      escapeHtml(
        e.message
      ) +
      '</div>';

  }

}


function renderizarImoveis(){

  const el =
    $("listaImoveis");


  if(
    !imoveis.length
  ){

    el.innerHTML =
      '<div class="empty">' +
      'Nenhum imóvel cadastrado.' +
      '</div>';

    return;

  }


  el.innerHTML =
    imoveis
      .map(
        function(im){

          return `

            <div class="item">

              <div class="item-head">

                <div>

                  <div class="item-title">

                    🏠
                    ${escapeHtml(
                      im.tipo ||
                      "Imóvel"
                    )}

                  </div>

                  <div class="muted">

                    Matrícula:
                    ${escapeHtml(
                      im.matricula ||
                      "-"
                    )}

                  </div>

                  <div class="muted">

                    ${escapeHtml(
                      im.cidade ||
                      ""
                    )}

                    ${
                      im.uf
                        ? " / " +
                          escapeHtml(
                            im.uf
                          )
                        : ""
                    }

                  </div>

                </div>


                <div
                  class="actions"
                  style="margin-top:0"
                >

                  <button
                    class="btn btn-primary"
                    onclick="abrirDetalheImovel(${Number(im.id)})"
                  >
                    Abrir
                  </button>

                </div>

              </div>

            </div>

          `;

        }
      )
      .join("");

}


function abrirFormImovel(
  im=null
){

  imovelEditandoId =
    im
      ? Number(im.id)
      : null;


  $("imovelFormTitulo")
    .textContent =
    im
      ? "Editar imóvel"
      : "Cadastrar imóvel";


  const campos = {

    imTipo:
      im?.tipo ||
      "",

    imMatricula:
      im?.matricula ||
      "",

    imCartorio:
      im?.cartorio ||
      "",

    imCep:
      im?.cep ||
      "",

    imEndereco:
      im?.endereco ||
      "",

    imNumero:
      im?.numero ||
      "",

    imComplemento:
      im?.complemento ||
      "",

    imBairro:
      im?.bairro ||
      "",

    imCidade:
      im?.cidade ||
      "",

    imUf:
      im?.uf ||
      "",

    imValor:
      im?.valor ||
      "",

    imFonte:
      im?.fonte ||
      "",

    imObservacoes:
      im?.observacoes ||
      ""

  };


  Object.entries(
    campos
  ).forEach(
    function([
      id,
      valor
    ]){

      $(id).value =
        valor;

    }
  );


  mostrar(
    $("imovelFormCard")
  );


  $("imTipo").focus();

}


function fecharFormImovel(){

  esconder(
    $("imovelFormCard")
  );


  $("imovelForm")
    .reset();


  imovelEditandoId =
    null;

}


$("imovelForm").addEventListener(
  "submit",
  async function(e){

    e.preventDefault();


    const payload = {

      investigacao_id:
        Number(
          investigacaoAtual.id
        ),

      tipo:
        $("imTipo")
          .value
          .trim(),

      matricula:
        $("imMatricula")
          .value
          .trim(),

      cartorio:
        $("imCartorio")
          .value
          .trim(),

      cep:
        $("imCep")
          .value
          .trim(),

      endereco:
        $("imEndereco")
          .value
          .trim(),

      numero:
        $("imNumero")
          .value
          .trim(),

      complemento:
        $("imComplemento")
          .value
          .trim(),

      bairro:
        $("imBairro")
          .value
          .trim(),

      cidade:
        $("imCidade")
          .value
          .trim(),

      uf:
        $("imUf")
          .value
          .trim()
          .toUpperCase(),

      valor:
        $("imValor")
          .value
          .trim(),

      fonte:
        $("imFonte")
          .value
          .trim(),

      observacoes:
        $("imObservacoes")
          .value
          .trim()

    };


    try{

      const dados =
        await api(

          imovelEditandoId
            ? "/imoveis/" +
              imovelEditandoId
            : "/imoveis",

          {

            method:
              imovelEditandoId
                ? "PUT"
                : "POST",

            body:
              JSON.stringify(
                payload
              )

          }

        );


      fecharFormImovel();


      await carregarImoveis();


      alert(
        dados.mensagem ||
        "Imóvel salvo com sucesso."
      );


      await carregarDashboard();

    }catch(e){

      alert(
        e.message
      );

    }

  }
);


function abrirDetalheImovel(
  id
){

  imovelAtual =
    imoveis.find(
      function(x){

        return Number(x.id) ===
          Number(id);

      }
    );


  if(!imovelAtual){
    return;
  }


  renderizarDetalheImovel();


  mostrarSomente(
    "imovelDetalheScreen"
  );

}


function renderizarDetalheImovel(){

  const im =
    imovelAtual;


  $("imovelDetalhe")
    .innerHTML = `

      <h3 class="section-title">
        📋 Identificação
      </h3>

      <div class="detail-grid">

        <div class="detail">

          <span class="muted">
            Tipo de imóvel
          </span>

          <strong>
            ${escapeHtml(
              im.tipo ||
              "-"
            )}
          </strong>

        </div>


        <div class="detail">

          <span class="muted">
            Matrícula
          </span>

          <strong>
            ${escapeHtml(
              im.matricula ||
              "-"
            )}
          </strong>

        </div>


        <div class="detail">

          <span class="muted">
            Cartório
          </span>

          <strong>
            ${escapeHtml(
              im.cartorio ||
              "-"
            )}
          </strong>

        </div>

      </div>


      <h3 class="section-title">
        📍 Localização
      </h3>

      <div class="detail-grid">

        ${detail(
          "CEP",
          im.cep
        )}

        ${detail(
          "Endereço",
          im.endereco
        )}

        ${detail(
          "Número",
          im.numero
        )}

        ${detail(
          "Complemento",
          im.complemento
        )}

        ${detail(
          "Bairro",
          im.bairro
        )}

        ${detail(
          "Cidade",
          im.cidade
        )}

        ${detail(
          "UF",
          im.uf
        )}

      </div>


      <h3 class="section-title">
        💰 Informações patrimoniais
      </h3>

      <div class="detail-grid">

        ${detail(
          "Valor",
          im.valor
        )}

        ${detail(
          "Fonte",
          im.fonte
        )}

        ${detail(
          "Data de cadastro",
          formatarData(
            im.data_criacao
          )
        )}

      </div>


      <h3 class="section-title">
        📝 Observações
      </h3>

      <div class="detail">

        <strong>
          ${escapeHtml(
            im.observacoes ||
            "Nenhuma observação cadastrada."
          )}
        </strong>

      </div>

    `;

}


function editarImovelAtual(){

  mostrarSomente(
    "imoveisScreen"
  );


  abrirFormImovel(
    imovelAtual
  );

}


async function excluirImovelAtual(){

  if(!imovelAtual){
    return;
  }


  if(
    !confirm(
      "Excluir este imóvel?"
    )
  ){

    return;

  }


  try{

    const dados =
      await api(
        "/imoveis/" +
        imovelAtual.id,
        {
          method:"DELETE"
        }
      );


    alert(
      dados.mensagem ||
      "Imóvel excluído com sucesso."
    );


    imovelAtual =
      null;


    await abrirImoveis();


    await carregarDashboard();

  }catch(e){

    alert(
      e.message
    );

  }

}


/* =========================
   VEÍCULOS
========================= */

async function abrirVeiculos(){

  if(
    !investigacaoAtual
  ){

    return;

  }


  $("veiculosSubtitulo")
    .textContent =
    "Processo: " + (investigacaoAtual.processo || "Sem número");


  mostrarSomente(
    "veiculosScreen"
  );


  fecharFormVeiculo();


  await carregarVeiculos();

}


async function carregarVeiculos(){

  $("listaVeiculos")
    .innerHTML =
    '<div class="loading">' +
    'Carregando...' +
    '</div>';


  try{

    const dados =
      await api(
        "/veiculos?investigacao_id=" +
        encodeURIComponent(
          investigacaoAtual.id
        )
      );


    veiculos =
      Array.isArray(dados)
        ? dados
        : (
            dados.results ||
            []
          );


    renderizarVeiculos();

  }catch(e){

    $("listaVeiculos")
      .innerHTML =
      '<div class="error">' +
      'Erro: ' +
      escapeHtml(
        e.message
      ) +
      '</div>';

  }

}


function renderizarVeiculos(){

  const el =
    $("listaVeiculos");


  if(!veiculos.length){

    el.innerHTML =
      '<div class="empty">' +
      'Nenhum veículo cadastrado.' +
      '</div>';

    return;

  }


  el.innerHTML =
    veiculos
      .map(
        function(v){

          return `

            <div class="item">

              <div class="item-head">

                <div>

                  <div class="item-title">

                    🚗
                    ${escapeHtml(
                      v.marca ||
                      ""
                    )}

                    ${escapeHtml(
                      v.modelo ||
                      ""
                    )}

                  </div>


                  <div class="muted">

                    ${escapeHtml(
                      v.tipo ||
                      "Veículo"
                    )}

                    ·

                    ${escapeHtml(
                      v.ano ||
                      "-"
                    )}

                  </div>


                  <div class="muted">

                    Placa:
                    ${escapeHtml(
                      v.placa ||
                      "-"
                    )}

                    · FIPE:

                    ${escapeHtml(
                      v.valor ||
                      "-"
                    )}

                  </div>

                </div>


                <div
                  class="actions"
                  style="margin-top:0"
                >

                  <button
                    class="btn btn-primary"
                    onclick="abrirDetalheVeiculo(${Number(v.id)})"
                  >
                    Abrir
                  </button>

                </div>

              </div>

            </div>

          `;

        }
      )
      .join("");

}


function abrirFormVeiculo(
  v=null
){

  veiculoEditandoId =
    v
      ? Number(v.id)
      : null;


  $("veiculoFormTitulo")
    .textContent =
    v
      ? "Editar veículo"
      : "Cadastrar veículo";


  const campos = {

    veTipo:
      v?.tipo ||
      "",

    veMarca:
      v?.marca ||
      "",

    veModelo:
      v?.modelo ||
      "",

    veAno:
      v?.ano ||
      "",

    vePlaca:
      v?.placa ||
      "",

    veRenavam:
      v?.renavam ||
      "",

    veChassi:
      v?.chassi ||
      "",

    veCor:
      v?.cor ||
      "",

    veCidade:
      v?.cidade ||
      "",

    veUf:
      v?.uf ||
      "",

    veValor:
      v?.valor ||
      "",

    veDataFipe:
      v?.data_fipe ||
      "",

    veFonte:
      v?.fonte ||
      "",

    veObservacoes:
      v?.observacoes ||
      ""

  };


  Object.entries(
    campos
  ).forEach(
    function([
      id,
      valor
    ]){

      $(id).value =
        valor;

    }
  );


  mostrar(
    $("veiculoFormCard")
  );


  $("veTipo").focus();

}


function fecharFormVeiculo(){

  esconder(
    $("veiculoFormCard")
  );


  $("veiculoForm")
    .reset();


  veiculoEditandoId =
    null;

}


$("veiculoForm").addEventListener(
  "submit",
  async function(e){

    e.preventDefault();


    const payload = {

      investigacao_id:
        Number(
          investigacaoAtual.id
        ),

      tipo:
        $("veTipo")
          .value
          .trim(),

      marca:
        $("veMarca")
          .value
          .trim(),

      modelo:
        $("veModelo")
          .value
          .trim(),

      ano:
        $("veAno")
          .value
          .trim(),

      placa:
        $("vePlaca")
          .value
          .trim()
          .toUpperCase(),

      renavam:
        $("veRenavam")
          .value
          .trim(),

      chassi:
        $("veChassi")
          .value
          .trim()
          .toUpperCase(),

      cor:
        $("veCor")
          .value
          .trim(),

      cidade:
        $("veCidade")
          .value
          .trim(),

      uf:
        $("veUf")
          .value
          .trim()
          .toUpperCase(),

      valor:
        $("veValor")
          .value
          .trim(),

      data_fipe:
        $("veDataFipe")
          .value,

      fonte:
        $("veFonte")
          .value
          .trim(),

      observacoes:
        $("veObservacoes")
          .value
          .trim()

    };


    try{

      const dados =
        await api(

          veiculoEditandoId
            ? "/veiculos/" +
              veiculoEditandoId
            : "/veiculos",

          {

            method:
              veiculoEditandoId
                ? "PUT"
                : "POST",

            body:
              JSON.stringify(
                payload
              )

          }

        );


      fecharFormVeiculo();


      await carregarVeiculos();


      alert(
        dados.mensagem ||
        "Veículo salvo com sucesso."
      );


      await carregarDashboard();

    }catch(e){

      alert(
        e.message
      );

    }

  }
);


function abrirDetalheVeiculo(
  id
){

  veiculoAtual =
    veiculos.find(
      function(x){

        return Number(x.id) ===
          Number(id);

      }
    );


  if(!veiculoAtual){
    return;
  }


  renderizarDetalheVeiculo();


  mostrarSomente(
    "veiculoDetalheScreen"
  );

}


function renderizarDetalheVeiculo(){

  const v =
    veiculoAtual;


  $("veiculoDetalhe")
    .innerHTML = `

      <h3 class="section-title">
        📋 Identificação
      </h3>

      <div class="detail-grid">

        ${detail(
          "Tipo",
          v.tipo
        )}

        ${detail(
          "Marca",
          v.marca
        )}

        ${detail(
          "Modelo",
          v.modelo
        )}

        ${detail(
          "Ano",
          v.ano
        )}

        ${detail(
          "Cor",
          v.cor
        )}

      </div>


      <h3 class="section-title">
        🔎 Identificadores
      </h3>

      <div class="detail-grid">

        ${detail(
          "Placa",
          v.placa
        )}

        ${detail(
          "RENAVAM",
          v.renavam
        )}

        ${detail(
          "Chassi",
          v.chassi
        )}

      </div>


      <h3 class="section-title">
        📍 Localização
      </h3>

      <div class="detail-grid">

        ${detail(
          "Cidade",
          v.cidade
        )}

        ${detail(
          "UF",
          v.uf
        )}

      </div>


      <h3 class="section-title">
        💰 Informações patrimoniais
      </h3>

      <div class="detail-grid">

        ${detail(
          "Valor pela Tabela FIPE",
          v.valor
        )}

        ${detail(
          "Data de referência FIPE",
          formatarDataFipe(
            v.data_fipe
          )
        )}

        ${detail(
          "Fonte",
          v.fonte
        )}

        ${detail(
          "Data de cadastro",
          formatarData(
            v.data_criacao
          )
        )}

      </div>


      <h3 class="section-title">
        📝 Observações
      </h3>

      <div class="detail">

        <strong>
          ${escapeHtml(
            v.observacoes ||
            "Nenhuma observação cadastrada."
          )}
        </strong>

      </div>

    `;

}


function editarVeiculoAtual(){

  mostrarSomente(
    "veiculosScreen"
  );


  abrirFormVeiculo(
    veiculoAtual
  );

}


async function excluirVeiculoAtual(){

  if(!veiculoAtual){
    return;
  }


  if(
    !confirm(
      "Excluir este veículo?"
    )
  ){

    return;

  }


  try{

    const dados =
      await api(
        "/veiculos/" +
        veiculoAtual.id,
        {
          method:"DELETE"
        }
      );


    alert(
      dados.mensagem ||
      "Veículo excluído com sucesso."
    );


    veiculoAtual =
      null;


    await abrirVeiculos();


    await carregarDashboard();

  }catch(e){

    alert(
      e.message
    );

  }

}

/* =========================
   PESSOAS
========================= */

async function abrirPessoas(){

  if(!investigacaoAtual){
    return;
  }

  $("pessoasSubtitulo")
    .textContent =
    "Processo: " + (investigacaoAtual.processo || "Sem número");

  mostrarSomente(
    "pessoasScreen"
  );

  fecharFormPessoa();

  await carregarPessoas();

}


async function carregarPessoas(){

  $("listaPessoas")
    .innerHTML =
    '<div class="loading">Carregando...</div>';

  try{

    const dados =
      await api(
        "/pessoas?investigacao_id=" +
        encodeURIComponent(
          investigacaoAtual.id
        )
      );

    pessoas =
      Array.isArray(dados)
        ? dados
        : (
            dados?.results ||
            []
          );

    renderizarPessoas();

  }catch(e){

    $("listaPessoas")
      .innerHTML =
      '<div class="error">Erro: ' +
      escapeHtml(e.message) +
      '</div>';

  }

}


function renderizarPessoas(){

  const el =
    $("listaPessoas");

  const busca =
    $("buscaPessoas")
      .value
      .trim()
      .toLocaleLowerCase("pt-BR");

  const buscaCpf =
    busca.replace(/\D/g, "");

  const filtradas =
    pessoas.filter(function(pessoa){

      const nome =
        String(
          pessoa.nome || ""
        ).toLocaleLowerCase("pt-BR");

      const cpf =
        String(pessoa.cpf || "");

      const cpfDigitos =
        cpf.replace(/\D/g, "");

      const correspondeBusca =
        !busca ||
        nome.includes(busca) ||
        cpf.toLocaleLowerCase("pt-BR").includes(busca) ||
        (
          buscaCpf &&
          cpfDigitos.includes(buscaCpf)
        );

      return correspondeBusca;

    });

  if(!filtradas.length){

    el.innerHTML =
      '<div class="empty">' +
      (
        pessoas.length
          ? "Nenhuma pessoa corresponde à pesquisa."
          : "Nenhuma pessoa cadastrada neste processo."
      ) +
      '</div>';

    return;

  }

  el.innerHTML =
    filtradas.map(function(pessoa){

      return `

        <div class="item">

          <div class="item-head">

            <div>

              <div class="item-title">
                👤 ${escapeHtml(pessoa.nome || "Pessoa")}
              </div>

              <div class="muted">
                CPF: ${escapeHtml(pessoa.cpf || "-")}
              </div>

            </div>

            <div
              class="actions"
              style="margin-top:0"
            >
              <button
                class="btn btn-primary"
                onclick="abrirDetalhePessoa(${Number(pessoa.id)})"
              >
                Ver detalhes
              </button>
            </div>

          </div>

        </div>

      `;

    }).join("");

}


$("buscaPessoas").addEventListener(
  "input",
  renderizarPessoas
);

const camposContatoEnderecoPessoa = {
  telefone: "pessoaTelefone",
  email: "pessoaEmail",
  redeSocial: "pessoaRedeSocial",
  endereco1Cep: "pessoaEndereco1Cep",
  endereco1Logradouro: "pessoaEndereco1Logradouro",
  endereco1Numero: "pessoaEndereco1Numero",
  endereco1Complemento: "pessoaEndereco1Complemento",
  endereco1Bairro: "pessoaEndereco1Bairro",
  endereco1Cidade: "pessoaEndereco1Cidade",
  endereco1Uf: "pessoaEndereco1Uf",
  endereco2Cep: "pessoaEndereco2Cep",
  endereco2Logradouro: "pessoaEndereco2Logradouro",
  endereco2Numero: "pessoaEndereco2Numero",
  endereco2Complemento: "pessoaEndereco2Complemento",
  endereco2Bairro: "pessoaEndereco2Bairro",
  endereco2Cidade: "pessoaEndereco2Cidade",
  endereco2Uf: "pessoaEndereco2Uf",
  endereco3Cep: "pessoaEndereco3Cep",
  endereco3Logradouro: "pessoaEndereco3Logradouro",
  endereco3Numero: "pessoaEndereco3Numero",
  endereco3Complemento: "pessoaEndereco3Complemento",
  endereco3Bairro: "pessoaEndereco3Bairro",
  endereco3Cidade: "pessoaEndereco3Cidade",
  endereco3Uf: "pessoaEndereco3Uf"
};


function abrirFormPessoa(
  pessoa=null
){

  pessoaEditandoId =
    pessoa
      ? Number(pessoa.id)
      : null;

  $("pessoaFormTitulo")
    .textContent =
    pessoa
      ? "Editar pessoa"
      : "Nova pessoa";

  const campos = {
    pessoaNome:
      pessoa?.nome || "",
    pessoaCpf:
      pessoa?.cpf || "",
    pessoaDataNascimento:
      pessoa?.dataNascimento || "",
    pessoaObservacoes:
      pessoa?.observacoes || "",
    pessoaFonte:
      pessoa?.fonte || "",
    pessoaReferencia:
      pessoa?.referencia || "",
    ...Object.fromEntries(
      Object.entries(camposContatoEnderecoPessoa)
        .map(function([campo, id]){
          return [
            id,
            pessoa?.[campo] ?? ""
          ];
        })
    )
  };

  Object.entries(campos).forEach(
    function([id, valor]){
      $(id).value = valor;
    }
  );

  mostrar(
    $("pessoaFormCard")
  );

  $("pessoaNome").focus();

}


function fecharFormPessoa(){

  esconder(
    $("pessoaFormCard")
  );

  $("pessoaForm").reset();

  pessoaEditandoId = null;

}


$("pessoaForm").addEventListener(
  "submit",
  async function(e){

    e.preventDefault();

    if(!investigacaoAtual){
      alert("Abra um processo antes de cadastrar pessoas.");
      return;
    }

    const payload = {
      nome:
        $("pessoaNome").value.trim(),
      cpf:
        $("pessoaCpf").value.trim(),
      dataNascimento:
        $("pessoaDataNascimento").value,
      observacoes:
        $("pessoaObservacoes").value.trim(),
      fonte:
        $("pessoaFonte").value.trim(),
      referencia:
        $("pessoaReferencia").value.trim(),
      ...Object.fromEntries(
        Object.entries(camposContatoEnderecoPessoa)
          .map(function([campo, id]){
            return [
              campo,
              $(id).value.trim()
            ];
          })
      )
    };

    try{

      const payloadPessoa =
        pessoaEditandoId
          ? payload
          : {
              investigacaoId:
                Number(investigacaoAtual.id),
              ...payload
            };

      const dados =
        await api(
          pessoaEditandoId
            ? "/pessoas/" + pessoaEditandoId
            : "/pessoas",
          {
            method:
              pessoaEditandoId
                ? "PUT"
                : "POST",
            body:
              JSON.stringify(payloadPessoa)
          }
        );

      fecharFormPessoa();
      await carregarPessoas();

      alert(
        dados.mensagem ||
        "Pessoa salva com sucesso."
      );

    }catch(e){

      alert(e.message);

    }

  }
);


function abrirDetalhePessoa(id){

  pessoaAtual =
    pessoas.find(function(pessoa){
      return Number(pessoa.id) ===
        Number(id);
    });

  if(!pessoaAtual){
    return;
  }

  renderizarDetalhePessoa();

  mostrarSomente(
    "pessoaDetalheScreen"
  );

}


function voltarDaInvestigacao(){
  const clienteId = retornoProcessoClienteId;
  retornoProcessoClienteId = null;
  if(clienteId && clienteId > 0){
    abrirCliente(clienteId);
  }else{
    voltarInicio();
  }
}


function renderizarDetalhePessoa(){

  const pessoa =
    pessoaAtual;

  const camposEndereco = [
    ["CEP", "Cep"],
    ["Logradouro", "Logradouro"],
    ["Número", "Numero"],
    ["Complemento", "Complemento"],
    ["Bairro", "Bairro"],
    ["Cidade", "Cidade"],
    ["UF", "Uf"]
  ];

  const enderecosHtml =
    [1, 2, 3]
      .map(function(numero){
        const campos =
          camposEndereco.map(
            function([rotulo, sufixo]){
              return [
                rotulo,
                pessoa[
                  "endereco" +
                  numero +
                  sufixo
                ]
              ];
            }
          );

        if (!campos.some(function([, valor]){
          return String(valor ?? "").trim();
        })) {
          return "";
        }

        return [
          '<h3 class="section-title">📍 Endereço ' +
            numero +
            "</h3>",
          '<div class="detail-grid">',
          campos.map(function([rotulo, valor]){
            return detail(rotulo, valor);
          }).join(""),
          "</div>"
        ].join("");
      })
      .join("");

  const referencia =
    String(pessoa.referencia || "").trim();

  const linkReferencia =
    /^https?:\/\//i.test(referencia)
      ? `
          <p>
            <a
              href="${escapeHtml(referencia)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir referência da fonte
            </a>
          </p>
        `
      : "";

  $("pessoaDetalhe").innerHTML = `

    <h3 class="section-title">📋 Identificação</h3>
    <div class="detail-grid">
      ${detail("Nome completo", pessoa.nome)}
      ${detail("CPF", pessoa.cpf)}
      ${detail("Data de nascimento", pessoa.dataNascimento)}
    </div>

    <h3 class="section-title">☎️ Contato</h3>
    <div class="detail-grid">
      ${detail("Telefone", pessoa.telefone)}
      ${detail("E-mail", pessoa.email)}
      ${detail("Rede social", pessoa.redeSocial)}
    </div>

    ${enderecosHtml}

    <h3 class="section-title">ℹ️ Informações</h3>
    <div class="detail-grid">
      ${detail("Fonte da informação", pessoa.fonte)}
      ${detail("Link ou referência", pessoa.referencia)}
    </div>
    ${linkReferencia}

    <h3 class="section-title">📝 Observações</h3>
    <div class="detail">
      <strong>${escapeHtml(
        pessoa.observacoes ||
        "Nenhuma observação cadastrada."
      )}</strong>
    </div>

  `;

}


function editarPessoaAtual(){

  if(!pessoaAtual){
    return;
  }

  mostrarSomente(
    "pessoasScreen"
  );

  abrirFormPessoa(
    pessoaAtual
  );

}


async function excluirPessoaAtual(){

  if(!pessoaAtual){
    return;
  }

  if(!confirm("Excluir esta pessoa?")){
    return;
  }

  try{

    const dados =
      await api(
        "/pessoas/" +
        encodeURIComponent(pessoaAtual.id),
        {
          method:"DELETE"
        }
      );

    alert(
      dados.mensagem ||
      "Pessoa excluída com sucesso."
    );

    pessoaAtual = null;

    await abrirPessoas();

  }catch(e){

    alert(e.message);

  }

}


/* =========================
   RELATÓRIOS
========================= */

async function abrirRelatorio(){

  mostrarSomente(
    "relatorioScreen"
  );


  $("relatorioConteudo")
    .innerHTML =
    '<div class="loading">' +
    'Carregando processos...' +
    '</div>';


  try{

    if(
      !investigacoes.length
    ){

      await carregarInvestigacoes();

    }


    if(
      !investigacoes.length
    ){

      $("relatorioConteudo")
        .innerHTML = `

          <div class="empty">

            Nenhum processo cadastrado.

            <div
              class="actions"
              style="justify-content:center"
            >

              <button
                class="btn btn-primary"
                onclick='mostrarSomente("homeScreen"); mostrarNovaInvestigacao();'
              >
                ＋ Novo processo
              </button>

            </div>

          </div>

        `;

      return;

    }


    if(
      investigacaoAtual
    ){

      await gerarRelatorioDaInvestigacao(
        investigacaoAtual.id
      );

      return;

    }


    $("relatorioConteudo")
      .innerHTML = `

        <div class="relatorio-capa">

          <div class="badge">
            RELATÓRIOS DE PROCESSOS
          </div>

          <h1>
            Meu Investigador
          </h1>

          <p class="muted">
            Selecione o processo
            que deseja consultar.
          </p>

        </div>


        <div class="relatorio-section">

          <h2>
            🔎 Clientes e processos
          </h2>

          ${
            agruparInvestigacoesPorCliente(investigacoes)
              .map(function(grupo){
                const processos = grupo.processos.map(function(inv, indice){
                  return `
                    <div class="item-head" style="${indice ? "border-top:1px solid var(--line);padding-top:14px;margin-top:14px" : "margin-top:14px"}">
                      <div>
                        <div class="item-title">Processo: ${escapeHtml(inv.processo || "Não informado")}</div>
                        <div class="muted">Advogado: ${escapeHtml(inv.advogado || "-")}</div>
                      </div>
                      <div class="actions" style="margin-top:0">
                        <button class="btn btn-primary" onclick="gerarRelatorioDaInvestigacao(${Number(inv.id)})">📄 Gerar relatório</button>
                      </div>
                    </div>`;
                }).join("");

                return `
                  <div class="item">
                    <div class="item-title">Cliente: ${escapeHtml(grupo.nome || "-")}</div>
                    <div class="muted">Documento: ${escapeHtml(grupo.documento || "-")}</div>
                    <div class="muted">Processos cadastrados: ${grupo.processos.length}</div>
                    <div style="border-top:1px solid var(--line);margin-top:14px;padding-top:2px">
                      ${processos}
                    </div>
                  </div>`;
              })
              .join("")
          }

        </div>

      `;

  }catch(e){

    $("relatorioConteudo")
      .innerHTML =
      '<div class="error">' +
      'Erro ao carregar relatórios: ' +
      escapeHtml(
        e.message
      ) +
      '</div>';

  }

}


async function gerarRelatorioDaInvestigacao(
  id
){

  const encontrada =
    investigacoes.find(
      function(x){

        return Number(x.id) ===
          Number(id);

      }
    );


  if(!encontrada){

    alert(
      "Processo não encontrado."
    );

    return;

  }


  investigacaoAtual =
    encontrada;


  mostrarSomente(
    "relatorioScreen"
  );


  $("relatorioConteudo")
    .innerHTML =
    '<div class="loading">' +
    'Preparando relatório...' +
    '</div>';


  try{

    const [
      dadosImoveis,
      dadosVeiculos,
      dadosPessoas
    ] =
      await Promise.all([

        api(
          "/imoveis?investigacao_id=" +
          encodeURIComponent(
            investigacaoAtual.id
          )
        ),

        api(
          "/veiculos?investigacao_id=" +
          encodeURIComponent(
            investigacaoAtual.id
          )
        ),

        api(
          "/pessoas?investigacao_id=" +
          encodeURIComponent(
            investigacaoAtual.id
          )
        )

      ]);


    relatorioImoveis =
      Array.isArray(
        dadosImoveis
      )
        ? dadosImoveis
        : (
            dadosImoveis.results ||
            []
          );


    relatorioVeiculos =
      Array.isArray(
        dadosVeiculos
      )
        ? dadosVeiculos
        : (
            dadosVeiculos.results ||
            []
          );

    relatorioPessoas =
      Array.isArray(
        dadosPessoas
      )
        ? dadosPessoas
        : Array.isArray(
            dadosPessoas?.results
          )
          ? dadosPessoas.results
          : [];


    renderizarRelatorio();

  }catch(e){

    $("relatorioConteudo")
      .innerHTML =
      '<div class="error">' +
      'Erro ao preparar relatório: ' +
      escapeHtml(
        e.message
      ) +
      '</div>';

  }

}


function renderizarRelatorio(){

  const inv =
    investigacaoAtual;

  const campoRelatorioPessoa =
    function(rotulo, valor){
      const texto =
        String(valor ?? "").trim();

      return texto
        ? detail(rotulo, texto)
        : "";
    };

  const grupoRelatorioPessoa =
    function(titulo, campos){
      return campos
        ? '<div class="section-title">' +
            escapeHtml(titulo) +
            '</div><div class="detail-grid">' +
            campos +
            '</div>'
        : "";
    };


  const imoveisHtml =
    relatorioImoveis.length

      ? relatorioImoveis
          .map(
            function(
              im,
              index
            ){

              return `

                <div
                  class="relatorio-item"
                >

                  <h3>

                    🏠 Imóvel
                    ${index + 1}

                    —

                    ${escapeHtml(
                      im.tipo ||
                      "Imóvel"
                    )}

                  </h3>


                  <div class="detail-grid">

                    ${detail(
                      "Matrícula",
                      im.matricula
                    )}

                    ${detail(
                      "Cartório",
                      im.cartorio
                    )}

                    ${detail(
                      "CEP",
                      im.cep
                    )}

                    ${detail(
                      "Endereço",
                      im.endereco
                    )}

                    ${detail(
                      "Número",
                      im.numero
                    )}

                    ${detail(
                      "Complemento",
                      im.complemento
                    )}

                    ${detail(
                      "Bairro",
                      im.bairro
                    )}

                    ${detail(
                      "Cidade",
                      im.cidade
                    )}

                    ${detail(
                      "UF",
                      im.uf
                    )}

                    ${detail(
                      "Valor",
                      im.valor
                    )}

                    ${detail(
                      "Fonte",
                      im.fonte
                    )}

                    ${detail(
                      "Data de cadastro",
                      formatarData(
                        im.data_criacao
                      )
                    )}

                  </div>


                  <div
                    class="section-title"
                  >
                    📝 Observações
                  </div>


                  <div class="detail">

                    <strong>

                      ${escapeHtml(
                        im.observacoes ||
                        "Nenhuma observação cadastrada."
                      )}

                    </strong>

                  </div>

                </div>

              `;

            }
          )
          .join("")

      : `

        <div class="empty">
          Nenhum imóvel cadastrado
          neste processo.
        </div>

      `;


  const veiculosHtml =
    relatorioVeiculos.length

      ? relatorioVeiculos
          .map(
            function(
              v,
              index
            ){

              return `

                <div
                  class="relatorio-item"
                >

                  <h3>

                    🚗 Veículo
                    ${index + 1}

                    —

                    ${escapeHtml(
                      (
                        v.marca ||
                        ""
                      ) +
                      " " +
                      (
                        v.modelo ||
                        ""
                      )
                    )}

                  </h3>


                  <div class="detail-grid">

                    ${detail(
                      "Tipo",
                      v.tipo
                    )}

                    ${detail(
                      "Marca",
                      v.marca
                    )}

                    ${detail(
                      "Modelo",
                      v.modelo
                    )}

                    ${detail(
                      "Ano",
                      v.ano
                    )}

                    ${detail(
                      "Cor",
                      v.cor
                    )}

                    ${detail(
                      "Placa",
                      v.placa
                    )}

                    ${detail(
                      "RENAVAM",
                      v.renavam
                    )}

                    ${detail(
                      "Chassi",
                      v.chassi
                    )}

                    ${detail(
                      "Cidade",
                      v.cidade
                    )}

                    ${detail(
                      "UF",
                      v.uf
                    )}

                    ${detail(
                      "Valor pela Tabela FIPE",
                      v.valor
                    )}

                    ${detail(
                      "Data de referência FIPE",
                      formatarDataFipe(
                        v.data_fipe
                      )
                    )}

                    ${detail(
                      "Fonte",
                      v.fonte
                    )}

                    ${detail(
                      "Data de cadastro",
                      formatarData(
                        v.data_criacao
                      )
                    )}

                  </div>


                  <div
                    class="section-title"
                  >
                    📝 Observações
                  </div>


                  <div class="detail">

                    <strong>

                      ${escapeHtml(
                        v.observacoes ||
                        "Nenhuma observação cadastrada."
                      )}

                    </strong>

                  </div>

                </div>

              `;

            }
          )
          .join("")

      : `

        <div class="empty">
          Nenhum veículo cadastrado
          neste processo.
        </div>

      `;

  const pessoasHtml =
    relatorioPessoas.length
      ? relatorioPessoas
          .map(function(pessoa, index){
            const identificacao = [
              campoRelatorioPessoa("Nome completo", pessoa.nome),
              campoRelatorioPessoa("CPF", pessoa.cpf),
              campoRelatorioPessoa(
                "Data de nascimento",
                pessoa.dataNascimento
              )
            ].join("");

            const contato = [
              campoRelatorioPessoa("Telefone", pessoa.telefone),
              campoRelatorioPessoa("E-mail", pessoa.email),
              campoRelatorioPessoa(
                "Rede social",
                pessoa.redeSocial
              )
            ].join("");

            const enderecos =
              [1, 2, 3]
                .map(function(numero){
                  const campos = [
                    ["CEP", "Cep"],
                    ["Logradouro", "Logradouro"],
                    ["Número", "Numero"],
                    ["Complemento", "Complemento"],
                    ["Bairro", "Bairro"],
                    ["Cidade", "Cidade"],
                    ["UF", "Uf"]
                  ]
                    .map(function([rotulo, sufixo]){
                      return campoRelatorioPessoa(
                        rotulo,
                        pessoa[
                          "endereco" +
                          numero +
                          sufixo
                        ]
                      );
                    })
                    .join("");

                  return grupoRelatorioPessoa(
                    "Endereço " + numero,
                    campos
                  );
                })
                .join("");

            const informacoes = [
              campoRelatorioPessoa(
                "Fonte da informação",
                pessoa.fonte
              ),
              campoRelatorioPessoa(
                "Link ou referência",
                pessoa.referencia
              )
            ].join("");

            const observacoes =
              campoRelatorioPessoa(
                "Observações",
                pessoa.observacoes
              );

            return (
              '<div class="relatorio-item">' +
                '<h3>👤 Pessoa ' +
                  (index + 1) +
                  ' — ' +
                  escapeHtml(
                    String(pessoa.nome ?? "").trim() ||
                    "Pessoa"
                  ) +
                '</h3>' +
                grupoRelatorioPessoa(
                  "Identificação",
                  identificacao
                ) +
                grupoRelatorioPessoa(
                  "Contato",
                  contato
                ) +
                enderecos +
                grupoRelatorioPessoa(
                  "Informações",
                  informacoes
                ) +
                grupoRelatorioPessoa(
                  "Observações",
                  observacoes
                ) +
              '</div>'
            );
          })
          .join("")
      : '<div class="empty">' +
          'Nenhuma pessoa cadastrada neste processo.' +
        '</div>';


  const agora =
    new Date()
      .toLocaleString(
        "pt-BR"
      );


  $("relatorioConteudo")
    .innerHTML = `

      <div class="relatorio-capa">

        <h1>
          RELATÓRIO
        </h1>

      </div>


      <div class="relatorio-meta">

        <div class="detail">

          <span class="muted">
            Cliente
          </span>

          <strong>
            ${escapeHtml(
              inv.nome ||
              "-"
            )}
          </strong>

        </div>


        <div class="detail">

          <span class="muted">
            Documento
          </span>

          <strong>
            ${escapeHtml(
              inv.documento ||
              "-"
            )}
          </strong>

        </div>


        <div class="detail">

          <span class="muted">
            Processo
          </span>

          <strong>
            ${escapeHtml(
              inv.processo ||
              "-"
            )}
          </strong>

        </div>


        <div class="detail">

          <span class="muted">
            Advogado
          </span>

          <strong>
            ${escapeHtml(
              inv.advogado ||
              "-"
            )}
          </strong>

        </div>


        <div class="detail">

          <span class="muted">
            Data de criação
          </span>

          <strong>
            ${formatarData(
              inv.data_criacao
            )}
          </strong>

        </div>


        <div class="detail">

          <span class="muted">
            Data do relatório
          </span>

          <strong>
            ${agora}
          </strong>

        </div>

      </div>


      <div class="relatorio-section">

        <h2>
          📊 Resumo patrimonial
        </h2>

        <div class="relatorio-counts">

          <div class="relatorio-count">

            <span class="muted">
              Processos
            </span>

            <strong>
              1
            </strong>

          </div>


          <div class="relatorio-count">

            <span class="muted">
              Imóveis
            </span>

            <strong>
              ${relatorioImoveis.length}
            </strong>

          </div>


          <div class="relatorio-count">

            <span class="muted">
              Veículos
            </span>

            <strong>
              ${relatorioVeiculos.length}
            </strong>

          </div>

          <div class="relatorio-count">

            <span class="muted">
              Pessoas
            </span>

            <strong>
              ${relatorioPessoas.length}
            </strong>

          </div>

        </div>

      </div>


      <div class="relatorio-section">

        <h2>
          🔎 Fontes / diligências
        </h2>

        <div class="detail">

          <strong>

            ${escapeHtml(
              inv.fontes ||
              "Nenhuma fonte informada."
            )}

          </strong>

        </div>

      </div>


      <div class="relatorio-section">

        <h2>
          🏠 Imóveis encontrados
        </h2>

        ${imoveisHtml}

      </div>


      <div class="relatorio-section">

        <h2>
          🚗 Veículos encontrados
        </h2>

        ${veiculosHtml}

      </div>

      <div class="relatorio-section">

        <h2>
          👤 Pessoas encontradas
        </h2>

        ${pessoasHtml}

      </div>


      <div class="relatorio-footer">

        Documento gerado pelo
        Meu Investigador em
        ${agora}.

      </div>

    `;

}


function voltarDaTelaRelatorio(){

  if(
    investigacaoAtual
  ){

    const clienteId = retornoProcessoClienteId;

    abrirInvestigacao(
      investigacaoAtual.id,
      clienteId
    );

  }else{

    voltarInicio();

  }

}


/* =========================
   HELPERS
========================= */

function detail(
  titulo,
  valor
){

  return `

    <div class="detail">

      <span class="muted">

        ${escapeHtml(
          titulo
        )}

      </span>

      <strong>

        ${escapeHtml(
          valor ||
          "-"
        )}

      </strong>

    </div>

  `;

}


function formatarData(
  valor
){

  if(!valor){
    return "-";
  }


  const d =
    new Date(
      String(valor)
        .replace(
          " ",
          "T"
        ) +
      "Z"
    );


  if(
    Number.isNaN(
      d.getTime()
    )
  ){

    return String(valor);

  }


  return d.toLocaleString(
    "pt-BR"
  );

}


function formatarDataFipe(
  valor
){

  if(!valor){
    return "-";
  }


  if(
    /^\d{4}-\d{2}-\d{2}$/
      .test(valor)
  ){

    const [
      ano,
      mes,
      dia
    ] =
      valor.split("-");


    return (
      dia +
      "/" +
      mes +
      "/" +
      ano
    );

  }


  return valor;

}


/* =========================
   INICIALIZAÇÃO
========================= */

iniciar();
