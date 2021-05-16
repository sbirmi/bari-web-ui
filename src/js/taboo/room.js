console.log("Loading taboo/room.js");

function obj_length(obj) {
   var count = 0;
   for (var i in obj) { count++; }
   return count;
}

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
   show() { this.ui.style.display = "table"; } // Unhide the widget
}

class TabooHostParamsBar extends TabooWidgetBase {
/**
 *  -------------------------------------------------------
 *  |    Alias [     ]  | Team [ Auto  v ] | [ Connect ]  |
 *  -------------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 1, 1, "taboo_host_params_bar width100");
      this.host_params = null;
   }

   process_host_parameters(tev) {
      if (this.host_params) {
         // receiving a duplicate message
         return;
      }
      this.host_params = tev;
      function param_span(lbl, val) {
         return create_span(lbl + ": " + val, "taboo_host_param text");
      }
      this.cell_content_add(0, 0, param_span("Word sets", tev.word_sets.join(", ")));
      this.cell_content_add(0, 0, param_span("Teams", tev.num_teams));
      this.cell_content_add(0, 0, param_span("Turn duration", tev.turn_duration_sec + " sec"));
      this.cell_content_add(0, 0, param_span("Turns per player", tev.num_turns));
   }
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

      this.my_alias = null;
      this.ready_players = [];

      this.hide();
   }

   ready_click(ev) {
      var ready_bar = ev.target.creator;
      ready_bar.nw.send(["READY"]);
      ready_bar.hide();
   }

   process_player_status(tev) {
      if (tev.ready && this.ready_players.indexOf(tev.alias) == -1) {
         this.ready_players.push(tev.alias);
      }
      if (tev.alias == this.my_alias && tev.ready) {
         this.hide();
      }
   }

   process_join_okay(tev) {
      if (this.game_started) { return; }
      this.my_alias = tev.alias;
      if (this.ready_players.indexOf(tev.alias) == -1) { // This player is not ready yet
         this.show();
         this.ready_btn.focus();
      }
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
 * |                [ START TURN ]                  |
 * |                                                |
 * --------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 1, 1, "taboo_wfk width100");

      this.start_turn_btn = create_button(this, "", "Start turn", this.start_turn_click, "head2");
      this.cell_class(0, 0, "center");
      this.cell_content_set(0, 0, this.start_turn_btn);

      this.game_over = false;
      this.recent_turnmsg_turn_id = 0;
      this.recent_wfkmsg_turn_id = 0;
      this.wfk_alias = null;
      this.my_alias = null;

      this.hide();
   }

   start_turn_click(ev) {
      var wfk = ev.target.creator;
      wfk.nw.send(["KICKOFF"]);
   }

   process_error(tev) {
      this.hide();
   }

   process_join_okay(tev) {
      this.my_alias = tev.alias;
      this.refresh();
   }

   process_turn(tev) {
      if (tev.turn_id < this.recent_turnmsg_turn_id) {
         return;
      }
      this.recent_turnmsg_turn_id = tev.turn_id;
      this.refresh();
   }

   process_wait_for_kickoff(tev) {
      if (tev.turn_id < this.recent_wfkmsg_turn_id) {
         return;
      }
      this.recent_wfkmsg_turn_id = tev.turn_id;
      this.wfk_alias = tev.alias;
      this.refresh();
   }

   process_game_over(tev) {
      this.game_over = true;
      this.refresh();
   }

   refresh() {
      if (!this.game_over &&
          this.recent_wfkmsg_turn_id > this.recent_turnmsg_turn_id &&
          this.my_alias == this.wfk_alias) {
         this.show();
      } else {
         this.hide();
      }
   }
}

class TabooTurnAndTeamsWidget extends TabooWidgetBase {
/*
 * ----------------------------------------------------
 * | <TurnWordWidget>      | <TeamWidget>             |
 * |                       |                          |
 * |                       |                          |
 * |                       |                          |
 * ----------------------------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 1, 2, "taboo_turn_team");
      this.cell_class(0, 0, "top left");
      this.cell_class(0, 1, "top right");
      this.cell(0, 0).style.width = "400px";
   }

   process_game_over() {
      this.hide();
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
      super(room, nw, parent_ui, 3, 1, "taboo_turn_word");

      this.cell_class(0, 0, "taboo_turn_word_timer_cell center");
      this.cell_class(1, 0, "taboo_turn_word_secret_cell center");
      this.cell_class(2, 0, "taboo_turn_word_disallowed_cell center top");

      this.last_tev = null;
      this.game_over = false;
   }

   process_game_over(tev) {
      this.game_over = true;
      this.hide();
   }

   timer_callback() {
      if (!this.last_tev || this.last_tev.state != "IN_PLAY") {
         return;
      }

      var now = new Date();
      var now_ts = (now.getTime() + now.getTimezoneOffset() * 60 * 1000) / 1000;

      var txt = "" + Math.floor((this.last_tev.utc_timeout - now_ts)*10)/10;
      this.cell_content_set(0, 0, create_span(txt, "taboo_turn_timer head2 center"));

      setTimeout(this.timer_callback.bind(this), 100);
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

      clear_contents(this.cell(1, 0));
      clear_contents(this.cell(2, 0));

      if (tev.state != "IN_PLAY") {      // Only show the word if it is in
         return;                          // play
      }

      setTimeout(this.timer_callback.bind(this), 100);

      var secret_display = tev.word_id + ".";
      if (tev.secret) {
         secret_display += " " + tev.secret;  // "1. <word>"

         for (var idx in tev.disallowed) {
            if (idx > 0) {
               this.cell_content_add(2, 0, create_line_break());
            }
            this.cell_content_add(2, 0,
               create_span(tev.disallowed[idx], "taboo_turn_word_disallowed head1 center"));
         }
      }
      this.cell_content_set(1, 0, create_span(secret_display, "taboo_turn_word_secret head1 center"));
      this.show();
   }

   process_wait_for_kickoff(tev) {
      this.hide();
   }
}

class TabooTeamsWidget extends TabooWidgetBase {
/*
 * -------------------------------
 * | Team 1  | Team 2  | Team 3  |
 * |         |         |         |
 * |         |         |         |
 * |         |         |         |
 * -------------------------------
 */
   constructor(room, nw, parent_ui) {
      super(room, nw, parent_ui, 0, 0, "taboo_teams width100");
      this.host_params = null;

      this.tev_by_team_id = {}; // latest tev by team-id
      this.player_status = {};  // name --> PlayerStatusTev

      this.div_by_player = {};
      this.max_team_members = 0;

      this.my_alias = null;

      this.current_turn_tev = null;
      this.current_wfk_tev = null;
   }

