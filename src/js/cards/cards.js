console.log("Loading cards/cards.js");

function card_pos_offset(attr_val) {
   if (attr_val) {
      return Number(attr_val.replace("px", ""));
   }
   return 0;
}

/**
 * Card theme
 *
 * Provides URL to images used for cards
 */
class CardThemeBase {
   constructor(base_dir, ext, cls) {
      this.base_dir = base_dir;
      this.ext = ext;
      this.cls = cls;
   }
   url(suit, rank) {
      var u = this.base_dir;
      if (suit == "JOKER") {
         u += "JOKER" + this.ext;
      } else {
         u += suit + rank + this.ext;
      }
      return u;
   }
   face_down_url() {
      var u = this.base_dir + "back" + this.ext;
      return u;
   }
}

class CardTheme extends CardThemeBase {
   constructor() {
      super("/assets/cards/", ".png", "card_big");
   }
}

class SmallCardTheme extends CardThemeBase {
   constructor() {
      super("/assets/cards_small/", ".png", "card_small");
   }
}

/**
 * Card
 *
 * Provides an image of a card (can be face up or face down).
 * The card is non-clickable by default. See set_click_action.
 */
class Card {
   card_shift = 33;
   card_themes = [new CardTheme(), new SmallCardTheme()];

   constructor(parent_ui, suit, rank,
               face_down=false,
               c_theme=0) {
      this.parent_ui = parent_ui;
      this.suit = suit;
      this.rank = rank;
      this.face_down = face_down;
      this.selected = false;
      this.card_theme = this.card_themes[c_theme];

      this.click_action = null;
      this.cb = null;

      this.ui = create_img(this, "", this.card_theme.cls);
      this.parent_ui.appendChild(this.ui);

      this.update_ui();
   }
   shift_up(amt) {
      var cur_offset = card_pos_offset(this.ui.style.top);
      this.ui.style.top = (cur_offset - amt) + "px";
   }
   shift_left(amt) {
      var cur_offset = card_pos_offset(this.ui.style.left);
      this.ui.style.left = (cur_offset - amt) + "px";
   }
   /**
    * The card is non-clickable by default.
    *
    * @param action:
    *    null => non-clickable
    *    "flip" => flip the card
    *    "slide_up" => move the card up when selected
    *    "slide_left" => raise the card up when selected
    *
    * @param cb: An optional callback (which accepts
    * card) can be provided
    */
   set_click_action(action, cb=null) {
      this.click_action = action;
      this.cb = cb;

      if (action == null) {
         this.ui.onclick = function(ev) {
            if (card.cb) { card.cb(card); }
         }

      } else if (action == "flip") {
         this.ui.onclick = function(ev) {
            var card = ev.target.creator;
            card.set_face_down(!card.face_down);

            if (card.cb) { card.cb(card); }
         }

      } else if (action == "slide_up") {
         this.ui.onclick = function(ev) {
            var card = ev.target.creator;
            card.set_selected(!card.selected);

            if (card.selected) {
               card.shift_up(card.card_shift);
            } else {
               card.shift_up(-1 * card.card_shift);
            }

            if (card.cb) { card.cb(card); }
         }

      } else if (action == "slide_left") {
         this.ui.onclick = function(ev) {
            var card = ev.target.creator;
            console.log(card);
            card.set_selected(!card.selected);

            if (card.selected) {
               card.shift_left(card.card_shift);
            } else {
               card.shift_left(-1 * card.card_shift);
            }

            if (card.cb) { card.cb(card); }
         }
      }
   }
   set_selected(val) {
      this.selected = val;
   }
   set_face_down(val) {
      this.face_down = val;
      this.update_ui();
   }
   set_card(suit, rank) {
      this.suit = suit;
      this.rank = rank;
      this.update_ui();
   }
   update_ui() {
      var url;
      if (this.face_down) {
         url = this.card_theme.face_down_url();
      } else {
         url = this.card_theme.url(this.suit, this.rank);
      }
      this.ui.src = url;
   }
}


class CardRack {
   constructor(parent_ui, id, shift_x=0, shift_y=0) {
      this.parent_ui = parent_ui;
      this.ui = create_div(this, id, "card_rack");
      this.cards = [];
      this.shift_x = shift_x;
      this.shift_y = shift_y;

      this.parent_ui.appendChild(this.ui);
   }
   count() {
      return this.cards.length;
   }
   append_cards(cards) {
      for (var card of cards) {
         this.append_card(card);
      }
   }
   append_card(card) {
      if (this.cards.length == 0) {
         card.ui.classList.add("card_rack_first");
      }  else {
         card.ui.classList.add("card_rack_remaining");
      }
      this.ui.appendChild(card.ui);
      card.shift_left(-1 * this.shift_x * this.cards.length);
      card.shift_up(this.shift_y * this.cards.length);
      this.cards.push(card);
   }
   card(idx) {
      return this.cards[idx];
   }
   remove_tail_cards(count) {
      var excess = this.cards.length - count;
      for (var i=0; i < excess; i++) {
         var card = this.cards.pop();
         card.ui.remove();
      }
   }
   clear() {
      while (this.cards.length) {
         var card = this.cards.pop();
         card.ui.remove();
      }
   }
   selected_cards() {
      var res = [];
      for (var card of this.cards) {
         if (card.selected) {
            res.push(card);
         }
      }
      return res;
   }
   selected_cards_jmsg() {
      var res = [];
      for (var card of this.selected_cards()) {
         res.push([card.suit, card.rank]);
      }
      return res;
   }
   update_ui() {
   }
}

class CardFaceDownDeck extends CardRack {
   constructor(parent_ui, id, card_count, clickable_count) {
      super(parent_ui, id, -2, 1);
      this.parent_ui = parent_ui;
      this.card_count = card_count;
      this.clickable_count = clickable_count;
      this.update_ui();
   }
   set_card_count(count) {
      this.card_count = count;
      this.update_ui();
   }
   selected_cards_count() {
      var count = 0;
      for (var card of this.cards) {
         if (card.selected) { count++; }
      }
      return count;
   }
   update_ui() {
      this.clear();
      for (var i=0; i<this.card_count; i++) {
         var card = new Card(this.ui, 0, 0, true);
         // card.ui.style.zIndex = this.card_count - i;
         if (i >= this.card_count - this.clickable_count) {
            card.set_click_action("slide_up");
         }
         this.append_card(card);
      }
   }
}
