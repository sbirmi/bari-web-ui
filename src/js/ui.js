console.log("Loading ui.js");

class Ui {
   constructor(div) {
      this.name = div.id;
      this.div = div;
      div.cls_ui = this;
   }
}

// Helpers

function createSpan(txt) {
   var span = document.createElement("span");
   span.innerHTML = txt;
   return span;
}

function createTextInput(creator, id) {
   var ele = document.createElement("input");
   ele.creator = creator;
   ele.id = id;
   return ele;
}

function createButton(creator, id, value, clickcb="") {
   // How is onclick registered?
   var ele = document.createElement("input");
   ele.type = "button";
   ele.creator = creator;
   ele.id = id;
   ele.value = value;
   ele.onclick = clickcb;
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
      // this.ui.className = ''; // CSS style

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

   // Accessors
   cell(rowi, coli) {
      if (rowi < 0 || rowi >= this.tbody.childElementCount) { return null; }

      var row = this.tbody.childNodes[rowi];
      if (coli < 0 || coli >= row.childElementCount) { return null; }

      return row.childNodes[coli];
   }

   // Mutators
   add_row(data) {
      // data is an array of HTML nodes
      var row = document.createElement('tr');
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

      this.tbody.appendChild(row);
      return row;
   }

   cell_content_add(ri, ci, obj) {
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
