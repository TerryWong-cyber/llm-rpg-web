export interface PublicNpc {
  npc_id: string
  name: string
  title: string
  gender: string
  race: string
  appearance: string
  image_url: string | null
  location: {
    region: string
    terrain_id: string | null
    landmark: string
    cell_ids: number[]
  }
  personality: string[]
  conversation_style: string
  public_backstory: string
  equipment: {
    weapon_id: string | null
    armor_id: string | null
    items: string[]
  }
  story_hooks: StoryHook[]
  combat_tactics: string[]
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
  completed_story_hooks: string[]
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
  xp_reward: number
  requirements: import('./player').QuestRequirement[]
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
  profile: import('./player').PlayerProfile
}

export interface ConversationTurn {
  turn_id: string
  npc_id: string
  player_id: string
  player_message: string
  npc_reply: string
  tone: string
  created_at: string
}

export interface JournalContact {
  npc: PublicNpc
  relationship: NpcRelationship
  memories: MemoryEntry[]
  conversations: ConversationTurn[]
}

export interface PlayerJournal {
  events: import('./exploration').WorldEventLogEntry[]
  active_quests: import('./player').QuestProgress[]
  completed_quests: import('./player').QuestProgress[]
  contacts: JournalContact[]
}
