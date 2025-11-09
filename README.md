# PlanuCenter

Sistema completo de gestão para oficinas mecânicas, composto por uma aplicação web Angular (PlanuCenter) e uma API Node.js com banco de dados SQLite. O sistema oferece controle de ordens de serviço, clientes, estoque e painel operacional.

## Estrutura do projeto

```
OS-Web/
├── README.md
├── workshop-app/        # Aplicação Angular PlanuCenter (frontend)
└── server/              # API Node.js + SQLite (backend)
```

## Pré-requisitos

- Node.js 18+
- npm 9+

## Configuração do backend

1. Instale as dependências:

   ```bash
   cd server
   npm install
   ```

2. Gere o banco de dados com dados de exemplo:

   ```bash
   npm run seed
   ```

3. Inicie a API:

   ```bash
   npm start
   ```

   A API ficará disponível em `http://localhost:3000`.

## Configuração do frontend

1. Em outro terminal, instale as dependências do Angular:

   ```bash
   cd workshop-app
   npm install
   ```

2. Inicie o servidor de desenvolvimento (o arquivo `proxy.conf.json` encaminha as chamadas `/api` para a API Node):

   ```bash
   npm start
   ```

   A aplicação ficará disponível em `http://localhost:4200`.

## Credenciais padrão

| Usuário   | Senha        | Perfil       |
|-----------|--------------|--------------|
| `admin`   | `admin123`   | Administrador|
| `mecanico`| `mecanico123`| Mecânico     |

## Funcionalidades principais

- Tela de login com perfis e permissões.
- Painel inicial com resumo das ordens abertas, status e estoque crítico.
- Gestão de ordens de serviço com filtros, cadastro/edição/remoção, detalhamento completo e impressão otimizada apenas do resumo financeiro (mão de obra, peças, taxas e descontos).
- Cadastro e manutenção de clientes com busca rápida.
- Gestão de estoque com criação, edição, exclusão e sinalização de itens críticos.
- Tema escuro moderno com destaques visuais para status e indicadores.
- API REST em Express + SQLite com dados de exemplo e filtros de busca em todas as listagens.

## Testes

Os projetos incluem configuração padrão do Angular CLI e podem ser executados com:

```bash
cd workshop-app
npm test
```

> Observação: a execução dos testes e builds depende da instalação das dependências via `npm install`.
