# 🌊 Ocean Sensor Network — Underwater Network Simulator

An interactive browser-based simulation of an underwater acoustic sensor network. Route data packets through a mesh of 6 underwater sensors back to a surface BASE station, survive ocean events, node failures, and deliver an emergency alert before time runs out.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Ocean_sensor_simulator
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

### Running the App

**Development mode** (with hot reload):

```bash
npm run dev
```

Open your browser and go to `http://localhost:5173`

**Production build:**

```bash
npm run build
```

**Preview the production build:**

```bash
npm run preview
```

---

## 🛠 Tech Stack

| Tool | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Build tool & dev server |
| @xyflow/react | Network graph visualization |
| framer-motion | Animations |
| lucide-react | Icons |

---

## 🎮 Game Simulation Workflow

The simulation is structured as a series of missions that progress automatically or on your action.

### Overall Flow

```
Intro → Deploy → Connect → Route → Transmit → Survive → Emergency → Final Screen
```

---

### Mission 01 — Deploy (Network Initialization)

The game opens on a splash screen. Click **[ ENTER SIMULATION ]** to begin.

You land on the deploy panel showing 6 sensors at 100% battery with an 80m acoustic range. Click **DEPLOY** to drop all sensors into the ocean. Each sensor animates falling into its fixed underwater position. After ~2 seconds the network initializes and you earn **+50 points**.

---

### Mission 02 — Connect (Establish Communication)

The sensors automatically handshake over acoustic links. A progress bar fills over ~3 seconds and 12 network links appear between the nodes. No interaction needed — the simulation advances on its own.

---

### Mission 03 — Route Planning

Pick a **source sensor** (S1–S6) by clicking a chip in the HUD or clicking directly on a sensor in the water. Once selected, click **BASE STATION** to confirm the destination.

The app runs **Dijkstra's shortest path algorithm** in real time to find the optimal route from your sensor to BASE. The chosen path highlights on the network graph. The routing cost considers:

- Physical distance between nodes
- Remaining energy of each node (low-energy nodes cost more)
- Current queue load (busy nodes add delay)
- Active ocean events (strong currents double the delay factor)

---

### Mission 04 — First Transmission

The HUD displays the computed route (e.g. `S2 → S4 → BASE`) and its cost. Click **TRANSMIT** to send a data packet.

The packet animates hop-by-hop along the route at 650ms per hop. Each node it passes through drains energy (~2.2% on the source, ~1.6% on relay nodes). On successful delivery to BASE you earn **+50 points**. If the path was 3 hops or fewer you also get a **+15 Efficient Route bonus**.

---

### Mission 05 — Survive (Keep the Network Alive)

The main gameplay loop. Your goal is to **deliver 12 packets** to BASE while the network is under constant stress.

**What you do:**
- Keep selecting a source and clicking TRANSMIT to send manual packets (+50 each)
- Adjust the **Traffic slider** to control background auto-packet volume
- Click **SIMULATE FAILURE** to manually trigger a node failure

**What the simulation does automatically:**

| Event | Effect |
|---|---|
| Background traffic | Auto-packets spawn from random sensors every ~450ms based on traffic level (+10 each) |
| 🌊 Strong Current | All transmission delays doubled for 12 seconds |
| 📡 Signal Interference | +22% packet loss chance for 12 seconds |
| ⚠ Node Failure | A sensor (preferably on your active route) goes offline for 20 seconds, then auto-repairs |

**When a node fails:**
- The network automatically reroutes around it via Dijkstra
- If a new route exists → keep transmitting, earn **+40 Network Restored**
- If your source is now isolated (NO ROUTE shown) → switch to a different alive source sensor
- The failed node repairs itself after ~20 seconds

**Packet loss** occurs when:
- Traffic slider is above 60%
- More than 5 packets are in-flight simultaneously
- A Signal Interference event is active

Once 12 packets are delivered in this stage, the Emergency mission triggers automatically.

---

### Mission !! — Emergency Alert

Sensor S5 (or another alive sensor) detects abnormal ocean conditions. You have **15 seconds** to transmit one emergency packet to BASE.

- The entire UI switches to red alert mode
- A live countdown timer is shown
- Emergency packets travel at ~0.55x normal speed and have **zero packet loss**
- Click **TRANSMIT EMERGENCY DATA** immediately

**Outcomes:**
- ✅ Delivered in time → **+150 points**, mission complete
- ❌ Timer hits 0 → Alert missed, game ends

---

### Final Screen — Mission Complete

Displays your final score with a full stats breakdown:

| Stat | Description |
|---|---|
| Packets Delivered | Total successful deliveries |
| Packets Lost | Dropped packets |
| Network Energy | Average remaining energy across all sensors |
| Routes Completed | Manual transmissions |
| Reroutes | Times the network recovered from failures |
| Emergency | Whether the alert was delivered or missed |

**Star Rating (1–5):**
- +1 if delivery ratio ≥ 75%
- +1 if delivery ratio ≥ 90%
- +1 if emergency alert was delivered
- +1 if average network energy ≥ 60%

Your best score is saved locally in the browser and shown on every run.

---

## 💡 Tips

- **S3, S4, S6** are the best source sensors — they connect directly to BASE in 2 hops (max efficiency bonus)
- Keep the traffic slider at **LOW or MED** — high traffic causes congestion and packet loss
- During a **Signal Interference** event, pause manual transmits until it clears
- During a **Strong Current** event, keep transmitting — packets are just slower, not lossy
- Switch source sensors freely if a failure isolates your current one
