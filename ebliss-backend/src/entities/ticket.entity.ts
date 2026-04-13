import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { TicketMessage } from './ticket-message.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  subject: string;

  @Column()
  department: string;

  @Column({ default: 'medium' })
  priority: string;

  @Column({ default: 'open' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.tickets)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => TicketMessage, message => message.ticket)
  messages: TicketMessage[];
}