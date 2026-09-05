# 💰 Balbino - Aplicativo de Gestão Financeira Pessoal & Imobiliária

Sistema moderno, intuitivo e completo para controle de finanças pessoais, contas bancárias, cartões de crédito, gestão de imóveis e aluguéis, integrado com **Consultoria Financeira Inteligente via Google Gemini AI** e banco de dados **Neon PostgreSQL** com isolamento multi-inquilino (RLS).

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend / Database**: Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **Segurança**: Row Level Security (RLS) no PostgreSQL, isolamento estrito por usuário
- **Inteligência Artificial**: Google Gen AI SDK (`@google/generative-ai`) com modelo `gemini-1.5-flash`

---

## ✨ Principais Funcionalidades

1. **Dashboard Consolidado**:
   - Saldo consolidado das contas bancárias
   - Total de faturas dos cartões de crédito
   - Contas a pagar nos próximos 7 dias
   - Recebimentos previstos de aluguéis
   - Gráfico dinâmico de fluxo de caixa (entradas vs. saídas dos últimos 6 meses)
   - Transações recentes e acesso rápido

2. **Gestão de Transações (Contas a Pagar & Receber)**:
   - Cadastro detalhado em abas (informações básicas e detalhes de conciliação)
   - Filtros inteligentes por período, tipo e status
   - Vinculação com contas bancárias e cartões

3. **Módulo Imobiliário & Gestão de Aluguéis**:
   - Cadastro completo de imóveis (endereço, inquilino, contatos, valor)
   - Histórico de pagamentos e gráfico anual de adimplência
   - Registro de despesas e manutenção do imóvel
   - Gestão de documentos e alertas de reajuste

4. **Cartões de Crédito & Contas Bancárias**:
   - Acompanhamento de limites, datas de fechamento e vencimento de faturas
   - Gerenciamento de saldos por instituição financeira

5. **Consultor Financeiro Inteligente (IA - Google Gemini)**:
   - Análise automatizada de receitas, despesas, faturas e rendimentos de aluguel
   - Geração de plano de otimização estruturado em JSON com sugestões de corte de gastos, metas de economia e alertas locatícios
   - Formulário 100% editável antes da confirmação
   - Persistência das recomendações no Neon PostgreSQL

---

## 🔒 Segurança e Privacidade

- As credenciais de banco de dados e chaves de IA **nunca** são expostas no repositório.
- Utilização de variáveis de ambiente (`.env`) devidamente ignoradas pelo `.gitignore`.
- Políticas de Row Level Security (RLS) ativas no banco para garantir que cada usuário visualize exclusivamente seus próprios registros.

---

## 🛠️ Como Executar o Projeto Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/dududecos1981/Controle-financeiro.git
cd Controle-financeiro
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
```env
# Neon PostgreSQL Connection String
VITE_NEON_DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@YOUR_ENDPOINT.neon.tech/neondb?sslmode=require

# Google Gemini API Key (Opcional para a IA)
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

### 4. Executar em modo de desenvolvimento
```bash
npm run dev
```
O aplicativo estará disponível em `http://localhost:5173`.

### 5. Build de produção
```bash
npm run build
```

---

## 📄 Licença
Este projeto é de uso privado e educacional.
