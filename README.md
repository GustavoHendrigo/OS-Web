# OS-Web

Sistema web completo para gestão de ordens de serviço em oficinas mecânicas. O projeto é dividido em duas partes:

- **Frontend (Angular 17)**: interface responsiva com login, painel, gestão de ordens, clientes e estoque, além de resumo financeiro e impressão de ordens.
- **Backend (Node.js)**: API REST simples utilizando arquivos JSON como banco de dados, com usuários, clientes, estoque e ordens pré-cadastrados.

## Funcionalidades principais

- Autenticação com perfis `admin` e `mecanico`.
- Dashboard com situação das ordens abertas (aguardando aprovação, em andamento, finalizadas, entregues) e resumo financeiro.
- CRUD de ordens de serviço com cálculo automático de mão de obra, peças, descontos e total. Possibilidade de impressão do resumo como nota para o cliente.
- Gestão de clientes e estoque (restritos ao perfil administrador).
- Filtros e pesquisa nas telas com grande volume de dados (ordens, clientes, estoque).
- Integração com um banco de dados baseado em arquivo JSON com dados de exemplo.

## Pré-requisitos

- [Node.js 18+](https://nodejs.org) (inclui `npm`).

## Como executar o backend

```bash
cd backend
npm install   # apenas para gerar package-lock.json quando necessário
npm start     # inicia a API em http://localhost:3000
```

A API carrega os dados a partir de `backend/data/database.json`. Ao criar novas ordens, clientes ou itens de estoque, o arquivo é atualizado automaticamente.

## Como executar o frontend

Em um segundo terminal, execute:

```bash
cd frontend
npm install
npm start
```

O aplicativo Angular estará disponível em `http://localhost:4200` por padrão.

### Usuários de demonstração

| Usuário   | Senha         | Perfil     |
|-----------|---------------|------------|
| `admin`   | `admin123`    | Administrador (acesso completo) |
| `mecanico`| `mecanico123` | Mecânico (acesso a ordens e painel) |

## Estrutura do projeto

```
OS-Web/
├── backend/
│   ├── data/database.json   # "banco de dados" em arquivo
│   ├── package.json
│   └── server.js            # API REST construída com Node.js nativo
├── frontend/
│   ├── angular.json
│   ├── package.json
│   └── src/
│       ├── app/             # componentes, serviços e modelos
│       └── environments/    # configuração da URL da API
└── README.md
```

## Observações

- A API não possui autenticação via token. O objetivo é demonstrar o fluxo de trabalho completo para oficinas mecânicas.
- Para redefinir os dados para o estado inicial, substitua `backend/data/database.json` pelo conteúdo original.
- Caso deseje usar outro tipo de banco de dados (ex.: PostgreSQL ou MongoDB), substitua a implementação do backend mantendo os contratos das rotas.
