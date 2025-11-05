# OS-Web

Sistema web de ordem de serviço para oficinas mecânicas desenvolvido com front-end Angular carregado via CDN e uma API Python com SQLite.

## Pré-requisitos

- Python 3.11+
- Navegador moderno com suporte a módulos ES.

## Configuração do banco de dados

```bash
cd backend
python init_db.py
```

O script cria o arquivo `workshop.db` com dados de exemplo, incluindo os usuários:

- `admin` / `admin123` (perfil administrador, acesso completo)
- `mecanico` / `mecanico123` (visualização das ordens e dados)

## Executando a API

```bash
cd backend
python server.py
```

O serviço ficará disponível em `http://localhost:8000/api` com suporte a CORS para o front-end.

## Executando o front-end

Basta abrir o arquivo `frontend/index.html` em um navegador. Todos os módulos Angular são carregados via CDN, portanto não é necessário build.

### Funcionalidades

- Dashboard com visão geral das ordens (abertas, aprovadas, concluídas, entregues, etc.) e resumo financeiro.
- Gestão de ordens de serviço com filtros, cadastro, detalhamento com resumo de custos (mão de obra, peças, adicionais) e impressão estilo nota.
- Cadastro e consulta de clientes com busca.
- Controle de estoque com busca e cadastro de itens.
- Controle de acesso por perfil (admin e mecânico).
