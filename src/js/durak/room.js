console.log("Loading durak/room.js");

const card_theme = 1;
const card_offset = 20;

const SuitMap = new Map([
   ["S", "♠"],
   ["C", "♣"],
   ["H", "♥"],
   ["D", "♦"]]);

function card_from_jmsg(parent_ui, suit, rank) {
   var card = new Card(parent_ui, suit, rank, false, card_theme);
   return card;
}

function card_to_jmsg(suit_rank) {
   return suit_rank;
}

class PlayerBoard {
   /*
    *  Name | Mode + Buttons | Player Hand | Attack
    *
    *
    */
   constructor(parent_ui, player_name) {
      this.parent_ui = parent_ui;
      this.player_name = player_name;

      this.table = new Table(this.parent_ui, 1, 4);

      this.ui = this.table.ui;
      this.parent_ui.appendChild(this.ui);

      this.table.cell_content_set(0, 0, create_span(this.player_name));
      this.player_hand = new PlayerHand(this.table.cell(0, 2), "");
      this.table.cell_content_set(0, 2, this.player_hand.ui);

      this.attack_btn = create_button(this, "attack_btn", "Attack", this.do_attack_btn);
      this.done_btn = create_button(this, "done_btn", "Done", this.do_done_btn);

      this.defend_btn = create_button(this, "defend_btn", "Defend", this.do_defend_btn);
      this.giveup_btn = create_button(this, "giveup_btn", "Give up", this.do_giveup_btn);

      this.undefended_attacks = [];
   }

   do_attack_btn(ev) {
      var me = ev.target.creator;
      room.nw.send(["ATTACK", me.player_hand.selected_cards()]);
   }

   do_done_btn(ev) {
      room.nw.send(["DONE"]);
   }

   do_defend_btn(ev) {
      var me = ev.target.creator;
      var defend_cards = me.player_hand.selected_cards();
      if (defend_cards.length != 1) {
         console.log("Must select exactly 1 card to defend with");
         return;
      }

      // Find selected cards to defend against
      var attack_cards = room.selected_attack_cards();
      if (attack_cards.length != 1) {
         console.log("Must select exactly one card to defend against");
         return;
      }

      room.nw.send(["DEFEND", [ [ card_to_jmsg(attack_cards[0]), card_to_jmsg(defend_cards[0]) ] ]]);
   }

   do_giveup_btn(ev) {
      room.nw.send(["GIVEUP"]);
   }

   set_cards(cards) {
      this.player_hand.set_cards(cards);
      this.shift_cell_right_of_player_hand();
   }

   set_hidden_card_count(card_count) {
      this.player_hand.set_hidden_card_count(card_count);
      this.shift_cell_right_of_player_hand();
   }

   shift_cell_right_of_player_hand() {
      var container = this.table.cell(0, 3);
      container.style.paddingLeft = card_offset * this.player_hand.cards.length + "px";
      return container;
   }

   reset_attacks() {
      this.undefended_attacks = [];
      var container = this.shift_cell_right_of_player_hand();
      clear_contents(container);
      return container;
   }

   set_attacks(attacks) {
      this.undefended_attacks = [];
      var container = this.reset_attacks();
      const clickable_cards = (room.round_msg && room.my_name == room.round_msg[2]["defender"]);
      for (let attack_defend of attacks) {
         var stack = new PlayerHand(container, "", true, "durak_attack_defend");
         if (clickable_cards && attack_defend.length == 1) {
            this.undefended_attacks.push(stack); // Collect undefended stacks
         }
         for (let cardj of attack_defend) {
            var card = card_from_jmsg(stack.ui, cardj[0], cardj[1]);
            if (clickable_cards && attack_defend.length == 1) {
               card.set_click_action("slide_up");
            }
            stack.append_card(card);
         }
      }
   }

   set_action_mode(attacker, defender, done) {
      const mode_row = 0;
      const mode_col = 1;

      if (defender) {
         this.table.cell_content_set(mode_row, mode_col, create_span("defender"));

         if (this.player_name == room.my_name) {
            this.table.cell_content_add(mode_row, mode_col, this.defend_btn);
            this.table.cell_content_add(mode_row, mode_col, this.giveup_btn);
            this.player_hand.set_mode_defender();
         } else {
            this.player_hand.set_mode_none();
         }

      } else if (done) {
         var strikethru = document.createElement("s");
         this.table.cell_content_set(mode_row, mode_col, strikethru);
         strikethru.appendChild(create_span("attacker"));
         this.player_hand.set_mode_none();

      } else if (attacker) {
         this.table.cell_content_set(mode_row, mode_col, create_span("attacker"));
         if (this.player_name == room.my_name) {
            this.table.cell_content_add(mode_row, mode_col, this.attack_btn);
            this.table.cell_content_add(mode_row, mode_col, this.done_btn);
            this.player_hand.set_mode_attacker();
         } else {
            this.player_hand.set_mode_none();
         }

      } else {
         clear_contents(this.table.cell(mode_row, mode_col));
         this.player_hand.set_mode_none();
      }

   }

