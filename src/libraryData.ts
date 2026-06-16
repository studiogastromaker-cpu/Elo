export type ContentType = 'video' | 'audio' | 'text';

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  category: string; // ansiedade, paz, proposito, autoestima, disciplina, etc.
  duration: string; // e.g. "3:45", "5 min"
  mediaUrl: string; // fallback working urls for media
  coverImg: string; // ambient placeholder
  author: string;
  bodyText?: string; // for articles/reflections
}

export interface LearningTrilha {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  itemIds: string[];
}

export const LIBRARY_CONTENTS: ContentItem[] = [
  // Ansiedade / Paz
  {
    id: 'aud-01',
    title: 'O Poder da Respiração Consciente',
    description: 'Um áudio curto e meditativo guiando você a ancorar seus pensamentos no momento presente, dissolvendo o excesso de futuro.',
    type: 'audio',
    category: 'ansiedade',
    duration: '4:12',
    mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverImg: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=600&q=80',
    author: 'Elo Sabedoria',
    bodyText: 'Encontre uma posição confortável. Permita que seus ombros caiam levemente. Inspire paz profunda, sinta a respiração fluir...'
  },
  {
    id: 'vid-01',
    title: 'Desacelerando em Meio à Tempestade',
    description: 'Vídeo imersivo de natureza com meditação reflexiva sobre reações calmas diante dos desafios externos da vida.',
    type: 'video',
    category: 'paz',
    duration: '2:15',
    mediaUrl: 'https://www.w3schools.com/html/movie.mp4',
    coverImg: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    author: 'Conselheiro Elo'
  },
  {
    id: 'txt-01',
    title: 'Não Andeis Ansiosos pelo Amanhã',
    description: 'Um ensaio profundo sobre o domínio das preocupações diárias e a arte de descansar na providência invisível.',
    type: 'text',
    category: 'paz',
    duration: '3 min',
    mediaUrl: '',
    coverImg: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
    author: 'Sabedoria Clássica',
    bodyText: `A ansiedade é, em sua essência, a pretensão dolorosa de controlar o amanhã. Ao projetarmos nossa mente para um tempo que ainda não existe, esvaziamos a força do único momento onde realmente podemos agir: o presente.

Como os antigos mestres ensinavam de forma poética, repare nas aves dos céus e nos lírios do campo. Eles não acumulam celeiros, nem se desgastam em trabalhos extenuantes de aflição, mas expressam sua beleza com graça impecável.

Para cultivar a calma:
1. **Silencie as projeções:** Quando um pensamento sussurrar "e se...", responda calmamente "por hoje, farei o que está ao meu alcance".
2. **Divida fardos pesados:** Faça uma pequena lista daquilo que você de fato controla hoje e entregue com esperança o resto à ordem do tempo.
3. **Respire e Contemple:** Pare por dois minutos diante de uma janela e simplesmente observe que a criação continua fluindo perfeita, à parte das suas pressões.

Descansar o coração é o maior sinal de domínio próprio.`
  },

  // Propósito / Disciplina
  {
    id: 'aud-02',
    title: 'A Sutileza dos Pequenos Começos',
    description: 'Áudio motivacional sobre valorizar as sementes invisíveis e focar na constância pacífica em vez dos aplausos rápidos.',
    type: 'audio',
    category: 'proposito',
    duration: '5:02',
    mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverImg: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    author: 'Elo Sabedoria',
    bodyText: 'Toda árvore frondosa já foi uma pequena semente plantada na terra escura. Não despreze os pequenos passos cotidianos...'
  },
  {
    id: 'txt-02',
    title: 'O Foco que Liberta: Disciplina com Amor',
    description: 'Artigo reflexivo sobre como construir hábitos consistentes com leveza, sem a autocrítica destrutiva e exaustiva.',
    type: 'text',
    category: 'disciplina',
    duration: '4 min',
    mediaUrl: '',
    coverImg: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
    author: 'Prática de Vida',
    bodyText: `A disciplina verdadeira não é uma punição autoinfligida ou uma rigidez que amargura o espírito. Ela é, em verdade, o maior ato de amor que você pode ter com o seu amanhã.

Muitos acreditam que a falta de foco é preguiça. Frequentemente, trata-se de desorganização emocional. Quando não sabemos por que estamos realizando algo, o menor ruído exterior rouba nossa atenção.

Instruções para uma Rotina Sábia:
- **Tenha clareza de intenção:** Antes de começar uma tarefa, declare em silêncio seu propósito básico (ex: "estou cuidando do futuro da minha família").
- **Diga 'não' com nobreza:** Cada vez que você recusa um excesso de distração ou de compromissos vazios, está dizendo 'sim' para a sua verdadeira identidade.
- **Evite cobranças de exaustão:** A persistência gera frutos duradouros se houver pausas para repouso no percurso.

A paciência com as próprias imperfeições é a raiz de toda virtude sustentável.`
  },

  // Autoestima / Identidade
  {
    id: 'vid-02',
    title: 'Quem é Você Quando Ninguém Vê?',
    description: 'Vídeo inspirador estimulando a reconexão com sua identidade autêntica, desvinculada das curtidas e expectativas sociais.',
    type: 'video',
    category: 'identidade',
    duration: '3:05',
    mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    coverImg: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=600&q=80',
    author: 'Conselheiro Elo'
  },
  {
    id: 'txt-03',
    title: 'O Resgate do Seu Valor Singular',
    description: 'Meditação profunda para afastar o hábito da comparação destrutiva e enxergar a beleza de ser quem você foi planejado para ser.',
    type: 'text',
    category: 'autoestima',
    duration: '2 min',
    mediaUrl: '',
    coverImg: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
    author: 'Maturidade Emocional',
    bodyText: `Comparar sua jornada invisível com a vitrine exterior alheia é um engano cruel. Cada vida desabrocha em sua própria estação, sob luzes e tempestades singulares.

Você foi desenhado de modo admirável, equipado com talentos, sensibilidades e caminhos de superação perfeitos para o seu aprendizado. 

Práticas para nutrir sua identidade hoje:
- **Agradeça pelas suas cicatrizes:** Suas quedas passadas não definem sua derrota; demonstram a resiliência inspiradora que trouxe você até aqui.
- **Seja seu anfitrião mansa:** Como você conversa consigo mesmo nas falhas? Pratique a autocompaixão de um amigo sábio.
- **Celebre os dons ocultos:** Um sorriso ofertado sem esperar recompensa, uma escuta generosa ou um ato de ordem na casa são gestos sublimes.

Reconheça seu valor sagrado.`
  },

  // Perdão / Relacionamentos / Família
  {
    id: 'aud-03',
    title: 'A Ponte do Perdão Silencioso',
    description: 'Meditação guiada em áudio para desfazer amarguras acumuladas, libertando a si mesmo e ao outro através da cura e da misericórdia.',
    type: 'audio',
    category: 'perdao',
    duration: '6:15',
    mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverImg: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80',
    author: 'Elo Sabedoria',
    bodyText: 'O rancor é um veneno que tomamos esperando que faça mal ao outro. Perdoar não significa concordar com o erro, mas abrir as portas da sua própria prisão...'
  },
  {
    id: 'txt-04',
    title: 'O Amor como Vínculo Perfeito',
    description: 'Ensaio sobre o valor da paciência silenciosa, do afeto sem julgamento e da união mútua na vida cotidiana.',
    type: 'text',
    category: 'relacionamentos',
    duration: '4 min',
    mediaUrl: '',
    coverImg: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    author: 'Escritos de Fraternidade',
    bodyText: `Nenhum relacionamento desabrocha sem o solo rico da abnegação e do carinho voluntário. Estar em comunhão com o outro exige suportar com ternura pequenos defeitos cotidianos, assim como desejamos que suportem os nossos.

O amor verdadeiro não exige, não se exalta e escuta com paciência renovada. Quando praticamos a escuta atenta e afetuosa, construímos pontes indestrutíveis nas amizades, na família e no trabalho.

Lembre-se de ser generoso com palavras de incentivo: 'palavras amigáveis são como favo de mel, doces para a alma e medicina para o corpo.'`
  }
];

