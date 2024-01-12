from datetime import datetime
from flask import (
        Flask,
        render_template,
        send_from_directory,
)
import glob
import os

app = Flask(__name__)

# -------------------------------------
# Don't cache elements/pages
if os.environ.get("NO_CACHE"):
    print("Caching disabled")

    server_start_time = datetime.now()
    @app.after_request
    def after_request(response):
        response.headers['Last-Modified'] = server_start_time
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, ' \
                                            'post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        return response

# -------------------------------------
# static files
jsFiles = set(glob.glob("./js" + "/**/*.js", recursive=True))
cssFiles = set(glob.glob("./css" + "/**/*.css", recursive=True))
assetFiles = set(glob.glob("./assets" + "/**/*.png", recursive=True)) | \
             set(glob.glob("./assets" + "/**/*.svg", recursive=True))

@app.route("/js/<path:jspath>")
def serveJs(jspath):
    jspath = "./js/" + jspath
    if jspath not in jsFiles:
        return "File not found: " + jspath
    return send_from_directory(".", jspath)

@app.route("/css/<path:csspath>")
def serveCss(csspath):
    csspath = "./css/" + csspath
    if csspath not in cssFiles:
        return "File not found: " + csspath
    return send_from_directory(".", csspath)

@app.route("/assets/<path:apath>")
def serveAsset(apath):
    apath = "./assets/" + apath
    if apath not in assetFiles:
        return "File not found: " + apath
    return send_from_directory(".", apath)

# -------------------------------------
# HTML pages
@app.route("/")
def serveLobby():
    return render_template("lobby.html")

# -------------------------------------
# Chat room
@app.route("/chat/<int:gid>")
def serveChat(gid):
    return render_template("chat/index.html", gid=gid)

# -------------------------------------
# Dirty7 room
@app.route("/dirty7/<int:gid>")
def serveDirty7(gid):
    return render_template("dirty7/index.html", gid=gid)

@app.route("/dirty7/help.html")
def serveDirty7Help():
    return render_template("dirty7/help.html")

# -------------------------------------
# Durak room
@app.route("/durak/<int:gid>")
def serveDurak(gid):
    return render_template("durak/index.html", gid=gid)

@app.route("/durak/help.html")
def serveDurakHelp():
    return render_template("durak/help.html")

# -------------------------------------
# Taboo room
@app.route("/taboo/<int:gid>")
def serveTaboo(gid):
    return render_template("taboo/index.html", gid=gid)

@app.route("/taboo/help.html")
def serveTabooHelp():
    return render_template("taboo/help.html")
