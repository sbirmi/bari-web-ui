console.log("Loading dirty7/lobby.js");

function d7_ele_count(obj) {
   var count=0;
   for (var a in obj) {
      count++;
   }
   return count;
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
      this.outer_table.cell_content_add(0, 0, createSpan("Dirty7 Lobby"));

      // Host table
      this.host_table = new Table(this.outer_table.cell(1, 0), 0, 2, "width100");
      this.host_btn = createButton(this, "d7lobby_host_btn", "host", this.host_click, "text");
      this.player_count = createDropDown(this, "d7lobby_player_count",
         [1, 2, 3, 4, 5, 6, 7, 8], 2, "text");
      this.start_card_count = createDropDown(this, "d7lobby_start_card_count",
         [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 7, "text");
      this.decl_point_limit = createDropDown(this, "d7lobby_point_limit",
         [1, 7, 10, 20, 30, 40, 999], 7, "text");
      this.penalty_points = createDropDown(this, "d7lobby_penalty_points",
         [20, 40, 60, 80,100], 40, "text");
      this.game_end_points = createDropDown(this, "d7lobby_game_end_points",
         [0, 50, 100, 150, 200, 250, 300], 100, "text");
      this.deck_count = createDropDown(this, "d7lobby_deck_count",
         [1, 2], 1, "text");
      this.joker_count = createDropDown(this, "d7lobby_joker_count",
         [0, 1, 2, 3, 4], 0, "text");

      this.host_table.add_row([
         createSpan("Start a new room", "head2"),
         this.host_btn]);

      // Rules row
      var rule_rowi = 1;
      this.host_table.add_row();
      this.host_table.cell(rule_rowi, 0).appendChild(createSpan("Rules", "text"));

      this.rules = [];
      var rule_choices = [["basic", "Basic"],
                          ["basic+seq3", "Basic, seq 3"],
                          ["basic+seq3plus", "Basic, seq 3+"],
                          ["seq3", "Seq 3"],
                          ["seq3plus", "Seq 3+"]];
      for (var rule_choice of rule_choices) {
         var div = createDiv(this, "");
         var ele = createCheckbox(this, "");
         ele.rule_name = rule_choice[0];
         div.appendChild(ele);
         div.appendChild(createSpan(rule_choice[1]));
         this.rules.push(ele);
         this.host_table.cell(1, 1).appendChild(div);
      }
      this.rules[0].checked = true;

      this.host_table.add_row([
         createSpan("Players", "text"),
         this.player_count]);
      this.host_table.add_row([
         createSpan("Start card count", "text"),
         this.start_card_count]);
      this.host_table.add_row([
         createSpan("Declare under points", "text"),
         this.decl_point_limit]);
      this.host_table.add_row([
         createSpan("Penalty points", "text"),
         this.penalty_points]);
      this.host_table.add_row([
         createSpan("Game end points", "text"),
         this.game_end_points]);
      this.host_table.add_row([
         createSpan("Deck count", "text"),
         this.deck_count]);
      this.host_table.add_row([
         createSpan("Joker count", "text"),
         this.joker_count]);

      // Right align right column except the Rules row
      for (var i=0; i < 9; ++i) {
         this.host_table.cell_class(i, 1, "right");
      }
      this.host_table.cell_class(rule_rowi, 1, "left top");
      this.host_table.cell_class(rule_rowi, 1, "left");

// XXX review everything after here

      // Existing rooms
      this.existing_table = new Table(this.outer_table.cell(1, 0), 1, 1);
      this.existing_table.cell_content_add(0, 0, createSpan("Existing rooms", "head2"));
   }

   show_error_msg(msg) {
      var obj = createSpan(msg, "head2");
      this.notifications.add_msg(obj, "notification_error");
   }

   update_row(row, gid, rcvd_status) {
      // row already has 1 cell. clear contents and add new status
      var cell = row.childNodes[0];
      clearContents(cell);

      var a = createLink("/dirty7/" + gid,
                         createSpan("Dirty7:" + gid, "text"));
      cell.appendChild(a);
      cell.appendChild(createSpan(" " + rcvd_status[0]["gameState"], "text"));

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
         cell.appendChild(createLineBreak());
         cell.appendChild(createSpan("Players: ", "text"));
         var first = true;
         for (var alias in rcvd_status[0]["clientCount"]) {
            cell.appendChild(createSpan((first ? "" : ", " ) + alias, "text"));
            first = false;
         }
      }

      if (rcvd_status[0]["gameState"] != "WaitingForPlayers") {
         // Show round number
         cell.appendChild(createLineBreak());
         cell.appendChild(createSpan("Round #" + rcvd_status[3]));
      }
      function add_params(msg, key) {
         cell.appendChild(createLineBreak());
         cell.appendChild(createSpan(msg + ": " + rcvd_status[2][key]));
      }
      add_params("Rules", "ruleNames");
      add_params("Players", "numPlayers");
      add_params("Start card count", "numCardsToStart");
      add_params("Declare under points", "declareMaxPoints");
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
            rule_names.push(rule.rule_name);
         }
      }
      var msg = ["HOST", "dirty7",
         rule_names,
         Number(lobby.player_count.value),
         Number(lobby.deck_count.value),
         Number(lobby.joker_count.value),
         Number(lobby.start_card_count.value),
         Number(lobby.decl_point_limit.value),
         Number(lobby.penalty_points.value),
         Number(lobby.game_end_points.value)];
      lobby.nw.send(msg);
   }
}

