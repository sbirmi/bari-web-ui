console.log("Loading chat/game.js");

class ChatRoom extends Ui {
   constructor(gid, div) {
      super(div);
      this.gid = gid;
      this.nw = new Network("NwChat:" + gid, "chat:" + gid, this.onmessage);
      this.nw.cls_room = this;

      div.innerHTML = "";

/*

   +-Outer---------------------------------------------------------+
   | +-Messages--------+---------------------------------------+ |^|
   | |       |         |                                       | | |
   | |---------------------------------------------------------| | |
   | |       |         |                                       | | |
   | |---------------------------------------------------------| | |
   | |       |         |                                       | | |
   | |---------------------------------------------------------| | |
   | |       |         |                                       | | |
   | +---------------------------------------------------------+ |v|
   +---------------------------------------------------------------+
   + +-Send------------------------------------------------------+ +
   | | [                                            ] | [ SEND ] | |
   + +-----------------------------------------------------------+ +
   +---------------------------------------------------------------+

*/
      this.outer_table = new Table(this.div, 2, 1, "chat_outer_table");
      this.outer_table.cell_class(0, 0, "chat_outer_table_r0");
      this.outer_table.cell_class(1, 0, "chat_outer_table_r1");

      this.messages_table = new Table(this.outer_table.cell(0, 0), 0, 2);

      this.send_table = new Table(this.outer_table.cell(1, 0), 1, 2);

      this.send_input = create_input_text(this, "chat_send_text_" + gid);
      this.send_btn = create_button(this, "chat_send_btn_" + gid, "send", this.send_click);

      this.send_table.cell_content_add(0, 0, this.send_input);
      this.send_table.cell_content_add(0, 1, this.send_btn);
   }
   onmessage(jmsg) {
      // this = Network instance
      var now = new Date();
      this.cls_room.messages_table.add_row([
         create_span(now + ""),
         create_span(jmsg[0])])
   }
   send_click(ev) {
      var chatroom = ev.target.creator;
      var msg = chatroom.send_input.value;
      chatroom.nw.send([msg]);
      chatroom.send_input.value = "";
      chatroom.send_input.focus();
   }
}
