console.log("Loading taboo/lobby.js");

function taboo_pretty_print_state(state) {
   var s = "";

   var tokens = state.split("_");
   for (var i in tokens) {
      var token = tokens[i].toLowerCase();
      tokens[i] = token;
   }
   tokens[0] = tokens[0][0].toUpperCase() + tokens[0].substring(1);
   return tokens.join(" ");
}

function taboo_lobby_checkbox(creator, label_txt, value, checked=true) {
   var div = create_div(creator, "");
   var ele = create_checkbox(creator, "");
   ele.taboo_value = value;
   div.appendChild(ele);
   div.appendChild(create_span(label_txt, "text"));
   ele.checked = checked;
   return [ele, div];
}

/**
 * From Taboo/README.md
 *{
 *    "numTeams": <int>,         # 1..4
 *    "turnDurationSec": <int>,  # 30..180
 *    "wordSets": ["name1", "name2", ...],
 *    "numTurns": <int>,        # 1..8
 *}
 *
 */

/*

+-Outer---------------------------------+
| Title                                 |
+---------------------------------------+
| +-Host------------------------------+ |
| | Start a new room         [ HOST ] | |
| +-----------------------------------+ |
| | numTeams                   [2 v ] | |
| | wordSets            [ MultChoice] | |
| | Duration (sec)          [ 30 v  ] | |
| | Turns per player          [ 1 v ] | |
| +-----------------------------------+ |
|                                       |
| +-----------------------------------+ |
| |Existing rooms                     | |
| +-----------------------------------+ |
| | HostParameters                  |^| |
| |                                 | | |
| |                                 |v| |
| +-----------------------------------+ |
+---------------------------------------+

*/

class TabooLobby extends Ui {
   constructor(div, notifications) {
      super(div);
      this.notifications = notifications;
      this.gname = "taboo";
      this.nw = new Network("NwTabooLobby", "lobby", this.onmessage);
      this.nw.cls_lobby = this;

      this.gid_to_row = {}; // Tracks rows across tables

      div.innerHTML = "";

      // Outer table
      this.outer_table = new Table(this.div, 2, 1);
      this.outer_table.cell_class(0, 0, "lobby_title head1");
      this.outer_table.cell_content_add(0, 0, create_span("Taboo Lobby"));

      // Host table
      this.host_table = new Table(this.outer_table.cell(1, 0), 0, 2, "width100");
      this.host_btn = create_button(this, "taboolobby_host_btn", "host", this.host_click, "text");
      this.host_table.add_row([
         create_span("Start a new room", "head2"),
         this.host_btn]);

      //Host parameter inputs
      this.num_teams = create_drop_down(this, "", [1, 2, 3, 4], 2, "text");
      this.duration = create_drop_down(this, "", [30, 60, 90, 120], 60, "text");
      this.num_turns = create_drop_down(this, "", [1, 2, 3, 4], 1, "text");

      // WordSet row
      var wordset_rowi = 1;
      this.host_table.add_row();
      this.host_table.cell(wordset_rowi, 0).appendChild(create_span("Word sets", "text"));

      this.word_sets = [];
      var word_set_choices = [
         ["test", "Test"],
      ];
      for (var choice of word_set_choices) {
         var ele_div = taboo_lobby_checkbox(this, choice[1], choice[0]);
         this.word_sets.push(ele_div[0]);
         this.host_table.cell(wordset_rowi, 1).appendChild(ele_div[1]);
      }

      this.host_table.add_row([
         create_span("Number of teams", "text"),
         this.num_teams]);

      this.host_table.add_row([
         create_span("Turn duration (seconds)", "text"),
         this.duration]);
      
      this.host_table.add_row([
         create_span("Number of turns per player", "text"),
         this.num_turns]);

      // Right align right column except the checkbox rows
      for (var i=0; i < 5; ++i) {
         this.host_table.cell_class(i, 1, "right");
      }
      for (var rowi of [wordset_rowi]) {
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

      var a = create_link("/taboo/" + gid,
                          create_span("Room #" + gid, "text"));

      var div = create_div(this, "", "taboolobby_room_row");
      div.appendChild(a);
      div.appendChild(create_span(" " + taboo_pretty_print_state(rcvd_status[0]["gameState"]),
                                  "text"));
      cell.appendChild(div);

      var host_params = rcvd_status[0]["hostParameters"];
      var client_count = rcvd_status[0]["clientCount"];

      // Show players by team
      for (var team_id=1; team_id <= host_params["numTeams"]; ++team_id) {
         var div = create_div(this, "")
         var msg = "Team " + team_id + ":";

         var plyr_idx = 0;
         for (var plyr in client_count["" + team_id]) {
            if (plyr_idx == 0) {
               msg += " ";
            } else {
               msg += ", ";
            }
            msg += plyr;
            plyr_idx++;
         }

         var cls = "text";
         if (rcvd_status[0]["winners"].indexOf(team_id) >= 0) {
            cls += " bold"; // winners appear in bold
         }
         div.appendChild(create_span(msg, cls));
         div.appendChild(create_line_break());
         cell.appendChild(div);
      }

      // Show wordsets
      function show_param(label, val) {
         var div = create_div(this, "")
         div.appendChild(create_span(label + ": " + val));
         div.appendChild(create_line_break());
         cell.appendChild(div);
      }

      show_param("Word sets", host_params["wordSets"].join(", "));
      show_param("Turn duration", host_params["turnDurationSec"] + " seconds");
      show_param("Number of turns per player", host_params["numTurns"]);
   }

   onmessage(jmsg) {
      // this = Network instance
      var lobby = this.cls_lobby;
      if (jmsg[0] == "GAME-STATUS") {
         // ["GAME-STATUS", <path:str>, 
         //   {"gameState": <str>,    WAITING_FOR_GAME_TO_START, WAITING_FOR_KICKOFF, TURN, GAME_OVER
         //    "clientCount": {teamId<int>:{plyrName<str>:clientCount<int>}},
         //    "hostParameters": <dict>,
         //    "winners": [winnerTeam<int>,winnerTeam<int>,...]
         //   }
         // ]
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
      var wordsets = [];
      for (var word_set of lobby.word_sets) {
         if (word_set.checked) {
            wordsets.push(word_set.taboo_value);
         }
      }

      var host_params = {
         "numTeams": Number(lobby.num_teams.value),
         "turnDurationSec": Number(lobby.duration.value),
         "wordSets": wordsets,
         "numTurns": Number(lobby.num_turns.value)
      };

      var msg = ["HOST", "taboo", host_params];
      lobby.nw.send(msg);
   }

  
}

