// Author: Sinclert Perez (Sinclert@hotmail.com)


/* Contains the web application functionalities*/
var app = function() {
	
	
	// Information and fields about the app
    var self = {};
    self.my_identity = randomString(20);
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
		
        if (self.vue.chosen_magic_word === null) {
            console.log("No magic word");
            setTimeout(call_server, call_interval);
        }
		else {
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
    }
	
	
	
    /* Main function for sending the state */
    self.send_state = function () {
        $.post(server_url + 'store', {
			
			key: self.vue.chosen_magic_word,
			val: JSON.stringify({
				
				'player_1': self.player_1,
				'player_2': self.player_2,
				'board_1': self.vue.board_1,
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
            self.vue.board_1 = self.null_board;
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
        var device_has_newer_state = false;
        for (var i = 0 ; i < 64 ; i++) {
			
			// The server has new information for this board
            if (self.vue.board_1[i] === ' ' || server_answer.board_1[i] !== ' ') {
                Vue.set(self.vue.board_1, i, server_answer.board_1[i]);
            }
			
			// The device has newer state
			else if (self.vue.board_1[i] !== ' ' && server_answer.board_1[i] === ' ') {
                device_has_newer_state = true;
            }
			
			else if (self.vue.board_1[i] !== server_answer.board_1[i]
                && self.vue.board_1[i] !== ' ' && server_answer.board_1[i] !== ' ')  {
                console.log("Board inconsistency at: " + i);
                console.log("Local:" + self.vue.board_1[i]);
                console.log("Server:" + server_answer.board_1[i]);
            }
        }

        // Compute if it is my turn based on the reconciled board
        self.vue.is_my_turn = ((self.vue.board_1 !== null) && whose_turn(server_answer.turn_counter));

        // If we have newer state than the server, we send it to the server
        if (device_has_newer_state) {
            self.send_state();
        }
    };
	
	
	
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
	
	
	
	/* Method to call from the HTML */
    self.set_magic_word = function () {
		
        self.vue.chosen_magic_word = self.vue.magic_word;
        self.vue.need_new_magic_word = false;
		
        // Resets board and turn
        self.vue.board_1 = self.null_board;
        self.vue.is_my_turn = false;
    };
	
	
	
	/* Method to call from the HTML */
    self.play = function (i, j) {
		
        // Check if it is not our turn or the square is not empty
        if ((!self.vue.is_my_turn) || (self.vue.board_1[i * 8 + j] !== ' ')) {
            return;
        }
		
        // Update the clicked position
        Vue.set(self.vue.board_1, i * 8 + j, 'X');
		
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
            board_1: getBoard(),
            is_other_present: false,
            is_my_turn: false
        },
        methods: {
            set_magic_word: self.set_magic_word,
            play: self.play
        }
    });

	
    call_server();
    return self;
};


var APP = null;

// This will make everything accessible from the js console
jQuery(function(){
    APP = app();
    APP.initialize();
});
