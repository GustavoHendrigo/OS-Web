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

## Implantação na Railway

O repositório já está preparado para ser implantado como um único serviço Web no [Railway](https://railway.app/). A plataforma executa os scripts declarados na raiz (`package.json`):

1. **Build command**: `npm run build`. O Angular gera o frontend diretamente em `server/public/`, permitindo que o Express sirva os arquivos estáticos.
2. **Start command**: `npm start`. Esse script recompila o frontend (garantindo que o diretório `server/public/` exista) e, em seguida, sobe a API Express.

### Variáveis de ambiente úteis

- `PORT`: é definida automaticamente pela Railway, mas pode ser sobrescrita localmente.
- `CLIENT_ORIGIN`: lista (separada por vírgulas) de domínios autorizados para CORS. Deixe em branco quando o frontend for servido pelo próprio Express (caso do deploy no Railway).

Com essa configuração o fluxo de deploy na Railway é:

1. Criar um novo serviço “Web Service” apontando para este repositório.
2. Confirmar os comandos de build e start acima ou sobrescrevê-los manualmente nas configurações da Railway.
3. Definir as variáveis de ambiente desejadas (opcional).
4. Deployar. O servidor Express subirá automaticamente na porta informada pela Railway e servirá a API e o frontend Angular pela mesma URL.

> Observação: os scripts de `postinstall` continuam garantindo que as dependências de `workshop-app/` e `server/` sejam instaladas automaticamente durante o build.