   process_join_okay(tev) {
      this.my_alias = tev.alias;
      this.refresh_alias(tev.alias);
   }

   process_wait_for_kickoff(tev) {
      if (this.current_wfk_tev && tev.turnId < this.current_wfk_tev.turn_id) {
         return;
      }
      this.current_wfk_tev = tev;
      this.refresh_alias(tev.alias);
   }

   process_team_status(tev) {
      if (tev.team_id in this.tev_by_team_id) {
         if (obj_length(tev.players) <= obj_length(this.tev_by_team_id[tev.team_id].players)) {
            return;
         }
      }
      this.tev_by_team_id[tev.team_id] = tev;

      this.max_team_members = Math.max(this.max_team_members, obj_length(tev.players));
      this.refresh();
   }

   process_host_parameters(tev) {
      if (this.host_params) {
         return;
      }
      this.host_params = tev;
      this.set_cols(tev.num_teams);

      this.refresh();
   }

   process_player_status(tev) {
      this.player_status[tev.alias] = tev;
      this.refresh_alias(tev.alias);
   }

   process_turn(tev) {
      // All the criteria to return early
      if (this.current_turn_tev &&
          (tev.turn_id < this.current_turn_tev.turn_id ||
           (tev.turn_id == this.current_turn_tev.turn_id &&
            (tev.word_id < this.current_turn_tev.word_id ||
             (tev.word_id == this.current_turn_tev.word_id &&
              (["COMPLETED", "DISCARDED", "TIMED_OUT"].indexOf(this.current_turn_tev.state) >=0)))))) {
         return;
      }

      // Found a new current turn tev
      var last_alias = this.current_turn_tev ? this.current_turn_tev.alias : null;
      this.current_turn_tev = tev;

      if (last_alias) {
         this.refresh_alias(last_alias);
      }

      this.refresh_alias(tev.alias);
   }

