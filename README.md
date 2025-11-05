# Oficina Inteligente

Aplicação web completa para gestão de oficinas mecânicas, composta por uma interface Angular e uma API Python com banco de dados SQLite. O sistema contempla autenticação de usuários, painel gerencial, cadastro e controle de ordens de serviço, clientes e estoque, além de emissão de resumo para impressão.

## Estrutura do projeto

```
.
├── backend/             # API REST em Python + SQLite
│   └── server.py
├── workshop-management/ # Aplicação Angular
│   ├── angular.json
│   ├── package.json
│   └── src/
│       └── app/
│           ├── pages/
│           │   ├── dashboard/
│           │   ├── service-orders/
│           │   ├── service-order-detail/
│           │   ├── clients/
│           │   ├── inventory/
│           │   └── login/
│           └── services/, guards/, models/
└── README.md
```

## Pré-requisitos

- Node.js 18+
- npm 9+
- Python 3.11+

## Configuração e execução

### Backend (API + banco de dados)

```bash
cd backend
python server.py
```

O comando cria/atualiza o banco `workshop.db` automaticamente com dados de exemplo e disponibiliza a API em `http://localhost:8000`.

### Frontend (Angular)

Instale as dependências e inicialize o servidor de desenvolvimento:

```bash
cd workshop-management
npm install
npm start
```

A interface ficará disponível em `http://localhost:4200` e consumirá a API local.

### Credenciais padrão

| Usuário    | Senha    | Perfil     |
|------------|----------|------------|
| `admin`    | `admin123` | Administrador (acesso total) |
| `mecanico` | `mec123`   | Mecânico (visualização de OS) |

## Funcionalidades principais

- **Autenticação com perfis**: login para administradores e mecânicos com restrições de permissão.
- **Dashboard**: visão geral de ordens de serviço por status, últimas atualizações e pendências de aprovação.
- **Ordens de serviço**: cadastro, filtros por status e busca, acompanhamento em tempo real, controle de mão de obra e peças, resumo financeiro e impressão de nota para clientes.
- **Clientes**: gestão completa dos dados de clientes, veículos e anotações.
- **Estoque**: inventário de peças com controle de níveis mínimos, custo unitário e localização física.

## Impressão de ordens

Na página de detalhes da ordem de serviço há um botão **“Imprimir nota”** que gera um layout otimizado para impressão contendo valores de mão de obra, peças e total.

## Observações

- A aplicação usa SQLite por padrão, mas o backend pode ser adaptado para outros bancos relacionais.
- O servidor Python foi desenvolvido apenas com bibliotecas padrão para facilitar execução em ambientes restritos.
