CREATE TABLE clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  documento TEXT NOT NULL DEFAULT '',
  data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_clientes_usuario_nome
  ON clientes(usuario_id, nome);

ALTER TABLE investigacoes
  ADD COLUMN cliente_id INTEGER
  REFERENCES clientes(id) ON DELETE SET NULL;

CREATE INDEX idx_investigacoes_cliente_usuario
  ON investigacoes(cliente_id, usuario_id);

INSERT INTO clientes (
  usuario_id,
  nome,
  documento,
  data_criacao
)
SELECT
  usuario_id,
  MIN(TRIM(nome)),
  MIN(TRIM(COALESCE(documento, ''))),
  MIN(COALESCE(data_criacao, datetime('now')))
FROM investigacoes
WHERE usuario_id IS NOT NULL
  AND TRIM(COALESCE(nome, '')) <> ''
GROUP BY
  usuario_id,
  CASE
    WHEN TRIM(COALESCE(documento, '')) <> '' THEN
      'documento:' || LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(documento), '.', ''), '-', ''), '/', ''), ' ', ''), char(9), ''))
    ELSE
      'nome:' || LOWER(TRIM(nome))
  END;

UPDATE investigacoes
SET cliente_id = (
  SELECT c.id
  FROM clientes c
  WHERE c.usuario_id = investigacoes.usuario_id
    AND (
      (
        TRIM(COALESCE(investigacoes.documento, '')) <> ''
        AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(c.documento), '.', ''), '-', ''), '/', ''), ' ', ''), char(9), '')) =
          LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(investigacoes.documento), '.', ''), '-', ''), '/', ''), ' ', ''), char(9), ''))
      )
      OR (
        TRIM(COALESCE(investigacoes.documento, '')) = ''
        AND TRIM(COALESCE(c.documento, '')) = ''
        AND LOWER(TRIM(c.nome)) = LOWER(TRIM(investigacoes.nome))
      )
    )
  ORDER BY c.id
  LIMIT 1
)
WHERE usuario_id IS NOT NULL
  AND TRIM(COALESCE(nome, '')) <> '';
