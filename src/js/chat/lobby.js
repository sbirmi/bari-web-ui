console.log("Loading chat/lobby.js");

/**
 * The file provides UI code for hosting new chat rooms +
 * listing existing chat rooms.
 */

/*

+-Outer---------------------------------+
| Title                                 |
+---------------------------------------+
| +-Host-------------------+----------+ |
| | Start a new room       | [ HOST ] | |
| +------------------------+----------+ |
|                                       |
| +-Existing--------------------------+ |
| |Existing rooms                     | |
| +-----------------------------------+ |
| | chat:30 - 5 clients             |^| |
| | chat:29 - 3 clients             | | |
| | chat:28 - 4 clients             |v| |
| +-----------------------------------+ |
+---------------------------------------+

 */

class ChatLobby extends Ui {
   constructor(div) {
      super(div);
      this.gname = "chat";
      this.nw = new Network("NwChatLobby", "lobby", this.onmessage);
      this.nw.cls_lobby = this;

      this.gid_to_row = {};

      div.innerHTML = "";

      // Outer table
      this.outer_table = new Table(this.div, 2, 1);
      this.outer_table.cell_class(0, 0, "chatlobby_title head1");
      this.outer_table.cell_content_add(0, 0, create_span("Chat Lobby"));

      // Host table
      this.host_table = new Table(this.outer_table.cell(1, 0), 1, 2, "width100");
      this.host_table.cell_content_add(0, 0, create_span("Start a new room", "head2"));
      this.host_table.cell_class(0, 1, "right");
      this.host_btn = create_button(this, "chatlobby_host_btn", "host", this.host_click, "text");
      this.host_table.cell_content_add(0, 1, this.host_btn);


      // Existing rooms
      this.existing_table = new Table(this.outer_table.cell(1, 0), 1, 1);
      this.existing_table.cell_content_add(0, 0, create_span("Existing rooms", "head2"));
   }
   update_row(row, gid, rcvd_status) {
      // row already has 1 cell. clear contents and add new status
      var cell = row.childNodes[0];
      clear_contents(cell);

      var a = create_link("/chat/" + gid, create_span("Chat:" + gid, "text"), true);
      cell.appendChild(a);
      cell.appendChild(create_span(" (" + rcvd_status["clients"] + " clients)", "text"));
   }
   onmessage(obj) {
      // this = Network instance
      var lobby = this.cls_lobby;
      if (obj[0] == "GAME-STATUS") {
         if (obj[1].startsWith(lobby.gname + ":")) {
            var gid = Number(obj[1].split(/:/)[ 1 ]);
            if (gid in lobby.gid_to_row) {
               // Update existing row
               var row = lobby.gid_to_row[gid];
            } else {
               // Add a new row
               var row = lobby.existing_table.add_row(null, 1);
               lobby.gid_to_row[gid] = row;
            }
            lobby.update_row(row, gid, obj[2]);
         }
      } else {
         console.log("UNHANDLED MESSAGE");
         console.log(obj);
      }
   }
   host_click(ev) {
      var lobby = ev.target.creator;
      var msg = ["HOST", "chat"];
      lobby.nw.send(msg);
   }
}

