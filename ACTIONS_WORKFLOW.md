# Playbook: GitHub Actions deploy to a DigitalOcean droplet

Use this for any project that already runs on the droplet with **Docker Hub + docker compose**. A push to `main` builds the image, pushes it, then SSHs in and recreates the stack from the existing compose file.

```
push main
  → build image
  → push Docker Hub (:latest + :<version>)
  → SSH to droplet
  → cd <compose dir>
  → docker compose pull
  → docker compose up -d
```

GitHub Actions does **not** own ports, volumes, env, or container names. Compose on the droplet does.

---

## 0. Decide the names

Fill these in before you start. Example values are from twitch-shenanigans.

| Placeholder | Meaning | Example |
|-------------|---------|---------|
| `<dockerhub-user>` | Docker Hub username | `frampersand` |
| `<image-name>` | Hub repository name | `tw-shenanigans` |
| `<compose-dir>` | Folder on the droplet with `docker-compose.yml` | `/home/framps/docker-images/overlay` |
| `<ssh-user>` | Linux user Actions will SSH as | `framps` |
| `<app-port>` | Port the process listens on **inside** the container | `3000` |
| `<host-port>` | Port published on the droplet | `8080` |
| `<version-file>` | Where the image version tag is read from | `package.json` → `"version"` |

Image on Hub: `<dockerhub-user>/<image-name>`  
Compose must pull that same image, usually `:<latest>`.

---

## 1. Droplet: Docker and compose

One-time on the droplet:

1. Install Docker (and confirm `docker compose` works as that plugin, not only the old `docker-compose` binary).
2. Put the SSH user in the `docker` group if they should not need `sudo`:
   ```bash
   sudo usermod -aG docker <ssh-user>
   ```
   Log out and back in after that.
3. Create `<compose-dir>` if it does not exist.
4. Add `docker-compose.yml` there. Keep secrets on the droplet (`.env` next to compose, or `env_file:`), not in the GitHub workflow.

Minimal compose shape:

```yaml
version: "3.3"
services:
  app:
    image: <dockerhub-user>/<image-name>:latest
    container_name: <something-stable>
    restart: always
    ports:
      - "<host-port>:<app-port>"
    volumes:
      - ./data:/app/data
```

Rules:

- **Port mapping** is `host:container`. The Dockerfile / app must listen on `<app-port>` inside the container.
- Persist writable data with a volume under `<compose-dir>` (a path the SSH user can write).
- Do not have Actions `docker run` a second container with a different name or registry. One compose project per app.

---

## 2. Repo: image that compose can run

In the GitHub repo:

**Dockerfile**

- Production install and start command for this app.
- `EXPOSE <app-port>` matching compose’s container port.
- Do **not** set `PORT` to the host port. If the app reads `PORT`, it must be `<app-port>` (or unset if that is already the default).

**.dockerignore**

Exclude at least:

- `.git`, `.github`
- `node_modules` (or language equivalent)
- `.env`, `.env.*`
- editor/OS junk

Secrets must never be copied into the image.

**Version tag**

Keep a version string in the repo (`package.json` `"version"`, or another file you teach the workflow to read). Each release that should get a numbered Hub tag bumps that value (for example `1.0.0` → `1.1.0`).

The workflow always also pushes `:latest`, which is what compose pulls.

---

## 3. Droplet: SSH key for Actions

Actions is the SSH **client**. The droplet is the **server**.

- Private key → GitHub secret `DROPLET_SSH_KEY`
- Public key → `~/.ssh/authorized_keys` for `<ssh-user>`

Create a **dedicated** deploy key (do not reuse your personal laptop key or the droplet’s own `id_ed25519`):

```bash
# on the droplet, as <ssh-user>
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys ~/.ssh/github_deploy
cat ~/.ssh/github_deploy
```

Copy the full private key (`BEGIN` / `END` lines included) into GitHub.

Reuse this **same key pair** on other repos that deploy to this droplet, or generate one key per project. Either is fine; one key per project is easier to revoke.