   selected_attack_cards_to_defend_against() {
      var selected = [];
      for (let stack of this.undefended_attacks) {
         for (let card of stack.selected_cards()) {
            selected.push(card);
         }
      }
      return selected;
   }
}

class PlayerHand extends CardRack {
   constructor(parent_ui, id, vertical=false, cls="") {
      super(parent_ui, id, vertical?0:card_offset, vertical?-1*card_offset:0);
      if (cls) { this.ui.classList.add( cls ); }

      this.mode = null;
   }

   selected_cards() {
      var selected = [];
      for (let card of this.cards) {
         if (card.selected) {
            selected.push([card.suit, card.rank]);
         }
      }
      return selected;
   }

   set_cards(cards) {
      this.clear();

      for (var card_jmsg of cards) {
         var card = card_from_jmsg(this.parent_ui, card_jmsg[0], card_jmsg[1]);
         if (this.mode == "attacker" || this.mode == "defender") {
            card.set_click_action("slide_up");
         }
         this.append_card(card);
      }
   }

   set_hidden_card_count(card_count) {
      this.remove_tail_cards(card_count);

      while (this.count() < card_count) {
         var card = new Card(this.parent_ui, 0, 0, true, card_theme);
         this.append_card(card);
      }
   }

   set_mode_none() {
      this.mode = null;

      for (let card in self.cards) {
         card.set_click_action(null);
      }
   }

   set_mode_attacker() {
      this.mode = "attacker";

      for (let card in self.cards) {
         card.set_click_action("slide_up");
      }
   }

   set_mode_defender() {
      this.mode = "defender";

      for (let card in self.cards) {
         card.set_click_action("slide_up");
      }
   }
}

class Board {
   constructor(parent_ui) {
      this.parent_ui = parent_ui;
      this.table = new Table(this.parent_ui, 1, 3);

      this.ui = this.table.ui;
      this.parent_ui.appendChild(this.ui);

      this.draw_pile = new DrawPile(this.table.cell(0, 1), "");
   }

   set_table_cards_msg(jmsg) {
      const trump = jmsg[1]["trump"];
      this.table.cell_content_set(0, 0, create_span("Trump: " + SuitMap.get(trump)));
      this.table.cell_content_add(0, 0, create_line_break());
      this.table.cell_content_add(0, 0, create_span(jmsg[1]["drawPileSize"] + " cards"));

      const bottom_card = jmsg[1]["bottomCard"];
      this.draw_pile.set_state(bottom_card[0], bottom_card[1], jmsg[1]["drawPileSize"]);
   }
}

class DrawPile extends CardRack {
   constructor(parent_ui, id) {
      super(parent_ui, id, 30, 0);

      this.bottom_card = null;
      this.max_cards = 2; // max cards to show in deck
   }

   set_state(bottom_suit, bottom_rank, card_count) {
      if (!this.bottom_card ||
          this.bottom_card.suit != bottom_suit ||
          this.bottom_card.rank != bottom_rank) {
         this.clear();

         this.bottom_card = card_from_jmsg(this.parent_ui, bottom_suit, bottom_rank);
         this.append_card(this.bottom_card);
      }

      if (card_count == 1) {
         this.remove_tail_cards(1);
      }

      while ((this.count() < this.max_cards) && (this.count() < card_count)) {
         var card = new Card(this.parent_ui, 0, 0, true, card_theme);
         this.append_card(card);
      }
   }
}

class JoinRoom {
   constructor(parent_ui, nw) {
      this.parent_ui = parent_ui;
      this.nw = nw;

      this.table = new Table(this.parent_ui, 1, 3);
      this.ui = this.table.ui;

      this.parent_ui.appendChild(this.ui);

      this.table.cell_content_set(0, 0, create_span("Player"));
      this.table.cell_content_set(0, 1, create_input_text(this, "player_name"));
      this.table.cell_content_set(0, 2, create_button(this, "", "Join", this.join));
   }

   join() {
      var my_name = document.getElementById("player_name").value;
      room.nw.send(["JOIN", my_name]);
   }
}

class DurakRoom {
   constructor(gid, parent_ui) {
      this.gid = gid;
      this.parent_ui = parent_ui;

      this.my_name = null;

      this.nw = new Network(
         "NwDurak:" + gid,
         "durak:" + gid,
         this.onmessage,
         this.onclose,
         this.onopen);

      this.round_msg = null;
      this.player_turn_order = null;
      this.player_hand_msgs = new Map();
      this.table_cards_msg = null;

      this.join_room = new JoinRoom(this.parent_ui, this.nw);
      this.board = new Board(this.parent_ui);
      this.draw_pile = new DrawPile(this.parent_ui, "");

      // player details
      this.player_table = new Table(this.parent_ui, 0, 1);
      this.player_table_row = new Map();
      this.player_board = new Map();

   }

