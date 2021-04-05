console.log("Loading dirty7/room.js");

function dirty7_cards_from_card_descs(card_rack, card_descs, c_theme=0,
                                      click_action="slide_up") {
   var cards = [];
   for (var card_desc of card_descs) {
      var card = new Card(card_rack.ui, card_desc[0], card_desc[1], false, c_theme); // suit, rank
      card.set_click_action(click_action);
      cards.push(card);
   }
   return cards;
}

class Dirty7UiBase {
   constructor(room, nw, parent_ui) {
      this.room = room;
      this.nw = nw;
      this.parent_ui = parent_ui;

      this.ui = null;
   }

   hide() { this.ui.style.display = "none"; }
   show() { this.ui.style.display = "block"; }
}

class Dirty7LoginBar extends Dirty7UiBase {
/**
 * [       Alias [____]    Passwd [____]    [ Connect ]
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui);

      this.alias_internal = "";

      this.ui = create_div(this, "", "d7_login_bar text");
      this.alias = create_input_text(this, "", "d7_login_bar_input text");
      this.passwd = create_input_password(this, "", "d7_login_bar_input text");
      this.connect_btn = create_button(this, "", "Connect",
                                      this.connect_click,
                                      "text");

      this.alias.addEventListener("keyup", this.alias_keyup);
      this.passwd.addEventListener("keyup", this.passwd_keyup);


      this.ui.appendChild(create_span("Name", "d7_login_bar_text"));
      this.ui.appendChild(this.alias);

      this.ui.appendChild(create_span("Password", "d7_login_bar_text"));
      this.ui.appendChild(this.passwd);

      this.ui.appendChild(this.connect_btn);

      this.parent_ui.appendChild(this.ui);

      this.alias.focus();
   }

   alias_keyup(ev) {
      ev.preventDefault();
      if (ev.keyCode === 13) {
         var creator = ev.target.creator;
         creator.passwd.focus();
      }
   }

   passwd_keyup(ev) {
      ev.preventDefault();
      if (ev.keyCode === 13) {
         var creator = ev.target.creator;
         creator.connect_btn.focus();
         creator.connect_click(ev);
      }
   }

   connect_click(ev) {
      var login_bar = ev ? ev.target.creator : this;
      login_bar.alias_internal = login_bar.alias.value;
      var passwd = login_bar.passwd.value;

      login_bar.nw.send(["JOIN", login_bar.alias_internal, passwd]);
   }

   maybe_rejoin() {
      if (this.alias.value) {
         this.connect_click();
      }
   }
}

class Dirty7RoundParameters extends Dirty7UiBase {
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui);
      this.round_num = null;
      this.round_params = null;

      this.ui = create_span("", "head2 d7_round_params");
      parent_ui.appendChild(this.ui);

      this.hide();
   }

   set_round_parameters(round_num, round_params) {
      if (this.room.game_over) {
         this.hide();
         return;
      }
      this.show();
      this.round_num = round_num;
      this.round_params = round_params;
      clear_contents(this.ui);
      this.ui.appendChild(create_span(
         "[" + this.round_num + "] " + this.round_params["ruleNames"][0]));
   }
}

class Dirty7GameOver extends Dirty7UiBase {
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui);
      this.ui = create_div(this, "width100");
      this.table = new Table(this.ui, 0, 1, "width100 d7_game_over");
      this.table.add_row([create_span("Game over", "head1")]);
      this.table.cell_class(0, 0, "center");

      this.parent_ui.appendChild(this.ui);
   }
   set_winners(winners) {
      var msg;
      if (winners.length == 1) {
         msg = "Winner: " + winners[0];
      } else {
         msg = "Winners: " + winners.join(", ");
      }
      this.table.add_row([create_span(msg, "head2")]);
      this.table.cell_class(1, 0, "center");
   }
}

class Dirty7Disconnected extends Dirty7UiBase {
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui);
      this.ui = create_span("Disconnected", "width100 head1 d7_disconnected");
      this.reconnect_btn = create_button(this, "", "Reconnect", this.reconnect_click, "head2");
      this.ui.appendChild(this.reconnect_btn);
      this.parent_ui.appendChild(this.ui);
   }

   reconnect_click(ev) {
      var disconnected_bar = ev.target.creator;
      disconnected_bar.nw.new_connection();
   }
}

class Dirty7Board extends Dirty7UiBase {
/*

 +-Container---+-----------+
 |             |           |
 |             |   +----+  |
 | +--+----+   |   |    |+ |
 | |  |    |   |   |    || |
 | |  |    |   |   |    || |
 | |  |    |   |   +----+| |
 | +--+----+   |    +----+ |
 |             |           |
 +-face_up_cell+-deck_cell-+

*/
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui);

      this.container_table = new Table(parent_ui, 1, 2, "d7_board floatleft");
      this.container_table.cell(0, 1).style.width = "250px";

      this.card_rack = new CardRack(
         this.container_table.cell(0, 0), "",
         45);
      this.deck = new CardFaceDownDeck(
         this.container_table.cell(0, 1), "",
         0, 1);

      this.ui = parent_ui.appendChild(this.container_table.ui);
   }
}

