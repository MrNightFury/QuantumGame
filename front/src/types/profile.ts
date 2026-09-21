export interface Invitation {
  senderId: string
  senderNickname: string
  receiverId: string
  sendTime: string
}

export interface AuthorizedUser {
  id: number
  email: string
  league: string
  nickname: string
  ratingPoints: number
  winsAmount: number
  gamesPlayed: number
  createdAt: string
}

export interface GameHistoryItem {
  isWinner: boolean
  opponentNickname: string
  totalMoves: number
  ratingChange: number
  playedAt: string
}