   onmessage(jmsg) {

      if (jmsg[0] == "ROUND") {
         room.round_msg = jmsg;
         room.refresh_ui();
      }

      if (jmsg[0] == "JOIN-OKAY") {
         room.my_name = jmsg[1];
         room.refresh_ui();
      }

      if (jmsg[0] == "TABLE-CARDS") {
         room.table_cards_msg = jmsg;
         room.refresh_ui();
      }

      if (jmsg[0] == "PLAYER-HAND") {
         room.player_hand_msgs.set(jmsg[1], jmsg);
         room.refresh_ui();
      }
   }

   onopen(ev) {
   }

   onclose(ev) {
   }

   refresh_ui() {
      if (!this.round_msg) {
         return;
      }

      const attackers = this.round_msg[2]["attackers"];
      const defender = this.round_msg[2]["defender"];
      const done_players = this.round_msg[2]["done"];

      if (this.table_cards_msg) {
         this.board.set_table_cards_msg(this.table_cards_msg);
      }

      const player_turn_order = this.round_msg[2]["playerTurnOrder"];

      // Per player update
      for (var player of player_turn_order) {
         // Create player row and player hand for each player
         if (!this.player_table_row.has(player)) {
            this.player_table_row.set(player,
               this.player_table.add_row(null));

            var player_row = this.player_table_row.get(player);

            var player_board = new PlayerBoard(player_row.childNodes[0], player);
            this.player_board.set(player, player_board);
         }

         var player_board = this.player_board.get(player);

         player_board.set_action_mode(
            attackers.includes(player),
            defender == player,
            done_players.includes(player));

         if (this.table_cards_msg && player in this.table_cards_msg[1]["attacks"]) {
            player_board.set_attacks(this.table_cards_msg[1]["attacks"][player]);
         } else {
            player_board.reset_attacks();
         }

         var player_hand_msg = this.player_hand_msgs.get(player);
         if (player_hand_msg) {
            if (player_hand_msg[3]) {
               player_board.set_cards(player_hand_msg[3]);
            } else {
               player_board.set_hidden_card_count(player_hand_msg[2]);
            }
         }
      }
   }

   selected_attack_cards() {
      var selected = [];
      for (const [name, player_board] of this.player_board) {
         for (let card of player_board.selected_attack_cards_to_defend_against()) {
            selected.push(card);
         }
      }
      return selected;
   }
}


