export type TicketId = string;

export interface Ticket {
	id: TicketId;
	name: string;
	url?: string;
}
