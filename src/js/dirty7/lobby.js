console.log("Loading dirty7/lobby.js");

function d7_ele_count(obj) {
   var count=0;
   for (var a in obj) {
      count++;
   }
   return count;
}

function d7_pretty_print_state(state) {
   var s = "";
   for (var c of state) {
      if (s && c >= 'A' && c <= 'Z') {
         s += " " + c;
      } else {
         s += c;
      }
   }
   return s;
}

function d7_lobby_checkbox(creator, label_txt, value, checked=true) {
   var div = create_div(creator, "");
   var ele = create_checkbox(creator, "");
   ele.d7_value = value;
   div.appendChild(ele);
   div.appendChild(create_span(label_txt));
   ele.checked = checked;
   return [ele, div];
}

/**
 * From Dirty7/Dirty7Round.py
 *
 *   class RoundParameters:
 *       ctrArgs = ("ruleNames",
 *                  "numPlayers",
 *                  "numDecks",
 *                  "numJokers",
 *                  "numCardsToStart",
 *                  "declareMaxPoints",
 *                  "penaltyPoints",
 *                  "stopPoints")
 *
 */

/*

+-Outer---------------------------------+
| Title                                 |
+---------------------------------------+
| +-Host------------------------------+ |
| | Start a new room         [ HOST ] | |
| +-----------------------------------+ |
| | Rules                [ Basic  v ] | |
| | Players                   [ 2 v ] | |
| | Start card count          [ 7 v ] | |
| | Declaration point limit   [ 7 v ] | |
| | Penalty points           [ 40 v ] | |
| | Game end points         [ 100 v ] | |
| | Deck count                [ 1 v ] | |
| | Joker count               [ 0 v ] | |
| +-----------------------------------+ |
|                                       |
| +-Waiting---------------------------+ |
| |Waiting for players                | |
| +-----------------------------------+ |
| | chat:30 - 5 clients             |^| |
| | chat:29 - 3 clients             | | |
| | chat:28 - 4 clients             |v| |
| +-----------------------------------+ |
|                                       |
| +-Running---------------------------+ |
| |Running rooms                      | |
| +-----------------------------------+ |
| | chat:30 - 5 clients             |^| |
| | chat:29 - 3 clients             | | |
| | chat:28 - 4 clients             |v| |
| +-----------------------------------+ |
|                                       |
| +-Completed-------------------------+ |
| |Completed rooms                    | |
| +-----------------------------------+ |
| | chat:30 - 5 clients             |^| |
| | chat:29 - 3 clients             | | |
| | chat:28 - 4 clients             |v| |
| +-----------------------------------+ |
+---------------------------------------+

*/

