console.log("Loading ui.js");

class Ui {
   constructor(div) {
      this.name = div.id;
      this.div = div;
      div.cls_ui = this;
   }
}

// Helpers

function set_title(txt) {
   document.title = txt;
}

function clear_contents(ele) {
   while (ele.firstChild) {
      ele.removeChild(ele.firstChild);
   }
}

function create_checkbox(creator, id, checked=false) {
   var ele = document.createElement("input");
   ele.type = "checkbox";
   ele.creator = creator;
   ele.checked = checked;
   ele.id = id;
   return ele;
}

function create_line_break() {
   return document.createElement("br");
}

function create_button(creator, id, value, clickcb="", cls="") {
   // How is onclick registered?
   var ele = document.createElement("input");
   ele.type = "button";
   ele.creator = creator;
   ele.id = id;
   ele.value = value;
   ele.onclick = clickcb;
   if (cls) { ele.className = cls; }
   return ele;
}

function create_div(creator, id, cls=null) {
   var ele = document.createElement("div");
   ele.creator = creator;
   if (cls) { ele.className = cls; }
   return ele;
}

function create_drop_down(creator, id, values, def_value, cls="") {
   var ele = document.createElement("select");
   ele.creator = creator;
   ele.id = id;

   for (const val of values) {
      var option = document.createElement("option");
      option.value = val;
      option.text = val;
      ele.appendChild(option);
   }

   if (def_value != null) {
      ele.value = def_value;
   }

   if (cls) { ele.className = cls; }
   return ele;
}

function create_img(creator, src, cls="") {
   var ele = document.createElement("img");
   ele.creator = creator;
   ele.src = src;

   if (cls) { ele.className = cls; }
   return ele;
}

function create_input_password(creator, id, cls="") {
   var ele = document.createElement("input");
   ele.creator = creator;
   ele.id = id;
   ele.type = "password";

   if (cls) { ele.className = cls; }
   return ele;
}

function create_input_text(creator, id, cls="") {
   var ele = document.createElement("input");
   ele.creator = creator;
   ele.id = id;

   if (cls) { ele.className = cls; }
   return ele;
}

function create_link(link, body, blank=false) {
   var ele = document.createElement("a");
   ele.href = link;
   ele.appendChild(body);
   if (blank) {
      ele.target = "_blank";
   }
   return ele;
}

function create_span(txt_or_ele, cls=null) {
   var ele = document.createElement("span");
   if (typeof txt_or_ele === "string") {
      ele.innerHTML = txt_or_ele;
   } else {
      ele.appendChild(txt_or_ele);
   }
   if (cls) { ele.className = cls; }
   return ele;
}

// helper methods

class Table {
   /*
    */
   constructor(parent_ui, num_rows=1, num_cols=1, cls="") {
      this.parent_ui = parent_ui;
      this.num_rows = num_rows;
      this.num_cols = num_cols;

      this.ui = document.createElement("table");
      this.ui.className = cls;

      this.tbody = document.createElement("tbody");

      for (var r=0; r < num_rows; ++r) {
         this.add_row();
      }

      this.ui.appendChild(this.tbody);

      if (cls) {
         this.ui.className = cls;
      }

      parent_ui.appendChild(this.ui);
   }

   // Delayed column setting
   set_cols(num_cols) {
      if (this.num_cols == 0) {
         this.num_cols = num_cols;
         return true;
      }
      return false;
   }

   // Accessors
   row(rowi) {
      if (rowi < 0 || rowi >= this.tbody.childElementCount) { return null; }
      return this.tbody.childNodes[rowi];
   }

   cell(rowi, coli) {
      var row = this.row(rowi);
      if (!row) { return null; }

      if (coli < 0 || coli >= row.childElementCount) { return null; }

      return row.childNodes[coli];
   }

   // Mutators
   add_row(data, pos=null) {
      // data is an array of HTML nodes
      if (pos == null) {
         pos = this.tbody.childElementCount;
      }
      var row = this.tbody.insertRow(pos);
      if (data) {
         for (var c=0; c < data.length; ++c) {
            var cell = document.createElement('td');
            cell.appendChild(data[c]);
            row.appendChild(cell);
         }
      } else {
         for (var c=0; c < this.num_cols; ++c) {
            var cell = document.createElement('td');
            row.appendChild(cell);
         }
      }
      return row;
   }

   cell_content_add(ri, ci, obj) {
      this.cell(ri, ci).appendChild(obj);
   }

   cell_content_set(ri, ci, obj) {
      clear_contents(this.cell(ri, ci));
      this.cell(ri, ci).appendChild(obj);
   }

   // Styling
   body_class(cls) {
      this.tbody.className = cls;
   }

   row_class(rowi, cls) {
      this.tbody.childNodes[rowi].className = cls;
   }

   cell_class(rowi, coli, cls) {
      this.cell(rowi, coli).className = cls;
   }
}
