# Portfolio Pi Remote

A tiny local iPhone-first remote for `portfolio-pi.local`. It does not modify the public website or the TV display-mode JavaScript.

## What it does

- `Wake Display`: sends HDMI-CEC power/active-source commands to the TV, then runs `/home/john/bin/display-refresh`.
- `Refresh`: runs `/home/john/bin/display-refresh`.
- `Restart display`: runs `/home/john/bin/display-restart`.
- Serves the controller at `http://portfolio-pi.local:8765/` on the local network.

The service intentionally does **not** expose reboot or shutdown in this first version.

## Important limitation

The phone can only reach this remote while the Raspberry Pi itself is powered and connected to the network. HDMI-CEC can wake the TV from standby, but it cannot boot a fully powered-off Pi. For the one-tap experience, leave the Pi running and let the TV sleep/stand by.

## Install on the Pi

1. Install HDMI-CEC tools:

```bash
sudo apt update
sudo apt install -y cec-utils
```

2. Confirm the TV responds to CEC (the TV must have HDMI-CEC enabled in its settings):

```bash
printf 'on 0\nas\n' | cec-client -s -d 1
```

3. Put this folder at `/home/john/pi-remote` so these files exist:

```text
/home/john/pi-remote/server.py
/home/john/pi-remote/index.html
```

4. Test manually:

```bash
cd /home/john/pi-remote
python3 server.py
```

Then, while the iPhone is on the same Wi-Fi network, open:

```text
http://portfolio-pi.local:8765/
```

5. If that works, install the background service:

```bash
sudo cp /home/john/pi-remote/portfolio-remote.service /etc/systemd/system/portfolio-remote.service
sudo systemctl daemon-reload
sudo systemctl enable --now portfolio-remote.service
```

Check it with:

```bash
systemctl status portfolio-remote.service
```

## iPhone

Open `http://portfolio-pi.local:8765/` in Safari. Once it works reliably, use Safari's Share menu → **Add to Home Screen**. The remote will then be one tap away like an app.

## TV settings

HDMI-CEC has different brand names (Anynet+, Bravia Sync, Simplink, VIERA Link, etc.). Enable the TV's HDMI-CEC/device-control setting. If `cec-client` can see the TV but cannot wake it, also look for a setting allowing HDMI devices to power on the TV.