export const LEARNING_TRILHAS: LearningTrilha[] = [
  {
    id: 'trilha-ansiedade',
    title: 'Calma no Coração: Superando a Ansiedade',
    description: 'Um caminho pacífico composto por áudios, vídeos reflexivos e textos para aprender a repousar no presente com plena esperança.',
    icon: '🍃',
    category: 'ansiedade',
    itemIds: ['aud-01', 'vid-01', 'txt-01']
  },
  {
    id: 'trilha-foco',
    title: 'Foco, Disciplina e Propósito',
    description: 'Aprenda a afastar ruídos digitais e emocionais, cultivando hábitos duradouros guiados pelo autodomínio consciente.',
    icon: '⏳',
    category: 'disciplina',
    itemIds: ['aud-02', 'txt-02', 'vid-02']
  },
  {
    id: 'trilha-identidade',
    title: 'Identidade Segura e Autorespeito',
    description: 'Esqueça a pressão da aprovação alheia. Reconecte-se com quem você é em essência através de diretrizes calmas.',
    icon: '🛡️',
    category: 'identidade',
    itemIds: ['vid-02', 'txt-03', 'txt-02']
  },
  {
    id: 'trilha-restauracao',
    title: 'Restauração de Vínculos e Paz Interior',
    description: 'Abra mão de mágoas silenciosas que pesam no coração. Exercite o perdão para si e para os que cercam você.',
    icon: '🤝',
    category: 'perdao',
    itemIds: ['aud-03', 'txt-04', 'txt-01']
  }
];
