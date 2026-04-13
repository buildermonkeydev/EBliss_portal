import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Node } from './node.entity';

@Entity('vms')
export class VM {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  node_id: number;

  @Column()
  proxmox_vmid: number;

  @Column()
  plan_type: string;

  @Column({ default: 'stopped' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hourly_rate: number;

  @Column('int', { array: true, nullable: true })
  ip_ids: number[];

  @ManyToOne(() => User, user => user.vms)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Node, node => node.vms)
  @JoinColumn({ name: 'node_id' })
  node: Node;
}