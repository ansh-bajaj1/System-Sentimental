# 🛡️ System Sentinel

### Proactive Log Monitor, Resource Telemetry & Alerting Engine

System Sentinel is a production-grade, full-stack automated infrastructure monitoring tool designed to continuously supervise system resource consumption, tail and parse Linux/application log files, identify threshold anomalies in real-time, dispatch critical notifications to administrators, and present visual cockpit insights.

It is structured to represent professional Site Reliability Engineering (SRE) and DevOps best practices, offering containerized deployments, robust REST APIs, real-time WebSockets communication, and Prometheus metric exporters.

---

## 🚀 Key Features

* **Real-time Log Monitoring**: Watches configured log files dynamically. Automatically handles rotations, truncation, and file locks.
* **Intelligent Log Parsing**: Extracts timestamp, log level (`INFO`, `WARN`, `ERROR`, `DEBUG`), service, message, and error class details using high-speed regular expressions.
* **System Telemetry Collector**: Gathers system CPU, memory usage, disk load, load averages, uptime, network I/O, and active process count every 10 seconds.
* **Sliding-Window Anomaly Engine**: Employs Redis sorted sets to count events over time (e.g. *5 error logs inside a 60-second window* or *3 auth failures*), triggering alarms for suspicious activities.
* **Proactive Multi-Channel Alerting**: Sends high-fidelity notifications to Slack Webhooks and Nodemailer SMTP (e.g., Ethereal/standard mail) with built-in Redis-backed mutes/cooldown intervals to prevent message spam.
* **Modern SRE Dashboard**: Dark-mode glassmorphic interface built in React & TailwindCSS with responsive live charts, active alarm panels, and live tail log consoles.
* **Prometheus & Grafana Ready**: Exposes `/metrics` endpoint, compatible with Prometheus scrapers, and includes a ready-to-run Grafana service.
* **SRE Automation Tools**: Custom Linux shell scripts to start, stop, backup, and health-check the full container stack.

---

## 🛠️ Technology Stack

* **Backend**: Node.js, Express.js, Socket.io, Winston Logger, Redis, Nodemailer, Axios, prom-client
* **Frontend**: React (Vite), TailwindCSS v4, Recharts, Lucide Icons
* **Database**: MongoDB (Mongoose)
* **DevOps**: Docker, Docker Compose, Prometheus, Grafana, Linux Bash Scripts

---

## 📂 Project Architecture

```text
system-sentinel/
├── backend/
│   ├── config/             # DB & Cache configurations
│   ├── controllers/        # Express request handlers
│   ├── middleware/         # Auth filters & requests logging
│   ├── models/             # Mongoose database models
│   ├── routes/             # REST endpoints mapping
│   ├── services/           # Log monitors, metrics collection, alerts
│   ├── utils/              # winston logger config
│   ├── scripts/            # mock log generators
│   └── Dockerfile          # Backend container configurations
├── frontend/
│   ├── src/
│   │   ├── assets/         # static assets
│   │   ├── components/     # Layout, Auth Context
│   │   ├── hooks/          # useAuth helper hooks
│   │   ├── pages/          # Login, Dashboard, Logs, Alerts, Analytics, Settings
│   │   └── services/       # axios api helper wrapper
│   ├── nginx.conf          # Frontend production server config
│   └── Dockerfile          # Multi-stage frontend container config
├── scripts/                # SRE Shell automation scripts
│   ├── start.sh
│   ├── stop.sh
│   ├── health-check.sh
│   └── backup-logs.sh
├── docker-compose.yml      # Multi-container coordinator
├── prometheus.yml          # Prometheus scraper configurations
└── README.md
```

---

## ⚙️ Environment Configuration

Copy the template config file:
```bash
cp .env.example .env
```

| Key | Description | Default Value |
| :--- | :--- | :--- |
| `PORT` | Backend port | `5000` |
| `MONGO_URI` | MongoDB connection URL | `mongodb://localhost:27017/system_sentinel` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | Token security encryption key | `super_secret_system_sentinel_key_987654321` |
| `JWT_EXPIRE` | Admin session duration | `24h` |
| `SLACK_WEBHOOK_URL` | Integration Slack Webhook | (Empty) |
| `SMTP_HOST` | SMTP server for emails | `smtp.ethereal.email` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | (Empty) |
| `SMTP_PASS` | SMTP password | (Empty) |
| `SMTP_FROM` | Sender address | `sentinel@system.monitor` |
| `LOG_FILE_PATH` | Monitored log file | `logs/application.log` |

