const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://meuinvestigador.com.br",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400"
};

// =================================================
// RESPOSTA JSON
// =================================================

function respostaJSON(dados, status = 200) {
  return new Response(
    JSON.stringify(dados),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json; charset=UTF-8"
      }
    }
  );
}

// =================================================
// BASE64
// =================================================

function base64(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ParaBytes(base64Texto) {
  const binary = atob(base64Texto);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

// =================================================
// HASH SHA-256
// =================================================

async function sha256(texto) {
  const dados = new TextEncoder().encode(texto);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    dados
  );

  return base64(new Uint8Array(hash));
}

// =================================================
// HASH DE SENHA - PBKDF2
// =================================================

async function gerarHashSenha(senha, saltBytes) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    material,
    256
  );

  return base64(new Uint8Array(bits));
}

// =================================================
// VERIFICAR SENHA
// =================================================

async function verificarSenha(senha, senhaHash) {
  try {
    const partes = senhaHash.split(":");

    if (partes.length !== 4) {
      return false;
    }

    const salt = base64ParaBytes(partes[2]);
    const hashEsperado = partes[3];

    const hashAtual = await gerarHashSenha(
      senha,
      salt
    );

    return hashAtual === hashEsperado;

  } catch (erro) {
    console.error(erro);
    return false;
  }
}  

// =================================================
// CRIAR HASH DA SENHA
// =================================================

async function criarHashSenha(senha) {
  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const hash = await gerarHashSenha(
    senha,
    salt
  );

  return base64(salt) + ":" + hash;
}

// =================================================
// TOKEN DE SESSÃO
// =================================================

function gerarToken() {
  const bytes = crypto.getRandomValues(
    new Uint8Array(32)
  );

  return base64(bytes);
}

// =================================================
// COOKIES
// =================================================

function obterCookie(request, nome) {
  const cookie = request.headers.get("Cookie");

  if (!cookie) {
    return null;
  }

  const partes = cookie.split(";");

  for (const parte of partes) {
    const [chave, ...resto] =
      parte.trim().split("=");

    if (chave === nome) {
      return resto.join("=");
    }
  }

  return null;
}

// =================================================
// OBTER USUÁRIO LOGADO
// =================================================

async function obterUsuario(request, env) {
  try {
    const token = obterCookie(
      request,
      "meu_investigador_sessao"
    );

    if (!token) {
      return null;
    }

    const tokenHash = await sha256(token);

    const sessao = await env.DB
      .prepare(`
        SELECT
          s.id,
          s.usuario_id,
          s.data_expiracao,
          u.nome,
          u.email,
          u.ativo
        FROM sessoes s
        INNER JOIN usuarios u
          ON u.id = s.usuario_id
        WHERE s.token_hash = ?
          AND s.data_expiracao > datetime('now')
          AND u.ativo = 1
        LIMIT 1
      `)
      .bind(tokenHash)
      .first();

    if (!sessao) {
      return null;
    }

    return {
      id: sessao.usuario_id,
      nome: sessao.nome,
      email: sessao.email
    };

  } catch (erro) {
    console.error(
      "Erro ao obter usuário:",
      erro
    );

    return null;
  }
}

// =================================================
// COOKIE VAZIO
// =================================================

function cookieSessaoVazia() {
  return [
    "meu_investigador_sessao=",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/",
    "Max-Age=0"
  ].join("; ");
}

// =================================================
// COOKIE DE SESSÃO
// =================================================

function cookieSessao(token) {
  return [
    "meu_investigador_sessao=" + token,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/",
    "Max-Age=604800"
  ].join("; ");
}

// =================================================
// RESPONSE COM COOKIE
// =================================================

function respostaComCookie(
  dados,
  cookie,
  status = 200
) {
  return new Response(
    JSON.stringify(dados),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type":
          "application/json; charset=UTF-8",
        "Set-Cookie": cookie
      }
    }
  );
}

function cpfPessoaNormalizado(valor) {
  if (!valor) {
    return "";
  }

  if (!/^[0-9.\-\s]+$/.test(valor)) {
    return null;
  }

  const cpf = valor.replace(/[.\-\s]/g, "");

  if (
    !/^\d{11}$/.test(cpf) ||
    /^(\d)\1{10}$/.test(cpf)
  ) {
    return null;
  }

  let soma = 0;

  for (let i = 0; i < 9; i++) {
    soma += Number(cpf[i]) * (10 - i);
  }

  let digito = (soma * 10) % 11;

  if (digito === 10) {
    digito = 0;
  }

  if (digito !== Number(cpf[9])) {
    return null;
  }

  soma = 0;

  for (let i = 0; i < 10; i++) {
    soma += Number(cpf[i]) * (11 - i);
  }

  digito = (soma * 10) % 11;

  if (digito === 10) {
    digito = 0;
  }

  if (digito !== Number(cpf[10])) {
    return null;
  }

  return cpf;
}


function dataPessoaValida(valor) {
  if (!valor) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const data = new Date(
    valor + "T00:00:00.000Z"
  );

  return (
    !Number.isNaN(data.getTime()) &&
    data.toISOString().slice(0, 10) === valor
  );
}


