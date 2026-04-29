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
            showFirstPlace: false,
            showSecondPlace: false,
            showThirdPlace: false,
            topThree: [],
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
            this.socket.addEventListener("message", message => {
                this.socketReceive(message);
            })
        },
        socketReceive: function (message) {
            m = JSON.parse(message.data)
            console.log("message recieved: ", m); 
            console.log("Action: ", m['action']);
            console.log("GameBoard: ", this.gameBoard);
            if ( m['action'] == 'playAgain') {
                this.gameBoard = 'joining';
                console.log("Game Board: ", this.gameBoard);
                this.winners = [];
                this.players = [];
                this.youPlaced = {};
                this.showFirstPlace = false;
                this.showSecondPlace = false;
                this.showThirdPlace = false;
                this.time = 0;
                this.place = 0;
                this.stop = 0;
                this.stopText = "";
                this.numOfFalse = 0;
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
                    this.calculateWinners();
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
                    name: this.sendName,
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
                    accuracy: Math.ceil(((this.typingPromptText.length - this.numOfFalse) / this.typingPromptText.length) * 100),
                    time: this.time,
                    wpm: this.calculateWordsPerMinute(),
                }
                this.sendToSocket(toSend)
            } else {
                let toSend = {
                    action: 'sendPercentage',
                    percentage: percentage,
                    accuracy: Math.ceil(((this.typingPromptText.length - this.numOfFalse) / this.typingPromptText.length) * 100),
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
            // console.log(event)
            // this.userTyped += event.key or somethjing like that
            // This function will be called every time the input value changes
            console.log('Input event:', event.target.value);
            let length = this.whatYouAreTyping.length;
            let isFinished = false;
            
            
            if (this.stop == 0 || event.target.value == this.stopText.slice(0, -1)) {
                if (event.target.value == this.stopText.slice(0, -1)) {
                    this.stop = 0
                }
                for (let i = 0; i < length; i++) {
                    if (this.whatYouAreTyping[i] != this.typingPromptText[i]) {
                        this.stop = this.whatYouAreTyping.length
                        this.stopText = this.whatYouAreTyping
                        console.log("False: ", this.whatYouAreTyping[i], " != ", this.typingPromptText[i]);
                        // this.typingPrompt = this.typingPrompt.substring(0, i) + "<span style='color: red'>" + this.typingPrompt[i] + "</span>" + this.typingPrompt.substring(i + 1);
                        console.log("Typing Prompt: ", this.typingPrompt);
                        console.log("This.typingprompt.supstring: ", this.typingPrompt.substring(i + 1));
                        this.numOfFalse += 1;
                        correct = false;
                    } 
                    if (this.whatYouAreTyping.length == this.typingPromptText.length) {
                        console.log("You Finished")
                        isFinished = true;
                    } if ( this.whatYouAreTyping.length > this.typingPromptText.length ) {
                        this.whatYouAreTyping = this.typingPromptText;
                        console.log("You Typed Too Much");
                    }
                }
                let html = '';
                for (let i = 0; i < this.typingPromptText.length; i++) {
                    const correctChar = this.typingPromptText[i];
                    const typedChar = this.whatYouAreTyping[i];
    
                    if (typedChar == null) {
                    // Not yet typed
                    html += `<span>${correctChar}</span>`;
                    } else if (typedChar === correctChar) {
                    html += `<span style="color: white">${correctChar}</span>`;
                    } else {
                    html += `<span style="color: #c81515;">${correctChar}</span>`;
                    }
                }
    
                this.typingPrompt = html;
            
                this.sendPercentage(Math.ceil((this.whatYouAreTyping.length / this.typingPromptText.length) * 100));
            } else {
                this.whatYouAreTyping = this.stopText;;
                console.log(this.whatYouAreTyping)
                console.log(this.stopText.slice(0, -1))
                
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
            let place = 0;
            console.log("WINNERS.LENGTH: ", this.winners.length)
            console.log("PRESENTING WINNNNNNNERSSSSS Winners");
            console.log("Winners: ", this.winners);
            this.gameBoard = 'winners';
            if (this.winners.length == 0) {
                console.log("No winners to present");
                return;
            }
            if (this.winners.length == 1) {
                this.winners[1] = {
                    name: "No one",
                    color: "black",
                    place: 2,
                    time: 0,
                    accuracy: 0,
                    wpm: 0,
                }
                this.players[1] = {
                    name: "No one",
                    color: "black",
                    place: 2,
                    time: 0,
                    accuracy: 0,
                    wpm: 0,
                }
            }
            if (this.winners.length == 2) {
                this.winners[2] = {
                    name: "No one",
                    color: "black",
                    place: 3,
                    time: 0,
                    accuracy: 0,
                    wpm: 0,
                }
                this.players[2] = {
                    name: "No one",
                    color: "black",
                    place: 3,
                    time: 0,
                    accuracy: 0,
                    wpm: 0,
                }
            }
            console.log("SD:LKFJ:SDLKFJ:SDLKFJ:", this.winners)
            this.placeTimer = setInterval(() => {
                place++;
                this.gameBoard = 'winners';
                if (place == 2) {
                    this.showFirstPlace = true;
                    console.log("First Place: ", this.winners[0]);
                } else if (place == 3) {
                    this.showSecondPlace = true;
                } else if (place == 4) {
                    this.showThirdPlace = true;
                    this.winSound.play();
                } else if (place == 5) {
                    clearInterval(this.placeTimer);
                    this.gameBoard = 'playAgain';
                }
                console.log("GAMMMME BOARDDD: ", this.gameBoard)
              }, 2000);
            
            console.log("Winners: ", this.winners);
        },
        playAgain: function () {
            let toSend = {
                action: 'playAgain',
            }
            this.sendToSocket(toSend);
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
        
        this.connectSocket();
    },
    mounted: function () {
        //setViewportHeight();
        //window.addEventListener('resize', setViewportHeight);
        // window.addEventListener('onkeydown', this.handleInput);
    },
    

}).mount('#app');


