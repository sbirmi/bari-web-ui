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

      this.host_params_event = null;
      this.game_over = false;

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

   process_error(tev) {
      this.hide();
   }

   process_host_parameters(tev) {
      if (this.host_params_event) { return; } // Don't process twice

      this.host_params_event = tev;

      for (var i=1; i <= tev.num_teams; ++i) {
         var option = document.createElement("option");
         option.value = i;
         option.text = i;
         this.team.appendChild(option);
      }
   }

   process_join_bad(tev) {
      this.room.show_error_msg(tev.reason);
      this.show();
      this.alias.focus();
   }

   process_join_okay(tev) {
      this.room.show_info_msg("Joined as " + tev.alias + " in team " + tev.team_id);
      this.hide();
   }

   process_game_over(tev) {
      this.game_over = true;
      this.hide();
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
}

class TabooReadyBar extends TabooWidgetBase {
/*
 *  -------------------------------------------------------
 *  |                     [ Ready ]                       |
 *  -------------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 1, 1, "taboo_ready_bar width100");

      this.game_started = false;

      this.ready_btn = create_button(this, "", "Ready", this.ready_click, "text");
      this.cell_content_set(0, 0, this.ready_btn);
      this.cell_class(0, 0, "center");

      this.hide();
   }

   ready_click(ev) {
      var ready_bar = ev.target.creator;
      ready_bar.nw.send(["READY"]);
      ready_bar.hide();
   }

   process_join_okay(tev) {
      if (this.game_started) { return; }
      this.show();
      this.ready_btn.focus();
   }

   process_error(tev) {
      this.hide();
   }

   process_ready_bad(tev) {
      this.room.show_error_msg(tev.reason);
      this.hide();
   }

   process_turn(tev) {
      this.game_started = true;
      this.hide();
   }

   process_game_over(tev) {
      this.hide();
   }
}

class TabooWaitForKickoff extends TabooWidgetBase {
/*
 * --------------------------------------------------
 * |                                                |
 * |           Waiting for <player-name>            |
 * |                                                |
 * --------------------------------------------------
 *
 * or
 *
 * --------------------------------------------------
 * |                                                |
 * |                [ START TURN ]                  |
 * |                                                |
 * --------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 1, 1, "taboo_wfk width100");

      this.start_turn_btn = create_button(this, "", "Start turn", this.start_turn_click, "head2");

      this.turn_id = null;
      this.alias = null;
      this.game_over = false;

      this.cell_class(0, 0, "center");
   }

   start_turn_click(ev) {
      var wfk = ev.target.creator;
      wfk.nw.send(["KICKOFF"]);
   }

   process_error(tev) {
      this.hide();
   }

   process_turn(tev) {
      this.hide();
   }

   process_join_okay(tev) {
      this.refresh();
   }

   process_game_over(tev) {
      this.game_over = true;
      this.hide();
   }

   process_wait_for_kickoff(tev) {
      this.update_alias(tev.turn_id, tev.alias);
   }

   update_alias(turn_id, alias) {
      if (this.game_over) {
         return;
      }

      this.turn_id = turn_id;
      this.alias = alias;

      this.show();
      this.room.turn_word_widget.hide();

      this.refresh();
   }

   refresh() {
      if (!this.alias) { return; }

      if (this.alias == this.room.login_bar.alias.value) {
         // My turn
         this.cell_content_set(0, 0, this.start_turn_btn);
      } else {
         // Someone else's turn
         this.cell_content_set(0, 0, create_span("Wait for " + this.alias, "head1"));
      }
   }
}

class TabooTurnWordWidget extends TabooWidgetBase {
/*
 * --------------------------------------------------
 * |           <wordId>  Main word                  |
 * --------------------------------------------------
 * |              Disallowed word 1                 |
 * |              Disallowed word 2                 |
 * |              Disallowed word 3                 |
 * --------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 2, 1, "taboo_turn_word width100");

      this.cell_class(0, 0, "taboo_turn_word_secret_cell center");
      this.cell_class(1, 0, "taboo_turn_word_disallowed_cell center top");

      this.last_tev = null;
      this.game_over = false;
   }

   process_game_over(tev) {
      this.game_over = true;
      this.hide();
   }

   process_turn(tev) {
      if (this.game_over) {
         return;
      }

      if (this.last_tev &&                           // Some word has been received already
          (tev.turn_id < this.last_tev.turn_id ||    // Older turn ID
           (tev.turn_id == this.last_tev.turn_id &&  // Same turn but older
            tev.word_id < this.last_tev.word_id))) { //   word ID
         // Receiving messages out of order. Ignore older message
         return;
      }

      this.last_tev = tev;

      clear_contents(this.cell(0, 0));
      clear_contents(this.cell(1, 0));

      if (tev.state != "IN_PLAY") {      // Only show the word if it is in
         return;                          // play
      }

      var secret_display = tev.word_id + ".";
      if (tev.secret) {
         secret_display += " " + tev.secret;  // "1. <word>"

         for (var idx in tev.disallowed) {
            if (idx > 0) {
               this.cell_content_add(1, 0, create_line_break());
            }
            this.cell_content_add(1, 0,
               create_span(tev.disallowed[idx], "taboo_turn_word_disallowed head1"));
         }
      }
      this.cell_content_set(0, 0, create_span(secret_display, "taboo_turn_word_secret head1"));
      this.show();
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

      this.widgets = [this];

      this.init_display();
   }

   add_widget(widget) {
      this.widgets.push(widget);
   }

   init_display() {
      // Create other widgets here

      this.add_widget(this.login_bar = new TabooLoginBar(this, this.nw, this.div));
      this.add_widget(this.ready_bar = new TabooReadyBar(this, this.nw, this.div));

      this.add_widget(this.wfk = new TabooWaitForKickoff(this, this.nw, this.div));

      this.add_widget(this.turn_word_widget = new TabooTurnWordWidget(this, this.nw, this.div));
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
      var room = this.room || this; // this => the network object if called on
                                    // receiving a message. If invoked manually,
                                    // it is this class instance

      var taboo_ev = taboo_get_event(jmsg);

      if (taboo_ev == null) { return; }

      for (var widget of room.widgets) {
         if (taboo_ev.handler_name in widget) {
            widget[taboo_ev.handler_name](taboo_ev);
         }
      }
   }

   process_error(tev) {
      this.show_error_msg("Room not created yet");
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
