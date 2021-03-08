console.log("Loading ui.js");

class Ui {
   constructor(div) {
      this.name = div.id;
      this.div = div;
      div.cls_ui = this;
   }
}

// Helpers

function clearContents(ele) {
   while (ele.firstChild) {
      ele.removeChild(ele.firstChild);
   }
}

function createSpan(txt, cls=null) {
   var ele = document.createElement("span");
   ele.innerHTML = txt;
   if (cls) { ele.className = cls; }
   return ele;
}

function createTextInput(creator, id) {
   var ele = document.createElement("input");
   ele.creator = creator;
   ele.id = id;
   return ele;
}

function createButton(creator, id, value, clickcb="", cls="") {
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

function createLink(link, body, blank=false) {
   var ele = document.createElement("a");
   ele.href = link;
   ele.appendChild(body);
   if (blank) {
      ele.target = "_blank";
   }
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
