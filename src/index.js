const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');

// Importing helper functions in the server file
const formatMessage = require('./utils/formatMessage.js');
const {
  addPlayer,
  getAllPlayers,
  getPlayer,
  removePlayer,
} = require('./utils/players.js');

const { getGameStatus, setGame, setGameStatus } = require('./utils/game.js');

// create the HTTP server
const app = express();
const server = http.createServer(app);

// connect Socket.IO to the HTTP server
const io = socketio(server);

const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

// Connection event handler
io.on('connection', (socket) => {
  console.log('A new player just connected');

  // listen for the join event
  socket.on('join', ({ playerName, room }, callback) => {
    const { error, newPlayer } = addPlayer({ id: socket.id, playerName, room });

    if (error) return callback(error.message);
    callback(); // The callback can be called without data.

    socket.join(newPlayer.room);

    socket.emit('message', formatMessage('Admin', 'Welcome!'));

    // Broadcast a message when a player joins
    socket.broadcast
      .to(newPlayer.room)
      .emit(
        'message',
        formatMessage('Admin', `${newPlayer.playerName} has joined the game!`)
      );

    // Emit a 'room' event to all players to update their Game Info sections
    io.in(newPlayer.room).emit('room', {
      room: newPlayer.room,
      players: getAllPlayers(newPlayer.room),
    });
  });

  // listen for the event and emitting a message to all players
  socket.on('sendMessage', (message, callback) => {
    const { error, player } = getPlayer(socket.id);

    if (error) return callback(error.message);

    if (player) {
      io.to(player.room).emit(
        'message',
        formatMessage(player.playerName, message)
      );
      callback(); // invoke the callback to trigger event acknowledgment
    }
  });

  // Invoke setGame to send question to all players
  socket.on('getQuestion', async (data, callback) => {
    const { error, player } = getPlayer(socket.id);

    if (error) return callback(error.message);

    if (player) {
      const game = await setGame();
      // Emit the 'question' event to all players in the room
      io.to(player.room).emit('question', {
        playerName: player.playerName,
        ...game.prompt,
      });
    }
  });

  // Handle the sendAnswer event in the server
  socket.on('sendAnswer', (answer, callback) => {
    const { error, player } = getPlayer(socket.id);

    if (error) return callback(error.message);

    if (player) {
      const { isRoundOver } = setGameStatus({
        event: 'sendAnswer',
        playerId: player.id,
        room: player.room,
      });

      // Since we want to show the player's submission to the rest of the players,
      // we have to emit an event (`answer`) to all the players in the room along
      // with the player's answer and `isRoundOver`.
      io.to(player.room).emit('answer', {
        ...formatMessage(player.playerName, answer),
        isRoundOver,
      });

      callback();
    }
  });

  // Emit the correct answer from the server
  socket.on('getAnswer', (data, callback) => {
    const { error, player } = getPlayer(socket.id);

    if (error) return callback(error.message);

    if (player) {
      const { correctAnswer } = getGameStatus({
        event: 'getAnswer',
      });
      io.to(player.room).emit(
        'correctAnswer',
        formatMessage(player.playerName, correctAnswer)
      );
    }
  });

  // listen for the disconnect event and removing the player
  socket.on('disconnect', () => {
    console.log('A player disconnected.');

    const disconnectedPlayer = removePlayer(socket.id);

    if (disconnectedPlayer) {
      const { playerName, room } = disconnectedPlayer;
      io.in(room).emit(
        'message',
        formatMessage('Admin', `${playerName} has left!`)
      );

      // update the players list
      io.in(room).emit('room', {
        room,
        players: getAllPlayers(room),
      });
    }
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server is up on port ${port}.`);
});
