# TRAE MASTER PRD
# Joint Command Exercise Demo System
## Sistem Simulasi & Visualisasi Latihan Gabungan Darat-Laut-Udara-Logistik Level Komando

---

# 1. IDENTITAS DOKUMEN

- **Nama Produk:** Joint Command Exercise Demo System
- **Jenis Produk:** Web-based command-post exercise simulator / decision support training demo
- **Target Utama:** Presentasi, demonstrasi, proof of concept, dan latihan level komando
- **Platform:** Web App
- **Frontend:** Next.js / React / TypeScript
- **Backend:** NestJS / Node.js / TypeScript
- **Database:** MySQL
- **Realtime:** WebSocket / Socket.IO
- **Map Engine:** MapLibre GL JS atau Leaflet
- **3D / Visual Enhancement:** Three.js (opsional untuk visual presentasi)
- **Authentication:** Demo auth internal
- **Environment:** Local development + deployable to VPS / local server
- **Tujuan Dokumen:** Menjadi master prompt dan acuan lengkap agar TRAE AI dapat membangun software demo dari nol secara bertahap hingga siap presentasi

---

# 2. LATAR BELAKANG

Dibutuhkan sebuah software demo untuk mensimulasikan latihan gabungan level komando dengan konteks operasi darat, laut, udara, dan logistik. Sistem ini bukan simulator tempur detail dan bukan game, tetapi platform untuk:

1. memvisualisasikan situasi operasi gabungan,
2. mendukung penyusunan strategi dan pengambilan keputusan komandan,
3. mengelola tasking lintas matra,
4. mensimulasikan perubahan situasi,
5. mengevaluasi hasil latihan melalui after action review.

Sistem harus cocok untuk demo kepada stakeholder, pimpinan, lembaga pendidikan militer, atau institusi yang membutuhkan sistem visualisasi command exercise.

---

# 3. TUJUAN PRODUK

## 3.1 Tujuan Utama
Membangun software demo yang mampu menunjukkan bagaimana komandan dan staf operasi dapat:
- memahami common operational picture,
- menyusun course of action,
- memberikan order lintas matra,
- memantau dampak keputusan,
- mengevaluasi hasil skenario latihan.

## 3.2 Tujuan Presentasi
Software ini harus cukup meyakinkan untuk:
- demo eksekutif,
- proposal proyek,
- proof of concept teknologi,
- demo pameran,
- simulasi pembelajaran command-post exercise.

## 3.3 Tujuan Teknis
Software harus:
- modular,
- mudah dikembangkan,
- mudah dipresentasikan,
- memakai dummy data otomatis,
- dapat berjalan menggunakan data abstraksi non-sensitif,
- mendukung realtime update.

---

# 4. RUANG LINGKUP

## 4.1 Yang Masuk Ruang Lingkup
- dashboard komando
- peta operasi
- manajemen unit
- manajemen skenario
- tasking / orders
- event inject
- logistik
- timeline operasi
- after action review
- dummy data generator
- multi-role demo accounts
- seed data otomatis
- mode presentasi / live simulation

## 4.2 Yang Tidak Masuk Ruang Lingkup
- simulasi balistik real
- data classified
- parameter senjata detail
- AI perang otonom
- integrasi sistem militer nyata
- satelit / ISR riil
- peta classified / restricted
- command-and-control produksi nyata

---

# 5. POSISI PRODUK

Produk ini harus diposisikan sebagai:

> **Command Exercise Visualization & Decision Support Demo System**

Bukan game perang.  
Bukan simulator senjata.  
Bukan sistem operasi militer nyata.  

Tetapi:
- platform latihan keputusan,
- platform visualisasi operasi gabungan,
- alat bantu skenario dan evaluasi.

---

# 6. USER PERSONA & ROLE

## 6.1 Commander
### Deskripsi
Peran ini mewakili jenderal / komandan latihan / pimpinan operasi.

### Kebutuhan
- melihat gambaran besar
- memahami risiko
- membandingkan opsi strategi
- menyetujui order
- melihat status lintas matra
- menerima alert penting

### Hak Akses
- lihat command dashboard
- lihat peta utama
- approve / reject order utama
- ubah prioritas objective
- aktifkan reserve / contingency
- lihat risk panel
- lihat mission success projection

