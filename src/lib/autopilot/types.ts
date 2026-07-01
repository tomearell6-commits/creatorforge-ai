/** CreatorsForge Autopilot shared types. */

export type AutopilotMode = "manual" | "assisted" | "full";

export type Campaign = {
  id: string;
  name: string;
  industry?: string | null;
  country?: string | null;
  language?: string | null;
  website?: string | null;
  brand_description?: string | null;
  goals: string[];
  content_types: string[];
  frequency: string;
  publish_windows: string[];
  timezone: string;
  destinations: string[];
  mode: AutopilotMode;
  status: "active" | "paused";
};

export type JobSpec = {
  title: string;
  content_type: string;
  destination: string;
  scheduled_time: string; // ISO
  estimated_credits: number;
};
