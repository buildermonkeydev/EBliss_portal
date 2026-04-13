import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('colocations')
export class Colocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  rack: string;

  @Column()
  unit: string;

  @Column()
  power_w: number;

  @Column()
  bandwidth_gbps: number;

  @Column({ default: 'active' })
  status: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}