---

## 6.2 Operations Staff
### Deskripsi
Staf operasi yang menyusun rencana dan menjalankan tasking.

### Kebutuhan
- membuat mission
- menugaskan unit
- membuat rute
- sinkronisasi antar matra
- memantau status eksekusi

### Hak Akses
- create / update mission
- assign units
- create orders
- manage timeline
- change route
- monitor unit status

---

## 6.3 Intelligence Staff
### Deskripsi
Staf intel yang mengelola ancaman, indikasi, dan level deteksi.

### Kebutuhan
- update situasi ancaman
- memasukkan detection event
- mengubah confidence level
- mengatur fog of war

### Hak Akses
- create threat markers
- update enemy estimate
- trigger intel inject
- update detection confidence
- reveal / conceal selected map info

---

## 6.4 Logistics Staff
### Deskripsi
Staf logistik yang mengelola supply, transport, dan sustainment.

### Kebutuhan
- memantau stok
- mengatur resupply
- melihat consumption
- melihat strain logistik
- memprioritaskan dukungan

### Hak Akses
- manage logistics nodes
- create resupply missions
- update stock levels
- track delivery delays
- view sustainment panel

---

## 6.5 Exercise Director
### Deskripsi
Pengendali latihan / admin skenario.

### Kebutuhan
- memilih skenario
- start / pause / reset
- inject event
- mengatur waktu simulasi
- mengubah cuaca dan kondisi

### Hak Akses
- full scenario control
- change simulation speed
- inject events
- reset scenario
- load seed data
- switch modes

---

## 6.6 Evaluator / Observer
### Deskripsi
Pihak yang melakukan evaluasi latihan.

### Kebutuhan
- melihat semua aksi
- meninjau timeline
- mencatat keputusan
- menilai hasil

### Hak Akses
- read-only visibility
- access AAR dashboard
- export evaluation summary
- see order history
- see decision timeline

---

# 7. SKENARIO MVP

## 7.1 Nama Skenario
**Pertahanan Wilayah Strategis / Pulau Terluar**

## 7.2 Narasi Umum
Terdapat indikasi ancaman terhadap wilayah strategis Indonesia. Unsur udara mendeteksi aktivitas mencurigakan. Unsur laut bergerak melakukan patroli dan pengamanan sektor. Unsur darat memperkuat pertahanan objek vital. Logistik harus menjaga sustainment seluruh unsur. Komandan dan staf harus menyesuaikan keputusan saat situasi berkembang.

## 7.3 Tujuan Simulasi
- menunjukkan koordinasi lintas matra
- menunjukkan hubungan keputusan dengan outcome
- menunjukkan pentingnya logistik
- menunjukkan dampak event inject
- menunjukkan alur AAR

## 7.4 Kondisi Awal
- 1 area operasi utama
- 3 sektor
- sejumlah unit darat
- sejumlah kapal
- sejumlah pesawat
- 2-3 node logistik
- 10-15 inject event
- 3 fase operasi

## 7.5 Fase
### Phase 1: Detection & Preparation
- situasi awal
- ancaman terindikasi
- komandan memilih prioritas
- unit siaga

### Phase 2: Deployment & Coordination
- unit bergerak
- order aktif
- ancaman berkembang
- logistik mulai berjalan

### Phase 3: Response & Stabilization
- inject tambahan muncul
- komandan revisi keputusan
- unsur cadangan dikerahkan
- hasil objective dihitung

---

# 8. KEBUTUHAN FUNGSIONAL

## 8.1 Authentication & Role Selection
Sistem harus menyediakan:
- login demo
- role-based access
- akun dummy siap pakai

## 8.2 Scenario Management
Sistem harus dapat:
- menampilkan daftar skenario
- memilih skenario aktif
- memuat parameter skenario
- start / pause / reset simulasi
- memilih simulation speed

## 8.3 Map-Based Common Operational Picture
Sistem harus dapat:
- menampilkan peta utama
- menampilkan unit darat, laut, udara
- menampilkan sektor operasi
- menampilkan threat markers
- menampilkan route / path
- menampilkan weather overlays
- memfilter layer

