import React, { useEffect, useRef, useState } from 'react';
import {
  socket,
  getOrCreatePlayerId,
  saveSession,
  getSavedSession,
  getPreferences,
} from './socket.js';
import AnimatedBackground from './components/AnimatedBackground.jsx';
import ResetButton from './components/ResetButton.jsx';
import Menu from './screens/Menu.jsx';
import Lobby from './screens/Lobby.jsx';
import CategoryPicker from './screens/CategoryPicker.jsx';
import WaitingScreen from './screens/WaitingScreen.jsx';
import GuesserScale from './screens/GuesserScale.jsx';
import PlayerQuestion from './screens/PlayerQuestion.jsx';
import RoundResult from './screens/RoundResult.jsx';
import GameOver from './screens/GameOver.jsx';

const playerId = getOrCreatePlayerId();

const ACCENT_HEX = {
  amber: '#f5a623',
  coral: '#ff5d8f',
  mint: '#4cd9c0',
  blue: '#7dc2ff',
  violet: '#c792ea',
};

function applyPreferences(prefs) {
  document.documentElement.style.setProperty('--accent', ACCENT_HEX[prefs.accent] || ACCENT_HEX.amber);
  document.documentElement.classList.toggle('reduce-motion', !!prefs.reduceMotion);
}

export default function App() {
  // 'menu' = tela inicial (jogar / perfil / predefinições)
  // 'lobby' | 'playing' | 'round_result' | 'finished' = dentro da sala global
  const [status, setStatus] = useState('menu');
  const [name, setName] = useState(() => getSavedSession().name || '');
  const [players, setPlayers] = useState([]);
  const [round, setRound] = useState(null);
  const [guesserQuestions, setGuesserQuestions] = useState(null);
  const [playerQuestion, setPlayerQuestion] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [finalScoreboard, setFinalScoreboard] = useState(null);
  const [error, setError] = useState('');
  const [entering, setEntering] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const attemptedRejoin = useRef(false);

  // Aplica cor de destaque e preferência de movimento salvas assim que o app abre.
  useEffect(() => {
    applyPreferences(getPreferences());
  }, []);

  function resetLocalGameState() {
    setPlayers([]);
    setRound(null);
    setGuesserQuestions(null);
    setPlayerQuestion(null);
    setRoundResult(null);
    setFinalScoreboard(null);
  }

  useEffect(() => {
    function onRoomUpdate(summary) {
      setPlayers(summary.players);
    }
    function onGameStarted() {
      setStatus('playing');
    }
    function onRoundStarted(payload) {
      setStatus('playing');
      setRound({ ...payload, category: null });
      setGuesserQuestions(null);
      setPlayerQuestion(null);
      setRoundResult(null);
    }
    function onCategoryChosen({ category }) {
      setRound((r) => (r ? { ...r, category } : r));
    }
    function onGuesserQuestions({ category, questions }) {
      setGuesserQuestions(questions);
      setRound((r) => (r ? { ...r, category } : r));
    }
    function onPlayerQuestion({ category, text }) {
      setPlayerQuestion({ category, text });
      setRound((r) => (r ? { ...r, category } : r));
    }
    function onRoundResult(payload) {
      setStatus('round_result');
      setRoundResult(payload);
    }
    function onGameOver({ players: finalPlayers }) {
      setStatus('finished');
      setFinalScoreboard(finalPlayers);
    }
    // Alguém apertou o botão global de reset: todo mundo volta pro menu.
    function onServerReset() {
      resetLocalGameState();
      setStatus('menu');
      setResetNotice(true);
      setTimeout(() => setResetNotice(false), 4000);
    }

    socket.on('room_update', onRoomUpdate);
    socket.on('game_started', onGameStarted);
    socket.on('round_started', onRoundStarted);
    socket.on('category_chosen', onCategoryChosen);
    socket.on('guesser_questions', onGuesserQuestions);
    socket.on('player_question', onPlayerQuestion);
    socket.on('round_result', onRoundResult);
    socket.on('game_over', onGameOver);
    socket.on('server_reset', onServerReset);

    return () => {
      socket.off('room_update', onRoomUpdate);
      socket.off('game_started', onGameStarted);
      socket.off('round_started', onRoundStarted);
      socket.off('category_chosen', onCategoryChosen);
      socket.off('guesser_questions', onGuesserQuestions);
      socket.off('player_question', onPlayerQuestion);
      socket.off('round_result', onRoundResult);
      socket.off('game_over', onGameOver);
      socket.off('server_reset', onServerReset);
    };
  }, []);

  // Tenta reconectar automaticamente à sala global (ex: app foi pra segundo plano).
  useEffect(() => {
    if (attemptedRejoin.current) return;
    attemptedRejoin.current = true;
    const saved = getSavedSession();
    if (!saved.name) return;
    socket.emit('rejoin_room', { playerId }, (res) => {
      if (!res || !res.ok) return;
      setName(saved.name);
      setPlayers(res.room.players);
      setStatus(res.room.status === 'lobby' ? 'lobby' : res.room.status);
      if (res.round) setRound({ ...res.round, category: res.round.category });
      if (res.guesserQuestions) setGuesserQuestions(res.guesserQuestions);
      if (res.playerQuestion) setPlayerQuestion(res.playerQuestion);
      if (res.roundResult) setRoundResult(res.roundResult);
      if (res.finalScoreboard) setFinalScoreboard(res.finalScoreboard);
    });
  }, []);

  function handlePlay(playerName) {
    setError('');
    setEntering(true);
    socket.emit('enter_lobby', { name: playerName, playerId }, (res) => {
      setEntering(false);
      if (!res.ok) return setError(res.error || 'Não foi possível entrar na sala.');
      setName(playerName);
      saveSession({ name: playerName });
      setStatus(res.status === 'lobby' ? 'lobby' : res.status);
    });
  }

  function handleLeaveToMenu() {
    setStatus('menu');
  }

  function handleStartGame() {
    setError('');
    socket.emit('start_game', {}, (res) => {
      if (res && !res.ok) setError(res.error || 'Não foi possível iniciar.');
    });
  }

  function handleChooseCategory(category) {
    socket.emit('choose_category', { category }, (res) => {
      if (res && !res.ok) setError(res.error || 'Erro ao escolher categoria.');
    });
  }

  function handleSubmitArrangement(arrangementIds) {
    socket.emit('submit_arrangement', { arrangement: arrangementIds }, (res) => {
      if (res && !res.ok) setError(res.error || 'Erro ao enviar.');
    });
  }

  function handleNextRound() {
    socket.emit('next_round', {}, () => {});
  }

  function handlePlayAgain() {
    setStatus('menu');
  }

  const isGuesser = round && round.guesserId === playerId;

  return (
    <>
      <AnimatedBackground />
      <div className="app-shell">
        {resetNotice && (
          <div className="toast-banner">O servidor foi resetado — todo mundo voltou pro menu.</div>
        )}

        {status === 'menu' && (
          <Menu
            name={name}
            setName={setName}
            onPlay={handlePlay}
            error={error}
            busy={entering}
            onPreferencesChange={applyPreferences}
          />
        )}

        {status === 'lobby' && (
          <Lobby
            players={players}
            onStart={handleStartGame}
            onLeave={handleLeaveToMenu}
            error={error}
            myId={playerId}
          />
        )}

        {status === 'playing' && round && !round.category && isGuesser && (
          <CategoryPicker round={round} onChoose={handleChooseCategory} />
        )}

        {status === 'playing' && round && !round.category && !isGuesser && (
          <WaitingScreen
            title={`${round.guesserName} está escolhendo a categoria...`}
            subtitle="Prepare os ouvidos — a pergunta chega já já."
            round={round}
          />
        )}

        {status === 'playing' && round && round.category && isGuesser && guesserQuestions && (
          <GuesserScale round={round} questions={guesserQuestions} onSubmit={handleSubmitArrangement} />
        )}

        {status === 'playing' && round && round.category && !isGuesser && playerQuestion && (
          <PlayerQuestion round={round} data={playerQuestion} />
        )}

        {status === 'round_result' && roundResult && (
          <RoundResult data={roundResult} myId={playerId} onNext={handleNextRound} />
        )}

        {status === 'finished' && finalScoreboard && (
          <GameOver players={finalScoreboard} myId={playerId} onPlayAgain={handlePlayAgain} />
        )}
      </div>
      <ResetButton />
    </>
  );
}
