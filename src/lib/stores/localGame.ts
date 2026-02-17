import { writable, derived, get } from 'svelte/store';
import type { GameSettings, Player, Team, Turn, TurnCard, Card } from '$lib/types';
import { DEFAULT_SETTINGS } from '$lib/constants';
import { createShuffledDeck } from '$lib/data/deck';

export type LocalPhase = 'setup' | 'interstitial' | 'playing' | 'turn_review' | 'game_over';

export type LocalGameState = {
    phase: LocalPhase;
    settings: GameSettings;
    teams: [Team, Team];
    deck: Card[];
    deckIndex: number;
    round: number;
    turnNumber: number;
    turn: Turn | null;
    turnHistory: { teamIndex: number; cards: TurnCard[] }[];
    reshuffleNotification: boolean;
};

function createInitialState(): LocalGameState {
    return {
        phase: 'setup',
        settings: { ...DEFAULT_SETTINGS },
        teams: [
            { name: 'Team 1', players: [], score: 0 },
            { name: 'Team 2', players: [], score: 0 }
        ],
        deck: [],
        deckIndex: 0,
        round: 0,
        turnNumber: 0,
        turn: null,
        turnHistory: [],
        reshuffleNotification: false
    };
}

function createLocalGameStore() {
    const { subscribe, set, update } = writable<LocalGameState>(createInitialState());

    function drawCard(state: LocalGameState): { card: Card; state: LocalGameState } {
        if (state.deckIndex >= state.deck.length) {
            state.deck = createShuffledDeck(state.settings.enabledPacks);
            state.deckIndex = 0;
            state.reshuffleNotification = true;
            setTimeout(() => {
                update((s) => ({ ...s, reshuffleNotification: false }));
            }, 3000);
        }
        const card = state.deck[state.deckIndex];
        state.deckIndex++;
        return { card, state };
    }

    return {
        subscribe,
        set,
        update,

        reset(preserveSettings = false) {
            update((s) => {
                const initial = createInitialState();
                if (preserveSettings) {
                    initial.settings = { ...s.settings };
                    initial.teams = [
                        { name: s.teams[0].name, players: [...s.teams[0].players], score: 0 },
                        { name: s.teams[1].name, players: [...s.teams[1].players], score: 0 }
                    ];
                }
                return initial;
            });
        },

        startGame() {
            update((s) => {
                const deck = createShuffledDeck(s.settings.enabledPacks);
                return {
                    ...s,
                    phase: 'interstitial',
                    deck,
                    deckIndex: 0,
                    round: 1,
                    turnNumber: 0,
                    turnHistory: [],
                    teams: [
                        { ...s.teams[0], score: 0 },
                        { ...s.teams[1], score: 0 }
                    ]
                };
            });
            this.prepareTurn();
        },

        prepareTurn() {
            update((s) => {
                const teamIndex = s.turnNumber % 2;
                const team = s.teams[teamIndex];
                const clueGiverIndex = Math.floor(s.turnNumber / 2) % team.players.length;
                const opposingTeam = s.teams[1 - teamIndex];
                const boppers: string[] = [];
                if (s.settings.bopperAssignment === 'rotate') {
                    const count = Math.min(s.settings.bopperCount, opposingTeam.players.length);
                    const startIdx = Math.floor(s.turnNumber / 2) % opposingTeam.players.length;
                    for (let i = 0; i < count; i++) {
                        const idx = (startIdx + i) % opposingTeam.players.length;
                        boppers.push(opposingTeam.players[idx].id);
                    }
                }

                const { card, state: newState } = drawCard({ ...s });

                return {
                    ...newState,
                    phase: 'interstitial',
                    turn: {
                        teamIndex,
                        clueGiverIndex,
                        boppers,
                        timeRemaining: s.settings.timerSec,
                        cards: [],
                        currentCard: card
                    }
                };
            });
        },

        startTurn() {
            update((s) => ({ ...s, phase: 'playing' }));
        },

        tick() {
            update((s) => {
                if (!s.turn) return s;
                const newTime = s.turn.timeRemaining - 1;
                return {
                    ...s,
                    turn: { ...s.turn, timeRemaining: newTime }
                };
            });
        },

        handleGotIt(difficulty: 'easy' | 'hard') {
            update((s) => {
                if (!s.turn) return s;
                const points = difficulty === 'easy' ? s.settings.pointsEasy : s.settings.pointsHard;
                const turnCard: TurnCard = { card: s.turn.currentCard, result: difficulty };
                const newCards = [...s.turn.cards, turnCard];

                const teams = [...s.teams] as [Team, Team];
                teams[s.turn.teamIndex] = {
                    ...teams[s.turn.teamIndex],
                    score: teams[s.turn.teamIndex].score + points
                };

                const { card, state: newState } = drawCard({ ...s, teams });

                return {
                    ...newState,
                    turn: {
                        ...s.turn,
                        cards: newCards,
                        currentCard: card
                    }
                };
            });
        },

        handleSkip() {
            update((s) => {
                if (!s.turn) return s;
                const turnCard: TurnCard = { card: s.turn.currentCard, result: 'skip' };
                const newCards = [...s.turn.cards, turnCard];

                const { card, state: newState } = drawCard({ ...s });

                return {
                    ...newState,
                    turn: {
                        ...s.turn,
                        cards: newCards,
                        currentCard: card
                    }
                };
            });
        },

        handleBop() {
            update((s) => {
                if (!s.turn) return s;
                const turnCard: TurnCard = { card: s.turn.currentCard, result: 'bop' };
                const newCards = [...s.turn.cards, turnCard];

                const teams = [...s.teams] as [Team, Team];
                teams[s.turn.teamIndex] = {
                    ...teams[s.turn.teamIndex],
                    score: teams[s.turn.teamIndex].score - s.settings.bopPenalty
                };

                const { card, state: newState } = drawCard({ ...s, teams });

                return {
                    ...newState,
                    turn: {
                        ...s.turn,
                        cards: newCards,
                        currentCard: card
                    }
                };
            });
        },

        endTurn() {
            update((s) => {
                if (!s.turn) return s;
                return {
                    ...s,
                    phase: 'turn_review',
                    turnHistory: [
                        ...s.turnHistory,
                        { teamIndex: s.turn.teamIndex, cards: s.turn.cards }
                    ]
                };
            });
        },

        nextTurn() {
            update((s) => {
                const nextTurnNumber = s.turnNumber + 1;
                const newRound = nextTurnNumber % 2 === 0 ? s.round + 1 : s.round;

                if (nextTurnNumber % 2 === 0 && s.round >= s.settings.rounds) {
                    return { ...s, phase: 'game_over', turn: null };
                }

                return {
                    ...s,
                    turnNumber: nextTurnNumber,
                    round: newRound
                };
            });
            const state = get(localGame);
            if (state.phase !== 'game_over') {
                this.prepareTurn();
            }
        }
    };
}

export const localGame = createLocalGameStore();
