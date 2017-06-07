// Author: Sinclert Perez (Sinclert@hotmail.com)


/* Contains the web application functionalities */
var app = function () {


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
	self.ships_left = 10;
	self.turn_counter = 0;
	self.game_counter = 0;


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
			url: server_url + 'read',
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
				'game_counter': self.game_counter,
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
			self.game_counter = 0;
			self.send_state();
		}

		else {

			// Parsing and storing the server answer
			var server_answer = JSON.parse(data.result);
			self.player_1 = server_answer.player_1;
			self.player_2 = server_answer.player_2;

			// If it is the first turn, the boards are copied
			if (self.turn_counter === 0) {
				self.vue.board_1 = server_answer.board_1;
				self.vue.board_2 = server_answer.board_2;
			}

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
						self.vue.message = "Both players are present";
						self.vue.need_new_magic_word = true;
					}
				}
			}

			// Both players are present
			else {

				// We are intruding in a game that already exist
				if (self.player_1 !== self.my_identity && self.player_2 !== self.my_identity) {
					self.vue.message = "The magic word is already taken";
					self.vue.need_new_magic_word = true;
				}

				// The magic word is available and it is the same game
				else if (server_answer.game_counter === self.game_counter && 
						 server_answer.turn_counter >= self.turn_counter) {
					self.turn_counter = server_answer.turn_counter;
					self.update_local(server_answer);
				}

				// The magic word is available but it is another game
				else if (server_answer.game_counter > self.game_counter) {
					self.game_counter = server_answer.game_counter;
					self.turn_counter = server_answer.turn_counter;
					self.update_local(server_answer);
				}
			}
		}
	};



	/* Updates the local variables with the information provided by the server */
	self.update_local = function (server_answer) {
		
		self.vue.board_1 = server_answer.board_1;
		self.vue.board_2 = server_answer.board_2;

		// Compute if it is my turn based on the reconciled board
		self.vue.is_my_turn = whose_turn(server_answer.turn_counter);
	};



	/* Determines which turn is it depending on the 'turn counter' */
	function whose_turn (turn_counter) {

		// If the number is even and we are player 1: our turn
		if (((turn_counter % 2 === 0) && (self.my_identity === self.player_1)) ||
			 (turn_counter % 2 === 1) && (self.my_identity === self.player_2)) {
			self.vue.message = "Your turn"
			return true;
		}

		// Otherwise: it is not our turn
		else {
			self.vue.message = "Waiting for the other player to play"
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
	};



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
	};



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
	};



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
	};



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
		var clicked_position = opponent_board[i * 8 + j];

		// Check if it is not our turn or the square has been clicked before
		if (!self.vue.is_my_turn || !self.default_symbols.includes(clicked_position)) {
			return;
		}

		// Updating the interface once clicked
		if (!isNaN(clicked_position)) {
			Vue.set(opponent_board, (i*8) + j, -1 * clicked_position);
			self.ships_left -= 1;

			// Updates the board if an enemy boat is sunk
			show_water(opponent_board, i, j);
		}
		else {
			Vue.set(opponent_board, i * 8 + j, null);
		}

		// Update the server state
		self.vue.is_my_turn = false;
		self.turn_counter += 1;
		self.send_state();
	};



	/* Shows water around a sunk boat (recursive implementation */
	function show_water (opponent_board, i, j) {

		var boat_number = opponent_board[i * 8 + j];
		var adjacent_cells = [];

		if (i-1 >= 0) {
			adjacent_cells.push({i: (i-1), j: j, value: opponent_board[(i-1) * 8 + j]})
		}
		if (i+1 <= 7) {
			adjacent_cells.push({i: (i+1), j: j, value: opponent_board[(i+1) * 8 + j]})
		}
		if ((j-1) >= 0) {
			adjacent_cells.push({i: i, j: (j-1), value: opponent_board[i * 8 + (j-1)]})
		}
		if ((j+1) <= 7) {
			adjacent_cells.push({i: i, j: (j+1), value: opponent_board[i * 8 + (j+1)]})
		}

		// Finding if there are more boat sunk cells
		var adjacent_sunk_cells = [];
		for (var k = 0 ; k < adjacent_cells.length ; k++) {
			cell = adjacent_cells[k];

			// If there is a cell with the positive value: return
			if (cell.value === - boat_number) {
				return;
			}

			// If there are more cells with negative values: store them
			if (cell.value === boat_number) {
				adjacent_sunk_cells.push(cell);
			}
		}

		// There is no more adjacent unsunk cells: reveil water
		adjacent_cells.forEach(function(cell) {
			if (cell.value === "*") {
				Vue.set(opponent_board, cell.i * 8 + cell.j, null);
			}
		});

		// Marking already analyzed positions to avoid infinite recursive loop
		opponent_board[i * 8 + j] = -100;

		// If there are more cells already sunk: recursive calls
		adjacent_sunk_cells.forEach(function(cell) {
			show_water(opponent_board, cell.i, cell.j);
		});
	}



	/* Resets the boards and start a new game */
	self.new_game = function () {

		// Only is there is no more ship cells, a new game can be started
		if (self.ships_left == 0) {
			self.ships_left = 10;
			self.vue.board_1 = getBoard();
			self.vue.board_2 = getBoard();
			self.game_counter += 1;
			self.turn_counter = 0;
			self.send_state();
		}
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
			is_my_turn: false,
			message: "Introduce a magic word to start"
		},
		methods: {
			set_magic_word: self.set_magic_word,
			get_my_board: self.get_my_board,
			get_opponent_board: self.get_opponent_board,
			get_my_color: self.get_my_color,
			get_opponent_color: self.get_opponent_color,
			play: self.play,
			new_game: self.new_game
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
