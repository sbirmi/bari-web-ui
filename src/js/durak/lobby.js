console.log("Loading durak/lobby.js");

class DurakLobby extends Ui {
   constructor(div, notifications) {
      super(div);
      this.notifications = notifications;
      this.gname = "durak";
      this.nw = new Network("NwDurakLobby", "lobby", this.onmessage);
      this.nw.cls_lobby = this;

      this.gid_to_row = {}; // Tracks rows across tables

      div.innerHTML = "";

      // Outer table
      this.outer_table = new Table(this.div, 2, 1);
      this.outer_table.cell_class(0, 0, "lobby_title head1");
      this.outer_table.cell_content_add(0, 0, create_span("Durak Lobby &nbsp; "));
      this.outer_table.cell_content_add(0, 0,
         create_link("/durak/help.html", create_span("[help]", "text"), true));

      // Host table
      this.host_table = new Table(this.outer_table.cell(1, 0), 0, 2, "width100");
      this.host_btn = create_button(this, "durak_lobby_host_btn", "Host", this.host_click, "text");
      this.player_count = create_drop_down(this, "durak_lobby_player_count",
         [2, 3, 4, 5, 6, 7, 8, 9, 10], 2, "text");
      this.game_end_points = create_drop_down(this, "durak_lobby_game_end_points",
         [3, 5, 10, 15, 20], 5, "text");

      this.host_table.add_row([
         create_span("Start a new room", "head2"),
         this.host_btn]);

      this.host_table.add_row([
         create_span("Players", "text"),
         this.player_count]);
      this.host_table.add_row([
         create_span("Stop points", "text"),
         this.game_end_points]);

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

      var a = create_link("/durak/" + gid,
                         create_span("Room #" + gid, "text"));

      var div = create_div(this, "", "durak_lobby_room_row");
      div.appendChild(a);
      cell.appendChild(div);
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
      var msg = ["HOST", "durak",
         Object({
            "numPlayers": Number(lobby.player_count.value),
            "stopPoints": Number(lobby.game_end_points.value)}),
      ];
      lobby.nw.send(msg);
   }
}