## 8.4 Unit Management
Sistem harus dapat:
- menampilkan daftar unit
- melihat detail tiap unit
- melihat readiness
- melihat status supply
- melihat mission assignment
- melihat parent command
- melihat lokasi terakhir

## 8.5 Mission & Order Tasking
Sistem harus dapat:
- membuat mission
- membuat order
- assign unit ke mission
- menentukan start time / phase
- menentukan objective
- mengubah status order
- approval order oleh commander

## 8.6 Event Inject Engine
Sistem harus dapat:
- menampilkan daftar inject
- menjalankan inject manual
- menjalankan inject otomatis berdasarkan waktu
- menampilkan efek inject ke unit / mission / logistics / threat

## 8.7 Logistics System
Sistem harus dapat:
- menyimpan logistics nodes
- melihat stok
- melihat delivery routes
- menjalankan resupply mission
- menghitung depletion rate
- menghitung sustainment status

## 8.8 Command Dashboard
Sistem harus dapat:
- menampilkan objective
- menampilkan readiness summary
- menampilkan mission status
- menampilkan top risks
- menampilkan command decisions
- menampilkan alert prioritas

## 8.9 After Action Review
Sistem harus dapat:
- menampilkan timeline keputusan
- menampilkan timeline event
- menampilkan objective results
- menampilkan mission outcomes
- menampilkan bottlenecks
- menampilkan rekomendasi evaluasi dasar

## 8.10 Dummy Data Generator
Sistem harus dapat:
- membuat data dummy otomatis
- membuat unit dummy lintas matra
- membuat skenario dummy
- membuat orders dummy
- membuat inject dummy
- membuat logistics nodes dummy
- membuat akun demo

---

# 9. KEBUTUHAN NON-FUNGSIONAL

## 9.1 Usability
- UI harus modern, bersih, dan profesional
- mudah dipahami saat demo
- warna tiap matra jelas
- komponen dashboard harus ringkas namun informatif

## 9.2 Performance
- map render tetap responsif untuk 20–100 unit dummy
- realtime updates tidak terasa berat pada local demo
- initial page load cepat

## 9.3 Maintainability
- arsitektur modular
- clean code
- reusable components
- typed APIs
- seed data terstruktur

## 9.4 Security
- auth demo sederhana
- role-based routes
- tidak menyimpan data sensitif
- semua data dummy

## 9.5 Portability
- dapat dijalankan lokal
- dapat di-deploy ke VPS
- dapat dipresentasikan di layar besar

---

# 10. FITUR UTAMA PER MODUL

## 10.1 Modul A - Authentication & Demo Access
### Fitur
- demo login page
- predefined demo users
- role switcher untuk admin / director
- protected routes

### Akun Demo
- commander@example.local
- ops@example.local
- intel@example.local
- log@example.local
- director@example.local
- evaluator@example.local

Password semua demo:
- password123

---

## 10.2 Modul B - Scenario Manager
### Fitur
- scenario list
- create scenario
- edit scenario
- load scenario
- start / pause / reset
- simulation speed controls
- auto inject toggle
- manual inject controls

### Halaman
- `/scenarios`
- `/scenarios/[id]`
- `/director/control`

---

## 10.3 Modul C - Common Operational Picture
### Fitur
- peta 2D utama
- marker unit
- path lines
- threat zones
- weather layers
- radar circles
- AO sectors
- layer toggles

### Halaman
- `/dashboard/command`
- `/viewer/live`

---

## 10.4 Modul D - Unit Management
### Fitur
- unit listing
- unit detail panel
- readiness indicator
- supply indicator
- movement state
- mission assignment
- service branch tagging

### Halaman
- `/units`
- `/units/[id]`

---

## 10.5 Modul E - Missions & Orders
### Fitur
- create mission
- create order
- assign unit(s)
- set phase
- set priority
- set route
- approve / reject order
- show dependencies

### Halaman
- `/missions`
- `/orders`
- `/planner`

---

## 10.6 Modul F - Logistics & Sustainment
### Fitur
- logistics node list
- stock table
- consumption rates
- transport missions
- resupply requests
- delayed delivery alerts
- sustainment summary

### Halaman
- `/logistics`
- `/logistics/nodes`
- `/logistics/missions`

---