class Dirty7PlayerBoard extends Dirty7UiBase {
/*
  +-Container-------------------------------------+
  | +------------------------+ |
  | | PlayerName             | | Cards 
  | | OtherStats             | |
  | |-player_pane------------| |
  | | [Play Cards] [Declare] | |
  | +-move_pane--------------+ |
  +-player_text_pane-------------cards_pane-------+

*/
   constructor(room, alias, nw, parent_ui) {
      super(room, nw, parent_ui);
      this.alias = alias;

      this.has_turn = false;  // tracks if it's this players turn
      this.last_msg_turn = null;

      this.container_table = new Table(parent_ui, 1, 2, "d7_player_board");

      // player_text_pane
      this.container_table.cell_class(0, 0, "d7_player_text_pane top");

      var player_info = new Table(this.container_table.cell(0, 0),
                                  2, 1, "d7_player_info height100");
      player_info.cell_class(0, 0, "top");
      this.player_pane = player_info.cell(0, 0);
      player_info.cell_class(0, 0, "center");

      this.move_pane = player_info.cell(1, 0);
      player_info.cell_class(1, 0, "bottom center");
      this.play_btn = create_button(this, "", "Play", this.play_click, "text d7_player_turn_btn");
      this.declare_btn = create_button(this, "", "Declare", this.declare_click, "text d7_player_turn_btn");
      this.move_pane.appendChild(this.play_btn);
      this.move_pane.appendChild(this.declare_btn);
      this.set_move_pane_visibility(room.last_msg_turn && room.last_msg_turn[2] == alias);

      // Cards pane
      this.card_rack = new CardRack(this.container_table.cell(0, 1), "", 50);

      this.ui = this.room.player_boards_holder.add_row([this.container_table.ui]);

      this.update_ui();
   }
   set_move_pane_visibility(val) {
      this.move_pane.style.display = val ? "block" : "none";
   }
   set_has_turn(val) {
      this.has_turn = val;
      var ele = this.container_table.cell(0, 0);
      if (this.has_turn) {
         ele.classList.add("d7_player_turn");
      } else {
         ele.classList.remove("d7_player_turn");
      }
   }
   set_card_count(count) {
      while (this.card_rack.count() < count) {
         this.card_rack.append_card(new Card(this.card_rack.ui, 0, 0, true, 1));
      }
      if (this.card_rack.count() > count) {
         this.card_rack.remove_tail_cards(count);
      }
   }
   play_click(ev) {
      var player_board = ev.target.creator;
      var room = player_board.room;

      var move = {};
      var dropCards = player_board.card_rack.selected_cards_jmsg();
      var numDrawCards = room.board.deck.selected_cards_count();
      var pickCards = room.board.card_rack.selected_cards_jmsg();

      if (dropCards.length)   { move["dropCards"] = dropCards; }
      if (numDrawCards)       { move["numDrawCards"] = numDrawCards; }
      if (pickCards.length)   { move["pickCards"] = pickCards; }
      var jmsg = ["PLAY", move];
      room.nw.send(jmsg);
   }
   declare_click(ev) {
      var room = ev.target.creator.room;
      var jmsg = ["DECLARE"];
      room.nw.send(jmsg);
   }
   update_ui() {
      clear_contents(this.player_pane);
      this.player_pane.appendChild(create_span(this.alias, "head2"));
   }
}

