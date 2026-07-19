# Pergunta Boba 🙈 — v2

Jogo de dedução social multiplayer, mobile-first, para jogar com amigos no
mesmo lugar — cada um no seu celular, todos numa única sala global (sem
código de sala).

### Novidades desta versão
- **Sala de espera** com avatar colorido, nome e uma tag "você" para
  identificar seu próprio jogador entre os outros.
- **Pergunta sempre visível** para quem não é o palpiteiro — tanto durante
  a fase de ouvir quanto durante a fase em que o palpiteiro está ordenando
  — com um botão de olho 👁️ para ocultar/revelar o texto a qualquer momento.
- **Régua do palpiteiro redesenhada**: sem campos vazios acima/abaixo — a
  lista já é a régua. Cada pergunta só sobe ou desce com os botões ▲▼,
  com animação fluida (FLIP) a cada movimento.
- **Visual aprimorado**: cartões em glassmorphism, barra de gradiente ao
  lado da régua indicando a escala de probabilidade, tipografia e espaçamento
  mais consistentes, hierarquia mais clara em todas as telas.

## Como rodar

Requer [Node.js](https://nodejs.org) 18+.

```bash
cd server
npm install
npm start
```

O servidor sobe em `http://localhost:3001` e já serve o cliente (pasta
`client/`) — não precisa de build separado.

## Para jogar com amigos no mesmo lugar

1. Descubra o IP local da máquina que vai rodar o servidor (ex.: `192.168.0.15`).
2. Todos os celulares precisam estar na **mesma rede Wi-Fi**.
3. Cada pessoa abre `http://SEU-IP:3001` no navegador do celular.
4. Todo mundo que abrir o link cai automaticamente na mesma sala — sem
   código, sem convite.

> Dica: para jogar em rede pública / internet, hospede o servidor em algum
> provedor (Render, Railway, Fly.io etc.) e compartilhe a URL pública.

## Regras rápidas

- 3 a 12 jogadores. Todo mundo passa pelo papel de **palpiteiro** uma vez,
  em rodadas alternadas.
- O palpiteiro escolhe 1 de 5 categorias.
- Os outros jogadores veem a pergunta oficial na tela e respondem **em voz
  alta** — o palpiteiro não vê a pergunta.
- O palpiteiro recebe 5 perguntas embaralhadas (1 oficial + 4 distratoras)
  e as posiciona numa régua de 0 (menos provável) a 4 (mais provável) de
  ser a oficial, com base só no que ouviu.
- Pontuação = posição em que a pergunta oficial foi colocada.
- No fim, ranking geral por pontos.

## Estrutura do projeto

```
server/
  index.js        servidor Express + Socket.io, estado da sala em memória
  questions.json  banco de perguntas por categoria
  package.json
client/
  index.html      todas as telas do jogo
  style.css       tema escuro, motion design, componentes
  app.js          lógica de estado, sockets, régua de arrastar/tocar
```

## Notas de implementação

- **Sala única**: o servidor mantém um único objeto de sala em memória.
  Qualquer conexão entra automaticamente nela.
- **Reconexão**: cada jogador guarda um token no `localStorage`. Ao voltar
  do segundo plano (ou cair a conexão), o app reconecta e reenvia esse
  token — o servidor devolve o mesmo jogador (nome, cor, pontuação) à sala.
- **Reset**: qualquer jogador pode reiniciar a sala a qualquer momento
  (botão ⟲, com confirmação em modal). Isso encerra a partida atual e
  zera os placares.
- **Acessibilidade**: alternância "reduzir movimento" nas configurações
  (⚙️), além de respeitar `prefers-reduced-motion` do sistema.
- **Cor de destaque**: cada jogador escolhe sua cor localmente; ela também
  é usada como cor do avatar visível para os outros.