## 10.7 Modul G - Event Inject Engine
### Fitur
- inject list
- inject trigger button
- inject schedule
- inject effect preview
- inject result logs

### Contoh Inject
- cuaca memburuk
- gangguan komunikasi
- radar loss
- delayed resupply
- new threat contact
- target priority change
- route blockage
- misinformation event

### Halaman
- `/injects`
- `/director/injects`

---

## 10.8 Modul H - Command Dashboard
### Fitur
- objective card
- phase progress
- mission status cards
- readiness charts
- top risks
- decision panel
- active alerts

### Halaman
- `/dashboard/command`

---

## 10.9 Modul I - AAR Dashboard
### Fitur
- event timeline
- decision timeline
- order history
- objective completion score
- logistic strain summary
- unit status replay
- export summary

### Halaman
- `/aar`
- `/aar/[scenarioRunId]`

---

# 11. INFORMASI YANG DITAMPILKAN PADA TIAP LAYAR

## 11.1 Command Dashboard
Harus berisi:
- judul skenario
- current phase
- simulation clock
- readiness summary per matra
- objective status
- top 5 alerts
- mission completion summary
- risk score
- peta utama
- last decisions
- quick action buttons

## 11.2 Planner Page
Harus berisi:
- mission table
- order table
- selected unit list
- route planner panel
- dependency diagram sederhana
- approval status

## 11.3 Live Viewer
Harus berisi:
- peta fullscreen
- timeline running
- event popups
- unit movement
- threat markers
- route lines
- weather overlay

## 11.4 Logistics Page
Harus berisi:
- node list
- current stock
- depletion trend
- resupply routes
- delayed shipments
- sustainment health meter

## 11.5 AAR
Harus berisi:
- scenario summary
- objective outcomes
- orders issued
- critical events
- delayed actions
- timeline replay
- recommendations

---

# 12. UX/UI GUIDELINES

## 12.1 Prinsip Desain
- profesional
- modern
- bersih
- command-center feel
- dark mode default
- high contrast untuk map dan dashboard
- modular card layout
- jelas saat diproyeksikan ke layar besar

## 12.2 Visual Theme
- background gelap navy / charcoal
- aksen hijau / cyan / amber / red untuk status
- darat = hijau
- laut = biru
- udara = cyan
- logistik = amber
- ancaman = merah

## 12.3 Komponen
- top navbar
- side navigation
- card panels
- alert badges
- mini charts
- modal create order
- slide-over detail unit
- map legend
- timeline strip

## 12.4 Typography
- font modern sans-serif
- heading tegas
- data panel monospace opsional untuk angka dan ID

## 12.5 Responsiveness
- desktop-first
- large screen optimized
- tablet boleh support terbatas
- mobile tidak jadi prioritas utama

---

# 13. ARSITEKTUR SISTEM

## 13.1 Arsitektur Umum
Sistem terdiri dari:
1. frontend web app
2. backend API server
3. MySQL database
4. WebSocket realtime layer
5. seed & dummy data generator
6. optional simulation scheduler

## 13.2 Frontend Stack
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- Socket.IO client
- MapLibre GL JS atau Leaflet
- Recharts untuk chart
- Framer Motion untuk animasi ringan

## 13.3 Backend Stack
- NestJS
- TypeScript
- Prisma ORM atau TypeORM
- MySQL
- Socket.IO gateway
- Swagger OpenAPI
- Zod atau class-validator untuk validation

## 13.4 Database
- MySQL 8+
- relational schema
- seed script
- demo run logs

## 13.5 Deployment
- docker-compose untuk local
- frontend dan backend terpisah
- atau monorepo dengan service terpisah

---

# 14. STRUKTUR MONOREPO YANG DIHARAPKAN

