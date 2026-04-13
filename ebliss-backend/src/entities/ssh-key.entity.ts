import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('ssh_keys')
export class SSHKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  label: string;

  @Column({ type: 'text' })
  public_key: string;

  @Column()
  fingerprint: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.ssh_keys)
  @JoinColumn({ name: 'user_id' })
  user: User;
}