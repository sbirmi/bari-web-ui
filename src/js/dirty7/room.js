console.log("Loading dirty7/room.js");

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
      this.alias_internal = login_bar.alias.value;
      var passwd = login_bar.passwd.value;

      login_bar.nw.send(["JOIN", this.alias_internal, passwd]);
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
      this.container_table.cell_class(0, 1, "right");

      this.card_rack = new CardRack(
         this.container_table.cell(0, 0), "",
         45);
      this.deck = new CardFaceDownDeck(
         this.container_table.cell(0, 1), "",
         0, 0);

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
  +------------------------------cards_pane-------+

*/
   constructor(room, alias, nw, parent_ui) {
      super(room, nw, parent_ui);
      this.alias = alias;
      this.has_turn = false;

      this.container_table = new Table(parent_ui, 1, 2, "d7_player_board");
      this.container_table.cell_class(0, 1, "right");

      var player_info = new Table(this.container_table.cell(0, 0), 2, 1, "d7_player_info");
      this.player_pane = player_info.cell(0, 0);
      this.move_pane = player_info.cell(1, 0);

      this.cards_pane = this.container_table.cell(0, 1);

      this.ui = parent_ui.appendChild(this.container_table.ui);

      this.update_ui();
   }
   set_has_turn(val) {
      this.has_turn = val;
      if (this.has_turn) {
         this.ui.classList.add("d7_player_turn");
      } else {
         this.ui.classList.remove("d7_player_turn");
      }
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
    * Message handling
    */
   process_turn_order(jmsg) {
      for (var alias of jmsg[2]) {
         if (!(alias in this.player_boards)) {
            var board = new Dirty7PlayerBoard(this, alias, this.nw, this.div);
            this.player_boards[alias] = board;
         }
      }
   }

   process_turn(jmsg) {
      for (var alias in this.player_boards) {
         var board = this.player_boards[alias];
         board.set_has_turn(board.alias == jmsg[2]);
      }
   }

   onmessage(jmsg) {
      var room = this.cls_room;

      if (jmsg[0] == "JOIN-BAD") {
         room.login_bar.alias.focus();
         alert("Bad name and password");

      } else if (jmsg[0] == "JOIN-OKAY") {
         room.login_bar.hide();

      } else if (jmsg[0] == "TURN-ORDER") {
         room.process_turn_order(jmsg);

      } else if (jmsg[0] == "TURN") {
         room.process_turn(jmsg);
      }
   }
}
