const clients = new Set<(msg: string) => void>()

export const broadcast = (msg: string) => {
  clients.forEach((send) => send(msg))
}

export { clients }