class Dirty7ScoreBoard extends Dirty7UiBase {
/*
  +-Container-----------------------------+
  |  | Player 1  | Player 2  | Player 3   |
  |---------------------------------------|
  | 1| [][][]  0 | [][]    8 |  []     10 |
  | 2| [][][] 12 | [][]   20 |  []      0 |
  |  |        12 |        28 |         10 |
  +---------------------------------------+

  Each row cell has two spans: left for cards, right for score
*/
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui);

      this.highest_round_num_seen = 0;
      this.player_cards_data = []; // [rno, alias, card_descs]
      this.alias_to_idx = {};

      this.container_table = null;
   }
   init_container_table(data) {
      var count = 0;
      for (var alias in data) {
         this.alias_to_idx[alias] = count++;
      }
      this.container_table = new Table(this.parent_ui, 2, count + 1, "d7_score_board floatleft");

      this.cell_inner_table = [];

      this.ui = this.parent_ui.appendChild(this.container_table.ui);

      // Populate first row
      for (var alias in this.alias_to_idx) {
         var idx = this.alias_to_idx[alias];

         this.container_table.cell_class(0, idx + 1, "d7_score_board_header");
         this.container_table.cell_content_add(0, idx + 1,
                                               create_span(alias, "head2"));

         this.container_table.cell_class(1, idx + 1, "right d7_score_board_total");
         this.container_table.cell_content_add(1, idx + 1, create_span("0", "text"));
      }
   }

   update_player_cards(round_num, alias, card_descs) {
      // this.player_cards_msgs.push(jmsg);
      if (round_num <= this.highest_round_num_seen) {
         // process immediately
         this.update_player_cards_impl(round_num, alias, card_descs);
      } else {
         this.player_cards_data.push([round_num, alias, card_descs]);
      }
   }

   update_player_cards_impl(round_num, alias, card_descs) {
      var idx = this.alias_to_idx[alias];

      var inner_table = this.cell_inner_table[round_num][idx + 1];
      var player_card_cell = inner_table.cell(0, 0);
      clear_contents(player_card_cell);

      var card_rack = new CardRack(player_card_cell, "", 25);
      var cards = dirty7_cards_from_card_descs(card_rack, card_descs, 1, null);
      card_rack.append_cards(cards);
   }

   add_row(round_num) {
      this.container_table.add_row(null, round_num);

      this.container_table.cell_content_add(round_num, 0,
                                            create_span("" + round_num, "text"));

      this.cell_inner_table[round_num] = [];
      for (var i=1; i < this.container_table.num_cols; ++i) {
         this.cell_inner_table[round_num][i] = new Table(this.container_table.cell(round_num, i),
                                     1, 2, "d7_score_board_inner_table width100");
         this.cell_inner_table[round_num][i].cell_class(0, 1, "right");
         this.cell_inner_table[round_num][i].cell_content_set(0, 1, create_span("", "text"));
      }

      // Review player card data queued in
      // this.player_cards_data and insert them now
      var new_player_cards_data = [];
      for (var row of this.player_cards_data) {
         if (row[0] == round_num) {
            // flush now
            this.update_player_cards_impl(row[0], row[1], row[2]);
         } else {
            new_player_cards_data.push(row);
         }
      }
      this.player_cards_data = new_player_cards_data;
   }

   update_round_score(round_num, data) {
      if (this.container_table == null) {
         this.init_container_table(data);
      }

      if (round_num > this.highest_round_num_seen) {
         for (var i = this.highest_round_num_seen + 1; i <= round_num; ++i) {
            this.add_row(i);
         }
         this.highest_round_num_seen = round_num;
      }

      set_title("Dirty7 room #" + this.room.gid +
                " round " + this.highest_round_num_seen);

      for (var alias in data) {
         var idx = this.alias_to_idx[alias];
         var score = data[alias];
         if (score != null) {
            this.cell_inner_table[round_num][idx + 1].cell_content_set(0, 1,
               create_span("" + score, "text"));
         }
      }

      this.update_total();
   }
   update_total() {
      if (this.container_table == null) { return; }
      if (this.highest_round_num_seen == 0) { return; }

      for (var alias in this.alias_to_idx) {
         var idx = this.alias_to_idx[alias];

         var total = 0;
         for (var round_num=1; round_num <= this.highest_round_num_seen; ++round_num) {
            var score = this.cell_inner_table[round_num][idx + 1].cell(0, 1).childNodes[0].innerHTML;
            if (score) {
               total += Number(score);
            }
         }

         this.container_table.cell_content_set(this.highest_round_num_seen + 1,
                                               idx + 1,
                                               create_span("" + total, "text"));
      }
   }
}

class Dirty7Room extends Ui {
   constructor(gid, div) {
      super(div);
      this.gid = gid;
      this.round_num = 0;

      this.nw = new Network("NwDirty7:" + gid, "dirty7:" + gid,
                            this.onmessage,
                            this.onclose,
                            this.onopen);
      this.nw.cls_room = this;
      this.game_over = false;

      this.init_display();
   }

