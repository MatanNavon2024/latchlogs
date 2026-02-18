export type UserRole = "admin" | "member" | "guest";
export type LockAction = "lock" | "unlock";
export type EventSource = "nfc" | "qr" | "manual" | "app_clip";
export type PlanType = "free" | "pro";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  plan: PlanType;
  max_locks: number;
  max_members: number;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
}

export interface Lock {
  id: string;
  group_id: string;
  name: string;
  nfc_tag_id: string | null;
  qr_code_id: string;
  created_by: string;
  created_at: string;
}

export interface LockEvent {
  id: string;
  lock_id: string;
  user_id: string;
  action: LockAction;
  source: EventSource;
  device_id: string | null;
  created_at: string;
}

export interface LockStatus {
  lock_id: string;
  status: LockAction;
  last_user_id: string;
  last_source: EventSource;
  last_action_at: string;
}

export interface LockWithStatus extends Lock {
  lock_current_status: LockStatus | null;
}

export interface EventWithDetails extends LockEvent {
  lock?: Pick<Lock, "name">;
  user?: Pick<Profile, "display_name">;
}

export interface GroupWithMembers extends Group {
  group_members: (GroupMember & { profiles?: Profile })[];
}
