console.log("Loading network.js");

class Network {
   constructor(name, dest, onmessage=null, onclose=null, onopen=null) {
      this.name = name;
      this.dest = dest;
      this.onmessage = onmessage;
      this.onclose = onclose;
      this.onopen = onopen;

      var domain_port = window.location.host.split(":");
      var domain = domain_port[0];
      var ui_port = Number(domain_port[1]);
      var ws_port = ui_port + 1;
      this.sock_url = "ws://" + domain + ":" + ws_port + "/" + dest;

      this.sock = null;
      console.log(this.name + " = WebSocket " + this.sock_url);

      this.new_connection();
   }

   new_connection() {
      if (this.sock) {
         this.sock.close();
      }

      this.sock = new WebSocket(this.sock_url);
      this.sock.cls_nw = this;

      this.sock.onopen = function(ev) {
         var sock = ev.target;
         console.log(sock.cls_nw.name + " connected");

         if (sock.cls_nw.onopen) {
            sock.cls_nw.onopen(ev);
         }
      }
      this.sock.onmessage = function(ev) {
         var sock = ev.target;
         console.log(sock.cls_nw.name + " RX: " + ev.data);

         if (sock.cls_nw.onmessage) {
            var obj = JSON.parse(ev.data);
            sock.cls_nw.onmessage(obj, ev);
         }
      }
      this.sock.onclose = function(ev) {
         var sock = ev.target;
         console.log(sock.cls_nw.name + " closed");

         if (sock.cls_nw.onclose) {
            sock.cls_nw.onclose(ev);
         }
      }
   }

   send(obj) {
      var data = JSON.stringify(obj);
      console.log(this.sock.cls_nw.name + " TX: " + data);
      this.sock.send(data);
   }
}
