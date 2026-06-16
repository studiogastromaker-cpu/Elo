const SYSTEM_INSTRUCTION = `
Você é Elo, um conselheiro e assistente emocional extraordinariamente sábio, calmo, compassivo e respeitoso.
Seu objetivo é oferecer um refúgio de acolhimento, cura emocional, paz e direção prática.

Sua escuta ativa, inteligência emocional e direcionamento são profundamente inspirados e fundamentados nos princípios da Bíblia Sagrada (como sabedoria, equilíbrio mental, amor incondicional, perdão genuíno, propósito de vida, domínio próprio, consolo nas dores, esperança realista, honestidade, verdade pacífica, compaixão curadora e fé para seguir em frente).

REGRAS DE CONTEÚDO E TOM (CRÍTICAS):
1. **Sem Sermões ou Linguagem Religiosa Pesada**: Nunca dê sermões, palestras dogmáticas ou lições de moral vazias. Fale como um amigo verdadeiramente sábio e acolhedor, não como um pregador.
2. **Uso de Referências Bíblicas**: Evite citar capítulos e versículos a cada frase, pois isso soa robótico. Em vez disso, transmita a essência da verdade e dos princípios bíblicos com palavras modernas, fluidas e gentis. Quando fizer sentido citar alguma passagem de consolo de forma sutil, faça-o de modo orgânico e contextualizado (exemplo: "Há um provérbio antigo que diz que a resposta branda desvia o furor...", ou "A sabedoria clássica nos ensina que há um tempo para tudo debaixo do céu...").
3. **Escuta Ativa e Validação**: Valide sempre a dor ou o sentimento do usuário antes de propor caminhos. Não use frases motivacionais de efeito ("Seja forte!", "Você consegue!"). Prefira uma esperança que é realista, profunda e guiada por equilíbrio emocional e domínio próprio.
4. **Respiração e Serenidade**: Incentive a autorreflexão calada e a serenidade. Seja um sopro de paz no dia a dia da pessoa.

REGRAS DE IDIOMA:
- Detecte automaticamente o idioma do usuário.
- Responda SEMPRE no mesmo idioma que o usuário utilizou (Português, Inglês, Espanhol, etc).
- Mantenha o tom de profunda sabedoria e acolhimento independente do idioma.

ESTILO DE RESPOSTA:
- Se estiver em modo texto, seja breve, empático, focado e prático.
- Se estiver em modo áudio (Live), seja natural, use pausas e evite listas longas para manter o diálogo leve.
`;

export const handler = async (event: any) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { message, messages } = body;

    if (!message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "A mensagem é obrigatória." }) };
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    if (!apiKey) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ 
          error: "A chave GEMINI_API_KEY ou API_KEY não foi configurada em seu ambiente Netlify. Por favor, adicione esta variável de ambiente no seu painel de Deploy/Settings do Netlify." 
        }) 
      };
    }

    const rawItems: { role: 'user' | 'model'; text: string }[] = [];

    if (messages && Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg && typeof msg.text === 'string' && msg.text.trim()) {
          rawItems.push({
            role: msg.role === 'model' ? 'model' : 'user',
            text: msg.text.trim()
          });
        }
      }
    }

    const cleanCurrent = message.trim();
    if (cleanCurrent) {
      if (rawItems.length === 0 || rawItems[rawItems.length - 1].text !== cleanCurrent || rawItems[rawItems.length - 1].role !== 'user') {
        rawItems.push({
          role: 'user',
          text: cleanCurrent
        });
      }
    }

    const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

    for (const item of rawItems) {
      if (contents.length === 0) {
        if (item.role === 'user') {
          contents.push({
            role: 'user',
            parts: [{ text: item.text }]
          });
        } else {
          continue;
        }
      } else {
        const last = contents[contents.length - 1];
        if (last.role === item.role) {
          last.parts[0].text += '\n\n' + item.text;
        } else {
          contents.push({
            role: item.role,
            parts: [{ text: item.text }]
          });
        }
      }
    }

    if (contents.length === 0 && cleanCurrent) {
      contents.push({
        role: 'user',
        parts: [{ text: cleanCurrent }]
      });
    }

    // Call Gemini API directly over HTTPS to avoid massive bundler sizes, dependency clashes, and ESM issues in serverless runtimes.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    console.log("📨 Enviando requisição HTTP direta para o Gemini API...");
    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`💥 Erro na API do Gemini (${apiResponse.status}):`, errorText);
      throw new Error(`Gemini API returned status ${apiResponse.status}: ${errorText}`);
    }

    const result = await apiResponse.json();
    const replyText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: replyText })
    };
  } catch (err: any) {
    console.error('❌ Erro no Netlify Function chat:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err?.message || 'Falha inesperada ao processar mensagem.',
        details: err?.stack || ''
      })
    };
  }
};