   refresh_alias(alias) {
      if (!this.host_params) { return; }

      var div = this.div_by_player[alias];
      if (!div) { return; }

      clear_contents(div);

      var classes = ["text taboo_team_player"];
      var player_status = (alias in this.player_status) ? this.player_status[alias] : null;

      // not ready => grey, ready => black
      if (player_status && player_status.ready) {
         classes.push("taboo_player_ready");
      } else {
         classes.push("taboo_player_not_ready");
      }

      // 0 connections means strike-through
      // > 1 connections means bold
      if (player_status && player_status.num_conns > 1) {
         classes.push("bold");
      } else if (!player_status || player_status.num_conns == 0) {
         classes.push("strike");
      }

      if (this.current_turn_tev && this.current_turn_tev.alias == alias &&
          this.current_turn_tev.state == "IN_PLAY") {
         classes.push("taboo_player_turn");
      } else if (this.current_wfk_tev && (!this.current_turn_tev || this.current_turn_tev.turn_id < this.current_wfk_tev.turn_id) && this.current_wfk_tev.alias == alias) {
         classes.push("taboo_player_wfk");
      }

      if (alias == this.my_alias) {
         classes.push("taboo_my_player");
      }

      div.appendChild(create_span(alias, classes.join(" ")));
   }

   refresh() { // null => refresh all; otherwise only refresh 1 player
      if (!this.host_params) { return; }

      var num_teams = this.host_params.num_teams;
      clear_contents(this.tbody);

      var headers = [];
      for (var i=1; i <= num_teams; ++i) {
         headers.push(create_span("Team " + i, "text"));
      }

      this.add_row(headers);
      for (var i=0; i < num_teams; ++i) {
         this.cell_class(0, i, "taboo_team_header");
      }

      this.div_by_player = {};

      for (var rowi=0; rowi < this.max_team_members; ++rowi) {
         var row_contents = Array(num_teams);

         var row_aliases = [];

         for (var i=0; i < num_teams; ++i) {
            var teamidx = i + 1;

            if (teamidx in this.tev_by_team_id &&
                rowi < this.tev_by_team_id[teamidx].players.length) {

               row_contents[i] = create_div(this, "", "");

               var alias = this.tev_by_team_id[teamidx].players[rowi];
               row_aliases.push(alias);

               this.div_by_player[alias] = row_contents[i];
            } else {
               row_contents[i] = create_span("");
            }
         }
         this.add_row(row_contents);

         for (var alias of row_aliases) {
            this.refresh_alias(alias);
         }
      }
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

      this.add_widget(new TabooHostParamsBar(this, this.nw, this.div));
      this.add_widget(this.login_bar = new TabooLoginBar(this, this.nw, this.div));
      this.add_widget(this.ready_bar = new TabooReadyBar(this, this.nw, this.div));

      this.add_widget(new TabooWaitForKickoff(this, this.nw, this.div));

      var turn_and_team_widget = new TabooTurnAndTeamsWidget(this, this.nw, this.div);
      this.add_widget(turn_and_team_widget);
      this.add_widget(new TabooTurnWordWidget(this, this.nw, turn_and_team_widget.cell(0, 0)));
      this.add_widget(new TabooTeamsWidget(this, this.nw, turn_and_team_widget.cell(0, 1)));
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
