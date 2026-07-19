// Gera 500 perguntas (100 por categoria) para o jogo "Dumb Questions".
// Roda uma vez e grava data/questions.json (fica versionado, não precisa rodar de novo).
const fs = require('fs');
const path = require('path');

function uniqueTake(list, n) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const clean = item.trim();
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
    if (out.length === n) break;
  }
  if (out.length < n) throw new Error(`Só consegui gerar ${out.length}/${n} perguntas únicas`);
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- OBJETOS ----------
const objAdj = [
  'mais caro', 'mais estranho', 'mais velho', 'mais inútil', 'mais bonito',
  'mais feio', 'mais sentimental', 'mais barato', 'mais pesado', 'mais frágil',
  'mais colorido', 'mais escondido', 'mais esquecido', 'mais personalizado', 'mais quebrado',
  'mais barulhento', 'mais cheiroso', 'mais fofo', 'mais raro', 'mais desnecessário',
];
const objVerbo = [
  'comprou', 'ganhou de presente', 'encontrou na rua', 'herdou da família',
  'emprestou e nunca devolveu', 'guardou por anos sem usar', 'usou até quebrar',
  'viu numa loja e se arrependeu de não comprar', 'colecionou', 'roubou de um amigo sem querer',
];
const objetosPool = [];
for (const adj of objAdj) for (const v of objVerbo) objetosPool.push(`Qual é o objeto ${adj} que você já ${v}?`);
objetosPool.push(
  'Que objeto da sua casa você levaria para uma ilha deserta?',
  'Qual objeto você consegue construir com suas próprias mãos?',
  'Qual objeto do seu quarto tem uma história engraçada por trás?',
  'Se um objeto da sua bolsa ou mochila pudesse fofocar sobre você, qual seria?',
  'Qual objeto você usa todos os dias e nunca imaginou que fosse tão importante?',
  'Qual objeto estranho você já viu em um brechó ou bazar?',
  'Qual objeto da sua infância você ainda guarda?',
  'Qual objeto você compraria em dobro se pudesse?',
  'Que objeto do seu trabalho ou escola você mais odeia?',
  'Qual objeto da casa de um parente te dá arrepios?',
  'Qual objeto você fingiria que é seu se um amigo perguntasse de quem é?',
  'Que objeto simples te faz mais feliz do que deveria?',
  'Qual objeto você levaria escondido para uma prova?',
  'Qual objeto você já tentou consertar sozinho e piorou tudo?',
  'Que objeto da moda você acha que vai voltar em 10 anos?',
);
const objetos = uniqueTake(shuffle(objetosPool), 100);

// ---------- NÚMEROS ----------
const numPeriodo = ['dia', 'semana', 'mês'];
const numAtividade = [
  'dormindo', 'no celular', 'assistindo série', 'ouvindo música', 'treinando',
  'cozinhando', 'jogando videogame', 'no trânsito ou no transporte', 'estudando',
  'nas redes sociais', 'tomando sol', 'conversando ao telefone', 'sonhando acordado',
  'arrumando a casa', 'procrastinando', 'reclamando da vida', 'planejando uma viagem',
  'no banho pensando na vida', 'organizando fotos no celular', 'rolando redes sociais sem prestar atenção',
  'brincando com o pet', 'ouvindo podcast', 'olhando o preço de passagens que não vai comprar',
];
const numPool = [];
for (const p of numPeriodo) for (const a of numAtividade) numPool.push(`Quantas horas por ${p} você passa ${a}?`);

const numMaxItem = [
  ['latas de refrigerante', 'você já tomou em um único dia'],
  ['fatias de pizza', 'você já comeu de uma vez'],
  ['xícaras de café', 'você já bebeu em um único dia'],
  ['mensagens de texto', 'você já mandou em um único dia'],
  ['selfies', 'você já tirou em um único dia'],
  ['brigadeiros', 'você conseguiria comer antes de passar mal'],
  ['horas seguidas', 'você já ficou acordado sem dormir'],
  ['peças de roupa', 'você já comprou em uma única ida ao shopping'],
  ['vezes', 'você já apertou o soneca do despertador em uma manhã'],
  ['amigos', 'você convidaria para uma festa surpresa'],
  ['cupcakes', 'você conseguiria comer em uma sentada'],
  ['minutos', 'você aguenta ficar sem olhar o celular'],
  ['pães de queijo', 'você já comeu em um café da manhã'],
  ['vezes', 'você já trocou de senha do wi-fi'],
  ['refeições', 'você já pediu por aplicativo em uma semana'],
];
for (const [item, acao] of numMaxItem) numPool.push(`Qual é o número máximo de ${item} que ${acao}?`);

