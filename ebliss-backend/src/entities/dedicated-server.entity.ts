import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('dedicated_servers')
export class DedicatedServer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  label: string;

  @Column({ type: 'json' })
  specs_json: any;

  @Column()
  datacenter: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'json', nullable: true })
  ips_json: any;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}