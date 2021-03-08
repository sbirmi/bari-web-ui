console.log("Loading lobby.js");

class Lobby {
   constructor(ui) {
      this.ui = ui;
      this.ui.cls_lobby = this;
      this.nw = new Network("NwLobby", "lobby", this.on_nw_msg, this.on_nw_close, this.on_nw_open);
   }
   send(obj) {
      console.log(this.nw);
      this.nw.send(obj);
   }
   on_nw_msg() {
   }
   on_nw_close() {
   }
   on_nw_open() {
      this.send(["HOST", "chat"]);
   }
}