class Dirty7Lobby extends Ui {
   constructor(div, notifications) {
      super(div);
      this.notifications = notifications;
      this.gname = "dirty7";
      this.nw = new Network("NwDirty7Lobby", "lobby", this.onmessage);
      this.nw.cls_lobby = this;

      this.gid_to_row = {}; // Tracks rows across tables

      div.innerHTML = "";

      // Outer table
      this.outer_table = new Table(this.div, 2, 1);
      this.outer_table.cell_class(0, 0, "dirty7lobby_title head1");
      this.outer_table.cell_content_add(0, 0, create_span("Dirty7 Lobby &nbsp; "));
      this.outer_table.cell_content_add(0, 0,
         create_link("/dirty7/help.html", create_span("[help]", "text"), true));

      // Host table
      this.host_table = new Table(this.outer_table.cell(1, 0), 0, 2, "width100");
      this.host_btn = create_button(this, "d7lobby_host_btn", "host", this.host_click, "text");
      this.player_count = create_drop_down(this, "d7lobby_player_count",
         [1, 2, 3, 4, 5, 6, 7, 8], 2, "text");
      this.start_card_count = create_drop_down(this, "d7lobby_start_card_count",
         [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 7, "text");
      this.decl_point_limit = create_drop_down(this, "d7lobby_point_limit",
         [1, 7, 10, 20, 30, 40, 999], 7, "text");
      this.penalty_points = create_drop_down(this, "d7lobby_penalty_points",
         [20, 40, 60, 80,100], 40, "text");
      this.game_end_points = create_drop_down(this, "d7lobby_game_end_points",
         [1, 50, 100, 150, 200, 250, 300], 100, "text");
      this.deck_count = create_drop_down(this, "d7lobby_deck_count",
         [1, 2], 1, "text");
      this.joker_count = create_drop_down(this, "d7lobby_joker_count",
         [0, 1, 2, 3, 4], 0, "text");

      this.host_table.add_row([
         create_span("Start a new room", "head2"),
         this.host_btn]);

      // Rules row
      var rule_rowi = 1;
      this.host_table.add_row();
      this.host_table.cell(rule_rowi, 0).appendChild(create_span("Rules", "text"));

      this.rules = [];
      var rule_choices = [["basic", "Basic"],
                          ["basic,seq3", "Basic, seq 3"],
                          ["basic,seq3+", "Basic, seq 3+"],
                          ["basic,suit3", "Basic, suit 3"],
                          ["basic,suit3+", "Basic, suit 3+"],
                          ["seq3", "Seq 3"],
                          ["seq3+", "Seq 3+"],
                          ["suit3", "Suit 3"],
                          ["suit3+", "Suit 3+"],
                         ];
      for (var rule_choice of rule_choices) {
         var ele_div = d7_lobby_checkbox(this, rule_choice[1], rule_choice[0]);
         this.rules.push(ele_div[0]);
         this.host_table.cell(rule_rowi, 1).appendChild(ele_div[1]);
      }

      this.host_table.add_row([
         create_span("Players", "text"),
         this.player_count]);
      this.host_table.add_row([
         create_span("Start card count", "text"),
         this.start_card_count]);

      // Declare under points row
      var declare_rowi = 4;
      this.host_table.add_row();
      this.host_table.cell(declare_rowi, 0).appendChild(create_span("Declare under points", "text"));

      this.declares = [];
      var declare_choices = [["7", 7, true],
                             ["Any", null, false],
                            ];
      for (var declare_choice of declare_choices) {
         var ele_div = d7_lobby_checkbox(this, declare_choice[0], declare_choice[1], declare_choice[2]);
         this.declares.push(ele_div[0]);
         this.host_table.cell(declare_rowi, 1).appendChild(ele_div[1]);
      }

      // Scoring system
      var scoring_rowi = 5;
      this.host_table.add_row();
      this.host_table.cell(scoring_rowi, 0).appendChild(create_span("Scoring system", "text"));

      this.scorings = [];
      var scoring_choices = [["Standard", "standard", true],
                             ["Heart-1", "heart-1", false],
                            ];
      for (var scoring_choice of scoring_choices) {
         var ele_div = d7_lobby_checkbox(this, scoring_choice[0], scoring_choice[1], scoring_choice[2]);
         this.scorings.push(ele_div[0]);
         this.host_table.cell(scoring_rowi, 1).appendChild(ele_div[1]);
      }

      this.host_table.add_row([
         create_span("Penalty points", "text"),
         this.penalty_points]);
      this.host_table.add_row([
         create_span("Game end points", "text"),
         this.game_end_points]);
      this.host_table.add_row([
         create_span("Deck count", "text"),
         this.deck_count]);
      this.host_table.add_row([
         create_span("Joker count", "text"),
         this.joker_count]);

      // Right align right column except the checkbox rows
      for (var i=0; i < 10; ++i) {
         this.host_table.cell_class(i, 1, "right");
      }
      for (var rowi of [rule_rowi, declare_rowi, scoring_rowi]) {
         this.host_table.cell_class(rowi, 0, "left top");
         this.host_table.cell_class(rowi, 1, "left");
      }

      // Existing rooms
      this.existing_table = new Table(this.outer_table.cell(1, 0), 1, 1, "width100");
      this.existing_table.cell_content_add(0, 0, create_span("Existing rooms", "head2"));
   }

   show_error_msg(msg) {
      var obj = create_span(msg, "head2");
      this.notifications.add_msg(obj, "notification_error");
   }

   update_row(row, gid, rcvd_status) {
      // row already has 1 cell. clear contents and add new status
      var cell = row.childNodes[0];
      clear_contents(cell);

      var a = create_link("/dirty7/" + gid,
                         create_span("Room #" + gid, "text"));

      var div = create_div(this, "", "dirty7lobby_room_row");
      div.appendChild(a);
      div.appendChild(create_span(" " + d7_pretty_print_state(rcvd_status[0]["gameState"]),
                                  "text"));
      cell.appendChild(div);

      // [{"gameState": "WaitingForPlayers",
      //   "clientCount": {"foo": 1},
      //   "spectatorCount": 0},
      //  0,  <-- round # (0 => host parameters)
      //  {"ruleNames": ["basic"],
      //   "numPlayers": 2,
      //   "numDecks": 1,
      //   "numJokers": 0,
      //   "numCardsToStart": 7,
      //   "declareMaxPoints": 7,
      //   "penaltyPoints": 40,
      //   "stopPoints": 100}]
      //
      // [{"gameState": "PlayerTurn",
      //   "clientCount": {"foo": 1, "bar": 1},
      //   "spectatorCount": 0},
      //  0,
      //  {"ruleNames": ["basic"], "numPlayers": 2, "numDecks": 1, "numJokers": 0, "numCardsToStart": 7, "declareMaxPoints": 7, "penaltyPoints": 40, "stopPoints": 100},
      //  2,    <-- current round
      //  {"ruleNames": ["basic"], "numPlayers": 2, "numDecks": 1, "numJokers": 0, "numCardsToStart": 7, "declareMaxPoints": 7, "penaltyPoints": 40, "stopPoints": 100}]

      if (d7_ele_count(rcvd_status[0]["clientCount"]) > 0) {
         var div = create_div(this, "");
         div.appendChild(create_span("Players: ", "text"));
         var first = true;
         for (var alias in rcvd_status[0]["clientCount"]) {
            div.appendChild(create_span((first ? "" : ", " ) + alias, "text"));
            first = false;
         }
         cell.appendChild(div);
      }

      if (rcvd_status[0]["gameState"] != "WaitingForPlayers") {
         var div = create_div(this, "");
         // Show round number
         div.appendChild(create_span("Round #" + rcvd_status[3]));
         cell.appendChild(div);
      }

      function add_params(msg, key) {
         var div = create_div(this, "");
         var val = rcvd_status[2][key];
         if (key == "ruleNames") {
            val = val.join("; ");
         }
         if (key == "declareMaxPoints") {
            for (var i in val) {
               if (val[i] == null) {
                  val[i] = "Any";
               }
            }
         }
         div.appendChild(create_span(msg + ": " + val));
         cell.appendChild(div);
      }
      add_params("Rules", "ruleNames");
      add_params("Players", "numPlayers");
      add_params("Start card count", "numCardsToStart");
      add_params("Declare under points", "declareMaxPoints");
      add_params("Scoring systems", "scoringSystems");
      add_params("Penalty points", "penaltyPoints");
      add_params("Game end points", "stopPoints");
      add_params("Deck count", "numDecks");
      add_params("Joker count", "numJokers");
   }
   onmessage(jmsg) {
      // this = Network instance
      var lobby = this.cls_lobby;
      if (jmsg[0] == "GAME-STATUS") {
         if (jmsg[1].startsWith(lobby.gname + ":")) {
            var gid = Number(jmsg[1].split(/:/)[ 1 ]);
            if (gid in lobby.gid_to_row) {
               // Update existing row
               var row = lobby.gid_to_row[gid];
            } else {
               // Add a new row
               var row = lobby.existing_table.add_row(null, 1);
               lobby.gid_to_row[gid] = row;
            }
            lobby.update_row(row, gid, jmsg.slice(2));
         }

      } else if (jmsg[0] == "HOST-BAD") {
         lobby.show_error_msg(jmsg[1]);

      } else {
         console.log("UNHANDLED MESSAGE");
         console.log(jmsg);
      }
   }
   host_click(ev) {
      var lobby = ev.target.creator;
      var rule_names = [];
      for (var rule of lobby.rules) {
         if (rule.checked) {
            rule_names.push(rule.d7_value);
         }
      }
      var declares = [];
      for (var declare of lobby.declares) {
         if (declare.checked) {
            declares.push(declare.d7_value);
         }
      }
      var scorings = [];
      for (var scoring of lobby.scorings) {
         if (scoring.checked) {
            scorings.push(scoring.d7_value);
         }
      }
      var msg = ["HOST", "dirty7",
         rule_names,
         Number(lobby.player_count.value),
         Number(lobby.deck_count.value),
         Number(lobby.joker_count.value),
         Number(lobby.start_card_count.value),
         declares,
         Number(lobby.penalty_points.value),
         Number(lobby.game_end_points.value),
         scorings,
      ];
      lobby.nw.send(msg);
   }
}

