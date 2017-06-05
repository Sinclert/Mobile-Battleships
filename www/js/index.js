// Author: Sinclert Perez (Sinclert@hotmail.com)


/* Contains the web application functionalities */
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
    self.player_1 = null;
    self.player_2 = null;
	self.turn_counter = 0;
	
	
	// General variables to use along the app
    var server_url = "https://luca-ucsc-teaching-backend.appspot.com/keystore/";
    var call_interval = 1000;
    Vue.config.silent = false;
	
	
	
	/* Puts a initialization listener */
    self.initialize = function () {
        document.addEventListener('deviceready', self.ondeviceready, false);
    };
	
	
	
	/* Listoner toshow vue-div once the browser page is ready */
    self.ondeviceready = function () {
        console.log("The device is ready");
        $("#vue-div").show();
    };
	
	
	
    /* This function calls the server each 'call_internal' ms to update information */
    function call_server() {
		
		// Add a bit of random delay to avoid synchronizations
		var extra_delay = Math.floor(Math.random() * 1000);
		$.ajax({
			dataType: 'json',
			url: server_url +'read',
			data: {key: self.vue.magic_word},
			success: self.process_server_data,
			complete: setTimeout(call_server, call_interval + extra_delay)
		});
    }
	
	
	
    /* Main function for sending the state */
    self.send_state = function () {
        $.post(server_url + 'store', {
			
			key: self.vue.magic_word,
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
		
        // The first player to introduce the magic word generates the boards
        if (!data.result) {
            self.player_1 = self.my_identity;
            self.player_2 = null;
			self.vue.board_1 = getBoard();
			self.vue.board_2 = getBoard();
			self.turn_counter = 0;
            self.send_state();
        }
		
		else {
			
            // Parsing and storing the server answer
            var server_answer = JSON.parse(data.result);
            self.player_1 = server_answer.player_1;
            self.player_2 = server_answer.player_2;
			self.vue.board_1 = server_answer.board_1;
			self.vue.board_2 = server_answer.board_2;
			self.turn_counter = server_answer.turn_counter;
			
			// Some player is missing, we cannot play yet
            if (self.player_1 === null || self.player_2 === null) {
                self.vue.is_my_turn = false;
                
				// We are already present, nothing to do
                if (self.player_2 === self.my_identity || self.player_1 === self.my_identity) {
                    self.vue.message = "Waiting for other player to join";
                }
				
				else {
                    self.vue.message = "Signing up...";
					
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
                self.vue.message = "Both players are present";
				
				// We are intruding in a game that already exist
                if (self.player_1 !== self.my_identity && self.player_2 !== self.my_identity) {
					self.vue.message = "The magic word is already taken";
                    self.vue.need_new_magic_word = true;
                }
				
				// The magic word is available: Let's play!
				else {
                    self.update_local(server_answer);
                }
            }
        }
    };
	
	
	
	/*	Updates the local variables with the information provided by the server
		We should be aware of the possibility of receiving unordered states */
    self.update_local = function (server_answer) {
		
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
		if (((turn_counter % 2 === 0) && (self.my_identity === self.player_1)) ||
			 (turn_counter % 2 === 1) && (self.my_identity === self.player_2)) {
			self.vue.message = "Your turn"
			return true;
		}
		
		// Otherwise: it is not our turn
		else {
			self.vue.message = "Waiting for the other player..."
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
	
	
	
	/* Returns the color of our cell depending on the symbol */
	self.get_my_color = function (symbol) {
		if (symbol === "*") {
			return "white";
		}
		else if (symbol === null) {
			return "blue";
		}
		else if (symbol > 0) {
			return "green";
		}
		else if (symbol < 0) {
			return "red";
		}
	}
	
	
	
	/* Returns the color of the opponent cell depending on the symbol */
	self.get_opponent_color = function (symbol) {
		if (symbol === "*") {
			return "white";
		}
		else if (symbol === null) {
			return "blue";
		}
		else if (symbol > 0) {
			return "white";
		}
		else if (symbol < 0) {
			return "red";
		}
	}
	
	
	
	/* Method to call from the HTML */
    self.set_magic_word = function () {
        self.vue.need_new_magic_word = false;
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
			Vue.set(opponent_board, i * 8 + j, null);
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
            need_new_magic_word: false,
            board_1: self.null_board,
			board_2: self.null_board,
            is_other_present: false,
            is_my_turn: false,
			message: "Introduce a magic word to start"
        },
        methods: {
            set_magic_word: self.set_magic_word,
			get_my_board: self.get_my_board,
			get_opponent_board: self.get_opponent_board,
			get_my_color: self.get_my_color,
			get_opponent_color: self.get_opponent_color,
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
