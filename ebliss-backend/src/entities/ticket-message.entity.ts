import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticket_id: number;

  @Column()
  author_id: number;

  @Column({ default: false })
  is_internal: boolean;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'json', nullable: true })
  attachments: any;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Ticket, ticket => ticket.messages)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;
}