```txt
joint-command-demo/
  apps/
    web/
    api/
  packages/
    ui/
    types/
    config/
  prisma/ or database/
  docs/
  scripts/
  docker/
  .env.example
  docker-compose.yml
  package.json
  pnpm-workspace.yaml

14.1 Apps Web

Berisi:

pages / app routes
dashboard pages
map components
mission forms
aar components
14.2 Apps API

Berisi:

auth module
users module
scenarios module
units module
missions module
orders module
logistics module
injects module
simulation module
websocket gateway
aar module
14.3 Packages UI

Berisi shared components:

cards
tables
badges
modals
sidebars
charts
legends
form controls
15. DATABASE DESIGN (MYSQL)
15.1 Core Principles
semua data awal harus dummy
semua relasi jelas
semua entity punya timestamps
enum dipakai untuk status-status penting
mendukung scenario run dan AAR
15.2 Tabel Users
Fields
id (uuid / varchar)
name
email
password_hash
role
is_active
created_at
updated_at
Roles
commander
operations
intelligence
logistics
director
evaluator
admin
15.3 Tabel Scenarios
Fields
id
name
slug
description
area_name
scenario_type
initial_phase
total_phases
status
is_template
created_at
updated_at
15.4 Tabel ScenarioPhases
Fields
id
scenario_id
phase_number
name
description
start_offset_minutes
end_offset_minutes
created_at
updated_at
15.5 Tabel ScenarioRuns
Fields
id
scenario_id
started_by_user_id
current_phase
simulation_status
simulation_speed
started_at
paused_at
ended_at
created_at
updated_at
simulation_status
not_started
running
paused
completed
aborted
15.6 Tabel Units
Fields
id
scenario_id
name
code
branch
unit_type
category
readiness_score
supply_score
morale_score
x_coord
y_coord
heading
parent_command
status
created_at
updated_at
branch
land
sea
air
logistics
status
idle
ready
moving
on_mission
delayed
engaged
damaged
resupplying
unavailable
15.7 Tabel Missions
Fields
id
scenario_run_id
name
mission_type
objective
priority
status
phase_number
planned_start_time
planned_end_time
actual_start_time
actual_end_time
created_by_user_id
approved_by_user_id
created_at
updated_at
mission_type
defend
patrol
recon
escort
intercept
transport
resupply
reserve
surveillance
support
status
draft
pending_approval
approved
active
delayed
completed
failed
cancelled
15.8 Tabel MissionUnits
Fields
id
mission_id
unit_id
assigned_role
created_at
15.9 Tabel Orders
Fields
id
scenario_run_id
mission_id
issued_by_user_id
target_unit_id
order_type
priority
approval_status
execution_status
details_json
issued_at
approved_at
executed_at
created_at
updated_at
order_type
move
hold
defend
patrol
recon
escort
support
resupply
intercept
standby
withdraw
reroute
approval_status
draft
pending
approved
rejected
execution_status
not_started
in_progress
completed
failed
delayed
cancelled
15.10 Tabel Threats
Fields
id
scenario_run_id
name
threat_type
severity
confidence
x_coord
y_coord
status
metadata_json
created_at
updated_at
threat_type
air_contact
sea_contact
land_intrusion
logistics_disruption
cyber_noise
unknown
15.11 Tabel LogisticsNodes
Fields
id
scenario_id
name
node_type
x_coord
y_coord
status
fuel_stock
ammo_stock
ration_stock
medical_stock
spare_stock
created_at
updated_at
node_type
main_base
forward_base
port
airbase
depot
field_support
15.12 Tabel LogisticsMissions
Fields
id
scenario_run_id
from_node_id
to_node_id
transport_mode
status
fuel_amount
ammo_amount
ration_amount
medical_amount
spare_amount
eta_minutes
launched_at
completed_at
created_at
updated_at
transport_mode
ground
sea
air
15.13 Tabel EventInjects
Fields
id
scenario_id
name
inject_type
trigger_type
trigger_offset_minutes
is_enabled
description
effect_json
created_at
updated_at
trigger_type
manual
scheduled
condition
15.14 Tabel EventLogs
Fields
id
scenario_run_id
event_type
title
description
severity
source_type
source_id
payload_json
occurred_at
created_at
15.15 Tabel DecisionLogs
Fields
id
scenario_run_id
user_id
decision_type
title
description
impact_summary
payload_json
created_at
15.16 Tabel AARReports
Fields
id
scenario_run_id
title
summary
objective_score
coordination_score
logistics_score
response_time_score
recommendations_json
created_at
updated_at
16. PRISMA / ORM REQUIREMENTS

TRAE harus:

membuat schema ORM lengkap
membuat migration
membuat seed file
membuat enum
membuat relational mappings
membuat repository / service / controller structure
memastikan seed dapat dijalankan berulang dengan aman
17. DUMMY DATA & SEEDING STRATEGY
17.1 Prinsip Dummy Data

Semua data dummy harus:

fiktif
non-sensitif
realistis secara struktur
cukup banyak untuk demo
mudah dipahami saat presentasi
17.2 Data Yang Harus Dibuat Otomatis

TRAE harus otomatis membuat:

6-8 akun demo
1 scenario template utama
3 phases
30-60 unit dummy
12-20 missions
20-40 orders
8-15 threats
5-10 logistics nodes
10-15 logistics missions
10-20 inject events
1-3 AAR samples jika perlu
17.3 Distribusi Dummy Units
Land
infantry task force alpha
mechanized detachment bravo
coastal defense unit charlie
reserve unit delta
rapid response unit echo
Sea
patrol squadron alpha
frigate group bravo
support vessel charlie
amphibious support delta
maritime surveillance element echo
Air
fighter flight alpha
reconnaissance flight bravo
transport flight charlie
helicopter support delta
air defense support echo
Logistics
main depot alpha
forward supply bravo
mobile medical charlie
fuel support delta
spare parts support echo
17.4 Geographic Dummy Layout

TRAE harus menempatkan koordinat dummy pada peta fiktif Indonesia-style atau AOI abstrak, misalnya:

sektor utara
sektor tengah
sektor selatan
pulau utama
choke point laut
bandara utama
pelabuhan utama
objek vital
17.5 Event Inject Dummy

Contoh:

unknown air contact detected
weather degradation in sector north
supply convoy delayed
communication latency increases
radar coverage reduced
new sea contact approaching choke point
priority objective changed
reserve activation recommended
fuel consumption spike
misinformation event from intel uncertainty
18. LOGIKA SIMULASI
18.1 Pendekatan Simulasi

Sistem tidak perlu memakai physics simulation berat. Gunakan:

rule-based engine
state transitions
time-based updates
probability modifiers
event-driven effects
18.2 Loop Simulasi

Setiap tick simulasi:

update clock
cek inject yang harus aktif
update mission statuses
update unit movement
update logistics depletion / replenishment
hitung alert baru
tulis event log
broadcast state via websocket
18.3 Faktor Yang Mempengaruhi Outcome
readiness_score
supply_score
morale_score
threat severity
weather modifier
route delay
mission priority
branch suitability
command approval delay
18.4 Contoh Rule
Rule 1

Jika weather severe dan mission_type air recon, maka:

success modifier turun
ETA bertambah
detection confidence turun
Rule 2

Jika supply_score < 40, maka:

readiness turun secara bertahap
delay chance naik
mission risk naik
Rule 3

Jika logistics mission completed, maka:

receiving node stock naik
selected units supply_score bertambah
Rule 4

Jika threat severity tinggi dan response terlambat, maka:

objective score turun
risk alert naik
Rule 5

Jika commander approve reserve activation, maka:

reserve units berubah dari standby ke ready
response options bertambah
19. REST API REQUIREMENTS
19.1 Auth
POST /auth/login
GET /auth/me
POST /auth/logout
19.2 Users
GET /users
GET /users/:id
19.3 Scenarios
GET /scenarios
GET /scenarios/:id
POST /scenarios
PATCH /scenarios/:id
POST /scenarios/:id/start-run
19.4 Scenario Runs
GET /scenario-runs
GET /scenario-runs/:id
POST /scenario-runs/:id/start
POST /scenario-runs/:id/pause
POST /scenario-runs/:id/reset
POST /scenario-runs/:id/speed
19.5 Units
GET /units
GET /units/:id
PATCH /units/:id
19.6 Missions
GET /missions
POST /missions
GET /missions/:id
PATCH /missions/:id
POST /missions/:id/approve
POST /missions/:id/start
POST /missions/:id/complete
19.7 Orders
GET /orders
POST /orders
GET /orders/:id
PATCH /orders/:id
POST /orders/:id/approve
POST /orders/:id/reject
POST /orders/:id/execute
19.8 Threats
GET /threats
POST /threats
PATCH /threats/:id
19.9 Logistics
GET /logistics/nodes
GET /logistics/missions
POST /logistics/missions
PATCH /logistics/missions/:id
POST /logistics/missions/:id/launch
POST /logistics/missions/:id/complete
19.10 Injects
GET /injects
POST /injects/:id/trigger
19.11 Event Logs
GET /event-logs
GET /decision-logs
19.12 AAR
GET /aar/:scenarioRunId
POST /aar/:scenarioRunId/generate
20. WEBSOCKET EVENTS
20.1 Channel Events

TRAE harus mengimplementasikan realtime event berikut:

simulation:tick
simulation:statusChanged
scenarioRun:updated
unit:updated
mission:updated
order:updated
logistics:updated
inject:triggered
eventLog:created
alert:created
aar:generated
20.2 Payload Minimal

Setiap payload harus typed dan minimal berisi:

eventName
scenarioRunId
timestamp
payload object
21. HALAMAN / ROUTE FRONTEND
21.1 Public / Auth
/login
21.2 Main
/
/dashboard/command
/planner
/viewer/live
/units
/units/[id]
/missions
/missions/[id]
/orders
/logistics
/injects
/scenarios
/scenarios/[id]
/director/control
/aar
/aar/[scenarioRunId]
21.3 Required Layout
authenticated shell
sidebar navigation
topbar with user & scenario info
content area
optional right-side detail drawer
22. KOMPONEN FRONTEND YANG HARUS DIBUAT
22.1 Global Components
AppSidebar
AppTopbar
PageHeader
StatCard
AlertList
TimelineStrip
StatusBadge
BranchBadge
PriorityBadge
ConfirmationDialog
22.2 Map Components
OperationalMap
UnitMarker
ThreatMarker
SectorPolygon
RoutePolyline
RadarRangeCircle
WeatherOverlay
MapLegend
LayerTogglePanel
22.3 Mission / Order Components
MissionTable
MissionForm
OrderTable
OrderForm
ApprovalPanel
DependencyPanel
22.4 Logistics Components
LogisticsNodeTable
SupplyBars
LogisticsMissionTable
SustainmentMeter
22.5 AAR Components
EventTimeline
DecisionTimeline
ObjectiveScoreCard
ReplayControls
OutcomeSummary
RecommendationPanel
23. DASHBOARD WIDGETS
Command Dashboard Widgets
current scenario
simulation clock
phase progress
objective summary
readiness by branch
active missions
top alerts
logistics health
recent decisions
live map
Planner Widgets
mission queue
unassigned units
pending approvals
timeline schedule
priority objectives
threat summary
Logistics Widgets
stock overview
transport routes
delayed resupply list
critical low supplies
node health
AAR Widgets
mission success rate
response time
decision count
logistics strain
delayed orders
recommendation summary
24. FILTERS & SEARCH

TRAE harus membangun:

search units
search missions
filter by branch
filter by status
filter by phase
filter by priority
filter by threat severity
filter by logistics mode
25. EXPORTS

Untuk MVP cukup sediakan:

export AAR summary ke JSON
export scenario summary ke JSON
export mission log ke CSV opsional
26. SAMPLE BUSINESS RULES
26.1 Approval Logic
mission priority high memerlukan approval commander
order type intercept / withdraw wajib approval commander atau director override
26.2 Logistics Logic
node dengan stock rendah memicu alert
mission resupply gagal memengaruhi supply_score unit terkait
26.3 Threat Logic
threat confidence tinggi menaikkan risk level
threat unknown tetap tampil sebagai warning
26.4 Mission Logic
mission tanpa unit tidak bisa active
mission tanpa approval tetap draft / pending
26.5 AAR Logic

AAR harus menghitung minimal:

objective completion
coordination score
logistics performance
response timeliness
alert management quality
27. ACCEPTANCE CRITERIA MVP

MVP dianggap berhasil jika:

user bisa login dengan akun demo
scenario bisa dipilih dan dijalankan
peta menampilkan unit lintas matra
mission dan order bisa dibuat
commander bisa approve order penting
inject bisa ditrigger dan mengubah state
logistics panel menunjukkan perubahan stok atau delay
simulation clock berjalan
event logs tercatat
AAR dapat digenerate
dummy data otomatis tersedia tanpa input manual
UI cukup baik untuk ditunjukkan pada stakeholder