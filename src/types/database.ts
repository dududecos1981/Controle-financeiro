export interface Usuario {
  id: string;
  nome: string;
  email: string;
  created_at?: string;
}

export interface Conta {
  id: string;
  usuario_id: string;
  nome_instituicao: string;
  saldo_inicial: number;
  tipo_conta?: string;
  created_at?: string;
}

export interface CartaoCredito {
  id: string;
  usuario_id: string;
  nome_cartao: string;
  limite_total: number;
  dia_fechamento?: number;
  dia_vencimento?: number;
  created_at?: string;
}

export interface LimiteEspecial {
  id: string;
  usuario_id: string;
  conta_id?: string | null;
  nome_instituicao: string;
  limite_total: number;
  taxa_juros_mensal?: number;
  dia_vencimento?: number;
  observacoes?: string | null;
  conta_nome?: string;
  created_at?: string;
}

export interface TransacaoLimiteEspecial {
  id: string;
  limite_especial_id: string;
  tipo: 'Utilização' | 'Amortização';
  valor: number;
  data_operacao: string;
  descricao: string;
  observacoes?: string | null;
  created_at?: string;
}

export interface ImovelDocumento {
  id: string;
  nome: string;
  url?: string;
  tipo: string;
  data: string;
}

export interface Imovel {
  id: string;
  usuario_id: string;
  endereco: string;
  valor_aluguel: number;
  dia_vencimento?: number;
  inquilino_nome?: string;
  inquilino_contato?: string;
  documentos?: ImovelDocumento[];
  created_at?: string;
}

export interface Transacao {
  id: string;
  conta_id: string;
  cartao_id?: string | null;
  imovel_id?: string | null;
  descricao: string;
  categoria?: string;
  valor: number;
  data_vencimento?: string;
  data_pagamento?: string;
  status: 'Pendente' | 'Pago' | 'Recebido' | 'Atrasado';
  observacoes?: string | null;
  anexo_nome?: string | null;
  anexo_base64?: string | null;
  recorrente?: boolean;
  frequencia?: string | null;
  created_at?: string;
}

export interface Notificacao {
  id: string;
  usuario_id: string;
  mensagem: string;
  tipo?: string;
  status_lida: boolean;
  created_at?: string;
}

export interface PropostaOtimizacao {
  mes_referencia: string;
  analise_gastos: string[];
  metas_economia: string[];
  alertas_imobiliarios: string[];
  projecao_saldo: number;
}

export interface PlanoOtimizacao {
  id: string;
  usuario_id: string;
  mes_referencia: string;
  analise_gastos: string[];
  metas_economia: string[];
  alertas_imobiliarios: string[];
  projecao_saldo: number;
  status?: string;
  created_at?: string;
}

export interface AuthSession {
  user: Usuario;
  token?: string;
}