const numVezes = [
  'mudou de corte de cabelo', 'trocou de emprego ou de escola', 'viajou de avião',
  'se mudou de casa', 'esqueceu a senha do próprio celular', 'perdeu as chaves de casa',
  'chorou assistindo a um filme', 'cantou no chuveiro hoje', 'inventou uma desculpa para sair mais cedo',
  'cancelou um plano de última hora', 'trocou de time de futebol', 'fingiu que entendeu uma piada',
  'ficou preso em um elevador', 'perdeu o ônibus ou o voo', 'esqueceu o aniversário de alguém',
  'tentou aprender um instrumento e desistiu', 'reiniciou o celular achando que ia resolver tudo',
  'contou a mesma história para a mesma pessoa', 'fingiu estar doente para faltar a algo',
  'trocou de corte de unha só para testar', 'quase bateu o carro por estar distraído',
];
for (const v of numVezes) numPool.push(`Quantas vezes você já ${v}?`);
const numeros = uniqueTake(shuffle(numPool), 100);

// ---------- FAMOSOS ----------
const famososBase = [
  'você não gostaria de atender se trabalhasse em um restaurante',
  'você gostaria de ir à festa de aniversário',
  'você menos gostaria de sentar do lado em uma viagem de avião de 10 horas',
  'provavelmente faria a melhor xícara de café',
  'você acha que rouba comida da geladeira dos outros em um show',
  'você acha que dorme com a luz acesa',
  'você levaria para brigar por você',
  'provavelmente é péssimo em jogos de tabuleiro',
  'você acha que não sabe cozinhar nem um ovo',
  'você imagina que fala sozinho no espelho todo dia',
  'seria seu parceiro de crime perfeito',
  'você acha que tem um armário bagunçado apesar da fama',
  'provavelmente chora assistindo comercial de banco',
  'você adotaria como seu melhor amigo imaginário',
  'você acha que nunca lavou uma louça na vida',
  'seria o pior anfitrião de um jantar',
  'você acha que manda memes horríveis no grupo da família',
  'provavelmente é super estranho fora das câmeras',
  'você contrataria para ser seu personal trainer',
  'você acha que trapaceia em jogos de cartas',
  'seria seu professor de dança ideal',
  'você acha que fala demais depois de duas taças de vinho',
  'provavelmente tem um hobby bizarro que ninguém sabe',
  'você levaria para sobreviver com você em uma ilha deserta',
  'você acha que é do tipo que chega sempre atrasado',
  'seria o pior parceiro de trabalho em grupo',
  'você acha que ainda dorme com um bichinho de pelúcia',
  'provavelmente finge que gosta de arte moderna sem entender nada',
  'você contrataria para ser seu personagem em um jogo de RPG',
  'você acha que é péssimo motorista',
  'seria seu vizinho barulhento',
  'você acha que tem medo de coisas bem bobas',
  'provavelmente daria os piores conselhos de relacionamento',
  'você acha que é obcecado com um programa de TV vergonhoso',
  'seria seu parceiro perfeito de karaokê',
  'você acha que é fã secreto de novela mexicana',
  'você levaria de babá para cuidar do seu animal de estimação',
  'provavelmente é ótimo contando piadas ruins',
  'você acha que já chorou em um reality show por bobagem',
  'seria a pior pessoa para dividir apartamento',
  'você acha que tem uma coleção estranha escondida em casa',
  'provavelmente demoraria 3 horas para se arrumar para sair',
  'você acha que finge estar ocupado para não responder mensagem',
  'seria o melhor apresentador de um programa de culinária',
  'você acha que é péssimo perdedor em jogos de videogame',
  'provavelmente teria um podcast sobre teorias da conspiração',
  'você contrataria para organizar sua festa de aniversário',
  'você acha que nunca aprendeu a estacionar direito',
  'seria seu personal shopper ideal',
  'você acha que fala com plantas em casa',
  'você acha que tem medo de palhaço escondido',
  'provavelmente nunca lê os contratos antes de assinar',
  'você acha que finge rir de piada que não entendeu',
  'seria o melhor padrinho de casamento',
  'você acha que trocaria de nome se pudesse recomeçar a vida',
  'provavelmente tem um apelido vergonhoso de infância',
  'você acha que discute muito com o motorista de aplicativo',
  'seria a pior pessoa para pedir opinião sobre roupa',
  'você acha que é supersticioso e tem um ritual esquisito antes de qualquer coisa importante',
  'provavelmente ainda usa uma gíria que já saiu de moda há anos',
  'você acha que é fã de um time de futebol que nunca ganha nada',
  'seria o melhor contador de causos em uma roda de amigos',
  'você acha que trocaria de carreira para virar produtor de queijos',
  'provavelmente tem uma playlist secreta cheia de músicas brega',
  'você acha que finge que sabe cozinhar quando tem visita',
  'seria a pessoa mais animada em uma festa de escritório',
  'você acha que já colou em uma prova pelo menos uma vez',
  'provavelmente é o tipo que nunca devolve as coisas que pega emprestado',
  'você acha que fica nervoso ao falar em público apesar da fama',
  'seria o pior no comando de um restaurante por um dia',
  'você acha que ainda acredita em teorias da conspiração bobas',
  'provavelmente demoraria para perceber que colocou a roupa do avesso',
  'você acha que finge estar em uma ligação importante para evitar uma conversa chata',
  'seria a pessoa ideal para organizar um assalto ao banco de brincadeira',
  'você acha que dorme com meia mesmo no verão',
  'provavelmente já brigou com o próprio reflexo no espelho por bobagem',
  'você acha que trocaria toda a fama por uma vida simples no campo',
  'seria o melhor cúmplice para pregar uma peça em alguém',
  'você acha que é péssimo em guardar presente de aniversário sem abrir antes da hora',
  'provavelmente conta a mesma piada em toda entrevista',
  'você acha que é obcecado com previsão do tempo',
  'seria o mais provável a esquecer o nome de quem acabou de conhecer',
  'você acha que tem um talento escondido totalmente diferente da carreira que segue',
  'provavelmente já brigou com o GPS do carro em voz alta',
  'você acha que finge estar de dieta na frente dos outros',
  'seria a pessoa mais competitiva em um jogo de tabuleiro em família',
  'você acha que já se perdeu tentando seguir uma receita simples',
  'provavelmente ainda tem um diário ou blog secreto da adolescência',
  'você acha que trocaria autógrafos por batata frita',
  'seria o mais provável a chorar vendo um pôr do sol',
  'você acha que é péssimo em guardar segredo de festa surpresa',
  'provavelmente nunca aprendeu a trocar um pneu sozinho',
  'você acha que finge entender de vinho só para impressionar',
  'seria a pessoa mais provável a adotar um jacaré de estimação',
  'você acha que já dormiu durante um show ao vivo',
  'provavelmente teria vergonha de mostrar o quarto de infância',
  'você acha que é péssimo dando indicação de filme',
  'seria o mais provável a adotar um sotaque estrangeiro depois de uma viagem de uma semana',
  'você acha que treina discurso de agradecimento no espelho até hoje',
  'provavelmente ainda guarda um brinquedo de infância na mala de viagem',
];
const famosos = uniqueTake(shuffle(famososBase.map(b => `Qual famoso ${b}?`)), 100);

