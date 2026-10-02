# How to Run

## Factory Admin Dashboard

The dashboard is a static page; it does not have an npm build or dev-server script. From the repository root, start a local server with Python 3:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dashboard/factory-admin
```

Open <http://127.0.0.1:8765/> in your browser. Keep the terminal running while you use the dashboard, and press `Ctrl+C` to stop the server. Serving it on localhost allows browser wallet extensions to connect.