   /**
    * init_display()
    * Used to setup the initial screen. This starts
    * by showing the login bar at the top
    */
   init_display() {
      this.ui_notifications = new UiNotifications(this.div, 3000, "d7_notifications_table");
      this.login_bar = new Dirty7LoginBar(this, this.nw, this.div);
      this.disconnected_bar = new Dirty7Disconnected(this, this.nw, this.div);
      this.disconnected_bar.hide();
      this.round_params = new Dirty7RoundParameters(this, this.nw, this.div);
      this.game_over_bar = new Dirty7GameOver(this, this.nw, this.div);
      this.game_over_bar.hide();
      this.board = new Dirty7Board(this, this.nw, this.div);

      this.player_boards_holder = new Table(this.div, 0, 1, "floatleft");
      this.player_boards = {};

      this.score_board = new Dirty7ScoreBoard(this, this.nw, this.div);

      document.notifications_ui = this.ui_notifications.ui;

      document.onscroll = function(ev) {
         ev.target.notifications_ui.style.top = window.pageYOffset + "px";
      }
   }


   /**
    * UI helpers
    */
   show_error_msg(msg) {
      var obj = create_span(msg, "head2");
      this.ui_notifications.add_msg(obj, "d7_notification_error");
   }

   show_info_msg(msg) {
      var obj = create_span(msg, "head2");
      this.ui_notifications.add_msg(obj, "d7_notification_info");
   }

   show_move_msg(msg) {
      var obj = create_span(msg, "head2");
      this.ui_notifications.add_msg(obj, "d7_notification_move");
   }

   show_move_obj(obj) {
      this.ui_notifications.add_msg(obj, "d7_notification_move");
   }

   /**
    * Helpers
    */
   maybe_create_player_board(alias) {
      if (!(alias in this.player_boards)) {
         var board = new Dirty7PlayerBoard(this, alias, this.nw, this.div);
         this.player_boards[alias] = board;
         if (this.game_over) {
            board.hide();
         }
      }
   }

   maybe_update_round_num(num) {
      if (this.round_num < num) {
         this.round_num = num;
      }
   }

   is_old_round(num) {
      return num < this.round_num;
   }

   /**
    * Message handling
    */
   process_turn_order(jmsg) {
      // Example:
      //    ["TURN-ORDER", 2, ["bar", "foo"]]
      if (this.is_old_round(jmsg[1])) { return; }

      for (var alias of jmsg[2]) {
         this.maybe_create_player_board(alias);
      }
   }

   process_turn(jmsg) {
      // Example:
      //    ["TURN", 2, "foo"]
      if (this.is_old_round(jmsg[1])) { return; }

      this.last_msg_turn = jmsg;
      for (var alias in this.player_boards) {
         var board = this.player_boards[alias];
         board.set_has_turn(board.alias == jmsg[2]);
         board.set_move_pane_visibility(alias == this.login_bar.alias_internal &&
                                        board.alias == jmsg[2]);
      }
   }

   process_player_cards(jmsg) {
      // Examples:
      //    ["PLAYER-CARDS", 1, "foo", 5]
      //    ["PLAYER-CARDS", 1, "foo", 5,
      //     [["S", 9], ["S", 13], ["D", 2], ["H", 4], ["D", 13]]]

      if (jmsg.length == 5) {
         this.score_board.update_player_cards(jmsg[1], jmsg[2], jmsg[4]);
      }

      if (this.is_old_round(jmsg[1])) { return; }

      this.maybe_create_player_board(jmsg[2]);

      if (jmsg.length == 5) {
         // My cards or other's cards when the round is over
         var card_rack = this.player_boards[jmsg[2]].card_rack;
         card_rack.clear();
         var cards = dirty7_cards_from_card_descs(card_rack, jmsg[4]);
         card_rack.append_cards(cards);
      } else {
         var card_rack = this.player_boards[jmsg[2]].card_rack;
         card_rack.clear();
         // Cards of others during a round
         this.player_boards[jmsg[2]].set_card_count(jmsg[3]);
      }
   }

   process_table_cards(jmsg) {
      // Example:
      //   ["TABLE-CARDS", 1, 37, 0, [["H", 5]]]
      if (this.is_old_round(jmsg[1])) { return; }

      this.board.deck.set_card_count(jmsg[2]);

      var cards = dirty7_cards_from_card_descs(this.board.card_rack, jmsg[4]);
      this.board.card_rack.clear();
      this.board.card_rack.append_cards(cards);
   }

   process_round_score(jmsg) {
      // Example:
      //    "ROUND-SCORE", 2, {"foo": 4, "bar": 4}]
      //    "ROUND-SCORE", 3, {"foo": null, "bar": null}]

      this.score_board.update_round_score(jmsg[1], jmsg[2]);
   }