function validarDadosPessoa(dados) {
  if (
    !dados ||
    typeof dados !== "object" ||
    Array.isArray(dados)
  ) {
    return {
      erro: "Dados da pessoa inválidos."
    };
  }

  const especificacoes = [
    ["nome", 200, "Nome completo"],
    ["nomeSocial", 200, "Nome social"],
    ["papel", 100, "Papel na investigação"],
    ["descricaoRelacao", 500, "Descrição da relação"],
    ["observacoes", 5000, "Observações"],
    ["fonte", 500, "Fonte da informação"],
    ["dataNascimento", 10, "Data de nascimento"],
    ["dataObtencao", 10, "Data de obtenção"],
    ["referencia", 2000, "Referência da fonte"],
    ["cpf", 14, "CPF"],
    ["telefone", 40, "Telefone"],
    ["email", 254, "E-mail"],
    ["redeSocial", 500, "Rede social"],
    ["endereco1Cep", 20, "CEP do endereço 1"],
    ["endereco1Logradouro", 300, "Endereço do endereço 1"],
    ["endereco1Numero", 50, "Número do endereço 1"],
    ["endereco1Complemento", 200, "Complemento do endereço 1"],
    ["endereco1Bairro", 150, "Bairro do endereço 1"],
    ["endereco1Cidade", 150, "Cidade do endereço 1"],
    ["endereco1Uf", 2, "UF do endereço 1"],
    ["endereco2Cep", 20, "CEP do endereço 2"],
    ["endereco2Logradouro", 300, "Endereço do endereço 2"],
    ["endereco2Numero", 50, "Número do endereço 2"],
    ["endereco2Complemento", 200, "Complemento do endereço 2"],
    ["endereco2Bairro", 150, "Bairro do endereço 2"],
    ["endereco2Cidade", 150, "Cidade do endereço 2"],
    ["endereco2Uf", 2, "UF do endereço 2"],
    ["endereco3Cep", 20, "CEP do endereço 3"],
    ["endereco3Logradouro", 300, "Endereço do endereço 3"],
    ["endereco3Numero", 50, "Número do endereço 3"],
    ["endereco3Complemento", 200, "Complemento do endereço 3"],
    ["endereco3Bairro", 150, "Bairro do endereço 3"],
    ["endereco3Cidade", 150, "Cidade do endereço 3"],
    ["endereco3Uf", 2, "UF do endereço 3"]
  ];

  const pessoa = {};

  for (const [chave, limite, rotulo] of especificacoes) {
    let valor = dados[chave];

    if (valor === undefined || valor === null) {
      valor = "";
    }

    if (typeof valor !== "string") {
      return {
        erro: "Campo " + rotulo + " inválido."
      };
    }

    valor = valor.trim();

    if (valor.length > limite) {
      return {
        erro: "Campo " + rotulo + " excede o tamanho permitido."
      };
    }

    pessoa[chave] = valor;
  }

  for (const chave of ["endereco1Uf", "endereco2Uf", "endereco3Uf"]) {
    if (pessoa[chave] && !/^[a-z]{2}$/i.test(pessoa[chave])) {
      return {
        erro: "UF inválida. Informe duas letras ou deixe o campo vazio."
      };
    }

    pessoa[chave] = pessoa[chave].toUpperCase();
  }

  if (!pessoa.nome) {
    return {
      erro: "Informe o nome completo."
    };
  }

  const cpf = cpfPessoaNormalizado(pessoa.cpf);

  if (cpf === null) {
    return {
      erro: "CPF inválido."
    };
  }

  pessoa.cpf = cpf;

  let status = dados.status;

  if (status === undefined || status === null || status === "") {
    status = "Não verificada";
  }

  if (
    typeof status !== "string" ||
    ![
      "Não verificada",
      "Parcialmente verificada",
      "Verificada"
    ].includes(status.trim())
  ) {
    return {
      erro: "Status da informação inválido."
    };
  }

  pessoa.status = status.trim();

  if (
    !dataPessoaValida(pessoa.dataNascimento) ||
    !dataPessoaValida(pessoa.dataObtencao)
  ) {
    return {
      erro: "Informe datas válidas no formato AAAA-MM-DD."
    };
  }

  const hoje = new Date().toISOString().slice(0, 10);

  if (
    pessoa.dataNascimento &&
    pessoa.dataNascimento > hoje
  ) {
    return {
      erro: "A data de nascimento não pode ser futura."
    };
  }

  if (
    pessoa.dataObtencao &&
    pessoa.dataObtencao > hoje
  ) {
    return {
      erro: "A data de obtenção não pode ser futura."
    };
  }

  return {
    pessoa
  };
}

function validarDadosCliente(dados) {
  if (
    !dados ||
    typeof dados !== "object" ||
    Array.isArray(dados)
  ) {
    return { erro: "Dados do cliente inválidos." };
  }

  if (
    typeof dados.nome !== "string" ||
    !dados.nome.trim()
  ) {
    return { erro: "Informe o nome do cliente." };
  }

  const nome = dados.nome.trim();
  const documento = dados.documento == null
    ? ""
    : dados.documento;

  if (
    nome.length > 200 ||
    typeof documento !== "string" ||
    documento.trim().length > 40
  ) {
    return { erro: "Os dados do cliente excedem o tamanho permitido." };
  }

  return {
    cliente: {
      nome,
      documento: documento.trim()
    }
  };
}

function normalizarDocumentoCliente(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .replace(/[.\-/\s]/g, "");
}

async function encontrarClientePorIdentidade(
  env,
  usuarioId,
  nome,
  documento
) {
  const documentoNormalizado =
    normalizarDocumentoCliente(documento);

  if (documentoNormalizado) {
    const porDocumento = await env.DB
      .prepare(`
        SELECT id, nome, documento
        FROM clientes
        WHERE usuario_id = ?
          AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(documento), '.', ''), '-', ''), '/', ''), ' ', ''), char(9), '')) = ?
        ORDER BY id
        LIMIT 1
      `)
      .bind(usuarioId, documentoNormalizado)
      .first();

    if (porDocumento) return porDocumento;
  }

  return env.DB
    .prepare(`
      SELECT id, nome, documento
      FROM clientes
      WHERE usuario_id = ?
        AND LOWER(TRIM(nome)) = LOWER(TRIM(?))
        AND LOWER(TRIM(COALESCE(documento, ''))) =
          LOWER(TRIM(COALESCE(?, '')))
      ORDER BY id
      LIMIT 1
    `)
    .bind(usuarioId, nome, documento)
    .first();
}