Confirm from your machine (optional):

```bash
ssh -i /path/to/github_deploy <ssh-user>@<droplet-ip>
```

Then, as that user, `cd <compose-dir>` and `docker compose ps` should work without sudo.

---

## 4. GitHub: repository secrets

Repo → **Settings → Secrets and variables → Actions**.

| Secret | Value |
|--------|--------|
| `DROPLET_HOST` | Droplet public IPv4 |
| `DROPLET_USER` | `<ssh-user>` |
| `DROPLET_SSH_KEY` | Private deploy key |
| `DOCKERHUB_TOKEN` | Docker Hub access token for `<dockerhub-user>` |

Create the token at Docker Hub → Account Settings → Security → New Access Token (read/write for pushing images).

App secrets (API keys, bot tokens) stay on the **droplet** with compose. Do not put them in the workflow unless compose itself has no env file and you choose to inject them in `docker compose` — that is a separate decision.

SSH and Hub secrets can be **organization** or **environment** secrets if many repos share the same droplet and Hub user.

---

## 5. GitHub: workflow file

Create `.github/workflows/deploy.yml`. Replace the `env` block and Docker Hub `username`.

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches:
      - main

env:
  IMAGE: <dockerhub-user>/<image-name>
  COMPOSE_DIR: <compose-dir>

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Read package version
        id: version
        run: echo "version=$(jq -r .version package.json)" >> "$GITHUB_OUTPUT"

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: <dockerhub-user>
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE }}:latest
            ${{ env.IMAGE }}:${{ steps.version.outputs.version }}

      - name: Deploy to droplet
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DROPLET_HOST }}
          username: ${{ secrets.DROPLET_USER }}
          key: ${{ secrets.DROPLET_SSH_KEY }}
          script: |
            set -e
            cd ${{ env.COMPOSE_DIR }}
            docker compose pull
            docker compose up -d
```

If the project is not Node, replace the “Read package version” step with whatever file holds the version (for example `grep`/`cut` on a `VERSION` file, or `cargo metadata`). Hub tags still need **`latest` plus one immutable version**.

If the droplet only has the old binary, change the script to `docker-compose pull` and `docker-compose up -d`.

---

## 6. First deploy

1. Commit Dockerfile, `.dockerignore`, and `.github/workflows/deploy.yml`.
2. Push to `main`.
3. GitHub → **Actions** → this workflow. Both jobs must pass: image push, then SSH deploy.
4. On the droplet:
   ```bash
   cd <compose-dir>
   docker compose ps
   docker compose logs -f --tail=50
   ```
5. Hit `http://<droplet-ip>:<host-port>` (or HTTPS if you terminate TLS in front).

The droplet user running compose must already be logged in to Docker Hub **if the image is private**. For public Hub repos, `compose pull` needs no Hub login on the droplet.

---

## 7. Every later release

1. Bump the version in `<version-file>`.
2. Push to `main`.
3. Confirm Actions is green and the app is up.

Rollback: in `<compose-dir>`, temporarily set `image:` to a numbered tag (`:1.2.0`), then `docker compose up -d`. Switch back to `:latest` when you want tracking again.

---

## Checklist (copy per project)

- [ ] `<image-name>`, `<compose-dir>`, ports, and Hub user written down
- [ ] Docker + compose on the droplet; SSH user can run them
- [ ] `docker-compose.yml` pulls `<dockerhub-user>/<image-name>:latest`
- [ ] Container port matches the app / Dockerfile
- [ ] Data/volumes live under a directory the SSH user owns
- [ ] Deploy SSH key: public on droplet, private in `DROPLET_SSH_KEY`
- [ ] Secrets: `DROPLET_HOST`, `DROPLET_USER`, `DROPLET_SSH_KEY`, `DOCKERHUB_TOKEN`
- [ ] App secrets stay on the droplet
- [ ] `.github/workflows/deploy.yml` with this project’s `IMAGE` and `COMPOSE_DIR`
- [ ] Version bump + push to `main` for each numbered release
