// The io() is provided by the client-side Socket.IO library
// that was loaded in public/trivia.html.
const socket = io();

// Extract the values from the URL search parameters. 
const urlSearchParams = new URLSearchParams(window.location.search);
const playerName = urlSearchParams.get('playerName');
const room = urlSearchParams.get('room');

/*
  Welcome Header
*/
// Target the template that’s embedded as a script tag in the public/trivia.html file.
const mainHeadingTemplate = document.querySelector(
  '#main-heading-template'
).innerHTML;

// Compile the template into HTML
const welcomeHeadingHTML = Handlebars.compile(mainHeadingTemplate);

// Insert welcomeHeadingHTML right after the opening <main> tag
document.querySelector('main').insertAdjacentHTML(
  'afterBegin',
  welcomeHeadingHTML({
    playerName,
  })
);

/*
  Socket.IO Join Event Emitter
*/
// Call socket.emit() to send a 'join' event to the server.
socket.emit('join', { playerName, room }, error => {
    // If there’s an error, the player will see an alert
    // and be redirected back to the registration page, /.
    if (error) {
      alert(error);
      location.href = '/';
  }
});

/*
  Socket.IO Messsage Event Listener
*/
// listen for the message event and update the chat section accordingly
socket.on('message', ({ playerName, text, createdAt }) => {
  
  const chatMessages = document.querySelector('.chat__messages');

  const messageTemplate = document.querySelector('#message-template').innerHTML;

  const template = Handlebars.compile(messageTemplate);

  const html = template({
    playerName,
    text,
    createdAt: moment(createdAt).format('h:mm a'),
  });

  chatMessages.insertAdjacentHTML('afterBegin', html);
});


/*
  Socket.IO Room Event Listener
*/
// set up the client to listen for the room event
// and update the page, the “Game Info” section, accordingly on receiving the event.
socket.on('room', ({ room, players }) => {
  // target the container where we'll attach the info to
  const gameInfo = document.querySelector('.game-info');

  // target the Handlebars template we'll use to format the game info
  const sidebarTemplate = document.querySelector(
    '#game-info-template'
  ).innerHTML;

  // Compile the template into HTML by calling Handlebars.compile(), which returns a function
  const template = Handlebars.compile(sidebarTemplate);

  const html = template({
    room,
    players,
  });

  // set gameInfo container's html content to the new html
  gameInfo.innerHTML = html;
});


/*
  SocketIO Question Event Listener
*/
// decode any HTML-encoded strings in the trivia questions
const decodeHTMLEntities = (text) => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};

socket.on('question', ({ answers, createdAt, playerName, question }) => {
  const triviaForm = document.querySelector('.trivia__form');
  const triviaQuestion = document.querySelector('.trivia__question');
  const triviaAnswers = document.querySelector('.trivia__answers');
  const triviaQuestionButton = document.querySelector('.trivia__question-btn');
  const triviaFormSubmitButton = triviaForm.querySelector(
    '.trivia__submit-btn'
  );

  const questionTemplate = document.querySelector(
    '#trivia-question-template'
  ).innerHTML;

  // Clear out any question and answers from the previous round
  triviaQuestion.innerHTML = '';
  triviaAnswers.innerHTML = '';

  // Disable the Get Question button to prevent the player from trying to skip a question
  triviaQuestionButton.setAttribute('disabled', 'disabled');

  // Enable the submit button to allow the player to submit an answer
  triviaFormSubmitButton.removeAttribute('disabled');

  const template = Handlebars.compile(questionTemplate);

  const html = template({
    playerName,
    createdAt: moment(createdAt).format('h:mm a'),
    question: decodeHTMLEntities(question),
    answers,
  });

  triviaQuestion.insertAdjacentHTML('beforeend', html);
});

/*
  Socket.IO Answer Event Listener
*/
// listen for the answer event, and update the trivia section
socket.on('answer', ({ playerName, isRoundOver, createdAt, text }) => {
  const triviaAnswers = document.querySelector('.trivia__answers');
  const triviaRevealAnswerButton = document.querySelector(
    '.trivia__answer-btn'
  );

  const messageTemplate = document.querySelector('#message-template').innerHTML;
  const template = Handlebars.compile(messageTemplate);

  const html = template({
    playerName: playerName,
    text,
    createdAt: moment(createdAt).format('h:mm a'),
  });

  triviaAnswers.insertAdjacentHTML('afterBegin', html);

  // If isRoundOver is set to true, activate the reveal answer button
  if (isRoundOver) {
    triviaRevealAnswerButton.removeAttribute('disabled');
  }
});

/*
  Socket.IO CorrectAnswer Event Listener
*/
// Display the correct answer in the client
socket.on('correctAnswer', ({ text }) => {
  const triviaAnswers = document.querySelector('.trivia__answers');
  const triviaQuestionButton = document.querySelector('.trivia__question-btn');
  const triviaRevealAnswerButton = document.querySelector(
    '.trivia__answer-btn'
  );
  const triviaFormSubmitButton = triviaForm.querySelector(
    '.trivia__submit-btn'
  );

  const answerTemplate = document.querySelector(
    '#trivia-answer-template'
  ).innerHTML;
  const template = Handlebars.compile(answerTemplate);

  const html = template({
    text,
  });

  triviaAnswers.insertAdjacentHTML('afterBegin', html);

  triviaQuestionButton.removeAttribute('disabled');
  triviaRevealAnswerButton.setAttribute('disabled', 'disabled');
  triviaFormSubmitButton.removeAttribute('disabled');
});

/*
  Chat Section
*/
const chatForm = document.querySelector('.chat__form');

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const chatFormInput = chatForm.querySelector('.chat__message');
  const chatFormButton = chatForm.querySelector('.chat__submit-btn');

  // prevent the player from being able to submit multiple messages simultaneously.
  chatFormButton.setAttribute('disabled', 'disabled');

  const message = event.target.elements.message.value;

  socket.emit('sendMessage', message, (error) => {
    chatFormButton.removeAttribute('disabled');
    chatFormInput.value = '';
    chatFormInput.focus();

    if (error) return alert(error);
  });
});

/*
  Trivia Section
*/
// Sending an event called getQuestion to the server
const triviaQuestionButton = document.querySelector('.trivia__question-btn');
triviaQuestionButton.addEventListener('click', () => {
  // pass null as the second argument because we're not sending any data to the server
  socket.emit('getQuestion', null, (error) => {
    if (error) return alert(error);
  });
});

// Emit a getAnswer event from the client to the server
const triviaRevealAnswerButton = document.querySelector('.trivia__answer-btn');
triviaRevealAnswerButton.addEventListener('click', () => {
  socket.emit('getAnswer', null, (error) => {
    if (error) return alert(error);
  });
});

// an event listener for submit button.
const triviaForm = document.querySelector('.trivia__form');
triviaForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const triviaFormSubmitButton = triviaForm.querySelector(
    '.trivia__submit-btn'
  );
  const triviaFormInputAnswer = triviaForm.querySelector('.trivia__answer');

  triviaFormSubmitButton.setAttribute('disabled', 'disabled');

  const answer = event.target.elements.answer.value;
  socket.emit('sendAnswer', answer, (error) => {
    triviaFormInputAnswer.value = '';
    triviaFormInputAnswer.focus();

    if (error) return alert(error.message);
  });
});
