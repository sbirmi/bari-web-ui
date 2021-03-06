console.log("Loading taboo/events.js");

// Events based on messages -----------------------------------------

class TabooEvent {
   constructor(handler_name, jmsg) {
      this.handler_name = handler_name;
   }
}

class TabooHostParametersEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_host_parameters", jmsg);
      this.num_teams = jmsg[1]['numTeams'];
      this.turn_duration_sec = jmsg[1]['turnDurationSec'];
      this.word_sets = jmsg[1]['wordSets'];
      this.num_turns = jmsg[1]['numTurns'];
   }
}

class TabooTeamStatusEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_team_status", jmsg);
      this.team_id = jmsg[1];
      this.players = jmsg[2];
   }
}

class TabooPlayerStatusEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_player_status", jmsg);
      this.alias = jmsg[1];
      this.num_conns = jmsg[2]["numConns"];
      this.ready = jmsg[2]["ready"];
      this.turns_played = jmsg[2]["turnsPlayed"];
   }
}

class TabooJoinBadEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_join_bad", jmsg);
      this.reason = jmsg[1];
   }
}

class TabooJoinOkayEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_join_okay", jmsg);
      this.alias = jmsg[1];
      this.team_id = jmsg[2];
   }
}

class TabooReadyBadEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_ready_bad", jmsg);
      this.reason = jmsg[1];
   }
}

class TabooWaitForKickoffEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_wait_for_kickoff", jmsg);
      this.turn_id = jmsg[1];
      this.alias = jmsg[2];
   }
}

class TabooTurnEvent extends TabooEvent {
   // ["TURN",
   //  turn<int>,
   //  wordIdx<int>,
   //  {"team": <int>,
   //   "player": <str>,
   //   "utcTimeout": <str>,
   //   "secret": <str>,
   //   "disallowed": [<str1>, ...],
   //   "state": COMPLETED | TIMED_OUT | DISCARDED,
   //   "score": [teamId1, teamId2, ...],
   //  }
   // ]
   constructor(jmsg) {
      super("process_turn", jmsg);
      this.turn_id = jmsg[1];
      this.word_id = jmsg[2];
      this.team_id = jmsg[3]['team'];
      this.alias = jmsg[3]['player'];
      this.utc_timeout = jmsg[3]['utcTimeout'];
      this.secret = jmsg[3]['secret'];
      this.disallowed = jmsg[3]['disallowed'];
      this.state = jmsg[3]['state'];
      this.score = jmsg[3]['score'];
   }
}

class TabooGameOverEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_game_over", jmsg);
   }
}

class TabooScoreEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_score", jmsg);
      this.score = jmsg[1];
   }
}

class TabooErrorEvent extends TabooEvent {
   constructor(jmsg) {
      super("process_error", jmsg);
      this.reason = jmsg[1];
   }
}

// Register events --------------------------------------------------

var taboo_type_events = [
   ["HOST-PARAMETERS", TabooHostParametersEvent],
   ["JOIN-BAD", TabooJoinBadEvent],
   ["JOIN-OKAY", TabooJoinOkayEvent],
   ["READY-BAD", TabooReadyBadEvent],
   ["WAIT-FOR-KICKOFF", TabooWaitForKickoffEvent],
   ["TURN", TabooTurnEvent],
   ["GAME-OVER", TabooGameOverEvent],
   ["ERROR", TabooErrorEvent],
   ["TEAM-STATUS", TabooTeamStatusEvent],
   ["PLAYER-STATUS", TabooPlayerStatusEvent],
   ["SCORE", TabooScoreEvent],
];

function taboo_get_event(jmsg) {
   for (var type_event of taboo_type_events) {
      if (type_event[0] == jmsg[0]) {
         return new type_event[1](jmsg);
      }
   }
   console.log("Unhandled message type: " + jmsg[0]);
   console.log(jmsg);
   return null;
}
