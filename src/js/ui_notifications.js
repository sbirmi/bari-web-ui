console.log("Loading ui_notifications.js");

class UiNotifications extends Table {
   constructor(parent_ui, timeout_ms=2500, cls="") {
      super(parent_ui, 0, 1, cls);
      this.timeout_ms = timeout_ms;
      window.rows = [];
   }
   timeout_cb(ev) {
      var row = window.ui_rows.pop();
      row.remove();
   }
   add_msg(objMsg, cls="") {
      var row = this.add_row([objMsg]);
      row.timer = window.setTimeout(this.timeout_cb, this.timeout_ms);
      if (window.ui_rows == undefined) {
         window.ui_rows = [];
      }
      if (cls) {
         row.childNodes[0].className = cls;
      }
      window.ui_rows.push(row);
      window.rows = [];
   }
}
