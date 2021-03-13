console.log("Loading dirty7/room.js");

function dirty7_cards_from_card_descs(card_rack, card_descs) {
   var cards = [];
   for (var card_desc of card_descs) {
      var card = new Card(card_rack.ui, card_desc[0], card_desc[1]); // suit, rank
      card.set_click_action("slide_up");
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

      this.ui = createDiv(this, "", "d7_login_bar text");
      this.alias = createInputText(this, "", "d7_login_bar_input text");
      this.passwd = createInputPassword(this, "", "d7_login_bar_input text");
      this.connect_btn = createButton(this, "", "Connect",
                                      this.connect_click,
                                      "text");


      this.ui.appendChild(createSpan("Name", "d7_login_bar_text"));
      this.ui.appendChild(this.alias);

      this.ui.appendChild(createSpan("Password", "d7_login_bar_text"));
      this.ui.appendChild(this.passwd);

      this.ui.appendChild(this.connect_btn);

      this.parent_ui.appendChild(this.ui);

      this.alias.focus();
   }

   connect_click(ev) {
      var login_bar = ev.target.creator;
      login_bar.alias_internal = login_bar.alias.value;
      var passwd = login_bar.passwd.value;

      login_bar.nw.send(["JOIN", login_bar.alias_internal, passwd]);
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

      this.container_table = new Table(parent_ui, 1, 2, "d7_board");
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
      this.player_pane = player_info.cell(0, 0);

      this.move_pane = player_info.cell(1, 0);
      player_info.cell_class(1, 0, "bottom center");
      this.play_btn = createButton(this, "", "Play", this.play_click, "text");
      this.declare_btn = createButton(this, "", "Declare", this.declare_click, "text");
      this.move_pane.appendChild(this.play_btn);
      this.move_pane.appendChild(this.declare_btn);
      this.set_move_pane_visibility(room.last_msg_turn && room.last_msg_turn[2] == alias);

      // Cards pane
      this.card_rack = new CardRack(this.container_table.cell(0, 1), "", 40);

      this.ui = parent_ui.appendChild(this.container_table.ui);

      this.update_ui();
   }
   set_move_pane_visibility(val) {
      this.move_pane.style.display = val ? "block" : "none";
   }
   set_has_turn(val) {
      this.has_turn = val;
      if (this.has_turn) {
         this.ui.classList.add("d7_player_turn");
      } else {
         this.ui.classList.remove("d7_player_turn");
      }
   }
   set_card_count(count) {
      while (this.card_rack.count() < count) {
         this.card_rack.append_card(new Card(this.card_rack.ui, 0, 0, true));
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
      clearContents(this.player_pane);
      this.player_pane.appendChild(createSpan(this.alias, "text"));
   }
}


class Dirty7Room extends Ui {
   constructor(gid, div) {
      super(div);
      this.gid = gid;
      this.round_num = 0;

      this.nw = new Network("NwDirty7:" + gid, "dirty7:" + gid, this.onmessage);
      this.nw.cls_room = this;

      this.init_display();
   }

   /**
    * init_display()
    * Used to setup the initial screen. This starts
    * by showing the login bar at the top
    */
   init_display() {
      this.login_bar = new Dirty7LoginBar(this, this.nw, this.div);
      this.board = new Dirty7Board(this, this.nw, this.div);

      this.player_boards_holder = this.div.appendChild(createDiv(this, ""));
      this.player_boards = {};
   }

   /**
    * Helpers
    */
   maybe_create_player_board(alias) {
      if (!(alias in this.player_boards)) {
         var board = new Dirty7PlayerBoard(this, alias, this.nw, this.div);
         this.player_boards[alias] = board;
      }
   }
   /**
    * Message handling
    */
   process_turn_order(jmsg) {
      for (var alias of jmsg[2]) {
         this.maybe_create_player_board(alias);
      }
   }

   process_turn(jmsg) {
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
      this.maybe_create_player_board(jmsg[2]);

      if (this.login_bar.alias_internal == jmsg[2]) {
         // my cards
         var card_rack = this.player_boards[jmsg[2]].card_rack;
         card_rack.clear();

         if (jmsg.length == 5) {
            var cards = dirty7_cards_from_card_descs(card_rack, jmsg[4]);
            card_rack.append_cards(cards);
         }

      } else {
         // Someone else's card
         this.player_boards[jmsg[2]].set_card_count(jmsg[3]);
      }
   }

   process_table_cards(jmsg) {
      // Example:
      //   ["TABLE-CARDS", 1, 37, 0, [["H", 5]]]
      this.board.deck.set_card_count(jmsg[2]);

      var cards = dirty7_cards_from_card_descs(this.board.card_rack, jmsg[4]);
      this.board.card_rack.clear();
      this.board.card_rack.append_cards(cards);
   }

   process_update(jmsg) {
      // ["UPDATE", 1, {"PLAY": ["foo", [["S", 5], ["D", 5]], 1, [], {"AdvanceTurn": 1}]}]
      // ["UPDATE", 1, {"DECLARE": ["bar", 3]}]

      if ("DECLARE" in jmsg[2]) {
         // 
      }

   }

   onmessage(jmsg) {
      var room = this.cls_room;

      if (jmsg[0] == "JOIN-BAD") {
         room.login_bar.alias.focus();
         alert("Bad name and password");

      } else if (jmsg[0] == "JOIN-OKAY") {
         var alias = room.login_bar.alias_internal;
         if (room.last_msg_turn && alias in room.player_boards) {
            room.player_boards[alias].set_move_pane_visibility(room.last_msg_turn[2] == alias);
         }
         room.login_bar.hide();

      } else if (jmsg[0] == "TURN-ORDER") {
         room.process_turn_order(jmsg);

      } else if (jmsg[0] == "TURN") {
         room.process_turn(jmsg);

      } else if (jmsg[0] == "PLAYER-CARDS") {
         room.process_player_cards(jmsg);

      } else if (jmsg[0] == "TABLE-CARDS") {
         room.process_table_cards(jmsg);

      } else if (jmsg[0] == "UPDATE") {
         room.process_update(jmsg);

      }
   }
}
