# Pergunta Boba — jogo pra jogar com os amigos

Jogo multiplayer de dedução: um jogador (o "palpiteiro") escolhe uma categoria, os demais
respondem em voz alta uma pergunta que ele não vê, e ele precisa adivinhar qual era a pergunta
ordenando 5 opções numa régua de 0 a 4. Cada jogador usa o próprio celular.

- `backend/` — servidor Node + Express + Socket.io (estado das salas, rodadas, pontuação, banco
  de 500 perguntas).
- `frontend/` — app React + Vite, mobile-first, com animações e transições entre as telas.

## Rodando localmente

### Backend
```bash
cd backend
npm install
npm start
```
Sobe em `http://localhost:3001`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Sobe em `http://localhost:5173` e já aponta para `http://localhost:3001` por padrão.
Para testar em outros celulares na mesma rede Wi-Fi, acesse pelo IP da sua máquina
(ex: `http://192.168.0.10:5173`) — o Vite já escuta em todas as interfaces (`host: true`).

## Deploy no Render

### 1) Backend (Web Service)
1. Suba este repositório no seu GitHub privado.
2. No Render, clique em **New > Web Service** e conecte o repositório.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free está ok para jogar com os amigos.
4. Anote a URL gerada, algo como `https://pergunta-boba-backend.onrender.com`.

> O plano gratuito do Render "dorme" depois de um tempo sem uso — a primeira conexão de cada
> partida pode demorar ~30s para acordar o servidor. Depois disso funciona normal.

### 2) Frontend (Static Site)
1. No Render, clique em **New > Static Site** e conecte o mesmo repositório.
2. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Em **Environment Variables**, adicione:
   - `VITE_BACKEND_URL` = a URL do backend do passo anterior (ex:
     `https://pergunta-boba-backend.onrender.com`)
4. Deploy. A URL do Static Site é o link que você manda para os amigos.

## Como jogar
1. Alguém cria a sala (recebe um código de 4 letras) e compartilha com o grupo.
2. Cada jogador entra pelo próprio celular com nome + código (mínimo 3 jogadores).
3. Quem criou a sala clica em "Começar partida".
4. A cada rodada, um jogador diferente é o palpiteiro:
   - Ele escolhe uma categoria.
   - Os demais veem a pergunta oficial na tela e respondem **em voz alta** (não pelo app).
   - O palpiteiro recebe 5 perguntas da categoria (uma delas é a oficial) e ordena da menos
     provável (0) para a mais provável (4) usando as setas.
   - Ao concluir, a pontuação é revelada: pontos = posição em que ele colocou a pergunta oficial.
5. A partida tem o mesmo número de rodadas que de jogadores — todos passam pelo papel de
   palpiteiro uma vez. Vence quem tiver mais pontos ao final.

## Estrutura de perguntas
As 500 perguntas ficam em `backend/data/questions.json`, geradas por
`backend/generate-questions.js` (mantido no repo caso você queira gerar variações ou aumentar o
banco — é só rodar `node generate-questions.js` de novo dentro de `backend/`).