// ---------- JOGADORES ----------
const jogadoresBase = [
  'tem mais probabilidade de quebrar algo em um museu',
  'tem mais probabilidade de ter um hobby incomum, como colecionar corujas de cerâmica',
  'tem mais probabilidade de se apresentar para alguém que já conheceu pelo menos 3 vezes',
  'se tornará o idoso mais fofo do grupo',
  'sobreviveria mais tempo perdido na selva',
  'tem mais probabilidade de ficar parado na chuva enquanto todo mundo corre para se abrigar',
  'tem a alma mais velha',
  'tem mais probabilidade de saber cada palavra de uma música antiga que ninguém mais lembra',
  'tem mais probabilidade de vencer em uma batalha de rap improvisada',
  'tem mais probabilidade de fazer um pedido ruim no restaurante e depois beliscar o prato dos outros',
  'tem mais chance de virar milionário por acaso',
  'tem mais probabilidade de esquecer o próprio aniversário',
  'seria o melhor sobrevivente em um apocalipse zumbi',
  'tem mais probabilidade de rir na hora errada em um funeral',
  'seria o pior jurado em um programa de talentos',
  'tem mais chance de ganhar na loteria e perder o bilhete',
  'tem mais probabilidade de adotar 10 gatos de rua',
  'seria o mais provável a virar influenciador digital sem querer',
  'tem mais chance de se perder em uma cidade que já visitou 20 vezes',
  'tem mais probabilidade de dormir em uma reunião importante',
  'seria o melhor em convencer alguém a fazer algo absurdo',
  'tem mais chance de chorar assistindo a um comercial de cachorro',
  'tem mais probabilidade de inventar uma história mirabolante para justificar um atraso',
  'seria o primeiro a sair correndo em um filme de terror',
  'tem mais chance de vencer um concurso de comer pimenta',
  'tem mais probabilidade de trocar de carreira do nada aos 40 anos',
  'seria o melhor para negociar um resgate com sequestradores de brincadeira',
  'tem mais chance de esquecer onde estacionou o carro',
  'tem mais probabilidade de virar vidente amador depois de um sonho estranho',
  'seria o mais provável a montar uma seita sem perceber',
  'tem mais chance de sobreviver sozinho numa fazenda',
  'tem mais probabilidade de ganhar uma discussão só na teimosia',
  'seria o pior em guardar segredo',
  'tem mais chance de virar meme sem querer',
  'tem mais probabilidade de fingir que entendeu as instruções de montagem de um móvel',
  'seria o melhor mentiroso em um jogo de tabuleiro',
  'tem mais chance de comprar algo inútil só porque estava em promoção',
  'tem mais probabilidade de se apaixonar por alguém que conheceu há 5 minutos',
  'seria o mais provável a virar dono de um bar de karaokê',
  'tem mais chance de acordar cantando uma música aleatória',
  'tem mais probabilidade de discutir com o GPS em voz alta',
  'seria o melhor para fingir ser expert em vinhos numa festa',
  'tem mais chance de terminar um relacionamento por mensagem de texto',
  'tem mais probabilidade de se perder tentando seguir um atalho',
  'seria o mais provável a virar viciado em um jogo de celular do nada',
  'tem mais chance de dar risada sozinho lembrando de algo',
  'tem mais probabilidade de trazer o prato errado numa encomenda de comida',
  'seria o melhor ator ao fingir estar doente para faltar ao trabalho',
  'tem mais chance de convencer todo mundo a entrar numa fria',
  'tem mais probabilidade de virar o novo melhor amigo do garçom em um restaurante que visitou uma vez',
  'tem mais chance de ganhar uma discussão inventando uma estatística na hora',
  'tem mais probabilidade de se perder dentro do próprio bairro',
  'seria o mais provável a virar personagem principal de um documentário estranho',
  'tem mais chance de arrumar confusão em um grupo de família no WhatsApp',
  'tem mais probabilidade de treinar uma resposta de agradecimento de Oscar só por diversão',
  'tem mais chance de ficar acordado a noite toda por uma série',
  'tem mais probabilidade de fingir que está de dieta na frente de todo mundo',
  'seria o mais provável a virar dono de um food truck',
  'tem mais chance de esquecer uma senha importante na hora que mais precisa',
  'tem mais probabilidade de se apaixonar por um personagem de desenho animado',
  'seria o melhor em fingir que não viu uma mensagem para não responder',
  'tem mais chance de virar o melhor amigo de um estranho em uma fila de banco',
  'tem mais probabilidade de tropeçar no próprio pé andando reto',
  'seria o mais provável a comprar um bicho de estimação por impulso',
  'tem mais chance de discutir com a Siri ou com o Google Assistente',
  'tem mais probabilidade de organizar uma viagem e esquecer o próprio documento',
  'seria o melhor em convencer os outros a dividir a última fatia de pizza com ele',
  'tem mais chance de se perder tentando montar um móvel sem manual',
  'tem mais probabilidade de rir alto sozinho lembrando de uma piada antiga',
  'seria o mais provável a virar o padrinho ou madrinha favorito de todos os sobrinhos',
  'tem mais chance de trocar o nome de alguém sempre que fala com essa pessoa',
  'tem mais probabilidade de ganhar de propósito em um jogo com crianças',
  'seria o melhor em inventar uma desculpa educada para sair de uma festa chata',
  'tem mais chance de comer escondido a última sobremesa da geladeira',
  'tem mais probabilidade de chegar sempre com folga em qualquer compromisso',
  'seria o mais provável a virar viciado em terapia de grupo só pela conversa',
  'tem mais chance de estragar uma surpresa sem querer',
  'tem mais probabilidade de discutir sobre o volume ideal da televisão',
  'seria o melhor em fingir que está prestando atenção em uma reunião longa',
  'tem mais chance de se machucar fazendo algo completamente inofensivo',
  'tem mais probabilidade de virar fã número um de um esporte que nunca praticou',
  'seria o mais provável a adotar uma rotina de academia e desistir em uma semana',
  'tem mais chance de trocar o dia da semana sem perceber',
  'tem mais probabilidade de contar vantagem sobre algo que nem aconteceu direito',
  'seria o melhor em fingir bom humor em um dia péssimo',
  'tem mais chance de virar o organizador oficial de todas as viagens do grupo',
  'tem mais probabilidade de esquecer o carregador do celular em toda viagem',
  'seria o mais provável a se envolver em uma confusão por educação demais',
  'tem mais chance de rir em momentos totalmente sérios',
  'tem mais probabilidade de dar nome de gente para os próprios eletrodomésticos',
  'seria o melhor em convencer alguém a comprar algo que nem precisa',
  'tem mais chance de fazer plano detalhado para algo simples',
  'tem mais probabilidade de virar o consultor sentimental não oficial do grupo',
  'seria o mais provável a testar toda dieta da moda por uma semana',
  'tem mais chance de acabar com o carregador de todo mundo emprestado',
  'tem mais probabilidade de esquecer de desligar o forno e lembrar da rua',
  'seria o melhor em explicar um filme complicado de forma ainda mais confusa',
  'tem mais chance de sair no meio de uma festa sem avisar ninguém',
  'tem mais probabilidade de virar o defensor de uma marca que nem paga ele para isso',
  'seria o mais provável a decorar letra de música em outro idioma sem entender nada',
];
const jogadores = uniqueTake(shuffle(jogadoresBase.map(b => `Qual jogador ${b}?`)), 100);