//function dirty7_cards_from_card_descs(card_rack, card_descs, c_theme=0,
//                                      click_action="slide_up") {
//   var cards = [];
//   for (var card_desc of card_descs) {
//      var card = new Card(card_rack.ui, card_desc[0], card_desc[1], false, c_theme); // suit, rank
//      card.set_click_action(click_action);
//      cards.push(card);
//   }
//   return cards;
//}
//
//function dirty7_rule_anchor(name) {
//   if (name == "basic") { return "rules_basic"; }
//   if (name == "basic,seq3") { return "rules_basic_seq3"; }
//   if (name == "basic,seq3+") { return "rules_basic_seq3_plus"; }
//   if (name == "basic,suit3") { return "rules_basic_suit3"; }
//   if (name == "basic,suit3+") { return "rules_basic_suit3_plus"; }
//   if (name == "seq3") { return "rules_seq3"; }
//   if (name == "seq3+") { return "rules_seq3_plus"; }
//   if (name == "suit3") { return "rules_suit3"; }
//   if (name == "suit3+") { return "rules_suit3_plus"; }
//   console.log("dirty7_rule_anchor: unrecognized rule " + name);
//   return "";
//}
//
//class Dirty7UiBase {
//   constructor(room, nw, parent_ui) {
//      this.room = room;
//      this.nw = nw;
//      this.parent_ui = parent_ui;
//
//      this.ui = null;
//   }
//
//   hide() { this.ui.style.display = "none"; }
//   show() { this.ui.style.display = "block"; }
//}
//
//class Dirty7LoginBar extends Dirty7UiBase {
///**
// * [       Alias [____]    Passwd [____]    [ Connect ]
// */
//   constructor(room, nw, parent_ui) {
//      super(room, nw, parent_ui);
//
//      this.alias_internal = "";
//
//      this.ui = create_div(this, "", "d7_login_bar text right");
//      this.alias = create_input_text(this, "", "d7_login_bar_input text");
//      this.passwd = create_input_password(this, "", "d7_login_bar_input text");
//      this.connect_btn = create_button(this, "", "Connect",
//                                      this.connect_click,
//                                      "d7_login_bar_input text");
//
//      this.alias.addEventListener("keyup", this.alias_keyup);
//      this.passwd.addEventListener("keyup", this.passwd_keyup);
//
//
//      this.ui.appendChild(create_span("Name", "d7_login_bar_text"));
//      this.ui.appendChild(this.alias);
//      this.ui.appendChild(create_line_break());
//
//      this.ui.appendChild(create_span("Password", "d7_login_bar_text"));
//      this.ui.appendChild(this.passwd);
//      this.ui.appendChild(create_line_break());
//
//      this.ui.appendChild(this.connect_btn);
//
//      this.parent_ui.appendChild(this.ui);
//
//      this.alias.focus();
//   }
//
//   alias_keyup(ev) {
//      ev.preventDefault();
//      if (ev.keyCode === 13) {
//         var creator = ev.target.creator;
//         creator.passwd.focus();
//      }
//   }
//
//   passwd_keyup(ev) {
//      ev.preventDefault();
//      if (ev.keyCode === 13) {
//         var creator = ev.target.creator;
//         creator.connect_btn.focus();
//         creator.connect_click(ev);
//      }
//   }
//
//   connect_click(ev) {
//      var login_bar = ev ? ev.target.creator : this;
//      login_bar.alias_internal = login_bar.alias.value;
//      var passwd = login_bar.passwd.value;
//
//      login_bar.nw.send(["JOIN", login_bar.alias_internal, passwd]);
//   }
//
//   maybe_rejoin() {
//      if (this.alias.value) {
//         this.connect_click();
//      }
//   }
//}
//
//class Dirty7RoundParameters extends Dirty7UiBase {
//   constructor(room, nw, parent_ui) {
//      super(room, nw, parent_ui);
//      this.round_num = null;
//      this.round_params = null;
//
//      this.ui = create_span("", "d7_round_params text bold");
//      parent_ui.appendChild(this.ui);
//
//      this.hide();
//   }
//
//   set_round_parameters(round_num, round_params) {
//      if (this.room.game_over) {
//         this.hide();
//         return;
//      }
//      this.show();
//      this.round_num = round_num;
//      this.round_params = round_params;
//      clear_contents(this.ui);
//
//      this.ui.appendChild(create_span("Round " + this.round_num + ", "));
//      this.ui.appendChild(create_span("Rules " + this.round_params["ruleNames"][0] + ", "));
//
//      var declare_cut_off = this.round_params["declareMaxPoints"][0];
//      if (declare_cut_off == null) {
//         declare_cut_off = "any";
//      }
//      this.ui.appendChild(create_span("Declare upto " + declare_cut_off + ", "));
//      this.ui.appendChild(create_span("Scoring system " + round_params["scoringSystems"][0] + " "));
//      this.ui.appendChild(create_link("/dirty7/help.html#" + dirty7_rule_anchor(this.round_params["ruleNames"][0]),
//                                      create_span("[?]"), true));
//   }
//}
//
//class Dirty7GameOver extends Dirty7UiBase {
//   constructor(room, nw, parent_ui) {
//      super(room, nw, parent_ui);
//      this.ui = create_div(this, "width100");
//      this.container_table = new Table(this.ui, 0, 1, "width100 d7_game_over");
//      this.container_table.add_row([create_span("Game over", "head1")]);
//      this.container_table.cell_class(0, 0, "center");
//
//      this.parent_ui.appendChild(this.ui);
//   }
//   set_winners(winners) {
//      var msg;
//      if (winners.length == 1) {
//         msg = "Winner: " + winners[0];
//      } else {
//         msg = "Winners: " + winners.join(", ");
//      }
//      this.container_table.add_row([create_span(msg, "head2")]);
//      this.container_table.cell_class(1, 0, "center");
//   }
//}
//
//class Dirty7Disconnected extends Dirty7UiBase {
//   constructor(room, nw, parent_ui) {
//      super(room, nw, parent_ui);
//      this.ui = create_span("Disconnected", "width100 head1 d7_disconnected");
//      this.reconnect_btn = create_button(this, "", "Reconnect", this.reconnect_click, "head2");
//      this.ui.appendChild(this.reconnect_btn);
//      this.parent_ui.appendChild(this.ui);
//   }
//
//   reconnect_click(ev) {
//      var disconnected_bar = ev.target.creator;
//      disconnected_bar.nw.new_connection();
//   }
//}
//
//class Dirty7Board extends Dirty7UiBase {
///*
//
// +-Container---+-----------+
// |             |           |
// |             |   +----+  |
// | +--+----+   |   |    |+ |
// | |  |    |   |   |    || |
// | |  |    |   |   |    || |
// | |  |    |   |   +----+| |
// | +--+----+   |    +----+ |
// |             |           |
// +-face_up_cell+-deck_cell-+
//
//*/
//   constructor(room, nw, parent_ui) {
//      super(room, nw, parent_ui);
//
//      this.container_table = new Table(parent_ui, 1, 2, "d7_board floatleft");
//      this.container_table.cell(0, 1).style.width = "250px";
//
//      this.card_rack = new CardRack(
//         this.container_table.cell(0, 0), "",
//         45);
//      this.deck = new CardFaceDownDeck(
//         this.container_table.cell(0, 1), "",
//         0, 1);
//
//      this.ui = parent_ui.appendChild(this.container_table.ui);
//   }
//}
//
//class Dirty7PlayerBoard extends Dirty7UiBase {
///*
//  +-Container-------------------------------------+
//  | +------------------------+ |
//  | | PlayerName             | | Cards 
//  | | OtherStats             | |
//  | |-player_pane------------| |
//  | | [Play Cards] [Declare] | |
//  | +-move_pane--------------+ |
//  +-player_text_pane-------------cards_pane-------+
//
//*/
//   constructor(room, alias, nw, parent_ui) {
//      super(room, nw, parent_ui);
//      this.alias = alias;
//
//      this.has_turn = false;  // tracks if it's this players turn
//      this.last_msg_turn = null;
//
//      this.container_table = new Table(parent_ui, 1, 2, "d7_player_board");
//
//      // player_text_pane
//      this.container_table.cell_class(0, 0, "d7_player_text_pane top");
//
//      var player_info = new Table(this.container_table.cell(0, 0),
//                                  2, 1, "d7_player_info height100");
//      player_info.cell_class(0, 0, "top");
//      this.player_pane = player_info.cell(0, 0);
//      player_info.cell_class(0, 0, "center");
//
//      this.move_pane = player_info.cell(1, 0);
//      player_info.cell_class(1, 0, "bottom center");
//      this.play_btn = create_button(this, "", "Play", this.play_click, "text d7_player_turn_btn");
//      this.declare_btn = create_button(this, "", "Declare", this.declare_click, "text d7_player_turn_btn");
//      this.move_pane.appendChild(this.play_btn);
//      this.move_pane.appendChild(this.declare_btn);
//      this.set_move_pane_visibility(room.last_msg_turn && room.last_msg_turn[2] == alias);
//
//      // Cards pane
//      this.card_rack = new CardRack(this.container_table.cell(0, 1), "", 50);
//
//      this.ui = this.room.player_boards_holder.add_row([this.container_table.ui]);
//
//      this.update_ui();
//   }
//   set_move_pane_visibility(val) {
//      this.move_pane.style.display = val ? "block" : "none";
//   }
//   set_has_turn(val) {
//      this.has_turn = val;
//      var ele = this.container_table.cell(0, 0);
//      if (this.has_turn) {
//         ele.classList.add("d7_player_turn");
//      } else {
//         ele.classList.remove("d7_player_turn");
//      }
//   }
//   set_card_count(count) {
//      while (this.card_rack.count() < count) {
//         this.card_rack.append_card(new Card(this.card_rack.ui, 0, 0, true, 1));
//      }
//      if (this.card_rack.count() > count) {
//         this.card_rack.remove_tail_cards(count);
//      }
//   }
//   play_click(ev) {
//      var player_board = ev.target.creator;
//      var room = player_board.room;
//
//      var move = {};
//      var dropCards = player_board.card_rack.selected_cards_jmsg();
//      var numDrawCards = room.board.deck.selected_cards_count();
//      var pickCards = room.board.card_rack.selected_cards_jmsg();
//
//      if (dropCards.length)   { move["dropCards"] = dropCards; }
//      if (numDrawCards)       { move["numDrawCards"] = numDrawCards; }
//      if (pickCards.length)   { move["pickCards"] = pickCards; }
//      var jmsg = ["PLAY", move];
//      room.nw.send(jmsg);
//   }
//   declare_click(ev) {
//      var room = ev.target.creator.room;
//      var jmsg = ["DECLARE"];
//      room.nw.send(jmsg);
//   }
//   update_ui() {
//      clear_contents(this.player_pane);
//      this.player_pane.appendChild(create_span(this.alias, "head2"));
//   }
//}
//
//class Dirty7ScoreBoard extends Dirty7UiBase {
///*
//  +-Container-----------------------------+
//  |  | Plyr1  24 | Plyr2  56 | Plyr3   20 |
//  |---------------------------------------|
//  | 3|        12 |        28 |         10 |
//  | 2| [][][] 12 | [][]   20 |  []      0 |
//  | 1| [][][]  0 | [][]    8 |  []     10 |
//  +---------------------------------------+
//
//  Each row cell has two spans: left for cards, right for score
//*/
//   constructor(room, nw, parent_ui) {
//      super(room, nw, parent_ui);
//
//      this.highest_round_num_seen = 0;
//      this.player_cards_data = []; // [rno, alias, card_descs]
//      this.alias_to_idx = {};
//
//      this.title_table = new Table(this.parent_ui, 2, 1, "d7_score_board floatleft");
//
//      this.container_table = null;
//   }
//
//   init_container_table(data) {
//      this.title_table.cell_content_add(0, 0, create_span("Scoreboard", "head2"));
//
//      var count = 0;
//      for (var alias in data) {
//         this.alias_to_idx[alias] = count++;
//      }
//      this.container_table = new Table(this.title_table.cell(1, 0), 1, count + 1, "d7_score_board");
//      this.ui = this.title_table.ui;
//
//      this.cell_inner_table = [];
//
//      // Populate first row
//      this.cell_inner_table[0] = []; // Row 0 has the total sum
//      for (var alias in this.alias_to_idx) {
//         var idx = this.alias_to_idx[alias];
//
//         this.cell_inner_table[0][idx+1] = new Table(this.container_table.cell(0, idx+1),
//                                     1, 2, "width100");
//         this.cell_inner_table[0][idx+1].cell_class(0, 1, "d7_score_board_inner_table_score");
//
//         this.container_table.cell_class(0, idx + 1, "d7_score_board_header");
//         this.cell_inner_table[0][idx+1].cell_content_set(0, 0, create_span(alias, "head2"));
//      }
//   }
//
//   /*
//    * Called when hand details (cards held) information is made available
//    */
//   update_player_cards(round_num, alias, card_descs) {
//      if (round_num <= this.highest_round_num_seen) {
//         // process immediately
//         this.update_player_cards_impl(round_num, alias, card_descs);
//      } else {
//         this.player_cards_data.push([round_num, alias, card_descs]);
//      }
//   }
//
//   update_player_cards_impl(round_num, alias, card_descs) {
//      var idx = this.alias_to_idx[alias];
//
//      var inner_table = this.cell_inner_table[round_num][idx + 1];
//      var player_card_cell = inner_table.cell(0, 0);
//      clear_contents(player_card_cell);
//
//      var card_rack = new CardRack(player_card_cell, "", 25);
//      var cards = dirty7_cards_from_card_descs(card_rack, card_descs, 1, null);
//      card_rack.append_cards(cards);
//   }
//
//   add_row(round_num) {
//      // Add a new row after the header
//      this.container_table.add_row(null, 1);
//
//      // Figure out where the new row was added
//      var num_table_rows = this.container_table.tbody.childElementCount;
//      var row_idx = num_table_rows - round_num; // This might always be 1??
//
//      this.container_table.cell_class(row_idx, 0, "d7_score_board_round right");
//      this.container_table.cell_content_add(row_idx, 0,
//                                            create_span("" + round_num, "text"));
//
//      this.cell_inner_table[round_num] = [];
//      for (var i=1; i < this.container_table.num_cols; ++i) {
//         this.cell_inner_table[round_num][i] = new Table(this.container_table.cell(row_idx, i),
//                                     1, 2, "d7_score_board_inner_table width100");
//         this.cell_inner_table[round_num][i].cell_class(0, 1, "d7_score_board_inner_table_score");
//         this.cell_inner_table[round_num][i].cell_content_set(0, 1, create_span("", "text"));
//      }
//
//      // Review player card data queued in
//      // this.player_cards_data and insert them now
//      var new_player_cards_data = [];
//      for (var row of this.player_cards_data) {
//         if (row[0] == round_num) {
//            // flush now
//            this.update_player_cards_impl(row[0], row[1], row[2]);
//         } else {
//            new_player_cards_data.push(row);
//         }
//      }
//      this.player_cards_data = new_player_cards_data;
//   }
//
//   /*
//    * Called when ROUND-SCORE message with score for each player
//    * is received.
//    */
//   update_round_score(round_num, data) {
//      if (this.container_table == null) {
//         this.init_container_table(data);
//      }
//
//      if (round_num > this.highest_round_num_seen) {
//         for (var i = this.highest_round_num_seen + 1; i <= round_num; ++i) {
//            this.add_row(i);
//         }
//         this.highest_round_num_seen = round_num;
//      }
//
//      set_title("Dirty7 room #" + this.room.gid +
//                " round " + this.highest_round_num_seen);
//
//      for (var alias in data) {
//         var idx = this.alias_to_idx[alias];
//         var score = data[alias];
//         if (score != null) {
//            this.cell_inner_table[round_num][idx + 1].cell_content_set(0, 1,
//               create_span("" + score, "text"));
//         }
//      }
//
//      this.update_total();
//   }
//
//   update_total() {
//      if (this.container_table == null) { return; }
//      if (this.highest_round_num_seen == 0) { return; }
//
//      for (var alias in this.alias_to_idx) {
//         var idx = this.alias_to_idx[alias];
//
//         var total = 0;
//         for (var round_num=1; round_num <= this.highest_round_num_seen; ++round_num) {
//            var score = this.cell_inner_table[round_num][idx + 1].cell(0, 1).childNodes[0].innerHTML;
//            if (score) {
//               total += Number(score);
//            }
//         }
//
//         this.cell_inner_table[0][idx+1].cell_content_set(0, 1,
//             create_span("" + total, "head2"));
//      }
//   }
//}
//
//class Dirty7Room extends Ui {
//   constructor(gid, div) {
//      super(div);
//      this.gid = gid;
//      this.round_num = 0;
//
//      this.nw = new Network("NwDirty7:" + gid, "dirty7:" + gid,
//                            this.onmessage,
//                            this.onclose,
//                            this.onopen);
//      this.nw.cls_room = this;
//      this.game_over = false;
//
//      this.init_display();
//   }
//
//   /**
//    * init_display()
//    * Used to setup the initial screen. This starts
//    * by showing the login bar at the top
//    */
//   init_display() {
//      this.ui_notifications = new UiNotifications(this.div, 3000, "d7_notifications_table");
//      this.login_bar = new Dirty7LoginBar(this, this.nw, this.div);
//      this.disconnected_bar = new Dirty7Disconnected(this, this.nw, this.div);
//      this.disconnected_bar.hide();
//      this.round_params = new Dirty7RoundParameters(this, this.nw, this.div);
//      this.game_over_bar = new Dirty7GameOver(this, this.nw, this.div);
//      this.game_over_bar.hide();
//      this.board = new Dirty7Board(this, this.nw, this.div);
//
//      this.player_boards_holder = new Table(this.div, 0, 1, "floatleft");
//      this.player_boards = {};
//
//      this.score_board = new Dirty7ScoreBoard(this, this.nw, this.div);
//
//      document.notifications_ui = this.ui_notifications.ui;
//
//      document.onscroll = function(ev) {
//         ev.target.notifications_ui.style.top = window.pageYOffset + "px";
//      }
//   }
//
//
//   /**
//    * UI helpers
//    */
//   show_error_msg(msg) {
//      var obj = create_span(msg, "head2");
//      this.ui_notifications.add_msg(obj, "d7_notification_error");
//   }
//
//   show_info_msg(msg) {
//      var obj = create_span(msg, "head2");
//      this.ui_notifications.add_msg(obj, "d7_notification_info");
//   }
//
//   show_move_msg(msg) {
//      var obj = create_span(msg, "head2");
//      this.ui_notifications.add_msg(obj, "d7_notification_move");
//   }
//
//   show_move_obj(obj) {
//      this.ui_notifications.add_msg(obj, "d7_notification_move");
//   }
//
//   /**
//    * Helpers
//    */
//   maybe_create_player_board(alias) {
//      if (!(alias in this.player_boards)) {
//         var board = new Dirty7PlayerBoard(this, alias, this.nw, this.div);
//         this.player_boards[alias] = board;
//         if (this.game_over) {
//            board.hide();
//         }
//      }
//   }
//
//   maybe_update_round_num(num) {
//      if (this.round_num < num) {
//         this.round_num = num;
//      }
//   }
//
//   is_old_round(num) {
//      return num < this.round_num;
//   }
//
//   /**
//    * Message handling
//    */
//   process_turn_order(jmsg) {
//      // Example:
//      //    ["TURN-ORDER", 2, ["bar", "foo"]]
//      if (this.is_old_round(jmsg[1])) { return; }
//
//      for (var alias of jmsg[2]) {
//         this.maybe_create_player_board(alias);
//      }
//   }
//
//   process_turn(jmsg) {
//      // Example:
//      //    ["TURN", 2, "foo"]
//      if (this.is_old_round(jmsg[1])) { return; }
//
//      this.last_msg_turn = jmsg;
//      for (var alias in this.player_boards) {
//         var board = this.player_boards[alias];
//         board.set_has_turn(board.alias == jmsg[2]);
//         board.set_move_pane_visibility(alias == this.login_bar.alias_internal &&
//                                        board.alias == jmsg[2]);
//      }
//   }
//
//   process_player_cards(jmsg) {
//      // Examples:
//      //    ["PLAYER-CARDS", 1, "foo", 5]
//      //    ["PLAYER-CARDS", 1, "foo", 5,
//      //     [["S", 9], ["S", 13], ["D", 2], ["H", 4], ["D", 13]]]
//
//      if (jmsg.length == 5) {
//         this.score_board.update_player_cards(jmsg[1], jmsg[2], jmsg[4]);
//      }
//
//      if (this.is_old_round(jmsg[1])) { return; }
//
//      this.maybe_create_player_board(jmsg[2]);
//
//      if (jmsg.length == 5) {
//         // My cards or other's cards when the round is over
//         var card_rack = this.player_boards[jmsg[2]].card_rack;
//         card_rack.clear();
//         var cards = dirty7_cards_from_card_descs(card_rack, jmsg[4]);
//         card_rack.append_cards(cards);
//      } else {
//         var card_rack = this.player_boards[jmsg[2]].card_rack;
//         card_rack.clear();
//         // Cards of others during a round
//         this.player_boards[jmsg[2]].set_card_count(jmsg[3]);
//      }
//   }
//
//   process_table_cards(jmsg) {
//      // Example:
//      //   ["TABLE-CARDS", 1, 37, 0, [["H", 5]]]
//      if (this.is_old_round(jmsg[1])) { return; }
//
//      this.board.deck.set_card_count(Math.min(jmsg[2], 8));
//
//      var cards = dirty7_cards_from_card_descs(this.board.card_rack, jmsg[4]);
//      this.board.card_rack.clear();
//      this.board.card_rack.append_cards(cards);
//   }
//
//   process_round_score(jmsg) {
//      // Example:
//      //    "ROUND-SCORE", 2, {"foo": 4, "bar": 4}]
//      //    "ROUND-SCORE", 3, {"foo": null, "bar": null}]
//
//      this.score_board.update_round_score(jmsg[1], jmsg[2]);
//   }
//
//   process_update(jmsg) {
//      if (this.is_old_round(jmsg[1])) { return; }
//
//      if ("DECLARE" in jmsg[2]) {
//         // ["UPDATE", 1, {"DECLARE": ["bar", 3]}]
//         var who = jmsg[2]["DECLARE"][0];
//         var score = jmsg[2]["DECLARE"][1];
//         this.show_move_msg(who + " declared at " + score + " points");
//
//      } else {
//         // ["UPDATE", 1, {"PLAY": ["foo", [["S", 5], ["D", 5]], 1, [["S", "4"]], {"AdvanceTurn": 1}]}]
//         var who = jmsg[2]["PLAY"][0];
//         var num_drawn_cards = jmsg[2]["PLAY"][2];
//         var cards_picked = jmsg[2]["PLAY"][3];
//         if (cards_picked.length > 0) {
//            var span = create_span(who + " picked ", "head2");
//            var card_rack = new CardRack(span, "", 25);
//            var cards = dirty7_cards_from_card_descs(card_rack, cards_picked, 1, null);
//            card_rack.append_cards(cards);
//            this.show_move_obj(span);
//         } else {
//            if (num_drawn_cards == 1) {
//               this.show_move_msg(who + " drew 1 card from the deck");
//            } else {
//               this.show_move_msg(who + " drew " + num_drawn_cards + " cards from the deck");
//            }
//         }
//      }
//   }
//
//   process_game_over(jmsg) {
//      // ["GAME-OVER", ["cat"]]
//      this.game_over = true;
//
//      for (var alias in this.player_boards) {
//         this.player_boards[alias].hide();
//      }
//      this.login_bar.hide();
//      this.board.hide();
//      this.game_over_bar.set_winners(jmsg[1]);
//      this.game_over_bar.show();
//      this.round_params.hide();
//   }
//
//   process_round_parameters(jmsg) {
//      if (this.is_old_round(jmsg[1])) { return; }
//
//      this.round_params.set_round_parameters(jmsg[1], jmsg[2]);
//   }
//
//   onmessage(jmsg) {
//      var room = this.cls_room;
//
//      if (jmsg[0] == "JOIN-BAD") {
//         room.login_bar.alias.focus();
//         room.show_error_msg(jmsg[1]);
//         room.login_bar.alias.focus();
//
//      } else if (jmsg[0] == "JOIN-OKAY") {
//         var alias = room.login_bar.alias_internal;
//         if (room.last_msg_turn && alias in room.player_boards) {
//            room.player_boards[alias].set_move_pane_visibility(room.last_msg_turn[2] == alias);
//         }
//         room.login_bar.hide();
//         room.show_info_msg("Player accepted");
//         room.show_info_msg("Waiting for game to start");
//
//      } else if (jmsg[0] == "TURN-ORDER") {
//         room.maybe_update_round_num(jmsg[1]);
//         room.process_turn_order(jmsg);
//
//      } else if (jmsg[0] == "TURN") {
//         room.maybe_update_round_num(jmsg[1]);
//         room.process_turn(jmsg);
//
//      } else if (jmsg[0] == "PLAYER-CARDS") {
//         room.maybe_update_round_num(jmsg[1]);
//         room.process_player_cards(jmsg);
//
//      } else if (jmsg[0] == "TABLE-CARDS") {
//         room.maybe_update_round_num(jmsg[1]);
//         room.process_table_cards(jmsg);
//
//      } else if (jmsg[0] == "ROUND-SCORE") {
//         room.maybe_update_round_num(jmsg[1]);
//         room.process_round_score(jmsg);
//
//      } else if (jmsg[0] == "UPDATE") {
//         room.maybe_update_round_num(jmsg[1]);
//         room.process_update(jmsg);
//
//      } else if (jmsg[0] == "PLAY-BAD") {
//         room.show_error_msg(jmsg[1]);
//
//      } else if (jmsg[0] == "DECLARE-BAD") {
//         room.show_error_msg(jmsg[1]);
//
//      } else if (jmsg[0] == "GAME-OVER") {
//         room.maybe_update_round_num(jmsg[1]);
//         room.process_game_over(jmsg);
//
//      } else if (jmsg[0] == "ROUND-PARAMETERS") {
//         room.maybe_update_round_num(jmsg[1]);
//         room.process_round_parameters(jmsg);
//
//      } else {
//         var msg = "Unhandled message: " + JSON.stringify(jmsg);
//         console.log(msg);
//         room.show_error_msg(msg);
//
//      }
//   }
//
//   /**
//    * Other socket events
//    */
//   onclose(ev) {
//      var room = this.cls_room;
//      // this = Network instance
//      room.show_error_msg("Disconnected");
//      room.disconnected_bar.show();
//   }
//
//   onopen(ev) {
//      var room = this.cls_room;
//      room.disconnected_bar.hide();
//      room.login_bar.maybe_rejoin();
//   }
//}
