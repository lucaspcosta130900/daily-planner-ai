import { GITHUB_TOKEN } from '@env';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  text: string;
  task?: string;
  date?: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
  };
}

export class AIService {
  private static readonly API_URL = 'https://models.inference.ai.azure.com/chat/completions';
  private static readonly MODEL = 'gpt-4o';

  static async sendMessage(
    userMessage: string,
    conversationHistory: AIMessage[] = []
  ): Promise<AIResponse> {
    try {
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: `Você é um assistente inteligente de planejamento diário. 
          Ajude o usuário a organizar suas tarefas de forma clara e objetiva.
          
          Quando o usuário pedir para adicionar uma tarefa, responda no formato:
          TASK: [título da tarefa]
          DATE: [TODAY/TOMORROW/YYYY-MM-DD] (opcional, padrão é TODAY)
          RECURRENCE: [DAILY/WEEKLY:0,1,2/MONTHLY:15] (opcional)
          RESPONSE: [sua mensagem amigável]
          
          Exemplos:
          - "adicionar reunião às 15h amanhã" → 
            TASK: Reunião às 15h
            DATE: TOMORROW
            RESPONSE: Tarefa adicionada para amanhã!
            
          - "estudar react toda segunda e quarta" → 
            TASK: Estudar React
            RECURRENCE: WEEKLY:1,3
            RESPONSE: Tarefa recorrente adicionada!
            
          - "academia todos os dias" → 
            TASK: Academia
            RECURRENCE: DAILY
            RESPONSE: Tarefa diária criada!
            
          - "pagar aluguel dia 5" → 
            TASK: Pagar aluguel
            RECURRENCE: MONTHLY:5
            RESPONSE: Lembrete mensal configurado!
          
          Para outras perguntas, responda normalmente sem o formato TASK.`
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          messages,
          model: this.MODEL,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'Desculpe, não entendi.';

      return this.parseResponse(aiResponse);
    } catch (error) {
      console.error('Erro ao chamar AI:', error);
      return {
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Verifique sua conexão e token do GitHub.',
      };
    }
  }

  private static parseResponse(response: string): AIResponse {
    const taskMatch = response.match(/TASK:\s*(.+?)(?:\n|$)/);
    const dateMatch = response.match(/DATE:\s*(.+?)(?:\n|$)/);
    const recurrenceMatch = response.match(/RECURRENCE:\s*(.+?)(?:\n|$)/);
    const responseMatch = response.match(/RESPONSE:\s*(.+?)(?:\n|$)/);

    if (!taskMatch) {
      return { text: response };
    }

    const result: AIResponse = {
      task: taskMatch[1].trim(),
      text: responseMatch ? responseMatch[1].trim() : 'Tarefa adicionada com sucesso!',
    };

    // Parse DATE
    if (dateMatch) {
      result.date = dateMatch[1].trim();
    }

    // Parse RECURRENCE
    if (recurrenceMatch) {
      const recurrenceStr = recurrenceMatch[1].trim();
      
      if (recurrenceStr === 'DAILY') {
        result.recurrence = { type: 'daily' };
      } else if (recurrenceStr.startsWith('WEEKLY:')) {
        const days = recurrenceStr.split(':')[1].split(',').map(d => parseInt(d.trim()));
        result.recurrence = { type: 'weekly', daysOfWeek: days };
      } else if (recurrenceStr.startsWith('MONTHLY:')) {
        const day = parseInt(recurrenceStr.split(':')[1].trim());
        result.recurrence = { type: 'monthly', dayOfMonth: day };
      }
    }

    return result;
  }
}