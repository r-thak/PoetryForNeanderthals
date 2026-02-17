export type Card = {
    easy: string
    hard: string
}

export type CardPack = {
    id: string
    name: string
    cards: Card[]
}

export type GameSettings = {
    timerSec: number
    rounds: number
    pointsEasy: number
    pointsHard: number
    bopPenalty: number
    bopperCount: number
    bopperAssignment: 'rotate' | 'manual'
    enabledPacks: string[]
}

export type Player = {
    id: string
    name: string
}

export type Team = {
    name: string
    players: Player[]
    score: number
}

export type TurnCard = {
    card: Card
    result: 'easy' | 'hard' | 'skip' | 'bop'
}

export type Turn = {
    teamIndex: number
    clueGiverIndex: number
    boppers: string[]
    timeRemaining: number
    cards: TurnCard[]
    currentCard: Card
}

export type RoomPhase = 'lobby' | 'playing' | 'turn_review' | 'game_over'

export type Room = {
    code: string
    host: string
    settings: GameSettings
    phase: RoomPhase
    teams: [Team, Team]
    deck: Card[]
    deckIndex: number
    round: number
    turn: Turn | null
    voiceEnabled: boolean
}

export type LocalAudioSettings = {
    masterVolume: number
    speakerBoost: number
    perPlayerVolume: Map<string, number>
}