// ---------- COMIDAS ----------
const comidaAdj = [
  'mais estranha', 'mais gostosa', 'mais nojenta', 'mais cara', 'mais barata',
  'mais colorida', 'mais exagerada', 'mais simples', 'mais azeda', 'mais doce',
  'mais picante', 'mais esquisita de combinar', 'mais underrated', 'mais superestimada', 'mais nostálgica',
  'mais viciante', 'mais gordurosa', 'mais saudável', 'mais rara de encontrar', 'mais divertida de comer',
];
const comidaVerbo = [
  'você já comeu', 'você comeria de novo agora mesmo', 'você já viu alguém comer',
  'você fingiu gostar por educação', 'você já cozinhou em casa', 'você comeria por dinheiro',
  'você comeu escondido de alguém', 'você recusaria mesmo com fome', 'você comeria todo dia se pudesse',
  'você já pediu por aplicativo às 3 da manhã',
];
const comidaPool = [];
for (const adj of comidaAdj) for (const v of comidaVerbo) comidaPool.push(`Qual é a comida ${adj} que ${v}?`);
comidaPool.push(
  'Qual comida você comeria numa aposta por 100 reais?',
  'Qual comida te lembra a sua infância?',
  'Qual comida você nunca conseguiu aprender a fazer direito?',
  'Qual combinação de comida você adora mas todo mundo acha nojenta?',
  'Qual comida você comeria mesmo depois de passar da validade?',
  'Qual sobremesa você comeria antes do prato principal sem culpa?',
  'Qual comida de festa de aniversário infantil você ainda ama?',
  'Qual comida você fingiria não gostar para não dividir com ninguém?',
  'Qual comida você comeria pelo resto da vida se só pudesse escolher uma?',
  'Qual comida você acha que representa a sua personalidade?',
  'Qual comida você nunca experimentou e tem vergonha de admitir?',
  'Qual comida você comeria de manhã, tarde e noite sem enjoar?',
  'Qual receita de família você ainda não aprendeu a fazer?',
  'Qual comida de boteco você não dispensa?',
  'Qual comida você levaria escondida para dentro do cinema?',
);
const comidas = uniqueTake(shuffle(comidaPool), 100);

const questions = { objetos, numeros, famosos, jogadores, comidas };

for (const [cat, arr] of Object.entries(questions)) {
  console.log(`${cat}: ${arr.length} perguntas`);
}

const outDir = path.join(__dirname, 'data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'questions.json'), JSON.stringify(questions, null, 2), 'utf-8');
console.log('Gravado em data/questions.json');
