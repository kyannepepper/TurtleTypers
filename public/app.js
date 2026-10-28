///JSON.stringify();
//JSON.parse();
//NOT JASON


const app = Vue.createApp({
    data: function () {
        return {
            // data properties here
            socket: null,
            messageToSend: "",
            sendName: "",
            // Kahoot-style game code
            isHost: !window.location.pathname.includes('player') && !window.location.pathname.includes('join'),
            // The host makes its own 6-digit PIN as soon as the page loads
            gameCode: "",
            joinCode: new URLSearchParams(window.location.search).get('code') || "",
            joinError: "",
            joinUrl: window.location.host + "/join",
            players: [],
            gameBoard: 'joining',
            countdown: 3,
            showCountdown: false,
            showPrompt: false,
            countdownTimer: null,
            typingPrompt: "",
            typingPromptText: "",
            whatYouAreTyping: "",
            winners: [],
            youPlaced: {},
            time: 0,
            place: 0,
            stop: 0,
            stopText: "",
            numOfFalse: 0,
            lastTyped: "",
            hasFinished: false,
            showFirstPlace: false,
            showSecondPlace: false,
            showThirdPlace: false,
            topThree: [],
            resultsHeadline: "",
            revealTimers: [],
            confetti: [],
            joinSound: new Audio("/sounds/join.mp3"),
            countDownSound: new Audio("/sounds/countDown.mp3"),
            typeSound: new Audio("/sounds/playing.mp3"),
            winSound: new Audio("/sounds/winning.mp3"),
        }
    },

    methods: {
        connectSocket: function () {
            this.socket = new WebSocket("wss://s25-websocket-kyannepepper.onrender.com")
            //this.socket = new WebSocket("ws://localhost:3000")
            this.socket.addEventListener("open", () => {
                // The host screen registers its game PIN with the server
                if (this.isHost) {
                    this.sendToSocket({ action: 'createGame', code: this.gameCode });
                }
            })
            this.socket.addEventListener("close", () => {
                // If the host loses its connection (for example the server
                // restarted), reconnect and register the same PIN again
                if (this.isHost) {
                    setTimeout(() => this.connectSocket(), 2000);
                }
            })
            this.socket.addEventListener("message", message => {
                this.socketReceive(message);
            })
        },
        socketReceive: function (message) {
            m = JSON.parse(message.data)
            console.log("message recieved: ", m); 
            console.log("Action: ", m['action']);
            console.log("GameBoard: ", this.gameBoard);
            if ( m['action'] == 'gameCreated') {
                this.gameCode = m['code'];
            }
            if ( m['action'] == 'joinError') {
                this.joinError = m['message'];
            }
            if ( m['action'] == 'hostLeft') {
                this.gameBoard = 'joining';
                this.players = [];
                this.winners = [];
                this.joinError = "The host ended the game. Enter a new code to join again.";
            }
            if ( m['action'] == 'playAgain') {
                this.gameBoard = 'joining';
                console.log("Game Board: ", this.gameBoard);
                this.winners = [];
                this.players = [];
                this.youPlaced = {};
                this.showFirstPlace = false;
                this.showSecondPlace = false;
                this.showThirdPlace = false;
                this.revealTimers.forEach(t => clearTimeout(t));
                this.revealTimers = [];
                this.confetti = [];
                this.resultsHeadline = "";
                this.time = 0;
                this.place = 0;
                this.stop = 0;
                this.stopText = "";
                this.numOfFalse = 0;
                this.lastTyped = "";
                this.hasFinished = false;
                this.typingPrompt = "";
                this.typingPromptText = "";
                this.whatYouAreTyping = "";
            }
            if ( this.gameBoard == 'joining' || this.gameBoard == 'youJoined' ) {
                if ( m["action"] == 'joinGame' ) {
                    console.log("Player Joined: " + m['name']);
                    console.log(this.players);
                    this.joinSound.play();
                } 
            }
            if ( m['action'] == 'updateAllPlayers') {
                console.log("Update All Players");
                console.log("Players: ", m['players']);
                this.players = m['players'];
                console.log("Players: ", this.players);
                console.log("Players: ", this.players.length);
            }
            if ( m['action'] == 'instructions') {
                console.log("Read Instructions");
                this.gameBoard = 'instructions';
            }
            if ( m['action'] == 'startGame') {
                console.log("Countdown");
                this.gameBoard = 'countdown';
                this.count();
            }
            if ( m['action'] == 'sendPrompt') {
                console.log("They are typing: ", m['prompt']);
                let prompt = m['prompt'];
                // Assign the processed string to a new variable (or overwrite prompt)
                
                this.typingPrompt = prompt;
                this.typingPromptText = prompt;
            }
            if ( m['action'] == 'sendPercentage') {
                console.log("Accuracy Sent: ", m['percentage']);
                
            }
            if ( m['action'] == 'finished') {
                console.log("You finished: ", m['percentage']);
                
            }
            if ( m['action'] == 'updateBoard') {
                const thisPlayer = this.players.find(player => player.color === m['color'])
                thisPlayer.percentage = m['percentage']
                
            }
            if ( m['action'] == 'updateWinners') {
                
                newWinner = {
                    name: m['name'],
                    color: m['color'],
                    place: m['place'],
                    time: m['time'],
                    accuracy: m['accuracy'],
                    wpm: m['wpm'],
                }
                console.log(m['color'])
                this.winners.push(newWinner)
                console.log("THIS IS THE LENGTH OF WINNERS: ", this.winners.length);
                console.log("THIS IS THE LENGTH OF PLAYERS: ", this.players.length);
                if (this.winners.length == this.players.length) {
                    console.log("All Players Finished");
                    this.presentWinners();
                }
            }
            if ( m['action'] == 'updateWinnersPage') {
                
                this.gameBoard = "youPlaced"
                this.youPlaced = {
                    name: m['name'],
                    color: m['color'],
                    place: m['place'],
                    time: m['time'],
                    accuracy: m['accuracy'],
                    wpm: m['wpm'],
                }
            }
            if ( m['action'] == 'updatePlayersPage') {
                this.gameBoard = "youJoined"
                this.youJoined = {
                    name: m['name'],
                    color: m['color'],
                }
            }
            
        },
        takeTurn: function () {
            let toSend = {
                action: 'takeTurn',
                turn: 'rollDie',
                player: this.messageToSend,
            };
            this.sendToSocket(toSend);
        },
        sendToSocket: function (data) {
            this.socket.send(JSON.stringify(data));
        },
        joinGame: function () {
            this.joinError = "";
            this.joinCode = String(this.joinCode).replace(/\D/g, '');
            if (this.joinCode.length != 6) {
                this.joinError = "Enter the 6-digit game code from the big screen.";
                return;
            }
            if (this.sendName.trim() == "") {
                this.joinError = "Enter your name.";
                return;
            }
            if (this.gameBoard == 'joining') {
                function getRandomHslColor(minSaturation = 0, maxSaturation = 100, minLightness = 0, maxLightness = 100) {
                    const h = Math.floor(Math.random() * 361); // Hue (0-360)
                    // Saturation between min/max (default 0-100)
                    const s = Math.floor(Math.random() * (maxSaturation - minSaturation + 1)) + minSaturation;
                    // Lightness between min/max (default 0-100)
                    const l = Math.floor(Math.random() * (maxLightness - minLightness + 1)) + minLightness;
                  
                    return `hsl(${h}, ${s}%, ${l}%)`;
                }
                const randomColorHsl = getRandomHslColor();
                let toSend = {
                    action: 'joinGame',
                    code: this.joinCode,
                    name: this.sendName.trim(),
                    color: randomColorHsl,
                    accuracy: 0,
                }
                this.sendToSocket(toSend);
            }
        },
        instructions: function () {
            let toSend = {
                action: 'instructions',
            }
            this.sendToSocket(toSend);
        },
        // startGame: function () {
        //     let toSend = {
        //         action: 'startGame',
        //     }
        //     this.sendToSocket(toSend);
        // }
        startGame: function () {
            let toSend = {
                action: 'startGame',
            }
            this.prompt();
            this.sendToSocket(toSend);
            document.addEventListener("")
        },
        prompt: function () {
            const typingPrompts = [
                "Speedy turtles dash across the digital desert, determined to defeat their typing rivals with flawless fingers and laser focus.",
                "The quick brown fox jumps over the lazy turtle, racing against time on a glowing keyboard trail.",
                "Typing like a ninja, the turtle zoomed ahead, smashing every letter with shell-shocking precision.",
                "In the great type-off of 2025, only the fastest fingers would win the golden shell trophy.",
                "Accuracy is everything when your turtle's speed depends on each perfect keystroke!",
                "With a determined glare and steady claws, the turtle typed like the wind, one keystroke at a time.",
                "Turtles may be slow in water, but on keyboards, they're lightning fast and laser focused.",
                "Every letter typed correctly was a step closer to victory in the ultimate typing showdown.",
                "A single typo could cost the race, so each turtle typed with care, speed, and determination.",
                "The crowd roared as turtles raced across the screen, their shells gleaming under the glow of pixel lights."
              ];
            const randomIndex = Math.floor(Math.random() * typingPrompts.length);
            const randomPrompt = typingPrompts[randomIndex];
            let toSend = {
                action: 'sendPrompt',
                prompt: randomPrompt,
            }
            this.sendToSocket(toSend);
        },
        updateBoard: function () {
            
            let toSend = {
                action: 'updateBoard',
            }
            this.sendToSocket(toSend);
        },
        
        sendPercentage: function (percentage) {
            if (percentage == 100) {
                console.log("You Finished")
                let toSend = {
                    action: 'finished',
                    accuracy: Math.max(0, Math.round(((this.typingPromptText.length - this.numOfFalse) / this.typingPromptText.length) * 100)),
                    time: this.time,
                    wpm: this.calculateWordsPerMinute(),
                }
                this.sendToSocket(toSend)
            } else {
                let toSend = {
                    action: 'sendPercentage',
                    percentage: percentage,
                    accuracy: Math.max(0, Math.round(((this.typingPromptText.length - this.numOfFalse) / this.typingPromptText.length) * 100)),
                }
                this.sendToSocket(toSend);
            }
            
            
        },
        count: function () {
            this.countdown = 3;
            this.showCountdown = true;
            this.countDownSound.play();
            this.countdownTimer = setInterval(() => {
              this.countdown--;
              this.countDownSound.play();
              if (this.countdown === 0) {
                clearInterval(this.countdownTimer);
                this.countdown = "GO"
                setTimeout(() => {
                    this.gameBoard = 'typing'
                    this.startTimer();
                    this.showCountdown = false;
                  }, 1000);
              }
            }, 1000);
        },
        startTimer: function () {
            console.log("Start Timer")
            this.typeSound.play();
            this.timer = setInterval(() => {
                this.time++;
                if (this.winners.length == this.players.length) {
                    console.log("All Players Finished");
                    this.typeSound.pause();
                    this.typeSound.currentTime = 0;
                    clearInterval(this.timer);
                }
                console.log("Timer: ", this.time);
              }, 1000);
            
        },
        
        handleInput(event) {
            // Lets you keep typing after a mistake. Wrong letters are highlighted
            // in red, and you can backspace to fix them. You only finish once
            // everything you typed matches the prompt exactly.
            const target = this.typingPromptText;
            // Read straight from the text box (works with phone keyboards too)
            let typed = event.target.value;

            // Don't let them type past the end of the prompt
            if (typed.length > target.length) {
                typed = typed.slice(0, target.length);
                event.target.value = typed;
            }
            this.whatYouAreTyping = typed;

            // Count each newly typed wrong letter (for accuracy)
            if (typed.length > this.lastTyped.length) {
                for (let i = this.lastTyped.length; i < typed.length; i++) {
                    if (typed[i] !== target[i]) {
                        this.numOfFalse += 1;
                    }
                }
            }
            this.lastTyped = typed;

            // How far they've gotten with no mistakes (this moves the turtle)
            let correctSoFar = 0;
            while (correctSoFar < typed.length && typed[correctSoFar] === target[correctSoFar]) {
                correctSoFar++;
            }

            // Color the prompt: white = correct, red = wrong, plain = not typed yet
            const escape = c => c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c;
            let html = '';
            for (let i = 0; i < target.length; i++) {
                const correctChar = escape(target[i]);
                if (i >= typed.length) {
                    html += `<span>${correctChar}</span>`;
                } else if (typed[i] === target[i]) {
                    html += `<span style="color: white">${correctChar}</span>`;
                } else {
                    html += `<span style="color: white; background-color: #c81515; border-radius: 4px;">${correctChar}</span>`;
                }
            }
            this.typingPrompt = html;

            if (typed === target) {
                if (!this.hasFinished) {
                    this.hasFinished = true;
                    this.sendPercentage(100);
                }
            } else {
                // Never report 100% until the whole prompt is typed correctly
                this.sendPercentage(Math.min(99, Math.floor((correctSoFar / target.length) * 100)));
            }
        },
        refocus() {
            this.$nextTick(() => {
                const input = this.$refs.hiddenInput;
                if (input) {
                input.focus();
                } else {
                console.warn("hiddenInput ref not available yet.");
                }
            });
        },
        calculateWordsPerMinute() {
            const totalTimeInMinutes = this.time / 60;
            const totalWordsTyped = this.whatYouAreTyping.split(' ').length;
            const wpm = totalWordsTyped / totalTimeInMinutes;
            return Math.round(wpm);
        },
        presentWinners() {
            // Reveal 3rd, then 2nd, then 1st (with confetti), then show "Play again"
            this.gameBoard = 'winners';
            this.revealTimers.forEach(t => clearTimeout(t));
            this.revealTimers = [];
            if (this.winners.length == 0) {
                return;
            }
            const steps = [];
            if (this.winners[2]) {
                steps.push(() => { this.resultsHeadline = "In third place…"; });
                steps.push(() => { this.showThirdPlace = true; });
            }
            if (this.winners[1]) {
                steps.push(() => { this.resultsHeadline = "In second place…"; });
                steps.push(() => { this.showSecondPlace = true; });
            }
            steps.push(() => { this.resultsHeadline = "And the winner is…"; });
            steps.push(() => {
                this.showFirstPlace = true;
                this.resultsHeadline = this.winners[0].name + " wins!";
                this.confetti = this.makeConfetti();
                const played = this.winSound.play();
                if (played && played.catch) played.catch(() => {});
            });
            steps.push(() => { this.gameBoard = 'playAgain'; });

            let delay = 0;
            steps.forEach((step, i) => {
                this.revealTimers.push(setTimeout(step, delay));
                delay += (i == steps.length - 2) ? 3000 : 1600;
            });
        },
        makeConfetti() {
            const colors = ['#ffe27a', '#ff7a59', '#4fd1c5', '#ffffff', '#9ae6b4', '#f687b3', '#7cc4ff'];
            const pieces = [];
            for (let i = 0; i < 110; i++) {
                const w = 7 + Math.random() * 8;
                pieces.push({
                    left: (Math.random() * 100) + '%',
                    width: w + 'px',
                    height: (w * (0.4 + Math.random() * 0.5)) + 'px',
                    backgroundColor: colors[i % colors.length],
                    animationDelay: (Math.random() * 0.9) + 's',
                    animationDuration: (2.6 + Math.random() * 2.2) + 's',
                    '--spin': (Math.random() > 0.5 ? '' : '-') + (360 + Math.floor(Math.random() * 540)) + 'deg',
                });
            }
            return pieces;
        },
        bubbleStyle(n) {
            const size = 8 + (n * 7) % 22;
            return {
                left: ((n * 37) % 100) + '%',
                width: size + 'px',
                height: size + 'px',
                animationDuration: (9 + (n * 3) % 9) + 's',
                animationDelay: (-(n * 1.7)) + 's',
            };
        },
        ordinal(n) {
            const s = ['th', 'st', 'nd', 'rd'];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        },
        playAgain: function () {
            let toSend = {
                action: 'playAgain',
            }
            this.sendToSocket(toSend);
        },
    },
    computed: {
        // Podium order on screen: 2nd, 1st, 3rd
        podiumSpots() {
            return [
                { place: 2, label: '2nd', player: this.winners[1] || null, revealed: this.showSecondPlace },
                { place: 1, label: '1st', player: this.winners[0] || null, revealed: this.showFirstPlace },
                { place: 3, label: '3rd', player: this.winners[2] || null, revealed: this.showThirdPlace },
            ];
        },
        // Everyone who finished after 3rd place
        otherFinishers() {
            return this.winners.slice(3);
        },
    },
    watch: {
        gameBoard(newValue) {
            
          if (newValue === 'typing') {
            setTimeout(() => {
              const input = this.$refs.hiddenInput;
              if (input) input.focus();
              else console.warn("Input still missing after timeout.");
            }, 100);
          }
        }
    },
    created: function () {
        if (this.isHost) {
            this.gameCode = String(Math.floor(100000 + Math.random() * 900000));
        }
        this.connectSocket();
    },
    mounted: function () {
        //setViewportHeight();
        //window.addEventListener('resize', setViewportHeight);
        // window.addEventListener('onkeydown', this.handleInput);
    },
    

}).mount('#app');


