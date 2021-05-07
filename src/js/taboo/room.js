console.log("Loading taboo/room.js");

/**
 * Each Widget is fundamentally a table (it could be a table of size 1 x 1
 * and we can add more rows and columns to it
 *
 * cls = CSS class name
 */
class TabooWidgetBase extends Table {
   constructor(room, nw, parent_ui,
               num_rows=1, num_cols=1, cls="") {
      super(parent_ui, num_rows, num_cols, cls);
      this.room = room;
      this.nw = nw;
   }

   hide() { this.ui.style.display = "none"; } // Hide the widget
   show() { this.ui.style.display = "block"; } // Unhide the widget
}

class TabooLoginBar extends TabooWidgetBase {
/**
 *  -------------------------------------------------------
 *  |    Alias [     ]  | Team [ Auto  v]  | [ Connect ]  |
 *  -------------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 1, 3);
   }
}

class TabooRoom extends Ui {
   constructor(gid, div) {
      super(div);
      this.gid = gid;

      this.nw = new Network("NwTaboo:" + gid, "taboo:" + gid,
                            this.onmessage,
                            this.onclose,
                            this.onopen);
      this.nw.room = this;
      this.game_over = false;

      this.init_display();
   }

   init_display() {
      // Create other widgets here
      // Each widget takes pointer to
      // 1. "this" (the room object)
      // 2. "this.nw" (the network object to send messages)
      // 3. "this.div" (where to insert their widgets into)
   }

   // Message handling ----------------------------------------------

   onmessage(jmsg) {
      var room = this.room; // this => the network object

      console.log(jmsg);
   }

   // Other socket events -------------------------------------------

   // WebSocket disconnected
   onclose(ev) {
      var room = this.room;  // this => the network object

   }

   // WebSocket connected
   onopen(ev) {
      var room = this.room; // this => the network object
   }
}
