import React, { useEffect, useRef, useState } from 'react';
import { socket, getOrCreatePlayerId, saveSession, getSavedSession, clearSession } from './socket.js';
import Join from './screens/Join.jsx';
import Lobby from './screens/Lobby.jsx';
import CategoryPicker from './screens/CategoryPicker.jsx';
import WaitingScreen from './screens/WaitingScreen.jsx';
import GuesserScale from './screens/GuesserScale.jsx';
import PlayerQuestion from './screens/PlayerQuestion.jsx';
import RoundResult from './screens/RoundResult.jsx';
import GameOver from './screens/GameOver.jsx';

const playerId = getOrCreatePlayerId();

export default function App() {
  const [status, setStatus] = useState('join'); // join | lobby | playing | round_result | finished
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [players, setPlayers] = useState([]);
  const [round, setRound] = useState(null); // {guesserId, guesserName, roundNumber, totalRounds, category}
  const [guesserQuestions, setGuesserQuestions] = useState(null);
  const [playerQuestion, setPlayerQuestion] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [finalScoreboard, setFinalScoreboard] = useState(null);
  const [error, setError] = useState('');
  const attemptedRejoin = useRef(false);

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

    socket.on('room_update', onRoomUpdate);
    socket.on('game_started', onGameStarted);
    socket.on('round_started', onRoundStarted);
    socket.on('category_chosen', onCategoryChosen);
    socket.on('guesser_questions', onGuesserQuestions);
    socket.on('player_question', onPlayerQuestion);
    socket.on('round_result', onRoundResult);
    socket.on('game_over', onGameOver);

    return () => {
      socket.off('room_update', onRoomUpdate);
      socket.off('game_started', onGameStarted);
      socket.off('round_started', onRoundStarted);
      socket.off('category_chosen', onCategoryChosen);
      socket.off('guesser_questions', onGuesserQuestions);
      socket.off('player_question', onPlayerQuestion);
      socket.off('round_result', onRoundResult);
      socket.off('game_over', onGameOver);
    };
  }, []);

  // Tenta reconectar automaticamente a uma sala salva (ex: app foi pra segundo plano)
  useEffect(() => {
    if (attemptedRejoin.current) return;
    attemptedRejoin.current = true;
    const saved = getSavedSession();
    if (!saved.code) return;
    setName(saved.name);
    socket.emit('rejoin_room', { code: saved.code, playerId }, (res) => {
      if (!res || !res.ok) {
        clearSession();
        return;
      }
      setCode(res.room.code);
      setPlayers(res.room.players);
      setStatus(res.room.status === 'lobby' ? 'lobby' : res.room.status);
      if (res.round) setRound({ ...res.round, category: res.round.category });
      if (res.guesserQuestions) setGuesserQuestions(res.guesserQuestions);
      if (res.playerQuestion) setPlayerQuestion(res.playerQuestion);
      if (res.roundResult) setRoundResult(res.roundResult);
      if (res.finalScoreboard) setFinalScoreboard(res.finalScoreboard);
    });
  }, []);

  function handleCreateRoom(playerName) {
    setError('');
    socket.emit('create_room', { name: playerName, playerId }, (res) => {
      if (!res.ok) return setError(res.error || 'Não foi possível criar a sala.');
      setName(playerName);
      setCode(res.code);
      saveSession({ code: res.code, name: playerName });
      setStatus('lobby');
    });
  }

  function handleJoinRoom(playerName, roomCode) {
    setError('');
    socket.emit('join_room', { name: playerName, code: roomCode, playerId }, (res) => {
      if (!res.ok) return setError(res.error || 'Não foi possível entrar na sala.');
      setName(playerName);
      setCode(res.code);
      saveSession({ code: res.code, name: playerName });
      setStatus('lobby');
    });
  }

  function handleStartGame() {
    setError('');
    socket.emit('start_game', { code }, (res) => {
      if (res && !res.ok) setError(res.error || 'Não foi possível iniciar.');
    });
  }

  function handleChooseCategory(category) {
    socket.emit('choose_category', { code, category }, (res) => {
      if (res && !res.ok) setError(res.error || 'Erro ao escolher categoria.');
    });
  }

  function handleSubmitArrangement(arrangementIds) {
    socket.emit('submit_arrangement', { code, arrangement: arrangementIds }, (res) => {
      if (res && !res.ok) setError(res.error || 'Erro ao enviar.');
    });
  }

  function handleNextRound() {
    socket.emit('next_round', { code }, () => {});
  }

  function handlePlayAgain() {
    clearSession();
    window.location.reload();
  }

  const isGuesser = round && round.guesserId === playerId;

  return (
    <div className="app-shell">
      {status === 'join' && (
        <Join onCreate={handleCreateRoom} onJoin={handleJoinRoom} error={error} />
      )}

      {status === 'lobby' && (
        <Lobby code={code} players={players} onStart={handleStartGame} error={error} myId={playerId} />
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
        <RoundResult
          data={roundResult}
          myId={playerId}
          onNext={handleNextRound}
        />
      )}

      {status === 'finished' && finalScoreboard && (
        <GameOver players={finalScoreboard} myId={playerId} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
}
