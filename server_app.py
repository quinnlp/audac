import http.server
import socketserver
import webbrowser
import threading
import os
import signal
import time
import sys
import argparse

PORT = 8000

# Parse command line arguments
parser = argparse.ArgumentParser(description="Serve a directory via HTTP.")
parser.add_argument("directory", type=str, help="Directory to serve")
args = parser.parse_args()

# Ensure the directory exists
if not os.path.isdir(args.directory):
    print(f"Error: The specified directory '{args.directory}' does not exist.")
    sys.exit(1)

DIRECTORY = os.path.abspath(args.directory)

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        kwargs['directory'] = DIRECTORY
        super().__init__(*args, **kwargs)

def start_server():
    handler = MyHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at http://localhost:{PORT} from {DIRECTORY}")
        httpd.serve_forever()

def monitor_browser():
    # Open the browser and check if the tab is closed
    webbrowser.open(f"http://localhost:{PORT}")

    # Wait for the browser tab to close
    try:
        while True:
            time.sleep(1)
            # Since we can't directly detect browser tab closure in Python,
            # we simply check if the server is still active
            if not any([t.is_alive() for t in threading.enumerate()]):
                break
    except KeyboardInterrupt:
        pass

    # Close the server
    print("Browser tab closed, shutting down server...")
    os.kill(os.getpid(), signal.SIGTERM)

if __name__ == "__main__":
    # Start server in a separate thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Monitor the browser
    monitor_browser()
