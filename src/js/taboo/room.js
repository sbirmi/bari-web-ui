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
 *  |    Alias [     ]  | Team [ Auto  v ] | [ Connect ]  |
 *  -------------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 1, 3, "taboo_login_bar width100");

      this.host_params_processed = false;

      this.alias = create_input_text(this, "", "taboo_login_bar_alias text");
      this.team = create_drop_down(this, "", ["Auto"], "Auto", "text");
      this.connect_btn = create_button(this, "", "Connect",
                                       this.connect_click,
                                       "text");

      this.cell_class(0, 0, "taboo_login_bar_alias_cell right");
      this.cell_content_add(0, 0, create_span("Alias", "taboo_login_bar_text text"));
      this.cell_content_add(0, 0, this.alias);

      this.cell_class(0, 1, "taboo_login_bar_team_cell center");
      this.cell_content_add(0, 1, create_span("Team", "taboo_login_bar_text text"));
      this.cell_content_add(0, 1, this.team);

      this.cell_class(0, 2, "taboo_login_bar_btn_cell");
      this.cell_content_add(0, 2, this.connect_btn);

      this.alias.focus();
   }

   connect_click(ev) {
      var login_bar = ev ? ev.target.creator : this;

      var team = Number(login_bar.team.value);
      if (isNaN(team)) { // team must have been "Any"
         team = 0;
      }
      login_bar.nw.send(["JOIN", login_bar.alias.value, team]);
      login_bar.hide();
   }

   updateHostParameters() {
      if (this.host_params_processed) { return; } // Don't process twice

      for (var i=1; i <= this.room.host_parameters["numTeams"]; ++i) {
         var option = document.createElement("option");
         option.value = i;
         option.text = i;
         this.team.appendChild(option);
      }

      this.host_params_processed = true;
   }
}

class TabooReadyBar extends TabooWidgetBase {
/*
 *  -------------------------------------------------------
 *  |                     [ Ready ]                       |
 *  -------------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 1, 1, "taboo_ready_bar width100");

      this.ready_btn = create_button(this, "", "Ready", this.ready_click, "text");
      this.cell_content_set(0, 0, this.ready_btn);
      this.cell_class(0, 0, "center");
   }

   ready_click(ev) {
      var ready_bar = ev.target.creator;
      ready_bar.nw.send(["READY"]);
   }

}

class TabooRoom extends Ui {
   constructor(gid, div) {
      super(div);
      this.ui_notifications = new UiNotifications(this.div, 3000, "taboo_notifications_table");
      this.gid = gid;

      this.nw = new Network("NwTaboo:" + gid, "taboo:" + gid,
                            this.onmessage,
                            this.onclose,
                            this.onopen);
      this.nw.room = this;

      this.host_parameters = null;
      this.game_over = false;

      this.init_display();
   }

   init_display() {
      // Create other widgets here

      this.login_bar = new TabooLoginBar(this, this.nw, this.div);
      this.ready_bar = new TabooReadyBar(this, this.nw, this.div);
      this.ready_bar.hide();
   }

   // UI helpers ----------------------------------------------------

   show_error_msg(msg) {
      var obj = create_span(msg, "head2");
      this.ui_notifications.add_msg(obj, "taboo_notification_error");
   }

   show_info_msg(msg) {
      var obj = create_span(msg, "head2");
      this.ui_notifications.add_msg(obj, "taboo_notification_info");
   }

   // Message handling ----------------------------------------------

   onmessage(jmsg) {
      var room = this.room; // this => the network object

      if (jmsg[0] == "HOST-PARAMETERS") {
         // ["HOST-PARAMETERS", {"numTeams": 1, "turnDurationSec": 30, "wordSets": ["test"], "numTurns": 1}]
         room.host_parameters = jmsg[1];
         room.login_bar.updateHostParameters();
         return;
      }

      if (jmsg[0] == "JOIN-BAD") {
         room.show_error_msg(jmsg[1]);
         room.login_bar.show();
         room.login_bar.alias.focus();
      }

      if (jmsg[0] == "JOIN-OKAY") {
         room.show_info_msg("Joined as " + jmsg[1] + " in team " + jmsg[2]);
         room.ready_bar.show();
         room.ready_bar.ready_btn.focus();
      }

      if (jmsg[0] == "READY-BAD") {
         room.show_error_msg(jmsg[1]);
         room.ready_bar.hide();
      }
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
