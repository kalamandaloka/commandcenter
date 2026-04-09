-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "area_name" TEXT,
    "scenario_type" TEXT,
    "initial_phase" INTEGER NOT NULL DEFAULT 1,
    "total_phases" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_template" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "scenario_phases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_id" TEXT NOT NULL,
    "phase_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_offset_minutes" INTEGER NOT NULL DEFAULT 0,
    "end_offset_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scenario_phases_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scenario_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_id" TEXT NOT NULL,
    "started_by_user_id" TEXT,
    "current_phase" INTEGER NOT NULL DEFAULT 1,
    "simulation_status" TEXT NOT NULL DEFAULT 'not_started',
    "simulation_speed" INTEGER NOT NULL DEFAULT 1,
    "started_at" DATETIME,
    "paused_at" DATETIME,
    "ended_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scenario_runs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scenario_runs_started_by_user_id_fkey" FOREIGN KEY ("started_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "unit_type" TEXT,
    "category" TEXT,
    "readiness_score" INTEGER NOT NULL DEFAULT 80,
    "supply_score" INTEGER NOT NULL DEFAULT 80,
    "morale_score" INTEGER NOT NULL DEFAULT 80,
    "x_coord" REAL NOT NULL,
    "y_coord" REAL NOT NULL,
    "heading" REAL,
    "parent_command" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "units_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_run_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mission_type" TEXT NOT NULL,
    "objective" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "phase_number" INTEGER NOT NULL DEFAULT 1,
    "planned_start_time" DATETIME,
    "planned_end_time" DATETIME,
    "actual_start_time" DATETIME,
    "actual_end_time" DATETIME,
    "created_by_user_id" TEXT,
    "approved_by_user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "missions_scenario_run_id_fkey" FOREIGN KEY ("scenario_run_id") REFERENCES "scenario_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "missions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "missions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mission_units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mission_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "assigned_role" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mission_units_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mission_units_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_run_id" TEXT NOT NULL,
    "mission_id" TEXT,
    "issued_by_user_id" TEXT,
    "target_unit_id" TEXT,
    "order_type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "approval_status" TEXT NOT NULL DEFAULT 'draft',
    "execution_status" TEXT NOT NULL DEFAULT 'not_started',
    "details_json" TEXT,
    "issued_at" DATETIME,
    "approved_at" DATETIME,
    "executed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "orders_scenario_run_id_fkey" FOREIGN KEY ("scenario_run_id") REFERENCES "scenario_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "orders_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_target_unit_id_fkey" FOREIGN KEY ("target_unit_id") REFERENCES "units" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "threats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_run_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "threat_type" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 3,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "x_coord" REAL NOT NULL,
    "y_coord" REAL NOT NULL,
    "status" TEXT,
    "metadata_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "threats_scenario_run_id_fkey" FOREIGN KEY ("scenario_run_id") REFERENCES "scenario_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "logistics_nodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "node_type" TEXT NOT NULL,
    "x_coord" REAL NOT NULL,
    "y_coord" REAL NOT NULL,
    "status" TEXT,
    "fuel_stock" INTEGER NOT NULL DEFAULT 0,
    "ammo_stock" INTEGER NOT NULL DEFAULT 0,
    "ration_stock" INTEGER NOT NULL DEFAULT 0,
    "medical_stock" INTEGER NOT NULL DEFAULT 0,
    "spare_stock" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "logistics_nodes_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "logistics_missions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_run_id" TEXT NOT NULL,
    "from_node_id" TEXT NOT NULL,
    "to_node_id" TEXT NOT NULL,
    "transport_mode" TEXT NOT NULL,
    "status" TEXT,
    "fuel_amount" INTEGER NOT NULL DEFAULT 0,
    "ammo_amount" INTEGER NOT NULL DEFAULT 0,
    "ration_amount" INTEGER NOT NULL DEFAULT 0,
    "medical_amount" INTEGER NOT NULL DEFAULT 0,
    "spare_amount" INTEGER NOT NULL DEFAULT 0,
    "eta_minutes" INTEGER NOT NULL DEFAULT 0,
    "launched_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "logistics_missions_scenario_run_id_fkey" FOREIGN KEY ("scenario_run_id") REFERENCES "scenario_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "logistics_missions_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "logistics_nodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "logistics_missions_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "logistics_nodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_injects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inject_type" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "trigger_offset_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "effect_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "event_injects_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_run_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "source_type" TEXT,
    "source_id" TEXT,
    "payload_json" TEXT,
    "occurred_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_logs_scenario_run_id_fkey" FOREIGN KEY ("scenario_run_id") REFERENCES "scenario_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "decision_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "decision_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "impact_summary" TEXT,
    "payload_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "decision_logs_scenario_run_id_fkey" FOREIGN KEY ("scenario_run_id") REFERENCES "scenario_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "decision_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "aar_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario_run_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "objective_score" INTEGER NOT NULL DEFAULT 0,
    "coordination_score" INTEGER NOT NULL DEFAULT 0,
    "logistics_score" INTEGER NOT NULL DEFAULT 0,
    "response_time_score" INTEGER NOT NULL DEFAULT 0,
    "recommendations_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "aar_reports_scenario_run_id_fkey" FOREIGN KEY ("scenario_run_id") REFERENCES "scenario_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "scenarios_slug_key" ON "scenarios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_phases_scenario_id_phase_number_key" ON "scenario_phases"("scenario_id", "phase_number");

-- CreateIndex
CREATE INDEX "scenario_runs_scenario_id_idx" ON "scenario_runs"("scenario_id");

-- CreateIndex
CREATE INDEX "units_scenario_id_branch_idx" ON "units"("scenario_id", "branch");

-- CreateIndex
CREATE UNIQUE INDEX "units_scenario_id_code_key" ON "units"("scenario_id", "code");

-- CreateIndex
CREATE INDEX "missions_scenario_run_id_status_idx" ON "missions"("scenario_run_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mission_units_mission_id_unit_id_key" ON "mission_units"("mission_id", "unit_id");

-- CreateIndex
CREATE INDEX "orders_scenario_run_id_approval_status_execution_status_idx" ON "orders"("scenario_run_id", "approval_status", "execution_status");

-- CreateIndex
CREATE INDEX "threats_scenario_run_id_threat_type_idx" ON "threats"("scenario_run_id", "threat_type");

-- CreateIndex
CREATE INDEX "logistics_nodes_scenario_id_node_type_idx" ON "logistics_nodes"("scenario_id", "node_type");

-- CreateIndex
CREATE INDEX "logistics_missions_scenario_run_id_idx" ON "logistics_missions"("scenario_run_id");

-- CreateIndex
CREATE INDEX "event_injects_scenario_id_trigger_type_idx" ON "event_injects"("scenario_id", "trigger_type");

-- CreateIndex
CREATE INDEX "event_logs_scenario_run_id_occurred_at_idx" ON "event_logs"("scenario_run_id", "occurred_at");

-- CreateIndex
CREATE INDEX "decision_logs_scenario_run_id_created_at_idx" ON "decision_logs"("scenario_run_id", "created_at");

-- CreateIndex
CREATE INDEX "aar_reports_scenario_run_id_idx" ON "aar_reports"("scenario_run_id");