   process_update(jmsg) {
      if (this.is_old_round(jmsg[1])) { return; }

      if ("DECLARE" in jmsg[2]) {
         // ["UPDATE", 1, {"DECLARE": ["bar", 3]}]
         var who = jmsg[2]["DECLARE"][0];
         var score = jmsg[2]["DECLARE"][1];
         this.show_move_msg(who + " declared at " + score + " points");

      } else {
         // ["UPDATE", 1, {"PLAY": ["foo", [["S", 5], ["D", 5]], 1, [["S", "4"]], {"AdvanceTurn": 1}]}]
         var who = jmsg[2]["PLAY"][0];
         var num_drawn_cards = jmsg[2]["PLAY"][2];
         var cards_picked = jmsg[2]["PLAY"][3];
         if (cards_picked.length > 0) {
            var span = create_span(who + " picked ", "head2");
            var card_rack = new CardRack(span, "", 25);
            var cards = dirty7_cards_from_card_descs(card_rack, cards_picked, 1, null);
            card_rack.append_cards(cards);
            this.show_move_obj(span);
         } else {
            if (num_drawn_cards == 1) {
               this.show_move_msg(who + " drew 1 card from the deck");
            } else {
               this.show_move_msg(who + " drew " + num_drawn_cards + " cards from the deck");
            }
         }
      }
   }

   process_game_over(jmsg) {
      // ["GAME-OVER", ["cat"]]
      this.game_over = true;

      for (var alias in this.player_boards) {
         this.player_boards[alias].hide();
      }
      this.login_bar.hide();
      this.board.hide();
      this.game_over_bar.set_winners(jmsg[1]);
      this.game_over_bar.show();
      this.round_params.hide();
   }

   process_round_parameters(jmsg) {
      if (this.is_old_round(jmsg[1])) { return; }

      this.round_params.set_round_parameters(jmsg[1], jmsg[2]);
   }

   onmessage(jmsg) {
      var room = this.cls_room;

      if (jmsg[0] == "JOIN-BAD") {
         room.login_bar.alias.focus();
         room.show_error_msg(jmsg[1]);
         room.login_bar.alias.focus();

      } else if (jmsg[0] == "JOIN-OKAY") {
         var alias = room.login_bar.alias_internal;
         if (room.last_msg_turn && alias in room.player_boards) {
            room.player_boards[alias].set_move_pane_visibility(room.last_msg_turn[2] == alias);
         }
         room.login_bar.hide();
         room.show_info_msg("Player accepted");

      } else if (jmsg[0] == "TURN-ORDER") {
         room.maybe_update_round_num(jmsg[1]);
         room.process_turn_order(jmsg);

      } else if (jmsg[0] == "TURN") {
         room.maybe_update_round_num(jmsg[1]);
         room.process_turn(jmsg);

      } else if (jmsg[0] == "PLAYER-CARDS") {
         room.maybe_update_round_num(jmsg[1]);
         room.process_player_cards(jmsg);

      } else if (jmsg[0] == "TABLE-CARDS") {
         room.maybe_update_round_num(jmsg[1]);
         room.process_table_cards(jmsg);

      } else if (jmsg[0] == "ROUND-SCORE") {
         room.maybe_update_round_num(jmsg[1]);
         room.process_round_score(jmsg);

      } else if (jmsg[0] == "UPDATE") {
         room.maybe_update_round_num(jmsg[1]);
         room.process_update(jmsg);

      } else if (jmsg[0] == "PLAY-BAD") {
         room.show_error_msg(jmsg[1]);

      } else if (jmsg[0] == "DECLARE-BAD") {
         room.show_error_msg(jmsg[1]);

      } else if (jmsg[0] == "GAME-OVER") {
         room.maybe_update_round_num(jmsg[1]);
         room.process_game_over(jmsg);

      } else if (jmsg[0] == "ROUND-PARAMETERS") {
         room.maybe_update_round_num(jmsg[1]);
         room.process_round_parameters(jmsg);

      } else {
         var msg = "Unhandled message: " + JSON.stringify(jmsg);
         console.log(msg);
         room.show_error_msg(msg);

      }
   }

   /**
    * Other socket events
    */
   onclose(ev) {
      var room = this.cls_room;
      // this = Network instance
      room.show_error_msg("Disconnected");
      room.disconnected_bar.show();
   }

   onopen(ev) {
      var room = this.cls_room;
      room.disconnected_bar.hide();
      room.login_bar.maybe_rejoin();
   }
}
