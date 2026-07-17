export interface PublicNpc {
  npc_id: string
  name: string
  title: string
  gender: string
  race: string
  appearance: string
  location: {
    region: string
    terrain_id: string | null
    landmark: string
    cell_ids: number[]
  }
  personality: string[]
  conversation_style: string
  public_backstory: string
  has_combat_profile: boolean
  combat_threat: number | null
}

export interface NpcRelationship {
  npc_id: string
  player_id: string
  affinity: number
  trust: number
  respect: number
  hostility: number
  flags: string[]
  active_story_hooks: string[]
  armed_combat_triggers: string[]
  consumed_combat_triggers: string[]
  interaction_count: number
}

export interface StoryHook {
  hook_id: string
  title: string
  summary: string
  min_affinity: number
  min_trust: number
  requires_memory_tags: string[]
}

export interface CombatTrigger {
  trigger_id: string
  title: string
  intro: string
}

export interface MemoryEntry {
  memory_id: string
  owner_type: 'player' | 'npc' | 'world'
  owner_id: string
  counterpart_id: string | null
  summary: string
  tags: string[]
  importance: number
  facts: Record<string, unknown>
  created_at: string
}

export interface NpcDialogueResponse {
  npc_id: string
  reply: string
  tone: string
  intent: string
  relationship: NpcRelationship
  activated_story_hook: StoryHook | null
  combat_trigger: CombatTrigger | null
}