// =================================================
// WORKER
// =================================================

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    // =================================================
    // OPTIONS / CORS
    // =================================================

    if (request.method === "OPTIONS") {
      return new Response(
        null,
        {
          status: 204,
          headers: CORS_HEADERS
        }
      );
    }

    // =================================================
    // API STATUS
    // =================================================

    if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {
      return respostaJSON({
        ok: true,
        sistema: "Meu Investigador API",
        status: "online"
      });
    }

    // =================================================
    // LOGIN
    // =================================================

    if (
      request.method === "POST" &&
      url.pathname === "/login"
    ) {

      try {

        const dados = await request.json();

        const email = String(
          dados.email || ""
        )
          .trim()
          .toLowerCase();

        const senha = String(
          dados.senha || ""
        );

        if (!email || !senha) {
          return respostaJSON({
            ok: false,
            erro: "Informe e-mail e senha."
          }, 400);
        }

        const usuario = await env.DB
          .prepare(`
            SELECT
              id,
              nome,
              email,
              senha_hash,
              ativo
            FROM usuarios
            WHERE email = ?
            LIMIT 1
          `)
          .bind(email)
          .first();

        if (!usuario) {
          return respostaJSON({
            ok: false,
            erro: "E-mail ou senha inválidos."
          }, 401);
        }

        if (!usuario.ativo) {
          return respostaJSON({
            ok: false,
            erro: "Usuário inativo."
          }, 403);
        }

        const senhaValida =
          await verificarSenha(
            senha,
            usuario.senha_hash
          );

        if (!senhaValida) {
          return respostaJSON({
            ok: false,
            erro: "E-mail ou senha inválidos."
          }, 401);
        }

        const token = gerarToken();
        const tokenHash = await sha256(token);

        await env.DB
          .prepare(`
            DELETE FROM sessoes
            WHERE data_expiracao <= datetime('now')
          `)
          .run();

        await env.DB
          .prepare(`
            INSERT INTO sessoes (
              usuario_id,
              token_hash,
              data_criacao,
              data_expiracao
            )
            VALUES (
              ?,
              ?,
              datetime('now'),
              datetime('now', '+7 days')
            )
          `)
          .bind(
            usuario.id,
            tokenHash
          )
          .run();

        return respostaComCookie(
          {
            ok: true,
            usuario: {
              id: usuario.id,
              nome: usuario.nome,
              email: usuario.email
            }
          },
          cookieSessao(token)
        );

      } catch (erro) {

        console.error(
          "Erro no login:",
          erro
        );

        return respostaJSON({
          ok: false,
          erro: "Erro ao realizar login."
        }, 500);
      }
    }

    // =================================================
    // LOGOUT
    // =================================================

    if (
      request.method === "POST" &&
      url.pathname === "/logout"
    ) {

      try {

        const token = obterCookie(
          request,
          "meu_investigador_sessao"
        );

        if (token) {

          const tokenHash =
            await sha256(token);

          await env.DB
            .prepare(`
              DELETE FROM sessoes
              WHERE token_hash = ?
            `)
            .bind(tokenHash)
            .run();
        }

        return respostaComCookie(
          {
            ok: true
          },
          cookieSessaoVazia()
        );

      } catch (erro) {

        console.error(
          "Erro no logout:",
          erro
        );

        return respostaComCookie(
          {
            ok: true
          },
          cookieSessaoVazia()
        );
      }
    }

    // =================================================
    // USUÁRIO ATUAL
    // =================================================

    if (
      request.method === "GET" &&
      url.pathname === "/usuario"
    ) {

      const usuario =
        await obterUsuario(
          request,
          env
        );

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      return respostaJSON({
        ok: true,
        usuario
      });
    }

    // =================================================
    // AUTENTICAÇÃO
    // =================================================

    const usuario =
      await obterUsuario(
        request,
        env
      );

    // =================================================
    // CLIENTES - LISTAR
    // =================================================

    if (
      request.method === "GET" &&
      url.pathname === "/clientes"
    ) {
      if (!usuario) {
        return respostaJSON({ ok: false, erro: "Não autenticado." }, 401);
      }

      try {
        const resultado = await env.DB
          .prepare(`
            SELECT
              c.id,
              c.nome,
              c.documento,
              c.data_criacao AS dataCriacao,
              c.data_atualizacao AS dataAtualizacao,
              COUNT(i.id) AS totalProcessos
            FROM clientes c
            LEFT JOIN investigacoes i
              ON i.cliente_id = c.id
              AND i.usuario_id = c.usuario_id
            WHERE c.usuario_id = ?
            GROUP BY c.id
            ORDER BY c.nome COLLATE NOCASE, c.id
          `)
          .bind(usuario.id)
          .all();

        return respostaJSON(resultado.results || []);
      } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);
        return respostaJSON({ ok: false, erro: "Erro ao carregar clientes." }, 500);
      }
    }

    // =================================================
    // CLIENTES - DETALHAR
    // =================================================

    if (
      request.method === "GET" &&
      /^\/clientes\/\d+$/.test(url.pathname)
    ) {
      if (!usuario) {
        return respostaJSON({ ok: false, erro: "Não autenticado." }, 401);
      }

      try {
        const id = Number(url.pathname.split("/").pop());
        if (!Number.isInteger(id) || id <= 0) {
          return respostaJSON({ ok: false, erro: "Cliente inválido." }, 400);
        }

        const cliente = await env.DB
          .prepare(`
            SELECT id, nome, documento,
              data_criacao AS dataCriacao,
              data_atualizacao AS dataAtualizacao
            FROM clientes
            WHERE id = ? AND usuario_id = ?
            LIMIT 1
          `)
          .bind(id, usuario.id)
          .first();

        if (!cliente) {
          return respostaJSON({ ok: false, erro: "Cliente não encontrado." }, 404);
        }

        const processos = await env.DB
          .prepare(`
            SELECT
              i.id,
              i.cliente_id AS clienteId,
              c.nome AS nome,
              c.documento AS documento,
              i.processo,
              i.advogado,
              i.fontes,
              i.data_criacao,
              i.usuario_id
            FROM investigacoes i
            INNER JOIN clientes c
              ON c.id = i.cliente_id
              AND c.usuario_id = i.usuario_id
            WHERE i.cliente_id = ?
              AND i.usuario_id = ?
            ORDER BY i.id DESC
          `)
          .bind(id, usuario.id)
          .all();

        return respostaJSON({
          ok: true,
          cliente,
          investigacoes: processos.results || []
        });
      } catch (erro) {
        console.error("Erro ao carregar cliente:", erro);
        return respostaJSON({ ok: false, erro: "Erro ao carregar cliente." }, 500);
      }
    }

    // =================================================
    // CLIENTES - CRIAR
    // =================================================

    if (
      request.method === "POST" &&
      url.pathname === "/clientes"
    ) {
      if (!usuario) {
        return respostaJSON({ ok: false, erro: "Não autenticado." }, 401);
      }

      try {
        let dados;
        try {
          dados = await request.json();
        } catch (erro) {
          return respostaJSON({ ok: false, erro: "JSON inválido." }, 400);
        }

        const validacao = validarDadosCliente(dados);
        if (validacao.erro) {
          return respostaJSON({ ok: false, erro: validacao.erro }, 400);
        }

        const existente = await encontrarClientePorIdentidade(
          env,
          usuario.id,
          validacao.cliente.nome,
          validacao.cliente.documento
        );

        if (existente) {
          return respostaJSON({
            ok: true,
            id: existente.id,
            existente: true,
            mensagem: "Este cliente já está cadastrado."
          });
        }

        const resultado = await env.DB
          .prepare(`
            INSERT INTO clientes (usuario_id, nome, documento)
            VALUES (?, ?, ?)
          `)
          .bind(
            usuario.id,
            validacao.cliente.nome,
            validacao.cliente.documento
          )
          .run();

        return respostaJSON({
          ok: true,
          id: resultado.meta.last_row_id,
          mensagem: "Cliente cadastrado com sucesso."
        });
      } catch (erro) {
        console.error("Erro ao cadastrar cliente:", erro);
        return respostaJSON({ ok: false, erro: "Erro ao cadastrar cliente." }, 500);
      }
    }

    // =================================================
    // CLIENTES - EDITAR
    // =================================================

    if (
      request.method === "PUT" &&
      /^\/clientes\/\d+$/.test(url.pathname)
    ) {
      if (!usuario) {
        return respostaJSON({ ok: false, erro: "Não autenticado." }, 401);
      }

      try {
        const id = Number(url.pathname.split("/").pop());
        if (!Number.isInteger(id) || id <= 0) {
          return respostaJSON({ ok: false, erro: "Cliente inválido." }, 400);
        }

        let dados;
        try {
          dados = await request.json();
        } catch (erro) {
          return respostaJSON({ ok: false, erro: "JSON inválido." }, 400);
        }

        const validacao = validarDadosCliente(dados);
        if (validacao.erro) {
          return respostaJSON({ ok: false, erro: validacao.erro }, 400);
        }

        const resultado = await env.DB
          .prepare(`
            UPDATE clientes
            SET nome = ?, documento = ?, data_atualizacao = datetime('now')
            WHERE id = ? AND usuario_id = ?
          `)
          .bind(
            validacao.cliente.nome,
            validacao.cliente.documento,
            id,
            usuario.id
          )
          .run();

        if (!resultado.meta || !resultado.meta.changes) {
          const existente = await env.DB
            .prepare("SELECT id FROM clientes WHERE id = ? AND usuario_id = ?")
            .bind(id, usuario.id)
            .first();
          if (!existente) {
            return respostaJSON({ ok: false, erro: "Cliente não encontrado." }, 404);
          }
        }

        return respostaJSON({ ok: true, mensagem: "Cliente atualizado com sucesso." });
      } catch (erro) {
        console.error("Erro ao atualizar cliente:", erro);
        return respostaJSON({ ok: false, erro: "Erro ao atualizar cliente." }, 500);
      }
    }

    // =================================================
    // INVESTIGAÇÕES - LISTAR
    // =================================================

    if (
      request.method === "GET" &&
      url.pathname === "/investigacoes"
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const resultado =
          await env.DB
            .prepare(`
              SELECT
                i.id,
                COALESCE(c.nome, i.nome) AS nome,
                COALESCE(c.documento, i.documento) AS documento,
                i.cliente_id AS clienteId,
                i.processo,
                i.advogado,
                i.fontes,
                i.data_criacao,
                i.usuario_id
              FROM investigacoes i
              LEFT JOIN clientes c
                ON c.id = i.cliente_id
                AND c.usuario_id = i.usuario_id
              WHERE i.usuario_id = ?
              ORDER BY i.id DESC
            `)
            .bind(usuario.id)
            .all();

        return respostaJSON(
          resultado.results || []
        );

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro: "Erro ao carregar investigações."
        }, 500);
      }
    }

    // =================================================
    // INVESTIGAÇÕES - CRIAR
    // =================================================

    if (
      request.method === "POST" &&
      url.pathname === "/investigacoes"
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        let dados;
        try {
          dados = await request.json();
        } catch (erro) {
          return respostaJSON({ ok: false, erro: "JSON inválido." }, 400);
        }

        if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
          return respostaJSON({ ok: false, erro: "Dados da investigação inválidos." }, 400);
        }

        let cliente;
        if (dados.clienteId !== undefined && dados.clienteId !== null && dados.clienteId !== "") {
          if (typeof dados.clienteId !== "number" && typeof dados.clienteId !== "string") {
            return respostaJSON({ ok: false, erro: "Cliente inválido." }, 400);
          }
          const clienteId = Number(dados.clienteId);
          if (!Number.isInteger(clienteId) || clienteId <= 0) {
            return respostaJSON({ ok: false, erro: "Cliente inválido." }, 400);
          }
          cliente = await env.DB
            .prepare("SELECT id, nome, documento FROM clientes WHERE id = ? AND usuario_id = ? LIMIT 1")
            .bind(clienteId, usuario.id)
            .first();
          if (!cliente) {
            return respostaJSON({ ok: false, erro: "Cliente não encontrado." }, 404);
          }
        } else {
          const validacaoCliente = validarDadosCliente({
            nome: String(dados.nome || "").trim(),
            documento: String(dados.documento || "").trim()
          });
          if (validacaoCliente.erro) {
            return respostaJSON({ ok: false, erro: validacaoCliente.erro }, 400);
          }
          cliente = await encontrarClientePorIdentidade(
            env,
            usuario.id,
            validacaoCliente.cliente.nome,
            validacaoCliente.cliente.documento
          );
          if (!cliente) {
            const novoCliente = await env.DB
              .prepare("INSERT INTO clientes (usuario_id, nome, documento) VALUES (?, ?, ?)")
              .bind(
                usuario.id,
                validacaoCliente.cliente.nome,
                validacaoCliente.cliente.documento
              )
              .run();
            cliente = {
              id: novoCliente.meta.last_row_id,
              nome: validacaoCliente.cliente.nome,
              documento: validacaoCliente.cliente.documento
            };
          }
        }

        const valores = {
          processo: String(dados.processo || "").trim(),
          advogado: String(dados.advogado || "").trim(),
          fontes: Array.isArray(dados.fontes)
            ? JSON.stringify(dados.fontes)
            : String(dados.fontes || "")
        };

        const resultado = await env.DB
          .prepare(`
            INSERT INTO investigacoes (
              nome, documento, processo, advogado, fontes,
              data_criacao, usuario_id, cliente_id
            )
            VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
          `)
          .bind(
            cliente.nome,
            cliente.documento || "",
            valores.processo,
            valores.advogado,
            valores.fontes,
            usuario.id,
            cliente.id
          )
          .run();

        return respostaJSON({
          ok: true,
          id: resultado.meta.last_row_id,
          mensagem:
            "Investigação criada com sucesso."
        });

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao criar investigação."
        }, 500);
      }
    }

    // =================================================
    // INVESTIGAÇÕES - EDITAR DADOS DO PROCESSO
    // =================================================

    if (
      request.method === "PUT" &&
      /^\/investigacoes\/\d+$/.test(url.pathname)
    ) {
      if (!usuario) {
        return respostaJSON({ ok: false, erro: "Não autenticado." }, 401);
      }

      try {
        const id = Number(url.pathname.split("/").pop());
        if (!Number.isInteger(id) || id <= 0) {
          return respostaJSON({ ok: false, erro: "Investigação inválida." }, 400);
        }

        let dados;
        try {
          dados = await request.json();
        } catch (erro) {
          return respostaJSON({ ok: false, erro: "JSON inválido." }, 400);
        }
        if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
          return respostaJSON({ ok: false, erro: "Dados da investigação inválidos." }, 400);
        }

        const valores = {
          processo: String(dados.processo || "").trim(),
          advogado: String(dados.advogado || "").trim(),
          fontes: Array.isArray(dados.fontes)
            ? JSON.stringify(dados.fontes)
            : String(dados.fontes || "")
        };

        const resultado = await env.DB
          .prepare(`
            UPDATE investigacoes
            SET processo = ?, advogado = ?, fontes = ?
            WHERE id = ? AND usuario_id = ?
          `)
          .bind(valores.processo, valores.advogado, valores.fontes, id, usuario.id)
          .run();

        if (!resultado.meta || !resultado.meta.changes) {
          const existente = await env.DB
            .prepare("SELECT id FROM investigacoes WHERE id = ? AND usuario_id = ?")
            .bind(id, usuario.id)
            .first();
          if (!existente) {
            return respostaJSON({ ok: false, erro: "Investigação não encontrada." }, 404);
          }
        }

        return respostaJSON({ ok: true, mensagem: "Processo atualizado com sucesso." });
      } catch (erro) {
        console.error("Erro ao atualizar investigação:", erro);
        return respostaJSON({ ok: false, erro: "Erro ao atualizar investigação." }, 500);
      }
    }

    // =================================================
    // INVESTIGAÇÕES - EXCLUIR
    // =================================================

    if (
      request.method === "DELETE" &&
      url.pathname.startsWith("/investigacoes/")
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Investigação inválida."
          }, 400);
        }

        const investigacao =
          await env.DB
            .prepare(`
              SELECT id
              FROM investigacoes
              WHERE id = ?
                AND usuario_id = ?
            `)
            .bind(
              id,
              usuario.id
            )
            .first();

        if (!investigacao) {
          return respostaJSON({
            ok: false,
            erro:
              "Investigação não encontrada."
          }, 404);
        }

        // Exclui imóveis
        await env.DB
          .prepare(`
            DELETE FROM imoveis
            WHERE investigacao_id = ?
              AND usuario_id = ?
          `)
          .bind(
            id,
            usuario.id
          )
          .run();

        // Exclui veículos
        await env.DB
          .prepare(`
            DELETE FROM veiculos
            WHERE investigacao_id = ?
              AND usuario_id = ?
          `)
          .bind(
            id,
            usuario.id
          )
          .run();

        await env.DB
          .prepare(`
            DELETE FROM pessoas
            WHERE investigacao_id = ?
              AND usuario_id = ?
          `)
          .bind(id, usuario.id)
          .run();

        // Exclui investigação
        await env.DB
          .prepare(`
            DELETE FROM investigacoes
            WHERE id = ?
              AND usuario_id = ?
          `)
          .bind(
            id,
            usuario.id
          )
          .run();

        return respostaJSON({
          ok: true,
          mensagem:
            "Investigação excluída com sucesso."
        });

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao excluir investigação."
        }, 500);
      }
    }

    // =================================================
    // IMÓVEIS - LISTAR
    // =================================================

    if (
      request.method === "GET" &&
      url.pathname === "/imoveis"
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const investigacaoId =
          Number(
            url.searchParams.get(
              "investigacao_id"
            )
          );

        if (
          !Number.isInteger(
            investigacaoId
          ) ||
          investigacaoId <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Investigação inválida."
          }, 400);
        }

        const resultado =
          await env.DB
            .prepare(`
              SELECT
                id,
                investigacao_id,
                usuario_id,
                tipo,
                matricula,
                cartorio,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                uf,
                valor,
                fonte,
                observacoes,
                data_criacao
              FROM imoveis
              WHERE investigacao_id = ?
                AND usuario_id = ?
              ORDER BY id DESC
            `)
            .bind(
              investigacaoId,
              usuario.id
            )
            .all();

        return respostaJSON(
          resultado.results || []
        );

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao carregar imóveis."
        }, 500);
      }
    }

    // =================================================
    // IMÓVEIS - CADASTRAR
    // =================================================

    if (
      request.method === "POST" &&
      url.pathname === "/imoveis"
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const dados =
          await request.json();

        const investigacaoId =
          Number(
            dados.investigacao_id
          );

        if (
          !Number.isInteger(
            investigacaoId
          ) ||
          investigacaoId <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Investigação inválida."
          }, 400);
        }

        const investigacao =
          await env.DB
            .prepare(`
              SELECT id
              FROM investigacoes
              WHERE id = ?
                AND usuario_id = ?
            `)
            .bind(
              investigacaoId,
              usuario.id
            )
            .first();

        if (!investigacao) {
          return respostaJSON({
            ok: false,
            erro:
              "Investigação não encontrada."
          }, 404);
        }

        const resultado =
          await env.DB
            .prepare(`
              INSERT INTO imoveis (
                investigacao_id,
                usuario_id,
                tipo,
                matricula,
                cartorio,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                uf,
                valor,
                fonte,
                observacoes
              )
              VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
              )
            `)
            .bind(
              investigacaoId,
              usuario.id,
              dados.tipo || "",
              dados.matricula || "",
              dados.cartorio || "",
              dados.cep || "",
              dados.endereco || "",
              dados.numero || "",
              dados.complemento || "",
              dados.bairro || "",
              dados.cidade || "",
              dados.uf || "",
              dados.valor || "",
              dados.fonte || "",
              dados.observacoes || ""
            )
            .run();

        return respostaJSON({
          ok: true,
          id:
            resultado.meta.last_row_id,
          mensagem:
            "Imóvel cadastrado com sucesso."
        });

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao cadastrar imóvel."
        }, 500);
      }
    }

    // =================================================
    // IMÓVEIS - DETALHES
    // =================================================

    if (
      request.method === "GET" &&
      /^\/imoveis\/\d+$/.test(
        url.pathname
      )
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        const imovel =
          await env.DB
            .prepare(`
              SELECT
                id,
                investigacao_id,
                usuario_id,
                tipo,
                matricula,
                cartorio,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                uf,
                valor,
                fonte,
                observacoes,
                data_criacao
              FROM imoveis
              WHERE id = ?
                AND usuario_id = ?
              LIMIT 1
            `)
            .bind(
              id,
              usuario.id
            )
            .first();

        if (!imovel) {
          return respostaJSON({
            ok: false,
            erro:
              "Imóvel não encontrado."
          }, 404);
        }

        return respostaJSON({
          ok: true,
          imovel
        });

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao carregar imóvel."
        }, 500);
      }
    }

    // =================================================
    // IMÓVEIS - EDITAR
    // =================================================

    if (
      request.method === "PUT" &&
      /^\/imoveis\/\d+$/.test(
        url.pathname
      )
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Imóvel inválido."
          }, 400);
        }

        const dados =
          await request.json();

        const imovel =
          await env.DB
            .prepare(`
              SELECT
                id,
                investigacao_id
              FROM imoveis
              WHERE id = ?
                AND usuario_id = ?
            `)
            .bind(
              id,
              usuario.id
            )
            .first();

        if (!imovel) {
          return respostaJSON({
            ok: false,
            erro:
              "Imóvel não encontrado."
          }, 404);
        }

        await env.DB
          .prepare(`
            UPDATE imoveis
            SET
              tipo = ?,
              matricula = ?,
              cartorio = ?,
              cep = ?,
              endereco = ?,
              numero = ?,
              complemento = ?,
              bairro = ?,
              cidade = ?,
              uf = ?,
              valor = ?,
              fonte = ?,
              observacoes = ?
            WHERE id = ?
              AND usuario_id = ?
          `)
          .bind(
            dados.tipo || "",
            dados.matricula || "",
            dados.cartorio || "",
            dados.cep || "",
            dados.endereco || "",
            dados.numero || "",
            dados.complemento || "",
            dados.bairro || "",
            dados.cidade || "",
            dados.uf || "",
            dados.valor || "",
            dados.fonte || "",
            dados.observacoes || "",
            id,
            usuario.id
          )
          .run();

        return respostaJSON({
          ok: true,
          mensagem:
            "Imóvel atualizado com sucesso."
        });

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao atualizar imóvel."
        }, 500);
      }
    }

    // =================================================
    // IMÓVEIS - EXCLUIR
    // =================================================

    if (
      request.method === "DELETE" &&
      /^\/imoveis\/\d+$/.test(
        url.pathname
      )
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Imóvel inválido."
          }, 400);
        }

        const resultado =
          await env.DB
            .prepare(`
              DELETE FROM imoveis
              WHERE id = ?
                AND usuario_id = ?
            `)
            .bind(
              id,
              usuario.id
            )
            .run();

        if (
          !resultado.meta ||
          !resultado.meta.changes
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Imóvel não encontrado."
          }, 404);
        }

        return respostaJSON({
          ok: true,
          mensagem:
            "Imóvel excluído com sucesso."
        });

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao excluir imóvel."
        }, 500);
      }
    }

    // =================================================
    // VEÍCULOS - LISTAR
    // =================================================

    if (
      request.method === "GET" &&
      url.pathname === "/veiculos"
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const investigacaoId =
          Number(
            url.searchParams.get(
              "investigacao_id"
            )
          );

        if (
          !Number.isInteger(
            investigacaoId
          ) ||
          investigacaoId <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Investigação inválida."
          }, 400);
        }

        const resultado =
          await env.DB
            .prepare(`
              SELECT
                id,
                investigacao_id,
                usuario_id,
                tipo,
                marca,
                modelo,
                ano,
                placa,
                renavam,
                chassi,
                cor,
                cidade,
                uf,
                valor,
                fonte,
                observacoes,
                data_criacao,
                data_fipe
              FROM veiculos
              WHERE investigacao_id = ?
                AND usuario_id = ?
              ORDER BY id DESC
            `)
            .bind(
              investigacaoId,
              usuario.id
            )
            .all();

        return respostaJSON(
          resultado.results || []
        );

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao carregar veículos."
        }, 500);
      }
    }

    // =================================================
    // VEÍCULOS - CADASTRAR
    // =================================================

    if (
      request.method === "POST" &&
      url.pathname === "/veiculos"
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const dados =
          await request.json();

        const investigacaoId =
          Number(
            dados.investigacao_id
          );

        if (
          !Number.isInteger(
            investigacaoId
          ) ||
          investigacaoId <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Investigação inválida."
          }, 400);
        }

        const investigacao =
          await env.DB
            .prepare(`
              SELECT id
              FROM investigacoes
              WHERE id = ?
                AND usuario_id = ?
              LIMIT 1
            `)
            .bind(
              investigacaoId,
              usuario.id
            )
            .first();

        if (!investigacao) {
          return respostaJSON({
            ok: false,
            erro:
              "Investigação não encontrada."
          }, 404);
        }

        const resultado =
          await env.DB
            .prepare(`
              INSERT INTO veiculos (
                investigacao_id,
                usuario_id,
                tipo,
                marca,
                modelo,
                ano,
                placa,
                renavam,
                chassi,
                cor,
                cidade,
                uf,
                valor,
                fonte,
                observacoes,
                data_fipe
              )
              VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
              )
            `)
            .bind(
              investigacaoId,
              usuario.id,
              String(dados.tipo || ""),
              String(dados.marca || ""),
              String(dados.modelo || ""),
              String(dados.ano || ""),
              String(dados.placa || ""),
              String(dados.renavam || ""),
              String(dados.chassi || ""),
              String(dados.cor || ""),
              String(dados.cidade || ""),
              String(dados.uf || ""),
              String(dados.valor || ""),
              String(dados.fonte || "Tabela FIPE"),
              String(dados.observacoes || ""),
              String(dados.data_fipe || "")
            )
            .run();

        return respostaJSON({
          ok: true,
          id:
            resultado.meta.last_row_id,
          mensagem:
            "Veículo cadastrado com sucesso."
        });

      } catch (erro) {

        console.error(
          "Erro ao cadastrar veículo:",
          erro
        );

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao cadastrar veículo."
        }, 500);
      }
    }

    // =================================================
    // VEÍCULOS - DETALHES
    // =================================================

    if (
      request.method === "GET" &&
      /^\/veiculos\/\d+$/.test(
        url.pathname
      )
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Veículo inválido."
          }, 400);
        }

        const veiculo =
          await env.DB
            .prepare(`
              SELECT
                id,
                investigacao_id,
                usuario_id,
                tipo,
                marca,
                modelo,
                ano,
                placa,
                renavam,
                chassi,
                cor,
                cidade,
                uf,
                valor,
                fonte,
                observacoes,
                data_criacao,
                data_fipe
              FROM veiculos
              WHERE id = ?
                AND usuario_id = ?
              LIMIT 1
            `)
            .bind(
              id,
              usuario.id
            )
            .first();

        if (!veiculo) {
          return respostaJSON({
            ok: false,
            erro:
              "Veículo não encontrado."
          }, 404);
        }

        return respostaJSON({
          ok: true,
          veiculo
        });

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao carregar veículo."
        }, 500);
      }
    }

    // =================================================
    // VEÍCULOS - EDITAR
    // =================================================

    if (
      request.method === "PUT" &&
      /^\/veiculos\/\d+$/.test(
        url.pathname
      )
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Veículo inválido."
          }, 400);
        }

        const dados =
          await request.json();

        const veiculo =
          await env.DB
            .prepare(`
              SELECT
                id,
                investigacao_id
              FROM veiculos
              WHERE id = ?
                AND usuario_id = ?
              LIMIT 1
            `)
            .bind(
              id,
              usuario.id
            )
            .first();

        if (!veiculo) {
          return respostaJSON({
            ok: false,
            erro:
              "Veículo não encontrado."
          }, 404);
        }

        await env.DB
          .prepare(`
            UPDATE veiculos
            SET
              tipo = ?,
              marca = ?,
              modelo = ?,
              ano = ?,
              placa = ?,
              renavam = ?,
              chassi = ?,
              cor = ?,
              cidade = ?,
              uf = ?,
              valor = ?,
              fonte = ?,
              observacoes = ?,
              data_fipe = ?
            WHERE id = ?
              AND usuario_id = ?
          `)
          .bind(
            String(dados.tipo || ""),
            String(dados.marca || ""),
            String(dados.modelo || ""),
            String(dados.ano || ""),
            String(dados.placa || ""),
            String(dados.renavam || ""),
            String(dados.chassi || ""),
            String(dados.cor || ""),
            String(dados.cidade || ""),
            String(dados.uf || ""),
            String(dados.valor || ""),
            String(dados.fonte || "Tabela FIPE"),
            String(dados.observacoes || ""),
            String(dados.data_fipe || ""),
            id,
            usuario.id
          )
          .run();

        return respostaJSON({
          ok: true,
          mensagem:
            "Veículo atualizado com sucesso."
        });

      } catch (erro) {

        console.error(
          "Erro ao atualizar veículo:",
          erro
        );

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao atualizar veículo."
        }, 500);
      }
    }

    // =================================================
    // VEÍCULOS - EXCLUIR
    // =================================================

    if (
      request.method === "DELETE" &&
      /^\/veiculos\/\d+$/.test(
        url.pathname
      )
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Veículo inválido."
          }, 400);
        }

        const resultado =
          await env.DB
            .prepare(`
              DELETE FROM veiculos
              WHERE id = ?
                AND usuario_id = ?
            `)
            .bind(
              id,
              usuario.id
            )
            .run();

        if (
          !resultado.meta ||
          !resultado.meta.changes
        ) {
          return respostaJSON({
            ok: false,
            erro:
              "Veículo não encontrado."
          }, 404);
        }

        return respostaJSON({
          ok: true,
          mensagem:
            "Veículo excluído com sucesso."
        });

      } catch (erro) {

        console.error(
          "Erro ao excluir veículo:",
          erro
        );

        return respostaJSON({
          ok: false,
          erro:
            "Erro ao excluir veículo."
        }, 500);
      }
    }

    // =================================================
    // PESSOAS - LISTAR
    // =================================================

    if (
      request.method === "GET" &&
      url.pathname === "/pessoas"
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const investigacaoId =
          Number(
            url.searchParams.get(
              "investigacao_id"
            )
          );

        if (
          !Number.isInteger(investigacaoId) ||
          investigacaoId <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro: "Investigação inválida."
          }, 400);
        }

        const investigacao =
          await env.DB
            .prepare(`
              SELECT id
              FROM investigacoes
              WHERE id = ?
                AND usuario_id = ?
              LIMIT 1
            `)
            .bind(
              investigacaoId,
              usuario.id
            )
            .first();

        if (!investigacao) {
          return respostaJSON({
            ok: false,
            erro: "Investigação não encontrada."
          }, 404);
        }

        const resultado =
          await env.DB
            .prepare(`
              SELECT
                id,
                investigacao_id AS investigacaoId,
                nome_completo AS nome,
                nome_social AS nomeSocial,
                cpf,
                data_nascimento AS dataNascimento,
                papel_investigacao AS papel,
                descricao_relacao AS descricaoRelacao,
                status_informacao AS status,
                observacoes,
                fonte_informacao AS fonte,
                data_obtencao AS dataObtencao,
                referencia_fonte AS referencia,
                telefone,
                email,
                rede_social AS redeSocial,
                endereco1_cep AS endereco1Cep,
                endereco1_logradouro AS endereco1Logradouro,
                endereco1_numero AS endereco1Numero,
                endereco1_complemento AS endereco1Complemento,
                endereco1_bairro AS endereco1Bairro,
                endereco1_cidade AS endereco1Cidade,
                endereco1_uf AS endereco1Uf,
                endereco2_cep AS endereco2Cep,
                endereco2_logradouro AS endereco2Logradouro,
                endereco2_numero AS endereco2Numero,
                endereco2_complemento AS endereco2Complemento,
                endereco2_bairro AS endereco2Bairro,
                endereco2_cidade AS endereco2Cidade,
                endereco2_uf AS endereco2Uf,
                endereco3_cep AS endereco3Cep,
                endereco3_logradouro AS endereco3Logradouro,
                endereco3_numero AS endereco3Numero,
                endereco3_complemento AS endereco3Complemento,
                endereco3_bairro AS endereco3Bairro,
                endereco3_cidade AS endereco3Cidade,
                endereco3_uf AS endereco3Uf
              FROM pessoas
              WHERE investigacao_id = ?
                AND usuario_id = ?
              ORDER BY id DESC
            `)
            .bind(
              investigacaoId,
              usuario.id
            )
            .all();

        return respostaJSON(
          resultado.results || []
        );

      } catch (erro) {

        console.error(erro);

        return respostaJSON({
          ok: false,
          erro: "Erro ao carregar pessoas."
        }, 500);
      }
    }

    // =================================================
    // PESSOAS - CADASTRAR
    // =================================================

    if (
      request.method === "POST" &&
      url.pathname === "/pessoas"
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        let dados;

        try {
          dados = await request.json();
        } catch (erro) {
          return respostaJSON({
            ok: false,
            erro: "JSON inválido."
          }, 400);
        }

        const validacao =
          validarDadosPessoa(dados);

        if (validacao.erro) {
          return respostaJSON({
            ok: false,
            erro: validacao.erro
          }, 400);
        }

        if (
          typeof dados.investigacaoId !== "number" &&
          typeof dados.investigacaoId !== "string"
        ) {
          return respostaJSON({
            ok: false,
            erro: "Investigação inválida."
          }, 400);
        }

        const investigacaoId =
          Number(dados.investigacaoId);

        if (
          !Number.isInteger(investigacaoId) ||
          investigacaoId <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro: "Investigação inválida."
          }, 400);
        }

        const investigacao =
          await env.DB
            .prepare(`
              SELECT id
              FROM investigacoes
              WHERE id = ?
                AND usuario_id = ?
              LIMIT 1
            `)
            .bind(
              investigacaoId,
              usuario.id
            )
            .first();

        if (!investigacao) {
          return respostaJSON({
            ok: false,
            erro: "Investigação não encontrada."
          }, 404);
        }

        const pessoa = validacao.pessoa;

        const resultado =
          await env.DB
            .prepare(`
              INSERT INTO pessoas (
                investigacao_id,
                usuario_id,
                nome_completo,
                nome_social,
                cpf,
                data_nascimento,
                papel_investigacao,
                descricao_relacao,
                status_informacao,
                observacoes,
                fonte_informacao,
                data_obtencao,
                referencia_fonte,
                telefone,
                email,
                rede_social,
                endereco1_cep,
                endereco1_logradouro,
                endereco1_numero,
                endereco1_complemento,
                endereco1_bairro,
                endereco1_cidade,
                endereco1_uf,
                endereco2_cep,
                endereco2_logradouro,
                endereco2_numero,
                endereco2_complemento,
                endereco2_bairro,
                endereco2_cidade,
                endereco2_uf,
                endereco3_cep,
                endereco3_logradouro,
                endereco3_numero,
                endereco3_complemento,
                endereco3_bairro,
                endereco3_cidade,
                endereco3_uf
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              investigacaoId,
              usuario.id,
              pessoa.nome,
              pessoa.nomeSocial,
              pessoa.cpf,
              pessoa.dataNascimento,
              pessoa.papel,
              pessoa.descricaoRelacao,
              pessoa.status,
              pessoa.observacoes,
              pessoa.fonte,
              pessoa.dataObtencao,
              pessoa.referencia,
              pessoa.telefone,
              pessoa.email,
              pessoa.redeSocial,
              pessoa.endereco1Cep,
              pessoa.endereco1Logradouro,
              pessoa.endereco1Numero,
              pessoa.endereco1Complemento,
              pessoa.endereco1Bairro,
              pessoa.endereco1Cidade,
              pessoa.endereco1Uf,
              pessoa.endereco2Cep,
              pessoa.endereco2Logradouro,
              pessoa.endereco2Numero,
              pessoa.endereco2Complemento,
              pessoa.endereco2Bairro,
              pessoa.endereco2Cidade,
              pessoa.endereco2Uf,
              pessoa.endereco3Cep,
              pessoa.endereco3Logradouro,
              pessoa.endereco3Numero,
              pessoa.endereco3Complemento,
              pessoa.endereco3Bairro,
              pessoa.endereco3Cidade,
              pessoa.endereco3Uf
            )
            .run();

        return respostaJSON({
          ok: true,
          id: resultado.meta.last_row_id,
          mensagem: "Pessoa cadastrada com sucesso."
        });

      } catch (erro) {

        console.error(
          "Erro ao cadastrar pessoa:",
          erro
        );

        return respostaJSON({
          ok: false,
          erro: "Erro ao cadastrar pessoa."
        }, 500);
      }
    }

    // =================================================
    // PESSOAS - EDITAR
    // =================================================

    if (
      request.method === "PUT" &&
      /^\/pessoas\/\d+$/.test(
        url.pathname
      )
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro: "Pessoa inválida."
          }, 400);
        }

        let dados;

        try {
          dados = await request.json();
        } catch (erro) {
          return respostaJSON({
            ok: false,
            erro: "JSON inválido."
          }, 400);
        }

        const validacao =
          validarDadosPessoa(dados);

        if (validacao.erro) {
          return respostaJSON({
            ok: false,
            erro: validacao.erro
          }, 400);
        }

        const pessoa = validacao.pessoa;

        const resultado =
          await env.DB
            .prepare(`
              UPDATE pessoas
              SET
                nome_completo = ?,
                nome_social = ?,
                cpf = ?,
                data_nascimento = ?,
                papel_investigacao = ?,
                descricao_relacao = ?,
                status_informacao = ?,
                observacoes = ?,
                fonte_informacao = ?,
                data_obtencao = ?,
                referencia_fonte = ?,
                telefone = ?,
                email = ?,
                rede_social = ?,
                endereco1_cep = ?,
                endereco1_logradouro = ?,
                endereco1_numero = ?,
                endereco1_complemento = ?,
                endereco1_bairro = ?,
                endereco1_cidade = ?,
                endereco1_uf = ?,
                endereco2_cep = ?,
                endereco2_logradouro = ?,
                endereco2_numero = ?,
                endereco2_complemento = ?,
                endereco2_bairro = ?,
                endereco2_cidade = ?,
                endereco2_uf = ?,
                endereco3_cep = ?,
                endereco3_logradouro = ?,
                endereco3_numero = ?,
                endereco3_complemento = ?,
                endereco3_bairro = ?,
                endereco3_cidade = ?,
                endereco3_uf = ?,
                data_atualizacao = datetime('now')
              WHERE id = ?
                AND usuario_id = ?
                AND EXISTS (
                  SELECT 1
                  FROM investigacoes i
                  WHERE i.id = pessoas.investigacao_id
                    AND i.usuario_id = ?
                )
            `)
            .bind(
              pessoa.nome,
              pessoa.nomeSocial,
              pessoa.cpf,
              pessoa.dataNascimento,
              pessoa.papel,
              pessoa.descricaoRelacao,
              pessoa.status,
              pessoa.observacoes,
              pessoa.fonte,
              pessoa.dataObtencao,
              pessoa.referencia,
              pessoa.telefone,
              pessoa.email,
              pessoa.redeSocial,
              pessoa.endereco1Cep,
              pessoa.endereco1Logradouro,
              pessoa.endereco1Numero,
              pessoa.endereco1Complemento,
              pessoa.endereco1Bairro,
              pessoa.endereco1Cidade,
              pessoa.endereco1Uf,
              pessoa.endereco2Cep,
              pessoa.endereco2Logradouro,
              pessoa.endereco2Numero,
              pessoa.endereco2Complemento,
              pessoa.endereco2Bairro,
              pessoa.endereco2Cidade,
              pessoa.endereco2Uf,
              pessoa.endereco3Cep,
              pessoa.endereco3Logradouro,
              pessoa.endereco3Numero,
              pessoa.endereco3Complemento,
              pessoa.endereco3Bairro,
              pessoa.endereco3Cidade,
              pessoa.endereco3Uf,
              id,
              usuario.id,
              usuario.id
            )
            .run();

        if (
          !resultado.meta ||
          !resultado.meta.changes
        ) {
          return respostaJSON({
            ok: false,
            erro: "Pessoa não encontrada."
          }, 404);
        }

        return respostaJSON({
          ok: true,
          mensagem: "Pessoa atualizada com sucesso."
        });

      } catch (erro) {

        console.error(
          "Erro ao atualizar pessoa:",
          erro
        );

        return respostaJSON({
          ok: false,
          erro: "Erro ao atualizar pessoa."
        }, 500);
      }
    }

    // =================================================
    // PESSOAS - EXCLUIR
    // =================================================

    if (
      request.method === "DELETE" &&
      /^\/pessoas\/\d+$/.test(
        url.pathname
      )
    ) {

      if (!usuario) {
        return respostaJSON({
          ok: false,
          erro: "Não autenticado."
        }, 401);
      }

      try {

        const id =
          Number(
            url.pathname.split("/").pop()
          );

        if (
          !Number.isInteger(id) ||
          id <= 0
        ) {
          return respostaJSON({
            ok: false,
            erro: "Pessoa inválida."
          }, 400);
        }

        const resultado =
          await env.DB
            .prepare(`
              DELETE FROM pessoas
              WHERE id = ?
                AND usuario_id = ?
                AND EXISTS (
                  SELECT 1
                  FROM investigacoes i
                  WHERE i.id = pessoas.investigacao_id
                    AND i.usuario_id = ?
                )
            `)
            .bind(
              id,
              usuario.id,
              usuario.id
            )
            .run();

        if (
          !resultado.meta ||
          !resultado.meta.changes
        ) {
          return respostaJSON({
            ok: false,
            erro: "Pessoa não encontrada."
          }, 404);
        }

        return respostaJSON({
          ok: true,
          mensagem: "Pessoa excluída com sucesso."
        });

      } catch (erro) {

        console.error(
          "Erro ao excluir pessoa:",
          erro
        );

        return respostaJSON({
          ok: false,
          erro: "Erro ao excluir pessoa."
        }, 500);
      }
    }

    // =================================================
    // ROTA NÃO ENCONTRADA
    // =================================================

    return respostaJSON({
      ok: false,
      erro: "Rota não encontrada."
    }, 404);
  }
};
