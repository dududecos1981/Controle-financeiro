import { GoogleGenerativeAI } from '@google/generative-ai';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function aiOptimizerPlugin(): Plugin {
  return {
    name: 'ai-optimizer-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/otimizar-financas' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const env = loadEnv('development', process.cwd(), '');
              const apiKey =
                process.env.GOOGLE_API_KEY ||
                process.env.GEMINI_API_KEY ||
                env.GOOGLE_API_KEY ||
                env.GEMINI_API_KEY ||
                env.VITE_GOOGLE_API_KEY ||
                '';

              const { dados_financeiros_e_imobiliarios } = JSON.parse(body || '{}');

              if (!apiKey) {
                console.warn('GOOGLE_API_KEY não configurada no backend.');
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'GOOGLE_API_KEY não configurada' }));
                return;
              }

              const genAI = new GoogleGenerativeAI(apiKey);
              const model = genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                  responseMimeType: 'application/json',
                },
              });

              const prompt = `Você é um consultor financeiro especialista em finanças pessoais e gestão imobiliária. Analise os dados financeiros do usuário (transações, despesas fixas, receitas de aluguéis e metas) fornecidos abaixo e gere um plano de otimização financeira para o próximo mês.
Dados do Usuário: ${JSON.stringify(dados_financeiros_e_imobiliarios)}
Regras de Execução:
Responda APENAS com o JSON solicitado.
Não inclua explicações ou markdown.
Foque em sugerir cortes de despesas desnecessárias, projeções de aluguéis e metas de economia realistas.
Utilize a estrutura JSON exata:
{
  "proposta_otimizacao": {
    "mes_referencia": "String",
    "analise_gastos": ["Sugestão 1", "Sugestão 2"],
    "metas_economia": ["Meta 1", "Meta 2"],
    "alertas_imobiliarios": ["Alerta 1", "Alerta 2"],
    "projecao_saldo": 0
  }
}`;

              const result = await model.generateContent(prompt);
              const text = result.response.text();
              const parsed = JSON.parse(text);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(parsed));
            } catch (error: unknown) {
              const errMsg = error instanceof Error ? error.message : 'Falha na geração com IA';
              console.error('Erro no plugin Gemini:', errMsg);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: errMsg }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    aiOptimizerPlugin(),
  ],
});
