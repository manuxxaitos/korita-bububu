#!/usr/bin/env python3
"""Vista local de «Feliz día, mamá — de Kora». Sirve esta carpeta por HTTP."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
import argparse
import urllib.request
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8867)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent
url = f'http://localhost:{args.port}/'
try:
    with urllib.request.urlopen(url, timeout=1) as response:
        existing = 'de Kora' in response.read().decode('utf-8')
except Exception:
    existing = False
if existing:
    print(url)
    if not args.no_browser:
        webbrowser.open(url)
else:
    class Handler(SimpleHTTPRequestHandler):
        extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript',
                          '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4'}

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

        def log_message(self, *_):
            pass

    # Muchas fotos a la vez: cola de conexiones más larga que la de fábrica (5).
    ThreadingHTTPServer.request_queue_size = 128
    ThreadingHTTPServer.daemon_threads = True
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(root)))
    print(f'Feliz día, mamá: {url}\nMantené esta ventana abierta. Ctrl+C para cerrar.')
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
