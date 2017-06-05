// Author: Sinclert Perez (Sinclert@hotmail.com)


/* Contains the web application functionalities*/
var app = function() {
	
	
	// Information and fields about the app
    var self = {};
    self.my_identity = randomString(20);
	self.default_symbols = [1, 2, 3, 4, 5, 6, "*"];
    self.null_board = [" ", " ", " ", " ", " ", " ", " ", " ",
					   " ", " ", " ", " ", " ", " ", " ", " ",
					   " ", " ", " ", " ", " ", " ", " ", " ",
					   " ", " ", " ", " ", " ", " ", " ", " ",
					   " ", " ", " ", " ", " ", " ", " ", " ",
					   " ", " ", " ", " ", " ", " ", " ", " ",
					   " ", " ", " ", " ", " ", " ", " ", " ",
					   " ", " ", " ", " ", " ", " ", " ", " "];
    self.is_configured = false;
    self.player_1 = null;
    self.player_2 = null;
	self.turn_counter = 0;
	
	
	// General variables to use along the app
    var server_url = "https://luca-ucsc-teaching-backend.appspot.com/keystore/";
    var call_interval = 2000;
    Vue.config.silent = false;
	
	
	
	/* Puts a initialization listener */
    self.initialize = function () {
        document.addEventListener('deviceready', self.ondeviceready, false);
    };
	
	
	
	/* Once Cordova has finished its own initialization */
    self.ondeviceready = function () {
        console.log("The device is ready");
		
        $("#vue-div").show();
        self.is_configured = true;
    };
	
	
	
    /* This function calls the server each 'call_internal' ms to update information */
    function call_server() {
        console.log("Calling the server");
		
		// Add a bit of random delay to avoid synchronizations.
		var extra_delay = Math.floor(Math.random() * 1000);
		$.ajax({
			dataType: 'json',
			url: server_url +'read',
			data: {key: self.vue.chosen_magic_word},
			success: self.process_server_data,
			complete: setTimeout(call_server, call_interval + extra_delay)
		});
    }
	
	
	
    /* Main function for sending the state */
    self.send_state = function () {
        $.post(server_url + 'store', {
			
			key: self.vue.chosen_magic_word,
			val: JSON.stringify({
				
				'player_1': self.player_1,
				'player_2': self.player_2,
				'board_1': self.vue.board_1,
				'board_2': self.vue.board_2,
				'turn_counter': self.turn_counter
			})
		});
    };
	
	
	
    /* Process the data once received and updates local variables */
    self.process_server_data = function (data) {
		
        // If data is null, we send our data
        if (!data.result) {
            self.player_1 = self.my_identity;
            self.player_2 = null;
			self.turn_counter = 0;
            self.vue.is_my_turn = false;
            self.send_state();
        }
		
		else {
			
            // I technically do not need to assign this to self, but it helps debug the code
            self.server_answer = JSON.parse(data.result);
            self.player_1 = self.server_answer.player_1;
            self.player_2 = self.server_answer.player_2;
			self.turn_counter = self.server_answer.turn_counter;
			
			// Some player is missing, we cannot play yet
            if (self.player_1 === null || self.player_2 === null) {
				console.log("Not all players present");
                self.vue.is_my_turn = false;
                
				// We are already present, nothing to do
                if (self.player_2 === self.my_identity || self.player_1 === self.my_identity) {
                    console.log("Waiting for other player to join");
                }
				
				else {
                    console.log("Signing up now");
					
                    // If it is free, try to play as player 1
                    if (self.player_1 === null) {
                        self.player_1 = self.my_identity;
                        self.send_state();
                    }
					// Otherwise, try to play as player 2
					else if (self.player_2 === null) {
                        self.player_2 = self.my_identity;
                        self.send_state();
                    }
					
					// The magic word is already taken
					else {
                        self.vue.need_new_magic_word = true;
                    }
                }
            }
			
			// Both players are present, we can try to play
			else {
                console.log("Both players are present");
				
				// We are intruding in a game that already exist
                if (self.player_1 !== self.my_identity && self.player_2 !== self.my_identity) {
                    self.vue.need_new_magic_word = true;
                }
				
				// The magic word is available: Let's play!
				else {
                    self.update_local_vars(self.server_answer);
                }
            }
        }
    };
	
	
	
	/*	Updates the local variables with the information provided by the server
		We should be aware of the possibility of receiving unordered states */
    self.update_local_vars = function (server_answer) {

        /* Reconciles the board, and computes whose turn it is */
        var newer_state_1 = update_layout(self.vue.board_1, server_answer.board_1);
		var newer_state_2 = update_layout(self.vue.board_2, server_answer.board_2);

        // Compute if it is my turn based on the reconciled board
        self.vue.is_my_turn = whose_turn(server_answer.turn_counter);

        // If we have newer state than the server, we send it to the server
        if (newer_state_1 || newer_state_2) {
            self.send_state();
        }
    };
	
	
	
	/* Updates the specified layout position from the specified server layout */
	function update_layout (local_board, server_board) {
		
		var newer_state = false;
		for (var i = 0 ; i < 64 ; i++) {
			
			// The server has new information for this board
			if (self.default_symbols.includes(local_board[i]) && 
				!self.default_symbols.includes(server_board[i])) {
				Vue.set(local_board, i, server_board[i]);
			}

			// The device has newer state
			else if (!self.default_symbols.includes(local_board[i]) && 
					 self.default_symbols.includes(server_board[i])) {
				newer_state = true;
			}
		}
		return newer_state;
	}
	
	
	
	/* Determines which turn is it depending on the 'turn counter' */
    function whose_turn(turn_counter) {
		
		// If the number is even and we are player 1: our turn
		if ((turn_counter % 2 === 0) && (self.my_identity === self.player_1)){
			return true;
		}
		
		// If the number is odd and we are player 2: our turn
		else if ((turn_counter % 2 === 1) && (self.my_identity === self.player_2)){
			return true;
		}
		
		// Otherwise: it is not our turn
		else {
			return false;
		}
    }
	
	
	
	/* Returns out layout depending on the player we are */
	self.get_my_board = function () {
		
		// If the game has started and we are player 1
		if (self.my_identity === self.player_1 && self.vue.board_1 !== null) {
			return self.vue.board_1;
		}
		
		// If the game has started and we are player 2
		else if (self.my_identity === self.player_2 && self.vue.board_2 !== null) {
			return self.vue.board_2;
		}
		
		// If the game has not been initialized
		else {
			return self.null_board;
		}
	}
	
	
	
	/* Returns out layout depending on the player we are */
	self.get_opponent_board = function () {
		
		// If the game has started and we are player 1
		if (self.my_identity === self.player_1 && self.vue.board_2 !== null) {
			return self.vue.board_2;
		}
		
		// If the game has started and we are player 2
		else if (self.my_identity === self.player_2 && self.vue.board_1 !== null) {
			return self.vue.board_1;
		}
		
		// If the game has not been initialized
		else {
			return self.null_board;
		}
	}
	
	
	
	/* Returns the color of the cell depending on the input symbol */
	self.get_color = function (symbol) {
		if (symbol === "*") {
			return "white";
		}
		else if (symbol === "w") {
			return "blue";
		}
		else if (symbol > 0) {
			return "green";
		}
		else if (symbol < 0) {
			return "red";
		}
	}
	
	
	
	/* Method to call from the HTML */
    self.set_magic_word = function () {
		
        self.vue.chosen_magic_word = self.vue.magic_word;
        self.vue.need_new_magic_word = false;
		
        // Resets board and turn
        self.vue.board_1 = getBoard();
		self.vue.board_2 = getBoard();
        self.vue.is_my_turn = false;
		
		// Start the server calls
		call_server();
    };
	
	
	
	/* Method to call from the HTML */
    self.play = function (i, j) {
		
		var opponent_board = self.get_opponent_board();
		
		// Check if it is not our turn or the square has been clicked before
		if (!self.vue.is_my_turn || !self.default_symbols.includes(opponent_board[i * 8 + j])) {
			return;
		}
		
		// Updating the interface once clicked
		try {
			var new_symbol = -1 * opponent_board[i * 8 + j];
			Vue.set(opponent_board, i * 8 + j, new_symbol);
		}
		catch (error) {
			Vue.set(opponent_board, i * 8 + j, "w");
		}
		
        // Update the server state
        self.vue.is_my_turn = false;
		self.turn_counter += 1;
        self.send_state();
    };
	
	
	
	/* The information about Vue in this project */
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            magic_word: "",
            chosen_magic_word: null,
            need_new_magic_word: false,
            board_1: self.null_board,
			board_2: self.null_board,
            is_other_present: false,
            is_my_turn: false
        },
        methods: {
            set_magic_word: self.set_magic_word,
			get_my_board: self.get_my_board,
			get_opponent_board: self.get_opponent_board,
			get_color: self.get_color,
            play: self.play
        }
    });
	
	
    return self;
};


var APP = null;

// This will make everything accessible from the js console
jQuery(function(){
    APP = app();
    APP.initialize();
});