---

## 🛠️ Quickstart Installation Guide

### Prerequisites
* Docker & Docker Compose
* Node.js v18+ (for local development only)

### Method A: Docker Compose Deployment (Recommended)
This runs the entire stack out of the box (MongoDB, Redis, Backend API, Frontend Dashboard, Prometheus, Grafana).

1. Clone the repository and navigate to folder:
   ```bash
   git clone https://github.com/ansh-bajaj1/System-Sentimental.git
   cd System-Sentimental
   ```
2. Build and run the containers using the start script:
   ```bash
   ./scripts/start.sh
   ```
   *This starts the services and maps them:*
   * **Frontend Dashboard**: `http://localhost:3000`
   * **Backend API**: `http://localhost:5000`
   * **Prometheus Metrics**: `http://localhost:9090`
   * **Grafana Dashboard**: `http://localhost:3001` (Default credentials: `admin` / `admin`)

3. Run health inspection to verify all services are active:
   ```bash
   ./scripts/health-check.sh
   ```

4. Tear down the stack:
   ```bash
   ./scripts/stop.sh
   ```

### Method B: Manual Local Development Setup
1. **Launch Database & Redis**:
   Make sure local MongoDB (port 27017) and Redis (port 6379) are active.

2. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *Automatically seeds a default admin account:*
   * **Username**: `admin`
   * **Password**: `adminpassword123`

3. **Start Mock Log Generator**:
   In a separate terminal:
   ```bash
   cd backend
   npm run generate-logs
   ```
   *This continuously writes test logs and periodically injects spikes to verify thresholds.*

4. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`.

---

## 📡 REST API Documentation

### 🔓 Authentication Endpoints
#### `POST /api/auth/login`
Admin JWT credential exchange.
* **Payload**:
  ```json
  { "username": "admin", "password": "adminpassword123" }
  ```
* **Response**:
  ```json
  { "success": true, "token": "JWT_TOKEN_HERE", "user": { "username": "admin" } }
  ```

---

### 🛡️ System Resources & Telemetry Endpoints (Requires JWT)

#### `GET /api/system/metrics`
Retrieves current telemetry and historical logs.
* **Response**:
  ```json
  {
    "success": true,
    "data": {
      "current": { "cpuUsage": 12, "memoryUsage": 45, "diskUsage": 55 },
      "history": [...]
    }
  }
  ```

#### `GET /api/system/logs`
Paginated, searchable log audit trail.
* **Query Parameters**: `page`, `limit`, `level`, `service`, `search` (keyword)
* **Example**: `/api/system/logs?level=ERROR&service=nginx`

#### `GET /api/system/alerts`
Retrieves system incident log.
* **Query Parameters**: `acknowledged` (`true`/`false`), `severity` (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`)

#### `POST /api/system/alerts/acknowledge/:id`
Acknowledges active system alert to silence logs.

#### `POST /api/alerts/test`
Manually triggers high/critical test alert to verify Slack/Email delivery.
* **Payload**:
  ```json
  { "severity": "CRITICAL", "service": "manual-test", "issue": "Manual validation of alerting rules" }
  ```

---

### ⚙️ Settings Endpoints (Requires JWT)

#### `GET /api/settings`
Retrieves current dynamic CPU, RAM, Disk thresholds, Slack integrations, and SMTP configurations.

#### `POST /api/settings`
Updates and dynamically implements threshold settings in running background threads.

---

### 📊 Prometheus Metrics
#### `GET /metrics`
Unauthenticated scrape endpoint formatted for Prometheus agents. Tracks:
* `sentinel_system_cpu_usage_ratio` (Gauge)
* `sentinel_system_memory_usage_ratio` (Gauge)
* `sentinel_system_disk_usage_ratio` (Gauge)
* `sentinel_http_requests_total` (Counter)
* `sentinel_parsed_errors_total` (Counter)
* `sentinel_alerts_triggered_total` (Counter)
* `sentinel_system_uptime_seconds` (Gauge)

---

## 🛠️ SRE Shell Automation Operations

* **`start.sh`**: Boots docker services, prints ports, checks dependencies.
* **`stop.sh`**: Safely terminates and removes docker compose network.
* **`health-check.sh`**: Performs curls on dashboard, api health status, MongoDB, and Redis connection state.
* **`backup-logs.sh`**: Rotates active `application.log` by compressing it as a `.tar.gz` archive in `backups/` and truncates the active log file to `0 bytes` to free system storage.
